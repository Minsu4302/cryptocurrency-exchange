// pages/api/coins/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getIp, rateLimit, serveWithCache, RL_WINDOW_SEC, fetchUpstream } from '../../../lib/api-cache'
import { respondMethodNotAllowed, respondBadRequest, respondRateLimited } from '../../../lib/api-response'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET')
        respondMethodNotAllowed(res, ['GET'])
        return
    }

    const { id } = req.query as { id?: string }
    if (!id || typeof id !== 'string' || id.trim() === '') {
        respondBadRequest(res, '코인 ID를 입력하세요')
        return
    }

    const ip = getIp(req)
    const allowed = await rateLimit(ip, 'coins:id')
    if (!allowed) {
        respondRateLimited(res, RL_WINDOW_SEC)
        return
    }

    const key = `coin:${id}:data`

    // CoinGecko 호출 최적화 (불필요 필드 차단)
    const url =
        `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}` +
        '?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false'

    // 코인 단건은 자주 바뀌므로 fresh 10s / stale 180s 정도로 설정
    return serveWithCache(res, key, async () => fetchUpstream(url), {
        freshSec: 10,
        staleSec: 180,
        lockSec: 10,
    })
}
