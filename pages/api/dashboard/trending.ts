// pages/api/dashboard/trending.ts
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
    const allowed = await rateLimit(ip, 'dash:trending')
    if (!allowed) {
        respondRateLimited(res, RL_WINDOW_SEC)
        return
    }

    const key = 'dash:trending'
    const url = 'https://api.coingecko.com/api/v3/search/trending'

    // 트렌딩은 자주 변하지 않음 - 긴 캐시 사용
    return serveWithCache(res, key, async () => fetchUpstream(url), {
        freshSec: 300,  // 5분
        staleSec: 1800, // 30분
        lockSec: 10
    })
}
