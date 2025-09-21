// pages/api/support/tickets/detail.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method Not Allowed' })
        return
    }

    const id = Number(req.query.id ?? 0)
    const userId = Number(req.query.userId ?? 0) // 접근 권한 체크용

    if (!id || !userId) {
        res.status(400).json({ error: 'id and userId required' })
        return
    }

    try {
        const ticket = await prisma.supportTicket.findFirst({
            where: { id, userId },
            include: {
                messages: { orderBy: { createdAt: 'asc' } },
            },
        })
        if (!ticket) {
            res.status(404).json({ error: 'not found' })
            return
        }
        res.status(200).json({ ticket })
    } catch (e: any) {
        res.status(500).json({ error: e?.message ?? 'internal error' })
    }
}
