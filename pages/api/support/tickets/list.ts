// pages/api/support/tickets/list.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method Not Allowed' })
        return
    }

    const userId = Number(req.query.userId ?? 0)
    const take = Number(req.query.take ?? 20)
    const cursor = req.query.cursor ? { id: Number(req.query.cursor) } : undefined

    if (!userId) {
        res.status(400).json({ error: 'userId required' })
        return
    }

    try {
        const tickets = await prisma.supportTicket.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            take,
            skip: cursor ? 1 : 0,
            cursor,
            select: {
                id: true,
                title: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        })
        res.status(200).json({ items: tickets, nextCursor: tickets.at(-1)?.id ?? null })
    } catch (e: any) {
        res.status(500).json({ error: e?.message ?? 'internal error' })
    }
}
