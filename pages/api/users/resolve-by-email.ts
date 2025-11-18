// pages/api/users/resolve-by-email.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import {
    respondMethodNotAllowed,
    respondBadRequest,
    respondNotFound,
    respondSuccess,
    respondInternalError,
    type ApiErrorResponse,
    type ApiSuccessResponse,
} from '../../../lib/api-response'

// 간단 재시도 유틸 (지수백오프)
async function withRetry<T>(fn: () => Promise<T>, times = 2, baseDelayMs = 200): Promise<T> {
    let lastErr: unknown
    for (let i = 0; i <= times; i++) {
        try {
            return await fn()
        } catch (e) {
            lastErr = e
            if (i === times) break
            const delay = baseDelayMs * Math.pow(2, i) // 200, 400, ...
            await new Promise((r) => setTimeout(r, delay))
        }
    }
    throw lastErr
}

// 타임아웃 래퍼 (DB가 응답 지연 시 빠르게 실패)
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const to = setTimeout(() => reject(new Error('timeout')), ms)
        p.then((v) => {
            clearTimeout(to)
            resolve(v)
        }).catch((e) => {
            clearTimeout(to)
            reject(e)
        })
    })
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiErrorResponse | ApiSuccessResponse>
) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET')
        respondMethodNotAllowed(res, ['GET'])
        return
    }

    res.setHeader('Cache-Control', 'no-store')

    try {
        const emailRaw = req.query.email
        const emailParam = Array.isArray(emailRaw) ? emailRaw[0] : emailRaw

        if (!emailParam || typeof emailParam !== 'string') {
            respondBadRequest(res, '이메일이 필수입니다')
            return
        }

        // 이메일 정규화(공백 제거 + 소문자)
        const email = emailParam.trim().toLowerCase()

        const user = await withRetry(
            () =>
                withTimeout(
                    prisma.user.findUnique({
                        where: { email },
                        select: { id: true },
                    }),
                    2500 // 2.5초 내 응답 없으면 재시도/실패
                ),
            2 // 총 3회 시도(초기 1 + 재시도 2)
        )

        if (!user) {
            respondNotFound(res, '사용자를 찾을 수 없습니다')
            return
        }

        respondSuccess(res, { userId: user.id })
    } catch (error) {
        console.error('Resolve user by email error:', error)

        const msg: string = error instanceof Error ? error.message : String(error)

        // Prisma/Neon 네트워크 계열 에러를 처리
        const isConnError =
            msg.includes('P1001') || // Prisma: DB 연결 불가
            msg.includes('timeout') ||
            msg.includes('ECONNRESET') ||
            msg.includes('ENOTFOUND') ||
            msg.includes('ETIMEDOUT')

        if (isConnError) {
            // 503 Service Unavailable은 표준 에러 응답으로 사용
            res.status(503)
            respondInternalError(res, '일시적 오류가 발생했습니다. 다시 시도하세요')
            return
        }

        respondInternalError(res, '사용자 조회 중 오류가 발생했습니다')
    }
}
