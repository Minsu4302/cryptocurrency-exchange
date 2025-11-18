// lib/cache.ts
import { getRedis } from './redis'

export type CacheEntry<T = any> = {
    value: T;
    savedAt: number; // ms
};

type MinimalRedis = {
    get: <T = any>(key: string) => Promise<T | null>;
    set: (key: string, value: unknown, opts?: any) => Promise<any>;
    del: (key: string) => Promise<any>;
};

const now = () => Date.now();

// ──────────────────────────────────────────────
// Redis 핸들 (없거나 실패해도 앱이 계속 돌도록)
// ──────────────────────────────────────────────
const redis: MinimalRedis | null = (() => {
    try {
        const r = getRedis() as unknown as MinimalRedis | null | undefined;
        return r ?? null;
    } catch {
        return null;
    }
})();

// ──────────────────────────────────────────────
// 인메모리 캐시/락 (프로세스 생명주기 한정)
// ──────────────────────────────────────────────
type MemWrap<T = any> = { entry: CacheEntry<T>; exp: number };
const memCache = new Map<string, MemWrap>();
const memLocks = new Map<string, number>(); // value: 만료 epoch(ms)

// ──────────────────────────────────────────────
// 안전한 get/set: Redis 실패 시 인메모리 폴백
// ──────────────────────────────────────────────
export async function getEntry<T>(key: string): Promise<CacheEntry<T> | null> {
    // 1) Redis 우선 시도
    if (redis) {
        try {
            const raw = await redis.get<CacheEntry<T>>(key);
            if (raw && typeof raw === 'object' && 'savedAt' in raw) {
                return raw as CacheEntry<T>;
            }
        } catch {
            // 폴백으로 진행
        }
    }

    // 2) 인메모리 폴백
    const w = memCache.get(key);
    if (!w) return null;
    if (w.exp <= now()) {
        memCache.delete(key);
        return null;
    }
    return w.entry as CacheEntry<T>;
}

/**
 * ttlSeconds = fresh + stale 전체 수명(초)
 */
export async function setEntry<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const entry: CacheEntry<T> = { value, savedAt: now() };
    const exp = now() + ttlSeconds * 1000;

    // 인메모리에 우선 저장(성공 보장)
    memCache.set(key, { entry, exp });

    // Redis 기록은 베스트에포트(실패해도 throw 금지)
    if (redis) {
        try {
            await redis.set(key, entry, { ex: ttlSeconds });
        } catch {
            // 무시
        }
    }
}

/**
 * 분산 락 (SET NX PX). lockMs는 밀리초.
 * Redis 실패 시 인메모리 락으로 폴백.
 */
export async function acquireLock(lockKey: string, lockMs: number): Promise<boolean> {
    // 1) Redis 시도
    if (redis) {
        try {
            const res = await (redis as any).set(lockKey, '1', { nx: true, px: lockMs });
            if (res === 'OK' || res === true) return true;
            // res가 null이면 이미 잠금 중
            return false;
        } catch {
            // 폴백으로 진행
        }
    }

    // 2) 인메모리 락
    const t = now();
    const exp = memLocks.get(lockKey);
    if (exp && exp > t) return false; // 이미 잠금 중
    memLocks.set(lockKey, t + lockMs);
    return true;
}

export async function releaseLock(lockKey: string): Promise<void> {
    // 인메모리 먼저 해제
    memLocks.delete(lockKey);

    // Redis 해제 시도(실패해도 throw 금지)
    if (redis) {
        try {
            await redis.del(lockKey);
        } catch {
            // 무시
        }
    }
}

/**
 * 누군가가 캐시를 갱신해줄 것을 잠시 기다렸다가 fresh 데이터를 받는 폴링.
 */
export async function waitForFresh<T>(
    key: string,
    freshMs: number,
    waitTotalMs = 1500,
    stepMs = 150
): Promise<CacheEntry<T> | null> {
    const deadline = now() + waitTotalMs;
    while (now() < deadline) {
        try {
            const ent = await getEntry<T>(key);
            if (ent && now() - (ent.savedAt ?? 0) <= freshMs) return ent;
        } catch {
            // getEntry는 내부에서 폴백하므로 사실상 여기로 오지 않지만, 혹시 모를 예외 무시
        }
        await new Promise((r) => setTimeout(r, stepMs));
    }
    return null;
}
