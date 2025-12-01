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
        // Connection pool 설정 (최적화)
        datasources: process.env.DATABASE_URL
            ? { db: { url: process.env.DATABASE_URL } }
            : undefined,
        // 추가 최적화 옵션
        errorFormat: 'minimal',
    });

// 개발 핫리로드 시 중복 생성을 방지
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
