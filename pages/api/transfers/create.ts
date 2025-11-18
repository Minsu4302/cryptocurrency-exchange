import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { getAssetIdOrThrow } from '../../../lib/assets'
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

    const { userId, symbol, type, amount, fee, network, address, txId } = req.body ?? {}

    if (!userId || !symbol || !type || !amount) {
        respondBadRequest(res, '필수 필드가 누락되었습니다')
        return
    }

    try {
        const assetId = await getAssetIdOrThrow(String(symbol))
        const rec = await prisma.transfer.create({
            data: {
                userId: Number(userId),
                assetId,
                type,
                status: 'PENDING',
                amount,
                fee: fee ?? null,
                network: network ?? null,
                address: address ?? null,
                txId: txId ?? null,
                requestedAt: new Date(),
            },
        })
        respondSuccess(res, { transfer: rec }, 201)
    } catch (error) {
        console.error('Transfer creation error:', error)
        respondInternalError(res, '송금 요청 생성 중 오류가 발생했습니다')
    }
}
