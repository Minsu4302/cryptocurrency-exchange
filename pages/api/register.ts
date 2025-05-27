// pages/api/register.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
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
        const existingUser = await prisma.user.findUnique({
        where: { email },
        })

        if (existingUser) {
        return res.status(409).json({ message: '이미 존재하는 이메일입니다' })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const newUser = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
        },
        })

        return res.status(201).json({ message: '회원가입 성공', userId: newUser.id })
    } catch (error) {
        console.error(error)
        return res.status(500).json({ message: '서버 오류' })
    }
}
