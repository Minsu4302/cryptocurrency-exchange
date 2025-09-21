// pages/api/trades/create.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { getAssetIdOrThrow } from '../../../lib/assets'
import { incrUserAssetBalance } from '../../../lib/wallet'
import { ensureIdempotent } from '../../../lib/idempotency'
import { getLimiter } from '../../../lib/ratelimit'
import { z } from 'zod'

const CreateTradeSchema = z.object({
    userId: z.number().int().positive(),
    symbol: z.string().min(1),
    side: z.enum(['BUY', 'SELL']),
    orderType: z.enum(['MARKET', 'LIMIT']),
    // 체결된 수량/가격(문자열 Decimal)
    quantity: z.string().regex(/^\d+(\.\d+)?$/, 'decimal string required'),
    price: z.string().regex(/^\d+(\.\d+)?$/, 'decimal string required'),
    // 수수료/통화
    fee: z.string().regex(/^\d+(\.\d+)?$/).optional(),
    feeCurrency: z.string().default('KRW'),
    // 가격 출처/시각
    priceSource: z.string().default('coingecko'),
    priceAsOf: z.string().datetime().optional(), // MARKET일 때 되도록 포함하도록 권장
    // 참조 값
    orderId: z.string().optional(),
    externalRef: z.string().optional(),
    // 중복 방지
    idempotencyKey: z.string().optional(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed' })
        return
    }

    try {
        // 레이트 리밋(선호: userId+ip 기준, 분당 20회)
        const rl = getLimiter()
        const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? 'local')
        // body를 미리 읽어야 userId 키 조합 가능 → 일단 라이트하게 ip 기반으로 한번 컷
        const pre = await rl.limit(`trade:create:ip:${ip}`)
        if (!pre.success) {
            res.status(429).json({ error: 'rate_limited', limit: pre.limit, remaining: pre.remaining, reset: pre.reset })
            return
        }

        const input = CreateTradeSchema.parse(req.body)

        // 두번째 컷: userId + ip 조합
        const post = await rl.limit(`trade:create:${input.userId}:${ip}`)
        if (!post.success) {
            res.status(429).json({ error: 'rate_limited', limit: post.limit, remaining: post.remaining, reset: post.reset })
            return
        }

        // 정책: MARKET은 priceAsOf가 있는 게 바람직
        if (input.orderType === 'MARKET' && !input.priceAsOf) {
            // 운영정책에 따라 허용할 수도 있음. 여기선 엄격모드로 400 반환.
            res.status(400).json({ error: 'priceAsOf is required for MARKET orders' })
            return
        }

        const assetId = await getAssetIdOrThrow(String(input.symbol))

        // 중복 방지
        await ensureIdempotent(input.userId, input.idempotencyKey ?? '', 'trade:create')

        // 트랜잭션: Trade 기록 + 잔고 증감
        const trade = await prisma.$transaction(async (tx) => {
            const created = await tx.trade.create({
                data: {
                    userId: input.userId,
                    assetId,
                    side: input.side,
                    orderType: input.orderType,      // ✅ 신규 저장
                    quantity: input.quantity,
                    price: input.price,              // 체결가(시장가/지정가 공통)
                    fee: input.fee ?? '0',
                    feeCurrency: input.feeCurrency,
                    executedAt: new Date(),
                    priceSource: input.priceSource,
                    priceAsOf: input.priceAsOf ? new Date(input.priceAsOf) : new Date(),
                    orderId: input.orderId ?? null,
                    externalRef: input.externalRef ?? null,
                },
            })

            const sign = input.side === 'BUY' ? 1 : -1
            await incrUserAssetBalance(input.userId, assetId, input.quantity, sign as 1 | -1)

            return created
        })

        res.status(200).json({ ok: true, trade })
    } catch (e: any) {
        const status = e?.statusCode ?? 500
        res.status(status).json({ error: e?.message ?? 'internal error' })
    }
}
