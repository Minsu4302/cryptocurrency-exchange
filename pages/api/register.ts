// pages/api/register.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import prisma from '../../lib/prisma'
import {
    respondMethodNotAllowed,
    respondBadRequest,
    respondConflict,
    respondSuccess,
    respondInternalError,
    type ApiErrorResponse,
    type ApiSuccessResponse,
} from '../../lib/api-response'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiErrorResponse | ApiSuccessResponse>
) {
    if (req.method !== 'POST') {
        respondMethodNotAllowed(res, ['POST'])
        return
    }

    const { email, password } = req.body

    if (!email || !password) {
        respondBadRequest(res, '이메일과 비밀번호를 모두 입력하세요')
        return
    }

    if (password.length < 6) {
        respondBadRequest(res, '비밀번호는 6자 이상이어야 합니다')
        return
    }

    try {
        const existingUser = await prisma.user.findUnique({
            where: { email },
        })

        if (existingUser) {
            respondConflict(res, '이미 존재하는 이메일입니다')
            return
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                balance: 10000000, // 초기 잔액 10000000으로 설정
            },
        })

        respondSuccess(res, { userId: newUser.id, email: newUser.email }, 201)
    } catch (error) {
        console.error('회원가입 오류:', error)
        respondInternalError(res, '회원가입 중 오류가 발생했습니다')
    }
}