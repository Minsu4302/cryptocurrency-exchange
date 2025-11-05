// pages/api/coins/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getIp, rateLimit, serveWithCache, RL_WINDOW_SEC, fetchUpstream } from '../../../lib/api-cache';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'method_not_allowed' });
    }

    const { id } = req.query as { id?: string };
    if (!id || typeof id !== 'string' || id.trim() === '') {
        return res.status(400).json({ error: 'missing_id' });
    }

    // 안전한 레이트리밋 (Redis 실패 시 인메모리 폴백)
    const ip = getIp(req);
    const allowed = await rateLimit(ip, 'coins:id');
    if (!allowed) {
        res.setHeader('Retry-After', `${RL_WINDOW_SEC}`);
        return res.status(429).json({ error: 'rate_limited' });
    }

    // 캐시 키
    const key = `coin:${id}:data`;

    // CoinGecko 호출 최적화 (불필요 필드 차단)
    const url =
        `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}` +
        `?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;

    // 코인 단건은 자주 바뀌므로 fresh 10s / stale 180s 정도로 설정
    return serveWithCache(
        res,
        key,
        async () => fetchUpstream(url),
        { freshSec: 10, staleSec: 180, lockSec: 10 }
    );
}
