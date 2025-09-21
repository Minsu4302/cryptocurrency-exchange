// lib/wallet.ts
import { Prisma } from '@prisma/client'
import { getRedis } from '../lib/redis'

const redis = getRedis()

function toFixed18(d: Prisma.Decimal) {
    const s = d.toFixed(18)
    return s.includes('-0.000000000000000000') ? '0.000000000000000000' : s
}

/**
 * 사용자 잔고 증감
 * @param sign +1(증가) / -1(감소)
 */
export async function incrUserAssetBalance(
    userId: number,
    assetId: number,
    quantity: string,
    sign: 1 | -1
) {
    const key = `bal:${userId}:${assetId}`

    const curStr = (await redis.get<string>(key)) ?? '0.000000000000000000'
    const cur = new Prisma.Decimal(curStr)
    const q = new Prisma.Decimal(quantity)
    const next = sign === 1 ? cur.add(q) : cur.sub(q)

    await redis.set(key, toFixed18(next))
    return toFixed18(next)
}
