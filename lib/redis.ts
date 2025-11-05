// lib/redis.ts
import { Redis } from '@upstash/redis';

let client: Redis | null = null;

/**
 * Upstash Redis가 없거나 환경변수가 비어도 null을 반환해
 * 호출부가 폴백할 수 있게 한다.
 */
export function getRedis(): Redis | null {
    if (client) return client;

    const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
    const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

    if (!url || !token) {
        // 환경 미설정 시 null 반환
        return null;
    }

    try {
        client = new Redis({ url, token });
        return client;
    } catch {
        // 생성 실패 시에도 null 반환
        client = null;
        return null;
    }
}
