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
    const take = Number(req.query.take ?? 50)
    const cursor = req.query.cursor ? { id: Number(req.query.cursor) } : undefined

    if (!userId) {
        respondBadRequest(res, '사용자 ID가 필수입니다')
        return
    }

    try {
        const trades = await prisma.trade.findMany({
            where: { userId },
            orderBy: { executedAt: 'desc' },
            take,
            skip: cursor ? 1 : 0,
            cursor,
            include: { asset: { select: { symbol: true, name: true } } },
        })

        respondSuccess(res, { items: trades, nextCursor: trades.at(-1)?.id ?? null })
    } catch (error) {
        console.error('Trades list error:', error)
        respondInternalError(res, '거래 목록 조회 중 오류가 발생했습니다')
    }
}
