// pages/api/login.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' })
    }

    const { email, password } = req.body

    if (!email || !password) {
        return res.status(400).json({ message: '이메일과 비밀번호를 모두 입력하세요' })
    }

    try {
        const user = await prisma.user.findUnique({ where: { email } })

        if (!user) {
        return res.status(401).json({ message: '존재하지 않는 사용자입니다' })
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
        return res.status(401).json({ message: '비밀번호가 일치하지 않습니다' })
        }

        const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
        )

        return res.status(200).json({ message: '로그인 성공', token })
    } catch (error: unknown) {
        if (error instanceof Error) {
        console.error('로그인 오류:', error.message);
        return res.status(500).json({ message: '서버 오류', error: error.message });
        } else {
            console.error('알 수 없는 오류:', error);
            return res.status(500).json({ message: '서버 오류', error: '알 수 없는 오류' });
        }
    }
}
