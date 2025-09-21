import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { getAssetIdOrThrow } from '../../../lib/assets'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed' })
        return
    }

    const {
        userId,
        symbol,
        type,               // 'DEPOSIT' | 'WITHDRAWAL'
        amount,             // string decimal
        fee,
        network,
        address,
        txId,
    } = req.body ?? {}

    if (!userId || !symbol || !type || !amount) {
        res.status(400).json({ error: 'missing fields' })
        return
    }

    try {
        const assetId = await getAssetIdOrThrow(String(symbol))
        const rec = await prisma.transfer.create({
            data: {
                userId: Number(userId),
                assetId,
                type,
                status: 'PENDING',
                amount,
                fee: fee ?? null,
                network: network ?? null,
                address: address ?? null,
                txId: txId ?? null,
                requestedAt: new Date(),
            },
        })
        res.status(200).json({ ok: true, transfer: rec })
    } catch (e: any) {
        res.status(500).json({ error: e?.message ?? 'internal error' })
    }
}
