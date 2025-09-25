// lib/idempotency.ts
import { PrismaClient, IdemStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Prisma 고유키 충돌 코드 체크
function isUniqueConstraintError(e: any): boolean {
    // P2002: Unique constraint failed
    return !!(e && (e.code === 'P2002' || (e.meta && e.meta.target)));
}

/**
 * 멱등키 확보.
 * - 처음이면 PROCESSING으로 생성 후 진행
 * - 중복이면 현재 상태 반환
 */
export async function ensureIdempotentBegin(userId: number, key: string, scope: string) {
    try {
        const row = await prisma.idempotencyKey.create({
            data: { userId, key, scope, status: IdemStatus.PROCESSING }
        });
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
                return { state: 'NEW' as const, row: retry };
            }
            // 기존 키 있음
            if (row.status === IdemStatus.DONE) {
                return { state: 'DONE' as const, row };
            }
            return { state: 'PROCESSING' as const, row };
        }
        throw e;
    }
}

/**
 * 처리 완료 후 결과를 저장(DONE).
 * - 동일 키 재요청 시 이 응답을 그대로 반환 가능
 */
export async function ensureIdempotentEnd(userId: number, key: string, scope: string, response: any) {
    await prisma.idempotencyKey.update({
        where: { userId_scope_key: { userId, scope, key } },
        data: { status: IdemStatus.DONE, response }
    });
}
