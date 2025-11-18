// pages/api/me.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'
import { verifyToken } from '../../lib/auth'
import {
    respondMethodNotAllowed,
    respondUnauthorized,
    respondNotFound,
    respondSuccess,
    respondInternalError,
    type ApiErrorResponse,
    type ApiSuccessResponse,
} from '../../lib/api-response'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiErrorResponse | ApiSuccessResponse>
) {
    if (req.method !== 'GET') {
        respondMethodNotAllowed(res, ['GET'])
        return
    }

    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        respondUnauthorized(res, '토큰이 없습니다')
        return
    }

    const token = authHeader.split(' ')[1]

    try {
        const decoded = verifyToken(token)

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                createdAt: true,
                balance: true,
            },
        })

        if (!user) {
            respondNotFound(res, '사용자를 찾을 수 없습니다')
            return
        }

        respondSuccess(res, {
            user: {
                id: user.id,
                email: user.email,
                createdAt: user.createdAt,
                balance: Number(user.balance ?? 0),
            },
        })
    } catch (error) {
        console.error('토큰 검증 오류:', error)
        respondUnauthorized(res, '유효하지 않은 토큰입니다')
    }
}
