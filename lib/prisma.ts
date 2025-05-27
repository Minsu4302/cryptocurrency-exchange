import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

// 개발 중 핫리로드 때문에 중복 생성되는 걸 방지
export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: ['query', 'error', 'warn'],
    })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma