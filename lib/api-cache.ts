// lib/api-cache.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getEntry, setEntry, acquireLock, releaseLock } from './cache';
import { getRedis } from '../lib/redis'

const redis = getRedis()   // ✅ 여기서 최초 생성

export const FRESH_TTL_SEC = 15;
export const STALE_TTL_SEC = 180;
export const LOCK_SEC = 10;
export const RL_WINDOW_SEC = 10;
export const RL_MAX = 30;

export const MS = (s: number) => s * 1000;

export function nowSec(): number {
    return Math.floor(Date.now() / 1000);
}

export function getIp(req: NextApiRequest): string {
    const xf = req.headers['x-forwarded-for'];
    if (typeof xf === 'string') return xf.split(',')[0].trim();
    if (Array.isArray(xf)) return xf[0];
    return (req.socket?.remoteAddress as string) || 'unknown';
}

export async function rateLimit(ip: string, route?: string): Promise<boolean> {
    const key = route ? `rl:${ip}:${route}` : `rl:${ip}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, RL_WINDOW_SEC);
    return count <= RL_MAX;
}

export async function fetchUpstream<T = any>(url: string): Promise<T> {
    let lastErr: unknown;
    for (const delay of [0, 300, 700]) {
        try {
            if (delay) await new Promise((r) => setTimeout(r, delay));
            const res = await fetch(url, { cache: 'no-store' });
            if (!res.ok) throw new Error(`status ${res.status}`);
            return (await res.json()) as T;
        } catch (e) {
            lastErr = e;
        }
    }
    throw lastErr;
}

/**
 * SWR 캐시 서빙 파이프라인(분산 락 + 폴백)
 * - freshSec / staleSec / lockSec: 라우트별 오버라이드 가능
 */
export async function serveWithCache(
    res: NextApiResponse,
    key: string,
    loader: () => Promise<any>,
    opts?: { freshSec?: number; staleSec?: number; lockSec?: number }
) {
    const freshSec = opts?.freshSec ?? FRESH_TTL_SEC;
    const staleSec = opts?.staleSec ?? STALE_TTL_SEC;
    const lockSec = opts?.lockSec ?? LOCK_SEC;

    const now = nowSec();
    const cached = await getEntry<any>(key);

    // FRESH
    if (cached && now * 1000 - cached.savedAt <= MS(freshSec)) {
        res.setHeader('Cache-Control', 'public, max-age=5, stale-while-revalidate=120');
        res.setHeader('X-Cache', 'FRESH');
        return res.status(200).json(cached.value);
    }

    // STALE → 즉시 반환 + 백그라운드 리프레시
    if (cached && now * 1000 - cached.savedAt <= MS(freshSec + staleSec)) {
        const lockKey = `${key}:lock`;
        const locked = await acquireLock(lockKey, MS(lockSec));
        if (locked) {
            (async () => {
                try {
                    const payload = await loader();
                    const totalTtl = freshSec + staleSec + 60;
                    await setEntry(key, payload, totalTtl);
                } finally {
                    await releaseLock(lockKey);
                }
            })().catch(() => {});
        }
        res.setHeader('Cache-Control', 'public, max-age=5, stale-while-revalidate=120');
        res.setHeader('X-Cache', 'STALE');
        return res.status(200).json(cached.value);
    }

    // MISS → 로드 후 저장
    try {
        const payload = await loader();
        const totalTtl = freshSec + staleSec + 60;
        await setEntry(key, payload, totalTtl);
        res.setHeader('Cache-Control', 'public, max-age=5, stale-while-revalidate=120');
        res.setHeader('X-Cache', 'MISS');
        return res.status(200).json(payload);
    } catch {
        // 완전 실패 → 캐시가 있으면 STALE-FALLBACK
        if (cached) {
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('X-Cache', 'STALE-FALLBACK');
            return res.status(200).json(cached.value);
        }
        return res.status(502).json({ error: 'upstream_failed' });
    }
}
