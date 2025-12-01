import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { getRedis, mgetStrings } from '../../../lib/redis'
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
        
        // 1) Redis에서 잔액 확인 (있으면 사용)
        if (redis) {
            const keys = assets.map((a) => `bal:${userId}:${a.id}`)
            const map = await mgetStrings(keys)
            assets.forEach((a) => {
                const bal = map[`bal:${userId}:${a.id}`]
                if (!bal || bal === '0' || bal === '0.000000000000000000') return
                list.push({ symbol: a.symbol, name: a.name, amount: bal })
            })
        }
        
        // 2) Redis에 데이터가 없으면 Prisma Holding 테이블에서 가져오기
        if (list.length === 0) {
            const holdings = await prisma.holding.findMany({
                where: { userId },
                select: { symbol: true, amount: true }
            })
            
            holdings.forEach((h) => {
                if (h.amount && h.amount !== '0') {
                    const asset = assets.find(a => a.symbol === h.symbol)
                    list.push({ 
                        symbol: h.symbol, 
                        name: asset?.name || h.symbol, 
                        amount: h.amount 
                    })
                }
            })
        }

        respondSuccess(res, { userId, holdings: list })
    } catch (error) {
        console.error('Portfolio error:', error)
        respondInternalError(res, '포트폴리오 조회 중 오류가 발생했습니다')
    }
}
