// lib/ratelimit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { getRedis } from './redis'

let limiter: Ratelimit | null = null

export function getLimiter() {
    if (!limiter) {
        limiter = new Ratelimit({
            redis: getRedis(),
            limiter: Ratelimit.slidingWindow(20, '1 m'), // 분당 20회
            analytics: true,
            prefix: 'rl',
        })
    }
    return limiter
}
