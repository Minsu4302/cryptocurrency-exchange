// pages/api/login.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../../lib/prisma'
import {
    respondMethodNotAllowed,
    respondBadRequest,
    respondUnauthorized,
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

    try {
        const user = await prisma.user.findUnique({ where: { email } })

        if (!user) {
            respondUnauthorized(res, '존재하지 않는 사용자입니다')
            return
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
            respondUnauthorized(res, '비밀번호가 일치하지 않습니다')
            return
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET!,
            { expiresIn: '1h' }
        )

        respondSuccess(res, { token, email: user.email, balance: Number(user.balance ?? 0) })
    } catch (error) {
        console.error('로그인 오류:', error)
        respondInternalError(res, '서버 오류가 발생했습니다')
    }
}
