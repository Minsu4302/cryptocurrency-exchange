import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { getRedis } from '../../../lib/redis'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method Not Allowed' })
        return
    }

    try {
        await prisma.$queryRaw`SELECT 1`
        const redis = getRedis()
        await redis.set('health:ping', '1', { ex: 10 })
        const pong = await redis.get('health:ping')
        res.status(200).json({ ok: true, db: 'ok', redis: pong === '1' ? 'ok' : 'fail' })
    } catch (e: any) {
        res.status(500).json({ ok: false, error: e?.message ?? 'internal error' })
    }
}
