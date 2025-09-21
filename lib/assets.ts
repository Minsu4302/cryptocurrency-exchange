// lib/assets.ts
import prisma from './prisma'

export async function getAssetIdOrThrow(symbolRaw: string) {
    const symbol = symbolRaw.toLowerCase()
    const asset = await prisma.asset.findFirst({ where: { symbol } })
    if (!asset) {
        throw new Error(`Unknown asset symbol: ${symbol}`)
    }
    return asset.id
}
