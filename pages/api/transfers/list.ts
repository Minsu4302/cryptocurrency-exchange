import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import {
    respondMethodNotAllowed,
    respondBadRequest,
    respondSuccess,
    respondInternalError,
    type ApiErrorResponse,
    type ApiSuccessResponse,
} from '../../../lib/api-response'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiErrorResponse | ApiSuccessResponse>
) {
    if (req.method !== 'GET') {
        respondMethodNotAllowed(res, ['GET'])
        return
    }

    const userId = Number(req.query.userId ?? 0)
    if (!userId) {
        respondBadRequest(res, '사용자 ID가 필수입니다')
        return
    }

    try {
        const items = await prisma.transfer.findMany({
            where: { userId },
            orderBy: { requestedAt: 'desc' },
            select: {
                id: true,
                type: true,
                status: true,
                amount: true,
                address: true,
                requestedAt: true,
                asset: {
                    select: {
                        symbol: true,
                        name: true
                    }
                }
            },
            take: 50,
        })
        respondSuccess(res, { items })
    } catch (error) {
        console.error('Transfers list error:', error)
        respondInternalError(res, '송금 목록 조회 중 오류가 발생했습니다')
    }
}
