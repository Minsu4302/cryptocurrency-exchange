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

/**
 * Upstash 파이프라인으로 여러 키를 한 번에 읽어오기.
 * 클라이언트가 없거나 오류 시에는 빈 객체 반환.
 */
export async function mgetStrings(keys: string[]): Promise<Record<string, string | null>> {
    if (!client || keys.length === 0) return {}
    try {
        const pipe = client.pipeline()
        keys.forEach((k) => pipe.get<string>(k))
        const results = await pipe.exec<string>()
        const out: Record<string, string | null> = {}
        keys.forEach((k, i) => {
            const v = results[i]
            out[k] = typeof v === 'string' ? v : (v ?? null)
        })
        return out
    } catch {
        return {}
    }
}
