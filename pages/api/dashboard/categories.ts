// pages/api/dashboard/categories.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getIp, rateLimit, serveWithCache, RL_WINDOW_SEC } from '../../../lib/api-cache'
import { fetchUpstream } from '../../../lib/api-cache'
import { respondMethodNotAllowed, respondRateLimited } from '../../../lib/api-response'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET')
        respondMethodNotAllowed(res, ['GET'])
        return
    }

    const ip = getIp(req)
    const allowed = await rateLimit(ip, 'dash:categories')
    if (!allowed) {
        respondRateLimited(res, RL_WINDOW_SEC)
        return
    }

    const key = 'dash:categories'
    const url = 'https://api.coingecko.com/api/v3/coins/categories'

    return serveWithCache(res, key, async () => fetchUpstream(url))
}
