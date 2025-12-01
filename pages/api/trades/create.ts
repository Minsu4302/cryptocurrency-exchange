// pages/api/trades/create.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { getAssetIdOrThrow } from '../../../lib/assets'
import { incrUserAssetBalance } from '../../../lib/wallet'
import { getLimiter } from '../../../lib/ratelimit'
import { ensureIdempotentBegin, ensureIdempotentEnd } from '../../../lib/idempotency'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { respondMethodNotAllowed, respondRateLimited, respondBadRequest, respondSuccess, respondInternalError, type ApiErrorResponse, type ApiSuccessResponse } from '../../../lib/api-response'
import { verifyToken } from '../../../lib/auth'

const CreateTradeSchema = z.object({
    userId: z.number().int().positive().optional(),
    symbol: z.string().min(1),
    side: z.enum(['BUY', 'SELL']),
    orderType: z.enum(['MARKET', 'LIMIT']),
    quantity: z.string().regex(/^\d+(\.\d+)?$/, 'decimal string required'),
    price: z.string().regex(/^\d+(\.\d+)?$/, 'decimal string required'),
    fee: z.string().regex(/^\d+(\.\d+)?$/).optional(),
    feeCurrency: z.string().default('KRW'),
    priceSource: z.string().default('coingecko'),
    priceAsOf: z.string().datetime().optional(),
    orderId: z.string().optional(),
    externalRef: z.string().optional(),
    idempotencyKey: z.string().min(16, 'idempotencyKey required'),
});

function firstString(v: unknown): string | undefined {
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) return v.find((x) => typeof x === 'string');
    return undefined;
}

