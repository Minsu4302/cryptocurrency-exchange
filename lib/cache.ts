// lib/cache.ts
import { getRedis } from '../lib/redis'

const redis = getRedis()

export type CacheEntry<T> = { value: T; savedAt: number };

const now = () => Date.now();

export async function getEntry<T>(key: string): Promise<CacheEntry<T> | null> {
    const raw = await redis.get<CacheEntry<T>>(key);
    return raw ?? null;
}

/**
 * ttlSeconds = fresh + stale 전체 수명(초)
 */
export async function setEntry<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const payload: CacheEntry<T> = { value, savedAt: now() };
    await redis.set(key, payload, { ex: ttlSeconds });
}

/**
 * 분산 락 (SET NX PX). lockMs는 밀리초.
 */
export async function acquireLock(lockKey: string, lockMs: number): Promise<boolean> {
    const ok = await redis.set(lockKey, '1', { nx: true, px: lockMs });
    return ok === 'OK';
}

export async function releaseLock(lockKey: string): Promise<void> {
    await redis.del(lockKey);
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
        const ent = await getEntry<T>(key);
        if (ent && now() - ent.savedAt <= freshMs) return ent;
        await new Promise((r) => setTimeout(r, stepMs));
    }
    return null;
}
