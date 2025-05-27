// pages/api/me.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'
import { verifyToken } from '../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' })
    }

    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: '토큰이 없습니다.' })
    }

    const token = authHeader.split(' ')[1]

    try {
        const decoded = verifyToken(token)

        const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
            id: true,
            email: true,
            createdAt: true,
        },
        })

        if (!user) {
        return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' })
        }

        return res.status(200).json({ user })
    } catch (error: any) {
        console.error('토큰 검증 실패:', error.message)
        return res.status(401).json({ message: '유효하지 않은 토큰입니다.' })
    }
}
