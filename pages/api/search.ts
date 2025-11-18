// pages/api/search.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getIp, rateLimit, serveWithCache, RL_WINDOW_SEC } from '../../lib/api-cache'
import { fetchUpstream } from '../../lib/api-cache'
import { respondMethodNotAllowed, respondBadRequest, respondRateLimited, type ApiErrorResponse } from '../../lib/api-response'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET')
        respondMethodNotAllowed(res, ['GET'])
        return
    }

    const q = String(req.query.query ?? '').trim()
    if (!q) {
        respondBadRequest(res, '검색 쿼리를 입력하세요')
        return
    }

    const ip = getIp(req)
    const allowed = await rateLimit(ip, 'search')
    if (!allowed) {
        respondRateLimited(res, RL_WINDOW_SEC)
        return
    }

    const key = `search:${q.toLowerCase()}`
    const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`

    return serveWithCache(res, key, async () => fetchUpstream(url))
}
