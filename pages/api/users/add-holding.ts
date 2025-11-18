import { NextApiRequest, NextApiResponse } from 'next'
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
    if (req.method !== 'POST') {
        respondMethodNotAllowed(res, ['POST'])
        return
    }

    const { userId, symbol, amount } = req.body
    if (!userId || !symbol || !amount || amount <= 0) {
        respondBadRequest(res, '유효한 입력값이 필요합니다')
        return
    }

    try {
        const existing = await prisma.holding.findFirst({ where: { userId, symbol } })

        if (existing) {
            const updated = await prisma.holding.update({
                where: { id: existing.id },
                data: { amount: { increment: amount } },
            })
            respondSuccess(res, updated)
            return
        }

        const created = await prisma.holding.create({
            data: { userId, symbol, amount },
        })

        respondSuccess(res, created, 201)
    } catch (error) {
        console.error('Add holding error:', error)
        respondInternalError(res, '보유 자산 추가 중 오류가 발생했습니다')
    }
}
