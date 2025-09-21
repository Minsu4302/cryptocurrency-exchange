// lib/redis.ts
import { Redis } from '@upstash/redis';

let client: Redis | null = null;

export function getRedis() {
    if (!client) {
        const url = process.env.UPSTASH_REDIS_REST_URL;
        const token = process.env.UPSTASH_REDIS_REST_TOKEN;

        if (!url || !token) {
            throw new Error('[Upstash Redis] Missing env: UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN');
        }

        client = new Redis({ url, token });
    }
    return client;
}
