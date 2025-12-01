// lib/idempotency-cache.ts
import { LRUCache } from 'lru-cache'

type CacheValue = {
  state: 'NEW' | 'PROCESSING' | 'DONE'
  response?: unknown
  timestamp: number
}

// LRU 캐시: 최근 1000개 요청, 1분 TTL
const idemCache = new LRUCache<string, CacheValue>({
  max: 1000,
  ttl: 60000, // 1분
  updateAgeOnGet: false,
  updateAgeOnHas: false,
})

/**
 * 캐시 키 생성
 */
function makeCacheKey(userId: number, scope: string, key: string): string {
  return `${userId}:${scope}:${key}`
}

/**
 * 캐시에서 idempotency 상태 조회
 */
export function getFromCache(userId: number, scope: string, key: string): CacheValue | null {
  const cacheKey = makeCacheKey(userId, scope, key)
  const cached = idemCache.get(cacheKey)
  return cached ?? null
}

/**
 * 캐시에 idempotency 상태 저장
 */
export function setInCache(userId: number, scope: string, key: string, value: CacheValue): void {
  const cacheKey = makeCacheKey(userId, scope, key)
  idemCache.set(cacheKey, value)
}

/**
 * 캐시에서 삭제
 */
export function deleteFromCache(userId: number, scope: string, key: string): void {
  const cacheKey = makeCacheKey(userId, scope, key)
  idemCache.delete(cacheKey)
}

/**
 * 캐시 통계
 */
export function getCacheStats() {
  return {
    size: idemCache.size,
    max: idemCache.max,
  }
}
