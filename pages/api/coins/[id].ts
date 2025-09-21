// pages/api/coins/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getIp, rateLimit, serveWithCache, RL_WINDOW_SEC } from '../../../lib/api-cache';
import { fetchUpstream } from '../../../lib/api-cache';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'method_not_allowed' });
    }

    const { id } = req.query as { id: string };
    if (!id) return res.status(400).json({ error: 'missing_id' });

    const ip = getIp(req);
    const allowed = await rateLimit(ip, 'coins:id');
    if (!allowed) {
        res.setHeader('Retry-After', `${RL_WINDOW_SEC}`);
        return res.status(429).json({ error: 'rate_limited' });
    }

    const key = `coin:${id}:data`;
    const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}?localization=false`;

    return serveWithCache(res, key, async () => fetchUpstream(url));
}
