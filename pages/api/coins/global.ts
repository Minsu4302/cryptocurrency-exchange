// pages/api/coins/global.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getIp, rateLimit, serveWithCache, RL_WINDOW_SEC, fetchUpstream } from '../../../lib/api-cache';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'method_not_allowed' });
    }

    // 안전한 레이트리밋 (Redis 실패 시 인메모리 폴백)
    const ip = getIp(req);
    const allowed = await rateLimit(ip, 'coins:global');
    if (!allowed) {
        res.setHeader('Retry-After', `${RL_WINDOW_SEC}`);
        return res.status(429).json({ error: 'rate_limited' });
    }

    const key = `coin:global:data`;
    const url = `https://api.coingecko.com/api/v3/global`;

    // 글로벌은 상대적으로 변동이 덜하니 fresh 20s / stale 120s
    return serveWithCache(
        res,
        key,
        async () => fetchUpstream(url),
        { freshSec: 20, staleSec: 120, lockSec: 10 }
    );
}
