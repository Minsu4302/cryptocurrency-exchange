// pages/api/trades/create.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { getAssetIdOrThrow } from '../../../lib/assets';
import { incrUserAssetBalance } from '../../../lib/wallet'; // 기존 사용 중이면 유지
import { getLimiter } from '../../../lib/ratelimit';
import { ensureIdempotentBegin, ensureIdempotentEnd } from '../../../lib/idempotency';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

const CreateTradeSchema = z.object({
    userId: z.number().int().positive(),
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed' });
        return;
    }

    try {
        const rl = getLimiter();
        const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? 'local');
        const pre = await rl.limit(`trade:create:ip:${ip}`);
        if (!pre.success) {
            res.status(429).json({ error: 'rate_limited', limit: pre.limit, remaining: pre.remaining, reset: pre.reset });
            return;
        }

        const rawInput = coerceFromAny(req.body ?? {});
        const parsed = CreateTradeSchema.parse({
            ...rawInput,
            userId: Number(rawInput.userId),
        });

        // MARKET은 priceAsOf 필수
        if (parsed.orderType === 'MARKET' && !parsed.priceAsOf) {
            res.status(400).json({ error: 'priceAsOf is required for MARKET orders' });
            return;
        }

        // 멱등
        const begin = await ensureIdempotentBegin(parsed.userId, parsed.idempotencyKey, 'trade:create');
        if (begin.state === 'PROCESSING') {
            res.status(409).json({ error: 'duplicate_request', processing: true });
            return;
        }
        if (begin.state === 'DONE') {
            res.status(200).json(begin.row.response ?? { ok: true, reused: true });
            return;
        }

        // 기초 값/정규화
        const assetId = await getAssetIdOrThrow(String(parsed.symbol));
        const symbolUpper = String(parsed.symbol).toUpperCase();

        // 금액 계산 (Decimal)
        const priceDec = new Prisma.Decimal(parsed.price);
        const qtyDec   = new Prisma.Decimal(parsed.quantity);
        const feeDec   = new Prisma.Decimal(parsed.fee ?? '0');

        const gross = priceDec.mul(qtyDec);
        const isKrwFee = (parsed.feeCurrency ?? 'KRW').toUpperCase() === 'KRW';
        const feeKrw = isKrwFee ? feeDec : new Prisma.Decimal(0);

        // 매수: -(gross + fee), 매도: +(gross - fee)
        const deltaKrw = parsed.side === 'BUY'
            ? gross.plus(feeKrw).neg()
            : gross.minus(feeKrw);

        // ===== 트랜잭션 시작 =====
        const result = await prisma.$transaction(async (tx) => {
            // 0) 레이트리밋 2차: userId + ip
            const post = await rl.limit(`trade:create:${parsed.userId}:${ip}`);
            if (!post.success) {
                throw Object.assign(new Error('rate_limited'), { statusCode: 429, meta: post });
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
                        WHERE "userId" = ${parsed.userId} AND "symbol" = ${symbolUpper}
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
                        WHERE "userId" = ${parsed.userId} AND "symbol" = ${symbolUpper}
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
                            userId: parsed.userId,
                            symbol: symbolUpper,
                            amount: qtyNum,
                        },
                    });
                }
            }

            // 3) 거래 기록
            const createdTrade = await tx.trade.create({
                data: {
                    userId: parsed.userId,
                    assetId,
                    side: parsed.side,
                    orderType: parsed.orderType,
                    quantity: parsed.quantity, // Decimal 컬럼: string 허용
                    price: parsed.price,
                    fee: parsed.fee ?? '0',
                    feeCurrency: parsed.feeCurrency,
                    executedAt: new Date(),
                    priceSource: parsed.priceSource,
                    priceAsOf: parsed.priceAsOf ? new Date(parsed.priceAsOf) : new Date(),
                    orderId: parsed.orderId ?? null,
                    externalRef: parsed.externalRef ?? null,
                },
            });

            // 4) (선택) 기존 내부 자산테이블도 관리 중이라면 계속 호출
            const sign = parsed.side === 'BUY' ? 1 : -1;
            await incrUserAssetBalance(parsed.userId, assetId, parsed.quantity, sign as 1 | -1).catch(() => { /* 외부 테이블 없으면 무시 */ });

            // 5) KRW 잔액 증감 (User.balance: Decimal)
            const updatedUser = await tx.user.update({
                where: { id: parsed.userId },
                data: {
                    balance: { increment: deltaKrw }, // Decimal 증감
                },
                select: { id: true, balance: true },
            });

            return { createdTrade, updatedUser };
        });
        // ===== 트랜잭션 끝 =====

        const responsePayload = {
            ok: true,
            trade: result.createdTrade,
            nextBalance: result.updatedUser.balance, // Prisma Decimal → 문자열 직렬화
        };

        await ensureIdempotentEnd(parsed.userId, parsed.idempotencyKey, 'trade:create', responsePayload);
        res.status(200).json(responsePayload);
    } catch (e: any) {
        const status = e?.statusCode ?? e?.status ?? 500;
        const message =
            e?.message === 'insufficient_holding'
                ? '보유 수량이 부족하여 매도할 수 없습니다.'
                : e?.message === 'rate_limited'
                    ? 'rate_limited'
                    : (e?.message ?? 'internal error');

        res.status(status).json({ error: message });
    }
}
