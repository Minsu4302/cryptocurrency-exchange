// pages/api/prices/update.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import type { Prisma } from '@prisma/client'

const COINS = ['bitcoin', 'ethereum']

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' })
    }

    try {
        const ids = COINS.join(',')
        const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=krw`
        )

        const data: Record<string, { krw: number }> = await response.json()

        const records: Prisma.PriceCreateManyInput[] = Object.entries(data).map(
        ([symbol, value]) => ({
            symbol,
            price: value.krw,
            currency: 'krw',
            source: 'coingecko',
        })
        )

        const saved = await prisma.price.createMany({
        data: records,
        })

        return res.status(200).json({
        message: '가격 저장 완료',
        count: saved.count,
        })
    } catch (error: unknown) {
        const err = error as Error;
        console.error('가격 저장 실패:', err.message);
        return res.status(500).json({ message: '서버 오류', error: err.message });
    }
}