function coerceFromAny(anyObj: any) {
    const userIdStr = firstString(anyObj?.userId) ?? (typeof anyObj?.userId === 'number' ? String(anyObj.userId) : undefined);
    const userIdNum = userIdStr ? Number(userIdStr) : undefined;
    const obj = {
        userId: userIdNum,
        symbol: firstString(anyObj?.symbol),
        side: firstString(anyObj?.side),
        orderType: firstString(anyObj?.orderType),
        quantity: firstString(anyObj?.quantity),
        price: firstString(anyObj?.price),
        fee: firstString(anyObj?.fee),
        feeCurrency: firstString(anyObj?.feeCurrency),
        priceSource: firstString(anyObj?.priceSource),
        priceAsOf: firstString(anyObj?.priceAsOf),
        orderId: firstString(anyObj?.orderId),
        externalRef: firstString(anyObj?.externalRef),
        idempotencyKey: firstString(anyObj?.idempotencyKey),
    };
    return obj;
}

 

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiErrorResponse | ApiSuccessResponse>
) {
    if (req.method !== 'POST') {
        respondMethodNotAllowed(res, ['POST'])
        return
    }

    try {
        // 인증: Authorization 헤더 또는 쿠키에서 토큰 추출 (최적화)
        let token: string | undefined
        const authHeader = req.headers.authorization
        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.substring(7) // 'Bearer '.length = 7
        } else {
            token = req.cookies?.token || req.cookies?.accessToken || req.cookies?.access_token
        }

        // Rate limit 체크 (간소화) - 개발 환경에서는 스킵
        if (process.env.NODE_ENV === 'production') {
            const rl = getLimiter()
            const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? 'local')
            try {
                const pre = await rl.limit(`trade:create:ip:${ip}`)
                if (!pre.success) {
                    respondRateLimited(res, Math.ceil((pre.reset - Date.now()) / 1000))
                    return
                }
            } catch {
                // Redis 실패 시 통과
            }
        }

        const rawInput = coerceFromAny(req.body ?? {});
        const parsed = CreateTradeSchema.parse({
            ...rawInput,
            userId: rawInput.userId != null ? Number(rawInput.userId) : undefined,
        });

        // userId가 없으면 토큰에서 유도
        let userId = parsed.userId
        if (!userId) {
            if (!token) {
                respondBadRequest(res, 'userId가 없고 인증 토큰도 없습니다')
                return
            }
            try {
                const decoded = verifyToken(token)
                userId = Number(decoded.userId)
            } catch (e) {
                respondBadRequest(res, '유효하지 않은 인증 토큰입니다')
                return
            }
        }

        // 최종 userId 검증
        if (!Number.isFinite(userId) || userId! <= 0) {
            respondBadRequest(res, '잘못된 사용자 ID')
            return
        }

        // MARKET은 priceAsOf 필수
        if (parsed.orderType === 'MARKET' && !parsed.priceAsOf) {
            respondBadRequest(res, 'MARKET 주문은 priceAsOf가 필수입니다')
            return
        }

        // 멱등 체크 (트랜잭션 밖에서 먼저 수행)
        const begin = await ensureIdempotentBegin(userId!, parsed.idempotencyKey, 'trade:create')
        if (begin.state === 'PROCESSING') {
            respondBadRequest(res, '같은 요청이 처리 중입니다')
            return
        }
        if (begin.state === 'DONE') {
            respondSuccess(res, begin.row.response ?? { ok: true, reused: true })
            return
        }

        // 기초 값/정규화
        let assetId: number
        try {
            assetId = await getAssetIdOrThrow(String(parsed.symbol));
        } catch (e) {
            respondBadRequest(res, `알 수 없는 심볼입니다: ${String(parsed.symbol)}`)
            return
        }
        const symbolUpper = String(parsed.symbol).toUpperCase();

        // ===== 시장가 검증 (가격 조작 방지) =====
        let validatedPrice: number;
        if (parsed.orderType === 'MARKET') {
            // 시장가 주문: CoinGecko에서 현재가 가져오기
            try {
                const asset = await prisma.asset.findUnique({
                    where: { id: assetId },
                    select: { coingeckoId: true }
                });
                if (!asset?.coingeckoId) {
                    respondBadRequest(res, '코인 정보를 찾을 수 없습니다')
                    return
                }

                // CoinGecko API 호출
                const coinUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${asset.coingeckoId}&vs_currencies=krw`;
                const priceData = await fetch(coinUrl, { 
                    cache: 'no-store',
                    signal: AbortSignal.timeout(3000)
                }).then(r => r.json()).catch(() => null);

                const currentPrice = priceData?.[asset.coingeckoId]?.krw;
                if (!currentPrice || typeof currentPrice !== 'number') {
                    respondBadRequest(res, '현재 시장가를 가져올 수 없습니다')
                    return
                }

                validatedPrice = Math.floor(currentPrice);
            } catch (e) {
                respondBadRequest(res, '시장가 조회 중 오류가 발생했습니다')
                return
            }
        } else {
            // 지정가 주문: 클라이언트 가격 사용하되 시장가 대비 ±10% 이내인지 검증
            try {
                const asset = await prisma.asset.findUnique({
                    where: { id: assetId },
                    select: { coingeckoId: true }
                });
                if (!asset?.coingeckoId) {
                    respondBadRequest(res, '코인 정보를 찾을 수 없습니다')
                    return
                }

                const coinUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${asset.coingeckoId}&vs_currencies=krw`;
                const priceData = await fetch(coinUrl, { 
                    cache: 'no-store',
                    signal: AbortSignal.timeout(3000)
                }).then(r => r.json()).catch(() => null);

                const currentPrice = priceData?.[asset.coingeckoId]?.krw;
                if (!currentPrice || typeof currentPrice !== 'number') {
                    respondBadRequest(res, '현재 시장가를 가져올 수 없습니다')
                    return
                }

                const clientPrice = Number(parsed.price);
                const marketPrice = Math.floor(currentPrice);
                const lowerBound = marketPrice * 0.9; // -10%
                const upperBound = marketPrice * 1.1; // +10%

                if (clientPrice < lowerBound || clientPrice > upperBound) {
                    respondBadRequest(res, `가격은 현재 시장가(${marketPrice.toLocaleString()}원)의 ±10% 범위 내여야 합니다`)
                    return
                }

                validatedPrice = clientPrice;
            } catch (e) {
                respondBadRequest(res, '시장가 검증 중 오류가 발생했습니다')
                return
            }
        }

        // 금액 계산 (검증된 가격 사용)
        const priceDec = new Prisma.Decimal(validatedPrice);
        const qtyDec   = new Prisma.Decimal(parsed.quantity);
        const feeDec   = new Prisma.Decimal(parsed.fee ?? '0');

        const gross = priceDec.mul(qtyDec);
        const isKrwFee = (parsed.feeCurrency ?? 'KRW').toUpperCase() === 'KRW';
        const feeKrw = isKrwFee ? feeDec : new Prisma.Decimal(0);

        // 매수: -(gross + fee), 매도: +(gross - fee)
        const deltaKrw = parsed.side === 'BUY'
            ? gross.plus(feeKrw).neg()
            : gross.minus(feeKrw);

        // ===== 트랜잭션 시작 (타임아웃 10초) =====
        const result = await prisma.$transaction(async (tx) => {
            // 0) BUY 시 잔액 확인
            if (parsed.side === 'BUY') {
                const user = await tx.user.findUnique({
                    where: { id: userId! },
                    select: { balance: true }
                });
                if (!user) {
                    throw Object.assign(new Error('user_not_found'), { statusCode: 404 });
                }
                const currentBalance = Number(user.balance);
                const requiredAmount = Number(gross.plus(feeKrw));
                
                if (currentBalance < requiredAmount) {
                    throw Object.assign(new Error('insufficient_balance'), { statusCode: 400 });
                }
            }

            // 1) SELL 시 보유 확인(+행 잠금)
            const qtyNum = Number(parsed.quantity);

            if (parsed.side === 'SELL') {
                // 행 잠금: 해당 보유행을 FOR UPDATE
                // prisma.$queryRaw 사용 – Postgres
                const rows: Array<{ id: number; amount: number }> =
                    await tx.$queryRaw`
                        SELECT id, amount
                        FROM "Holding"
                        WHERE "userId" = ${userId} AND "symbol" = ${symbolUpper}
                        FOR UPDATE
                    `;

                const found = rows[0];
                const currentAmt = found ? Number(found.amount) : 0;

                if (currentAmt + 1e-12 < qtyNum) {
                    // 보유 부족 → 실패
                    throw Object.assign(new Error('insufficient_holding'), { statusCode: 400 });
                }

                // 감소
                const nextAmt = currentAmt - qtyNum;
                await tx.holding.update({
                    where: { id: found.id },
                    data: { amount: nextAmt },
                });
            }

            // 2) BUY 시 보유 upsert(+행 잠금)
            if (parsed.side === 'BUY') {
                const rows: Array<{ id: number; amount: number }> =
                    await tx.$queryRaw`
                        SELECT id, amount
                        FROM "Holding"
                        WHERE "userId" = ${userId} AND "symbol" = ${symbolUpper}
                        FOR UPDATE
                    `;

                const found = rows[0];
                if (found) {
                    const nextAmt = Number(found.amount) + Number(qtyNum);
                    await tx.holding.update({
                        where: { id: found.id },
                        data: { amount: nextAmt },
                    });
                } else {
                    await tx.holding.create({
                        data: {
                            userId: userId!,
                            symbol: symbolUpper,
                            amount: qtyNum,
                        },
                    });
                }
            }

            // 3) Trade 기록 & User balance 업데이트 (병렬 실행)
            const [createdTrade, updatedUser] = await Promise.all([
                tx.trade.create({
                    data: {
                        userId: userId!,
                        assetId,
                        side: parsed.side,
                        orderType: parsed.orderType,
                        quantity: parsed.quantity,
                        price: String(validatedPrice), // 검증된 가격 사용
                        fee: parsed.fee ?? '0',
                        feeCurrency: parsed.feeCurrency,
                        executedAt: new Date(),
                        priceSource: parsed.priceSource,
                        priceAsOf: parsed.priceAsOf ? new Date(parsed.priceAsOf) : new Date(),
                        orderId: parsed.orderId ?? null,
                        externalRef: parsed.externalRef ?? null,
                    },
                }),
                tx.user.update({
                    where: { id: userId! },
                    data: { balance: { increment: deltaKrw as any } },
                    select: { id: true, balance: true },
                })
            ]);

            return { createdTrade, updatedUser };
        }, { timeout: 5000 });
        // ===== 트랜잭션 끝 =====

        // Redis 잔고 증감 (트랜잭션 밖, 비동기로 실행하되 기다리지 않음)
        const sign = parsed.side === 'BUY' ? 1 : -1;
        incrUserAssetBalance(userId!, assetId, parsed.quantity, sign as 1 | -1).catch(() => { /* 무시 */ });

        const responsePayload = {
            ok: true,
            trade: result.createdTrade,
            nextBalance: result.updatedUser.balance, // Prisma Decimal → 문자열 직렬화
        }

        // Idempotency 완료 기록 (비동기로 실행, 응답 전송과 병렬 처리)
        ensureIdempotentEnd(userId!, parsed.idempotencyKey, 'trade:create', responsePayload).catch(() => { /* 무시 */ })
        
        respondSuccess(res, responsePayload)
    } catch (error) {
        console.error('Trade creation error:', error)

        // Zod validation 오류 처리
        if ((error as any)?.name === 'ZodError') {
            respondBadRequest(res, '요청 형식이 올바르지 않습니다')
            return
        }

        if (error instanceof Error) {
            if (error.message === 'insufficient_holding') {
                respondBadRequest(res, '보유 수량이 부족하여 매도할 수 없습니다')
                return
            }
            if (error.message === 'insufficient_balance') {
                respondBadRequest(res, '잔액이 부족하여 매수할 수 없습니다')
                return
            }
            if (error.message === 'rate_limited') {
                respondRateLimited(res, 60)
                return
            }
            // 개발 환경에서는 상세 메시지 노출
            if (process.env.NODE_ENV !== 'production') {
                respondInternalError(res, `거래 생성 중 오류: ${error.message}`)
                return
            }
        }

        respondInternalError(res, '거래 생성 중 오류가 발생했습니다')
    }
}
