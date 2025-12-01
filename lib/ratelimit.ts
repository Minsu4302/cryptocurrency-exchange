// lib/ratelimit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { getRedis } from './redis'

let limiter: Ratelimit | null = null

export function getLimiter() {
    if (!limiter) {
        const redis = getRedis()
        if (redis) {
            limiter = new Ratelimit({
                redis,
                limiter: Ratelimit.slidingWindow(20, '1 m'), // 분당 20회
                analytics: true,
                prefix: 'rl',
            })
        } else {
            // 개발/로컬 환경 폴백: 항상 허용하는 noop limiter
            limiter = {
                limit: async (_key: string) => ({ success: true, limit: 1000, remaining: 999, reset: Date.now() + 60_000 }),
            } as unknown as Ratelimit
        }
    }
    return limiter
}
