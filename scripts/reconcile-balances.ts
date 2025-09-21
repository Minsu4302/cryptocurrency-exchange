// scripts/reconcile-balances.ts
import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local', override: true })
import prisma from '../lib/prisma'
import { getRedis } from '../lib/redis'
import { Prisma } from '@prisma/client'

const redis = getRedis()   // ✅ 여기서 최초 생성

function toFixed18(d: Prisma.Decimal) {
    const s = d.toFixed(18)
    return s.includes('-0.000000000000000000') ? '0.000000000000000000' : s
}

async function sumLedger(userId: number, assetId: number) {
    // Trade 누적
    const trades = await prisma.trade.findMany({
        where: { userId, assetId },
        select: { side: true, quantity: true },
    })
    let qty = new Prisma.Decimal(0)
    for (const t of trades) {
        qty = t.side === 'BUY'
            ? qty.add(t.quantity)
            : qty.sub(t.quantity)
    }

    // Transfer 누적 (SUCCESS만)
    const transfers = await prisma.transfer.findMany({
        where: { userId, assetId, status: 'SUCCESS' },
        select: { type: true, amount: true },
    })
    let tf = new Prisma.Decimal(0)
    for (const tr of transfers) {
        tf = tr.type === 'DEPOSIT'
            ? tf.add(tr.amount)
            : tf.sub(tr.amount)
    }

    return qty.add(tf)
}

async function reconcileAll() {
    const users = await prisma.user.findMany({ select: { id: true } })
    const assets = await prisma.asset.findMany({ select: { id: true, symbol: true } })

    let fixed = 0
    for (const u of users) {
        for (const a of assets) {
            const expected = await sumLedger(u.id, a.id)
            const key = `bal:${u.id}:${a.id}`
            const cur = (await redis.get<string>(key)) ?? '0.000000000000000000'
            const curD = new Prisma.Decimal(cur)

            if (!expected.eq(curD)) {
                await redis.set(key, toFixed18(expected))
                fixed++
                // 운영 시 로깅: user, asset, 이전값→보정값
                // console.warn(`[reconcile] user=${u.id} asset=${a.id} ${cur} -> ${toFixed18(expected)}`)
            }
        }
    }
    console.log(`✅ reconcile 완료. 보정건수=${fixed}`)
}

reconcileAll()
    .catch((e) => {
        console.error('reconcile 실패', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
