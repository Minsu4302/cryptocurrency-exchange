import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { getRedis } from '../../../lib/redis'
import {
    respondMethodNotAllowed,
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

    try {
        await prisma.$queryRaw`SELECT 1`
        const redis = getRedis()
        const redisStatus = redis ? 'ok' : 'unavailable'
        if (redis) {
            try {
                await redis.set('health:ping', '1', { ex: 10 })
                const pong = await redis.get('health:ping')
                if (pong !== '1') {
                    throw new Error('Redis check failed')
                }
            } catch {
                // Redis는 선택사항이므로 실패해도 계속
            }
        }
        respondSuccess(res, { db: 'ok', redis: redisStatus })
    } catch (error) {
        console.error('Health check error:', error)
        respondInternalError(res, '헬스 체크 실패')
    }
}
