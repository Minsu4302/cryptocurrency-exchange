import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { incrUserAssetBalance } from '../../../lib/wallet'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed' })
        return
    }

    const { id } = req.body ?? {}
    if (!id) {
        res.status(400).json({ error: 'id required' })
        return
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            const t = await tx.transfer.update({
                where: { id: Number(id) },
                data: { status: 'SUCCESS', processedAt: new Date() },
            })

            const sign = t.type === 'DEPOSIT' ? 1 : -1
            await incrUserAssetBalance(t.userId, t.assetId, String(t.amount), sign as 1 | -1)

            return t
        })

        res.status(200).json({ ok: true, transfer: result })
    } catch (e: any) {
        res.status(500).json({ error: e?.message ?? 'internal error' })
    }
}
