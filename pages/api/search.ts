// pages/api/search.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getIp, rateLimit, serveWithCache, RL_WINDOW_SEC } from '../../lib/api-cache';
import { fetchUpstream } from '../../lib/api-cache';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'method_not_allowed' });
    }

    const q = String(req.query.query ?? '').trim();
    if (!q) return res.status(400).json({ error: 'missing_query' });

    const ip = getIp(req);
    const allowed = await rateLimit(ip, 'search');
    if (!allowed) {
        res.setHeader('Retry-After', `${RL_WINDOW_SEC}`);
        return res.status(429).json({ error: 'rate_limited' });
    }

    const key = `search:${q.toLowerCase()}`;
    const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`;

    return serveWithCache(res, key, async () => fetchUpstream(url));
}
