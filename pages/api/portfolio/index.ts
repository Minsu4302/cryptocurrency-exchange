import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { getRedis } from '../../../lib/redis'
import {
    respondMethodNotAllowed,
    respondBadRequest,
    respondSuccess,
    respondInternalError,
    type ApiErrorResponse,
    type ApiSuccessResponse,
} from '../../../lib/api-response'

const redis = getRedis()

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
        const assets = await prisma.asset.findMany({
            select: { id: true, symbol: true, name: true, coingeckoId: true },
        })

        const list: Array<{ symbol: string; name: string; amount: string }> = []
        // Upstash는 멀티 GET 파이프라인이 없어서 단건 루프 사용
        if (redis) {
            for (const a of assets) {
                try {
                    const bal = await redis.get<string>(`bal:${userId}:${a.id}`)
                    if (!bal || bal === '0' || bal === '0.000000000000000000') continue
                    list.push({ symbol: a.symbol, name: a.name, amount: bal })
                } catch {
                    // Redis 오류 시 해당 항목 스킵
                }
            }
        }

        respondSuccess(res, { userId, holdings: list })
    } catch (error) {
        console.error('Portfolio error:', error)
        respondInternalError(res, '포트폴리오 조회 중 오류가 발생했습니다')
    }
}
