// pages/api/dashboard/assets.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getIp, rateLimit, serveWithCache, RL_WINDOW_SEC } from '../../../lib/api-cache';
import { fetchUpstream } from '../../../lib/api-cache';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'method_not_allowed' });
    }

    const ip = getIp(req);
    const allowed = await rateLimit(ip, 'dash:assets');
    if (!allowed) {
        res.setHeader('Retry-After', `${RL_WINDOW_SEC}`);
        return res.status(429).json({ error: 'rate_limited' });
    }

    const vs = String(req.query.vs ?? 'usd');
    const order = String(req.query.order ?? 'market_cap_desc');
    const per_page = String(req.query.per_page ?? '20');
    const page = String(req.query.page ?? '1');
    const sparkline = String(req.query.sparkline ?? 'true');

    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${encodeURIComponent(
        vs
    )}&order=${encodeURIComponent(order)}&per_page=${encodeURIComponent(per_page)}&page=${encodeURIComponent(
        page
    )}&sparkline=${encodeURIComponent(sparkline)}`;

    const key = `dash:assets:${vs}:${order}:${per_page}:${page}:${sparkline}`;

    return serveWithCache(res, key, async () => fetchUpstream(url));
}
