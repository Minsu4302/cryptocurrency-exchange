import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'

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
        const items = await prisma.transfer.findMany({
            where: { userId },
            orderBy: { requestedAt: 'desc' },
            include: { asset: { select: { symbol: true, name: true } } },
            take: 100,
        })
        res.status(200).json({ items })
    } catch (e: any) {
        res.status(500).json({ error: e?.message ?? 'internal error' })
    }
}
