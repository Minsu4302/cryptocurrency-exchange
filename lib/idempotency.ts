// lib/idempotency.ts
import prisma from './prisma'

export async function ensureIdempotent(userId: number, key: string, purpose: string) {
    if (!key) return // 키가 없다면 스킵(선택 정책)
    try {
        await prisma.idempotencyKey.create({
            data: { key, userId, purpose },
        })
    } catch {
        const err = new Error('duplicate_request')
        ;(err as any).statusCode = 409
        throw err
    }
}
