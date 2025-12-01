// lib/idempotency.ts
import { IdemStatus } from '@prisma/client';
import prisma from './prisma';
import { getFromCache, setInCache } from './idempotency-cache';

// Prisma 고유키 충돌 코드 체크
function isUniqueConstraintError(e: any): boolean {
    // P2002: Unique constraint failed
    return !!(e && (e.code === 'P2002' || (e.meta && e.meta.target)));
}

/**
 * 멱등키 확보 (캐시 우선 조회).
 * - 캐시에 있으면 즉시 반환
 * - 없으면 DB 조회 후 캐시 저장
 */
export async function ensureIdempotentBegin(userId: number, key: string, scope: string) {
    // 1) 캐시 먼저 확인
    const cached = getFromCache(userId, scope, key);
    if (cached) {
        if (cached.state === 'DONE') {
            return { state: 'DONE' as const, row: { response: cached.response } as any };
        }
        if (cached.state === 'PROCESSING') {
            return { state: 'PROCESSING' as const, row: {} as any };
        }
    }

    // 2) 캐시 없으면 DB에서 생성/조회
    try {
        const row = await prisma.idempotencyKey.create({
            data: { userId, key, scope, status: IdemStatus.PROCESSING }
        });
        // 캐시에 저장
        setInCache(userId, scope, key, { state: 'PROCESSING', timestamp: Date.now() });
        return { state: 'NEW' as const, row };
    } catch (e: any) {
        if (isUniqueConstraintError(e)) {
            const row = await prisma.idempotencyKey.findUnique({
                where: { userId_scope_key: { userId, scope, key } }
            });
            if (!row) {
                // 극히 드문 레이스 상황: 다시 NEW로 간주
                const retry = await prisma.idempotencyKey.create({
                    data: { userId, key, scope, status: IdemStatus.PROCESSING }
                });
                setInCache(userId, scope, key, { state: 'PROCESSING', timestamp: Date.now() });
                return { state: 'NEW' as const, row: retry };
            }
            // 기존 키 있음 - 캐시에도 저장
            if (row.status === IdemStatus.DONE) {
                setInCache(userId, scope, key, { state: 'DONE', response: row.response, timestamp: Date.now() });
                return { state: 'DONE' as const, row };
            }
            setInCache(userId, scope, key, { state: 'PROCESSING', timestamp: Date.now() });
            return { state: 'PROCESSING' as const, row };
        }
        throw e;
    }
}

/**
 * 처리 완료 후 결과를 저장(DONE).
 * - 캐시와 DB 모두 업데이트
 */
export async function ensureIdempotentEnd(userId: number, key: string, scope: string, response: any) {
    // 캐시 먼저 업데이트 (빠른 조회를 위해)
    setInCache(userId, scope, key, { state: 'DONE', response, timestamp: Date.now() });
    
    // DB 업데이트 (비동기로 실행되므로 빠름)
    await prisma.idempotencyKey.update({
        where: { userId_scope_key: { userId, scope, key } },
        data: { status: IdemStatus.DONE, response }
    });
}
