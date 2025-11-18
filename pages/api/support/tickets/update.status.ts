// pages/api/support/tickets/update-status.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed' })
        return
    }

    const { id, status } = req.body ?? {}
    // status: 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED'
    if (!id || !status) {
        res.status(400).json({ error: 'missing fields' })
        return
    }

    // 관리자 인증 필수 (isAdmin(req) 같은 체크 추가 권장)

    try {
        const updated = await prisma.supportTicket.update({
            where: { id: Number(id) },
            data: { status, updatedAt: new Date() },
        })
        res.status(200).json({ ok: true, ticket: updated })
    } catch (e: any) {
        res.status(500).json({ error: e?.message ?? 'internal error' })
    }
}
