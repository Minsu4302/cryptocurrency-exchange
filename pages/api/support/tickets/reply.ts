// pages/api/support/tickets/reply.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed' })
        return
    }

    const { ticketId, userId, body, authorType } = req.body ?? {}
    // authorType: 'USER' | 'ADMIN'
    if (!ticketId || !userId || !body || !authorType) {
        res.status(400).json({ error: 'missing fields' })
        return
    }

    try {
        // 접근 제어: USER면 자신의 티켓만, ADMIN이면 스킵(권한 체크는 별도 미들웨어 권장)
        const ticket = await prisma.supportTicket.findFirst({
            where: authorType === 'USER' ? { id: Number(ticketId), userId: Number(userId) } : { id: Number(ticketId) },
            select: { id: true },
        })
        if (!ticket) {
            res.status(404).json({ error: 'not found or forbidden' })
            return
        }

        const created = await prisma.$transaction(async (tx) => {
            const msg = await tx.ticketMessage.create({
                data: {
                    ticketId: ticket.id,
                    authorType,
                    body: String(body),
                },
            })
            // 티켓 업데이트 시간 갱신(정렬 용도)
            await tx.supportTicket.update({
                where: { id: ticket.id },
                data: { updatedAt: new Date() },
            })
            return msg
        })

        res.status(200).json({ ok: true, message: created })
    } catch (e: any) {
        res.status(500).json({ error: e?.message ?? 'internal error' })
    }
}
