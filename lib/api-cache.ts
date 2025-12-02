// lib/api-cache.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getEntry, setEntry, acquireLock, releaseLock } from './cache'
import { getRedis } from './redis'

// ───────────────────────────────────────────────────────────────────────────────
// 환경 상수
// ───────────────────────────────────────────────────────────────────────────────
export const FRESH_TTL_SEC = 15;
export const STALE_TTL_SEC = 180;
export const LOCK_SEC = 10;

// 레이트리밋 윈도우 / 한도 (필요 시 라우트별 오버라이드 가능)
export const RL_WINDOW_SEC = 10;
export const RL_MAX = 30;

export const MS = (s: number) => s * 1000;

// ───────────────────────────────────────────────────────────────────────────────
// Redis 클라이언트 (없거나 실패해도 앱이 죽지 않게 설계)
// ───────────────────────────────────────────────────────────────────────────────
type MinimalRedis = {
    incr: (key: string) => Promise<number>;
    expire: (key: string, seconds: number) => Promise<unknown>;
};

const redis = ((): MinimalRedis | null => {
    try {
        const r = getRedis() as unknown as MinimalRedis | null | undefined;
        return r ?? null;
    } catch {
        return null;
    }
})();

// ───────────────────────────────────────────────────────────────────────────────
// 유틸
// ───────────────────────────────────────────────────────────────────────────────
export function nowSec(): number {
    return Math.floor(Date.now() / 1000);
}

export function getIp(req: NextApiRequest): string {
    // 프록시/엣지 환경 고려
    const xf = req.headers['x-forwarded-for'];
    if (typeof xf === 'string' && xf.trim() !== '') return xf.split(',')[0].trim();
    if (Array.isArray(xf) && xf.length > 0) return xf[0].trim();
    const ra = (req.socket as any)?.remoteAddress as string | undefined;
    return ra ?? '0.0.0.0';
}

// ───────────────────────────────────────────────────────────────────────────────
// 인메모리 폴백 버킷 (프로세스 생명주기 동안만 유효)
// ───────────────────────────────────────────────────────────────────────────────
type MemCounter = { c: number; exp: number };
const memCounters = new Map<string, MemCounter>();

function memRate(key: string, windowSec: number): number {
    const now = Date.now();
    const bucket = memCounters.get(key);
    if (!bucket || bucket.exp <= now) {
        const exp = now + windowSec * 1000;
        memCounters.set(key, { c: 1, exp });
        return 1;
    }
    bucket.c += 1;
    return bucket.c;
}

// ───────────────────────────────────────────────────────────────────────────────
// 안전한 레이트리밋: Redis가 죽어도 throw 하지 않음 (실패 시 인메모리 폴백)
// ───────────────────────────────────────────────────────────────────────────────
export async function rateLimit(
    ip: string,
    route?: string,
    opts?: { windowSec?: number; max?: number }
): Promise<boolean> {
    const windowSec = opts?.windowSec ?? RL_WINDOW_SEC;
    const max = opts?.max ?? RL_MAX;
    const key = route ? `rl:${ip}:${route}` : `rl:${ip}`;

    // 1) Redis 시도
    if (redis) {
        try {
            // Upstash/일반 Redis 모두 호환: incr → 첫 호출이면 count=1, 이어서 expire
            const count = await redis.incr(key);
            if (count === 1) {
                // 첫 증가 시에만 만료 부여
                await redis.expire(key, windowSec);
            }
            return count <= max;
        } catch {
            // 네트워크/DNS/인증 오류 → 폴백으로 전환
        }
    }

    // 2) 폴백: 인메모리 카운터 (프로세스 단위, 다중 인스턴스면 각자 독립)
    const count = memRate(key, windowSec);
    return count <= max;
}

// ───────────────────────────────────────────────────────────────────────────────
export async function fetchUpstream<T = any>(url: string, timeoutMs = 5000): Promise<T> {
    // \uc7ac\uc2dc\ub3c4 1\ud68c\ub85c \ucd95\uc18c - CoinGecko\ub294 \ub290\ub9ac\uc9c0\ub9cc \uc548\uc815\uc801\uc774\ubbc0\ub85c \ubd88\ud544\uc694\ud55c \ub300\uae30 \uc2dc\uac04 \uac10\uc18c
    const ctrl = new AbortController()
    const timeoutId = setTimeout(() => ctrl.abort(), timeoutMs)
    
    try {
        const res = await fetch(url, {
            cache: 'no-store',
            keepalive: true,
            signal: ctrl.signal,
            headers: {
                'Accept': 'application/json',
            },
        })
        clearTimeout(timeoutId)
        if (!res.ok) throw new Error(`status ${res.status}`)
        return (await res.json()) as T
    } catch (error) {
        clearTimeout(timeoutId)
        throw error
    }
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
        res.setHeader('Cache-Control', `public, max-age=${freshSec}, stale-while-revalidate=${staleSec}`)
        res.setHeader('Vary', 'Accept, Accept-Encoding')
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
        res.setHeader('Cache-Control', `public, max-age=${freshSec}, stale-while-revalidate=${staleSec}`)
        res.setHeader('Vary', 'Accept, Accept-Encoding')
        res.setHeader('X-Cache', 'STALE');
        return res.status(200).json(cached.value);
    }

    // MISS → 로드 후 저장
    try {
        const payload = await loader();
        const totalTtl = freshSec + staleSec + 60;
        await setEntry(key, payload, totalTtl);
        res.setHeader('Cache-Control', `public, max-age=${freshSec}, stale-while-revalidate=${staleSec}`)
        res.setHeader('Vary', 'Accept, Accept-Encoding')
        res.setHeader('X-Cache', 'MISS');
        return res.status(200).json(payload);
    } catch {
        // 완전 실패 → 캐시가 있으면 STALE-FALLBACK
        if (cached) {
            res.setHeader('Cache-Control', 'no-cache')
            res.setHeader('Vary', 'Accept, Accept-Encoding')
            res.setHeader('X-Cache', 'STALE-FALLBACK');
            return res.status(200).json(cached.value);
        }
        return res.status(502).json({ error: 'upstream_failed' });
    }
}
