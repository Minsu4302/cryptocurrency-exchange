// pages/api/dashboard/categories.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getIp, rateLimit, serveWithCache, RL_WINDOW_SEC } from '../../../lib/api-cache';
import { fetchUpstream } from '../../../lib/api-cache';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'method_not_allowed' });
    }

    const ip = getIp(req);
    const allowed = await rateLimit(ip, 'dash:categories');
    if (!allowed) {
        res.setHeader('Retry-After', `${RL_WINDOW_SEC}`);
        return res.status(429).json({ error: 'rate_limited' });
    }

    const key = `dash:categories`;
    const url = 'https://api.coingecko.com/api/v3/coins/categories';

    return serveWithCache(res, key, async () => fetchUpstream(url));
}
