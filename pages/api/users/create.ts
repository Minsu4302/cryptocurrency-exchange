// capstone_design/pages/api/users/create.ts

import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import bcrypt from 'bcrypt'
import {
    respondMethodNotAllowed,
    respondBadRequest,
    respondConflict,
    respondSuccess,
    respondInternalError,
    type ApiErrorResponse,
    type ApiSuccessResponse,
} from '../../../lib/api-response'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiErrorResponse | ApiSuccessResponse>
) {
    if (req.method !== 'POST') {
        respondMethodNotAllowed(res, ['POST'])
        return
    }

    const { email, password, initialBalance } = req.body

    if (!email || !password) {
        respondBadRequest(res, '이메일과 비밀번호는 필수입니다')
        return
    }

    try {
        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) {
            respondConflict(res, '이미 존재하는 사용자입니다')
            return
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                balance: initialBalance ?? 1000000, // 기본 잔고 100만원
            },
        })

        respondSuccess(res, { userId: user.id, email: user.email, balance: user.balance }, 201)
    } catch (error) {
        console.error('User creation error:', error)
        respondInternalError(res, '사용자 생성 중 오류가 발생했습니다')
    }
}
