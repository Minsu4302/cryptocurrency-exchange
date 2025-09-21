// pages/api/support/tickets/create.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed' })
        return
    }

    const { userId, title, body } = req.body ?? {}
    if (!userId || !title || !body) {
        res.status(400).json({ error: 'missing fields' })
        return
    }

    try {
        const ticket = await prisma.supportTicket.create({
            data: {
                userId: Number(userId),
                title: String(title),
                status: 'OPEN',
                messages: {
                    create: [{
                        authorType: 'USER',
                        body: String(body),
                    }],
                },
            },
            include: {
                messages: { orderBy: { createdAt: 'asc' } },
            },
        })
        res.status(200).json({ ok: true, ticket })
    } catch (e: any) {
        res.status(500).json({ error: e?.message ?? 'internal error' })
    }
}
