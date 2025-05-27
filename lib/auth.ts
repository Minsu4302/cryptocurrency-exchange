// lib/auth.ts
import * as jwt from 'jsonwebtoken'

export interface AuthPayload {
    userId: number
    email: string
}

export function verifyToken(token: string): AuthPayload {
    const secret = process.env.JWT_SECRET
    if (!secret) {
        throw new Error('JWT_SECRET이 설정되지 않았습니다.')
    }

    return jwt.verify(token, secret) as AuthPayload
}
