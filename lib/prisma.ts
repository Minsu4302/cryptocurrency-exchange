// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

// 개발에선 쿼리 로그로 디버깅, 프로덕션은 경고/에러만
const logs: ('query' | 'error' | 'warn')[] =
    process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query', 'error', 'warn'];

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: logs,
        // 필요 시 명시적 데이터소스 URL 지정
        datasources: process.env.DATABASE_URL
            ? { db: { url: process.env.DATABASE_URL } }
            : undefined,
    });

// 개발 핫리로드 시 중복 생성을 방지
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
