import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { getRedis } from '../../../lib/redis'

const redis = getRedis()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method Not Allowed' })
        return
    }

    const userId = Number(req.query.userId ?? 0)
    if (!userId) {
        res.status(400).json({ error: 'userId required' })
        return
    }

    try {
        const assets = await prisma.asset.findMany({
            select: { id: true, symbol: true, name: true, coingeckoId: true },
        })

        const list: Array<{ symbol: string; name: string; amount: string }> = []
        // Upstash는 멀티 GET 파이프라인이 없어서 단건 루프 사용
        for (const a of assets) {
            const bal = await redis.get<string>(`bal:${userId}:${a.id}`)
            if (!bal || bal === '0' || bal === '0.000000000000000000') continue
            list.push({ symbol: a.symbol, name: a.name, amount: bal })
        }

        res.status(200).json({ userId, holdings: list })
    } catch (e: any) {
        res.status(500).json({ error: e?.message ?? 'internal error' })
    }
}
