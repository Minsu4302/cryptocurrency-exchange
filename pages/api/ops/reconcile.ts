// pages/api/ops/reconcile.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { Prisma } from '@prisma/client'
import prisma from '../../../lib/prisma'
import { getRedis } from '../../../lib/redis'

const redis = getRedis()

function toFixed18(d: Prisma.Decimal) {
    const s = d.toFixed(18)
    return s.includes('-0.000000000000000000') ? '0.000000000000000000' : s
}

async function sumLedger(userId: number, assetId: number) {
    const trades = await prisma.trade.findMany({
        where: { userId, assetId },
        select: { side: true, quantity: true },
    })
    let qty = new Prisma.Decimal(0)
    for (const t of trades) {
        qty = t.side === 'BUY'
            ? qty.add(t.quantity)
            : qty.sub(t.quantity)
    }

    const transfers = await prisma.transfer.findMany({
        where: { userId, assetId, status: 'SUCCESS' },
        select: { type: true, amount: true },
    })
    let tf = new Prisma.Decimal(0)
    for (const tr of transfers) {
        tf = tr.type === 'DEPOSIT'
            ? tf.add(tr.amount)
            : tf.sub(tr.amount)
    }

    return qty.add(tf)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed' })
        return
    }

    // 여기에 관리자 인증 체크 추가(프로젝트 규칙에 맞게)
    // if (!isAdmin(req)) return res.status(403).json({ error: 'forbidden' })

    try {
        const users = await prisma.user.findMany({ select: { id: true } })
        const assets = await prisma.asset.findMany({ select: { id: true } })

        let fixed = 0
        for (const u of users) {
            for (const a of assets) {
                const expected = await sumLedger(u.id, a.id)
                const key = `bal:${u.id}:${a.id}`
                const cur = (await redis.get<string>(key)) ?? '0.000000000000000000'
                const curD = new Prisma.Decimal(cur)

                if (!expected.eq(curD)) {
                    await redis.set(key, toFixed18(expected))
                    fixed++
                }
            }
        }

        res.status(200).json({ ok: true, fixed })
    } catch (e: any) {
        res.status(500).json({ error: e?.message ?? 'internal error' })
    }
}
