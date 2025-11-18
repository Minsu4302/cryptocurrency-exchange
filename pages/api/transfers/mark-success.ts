import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { incrUserAssetBalance } from '../../../lib/wallet'
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

    const { id } = req.body ?? {}
    if (!id) {
        respondBadRequest(res, 'ID가 필수입니다')
        return
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            const t = await tx.transfer.update({
                where: { id: Number(id) },
                data: { status: 'SUCCESS', processedAt: new Date() },
            })

            const sign = t.type === 'DEPOSIT' ? 1 : -1
            await incrUserAssetBalance(t.userId, t.assetId, String(t.amount), sign as 1 | -1)

            return t
        })

        respondSuccess(res, { transfer: result })
    } catch (error) {
        console.error('Mark transfer success error:', error)
        respondInternalError(res, '송금 상태 업데이트 중 오류가 발생했습니다')
    }
}
