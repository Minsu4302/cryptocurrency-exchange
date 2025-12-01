import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { verifyToken } from '../../../lib/auth'
import Prisma from '@prisma/client'
import {
    respondMethodNotAllowed,
    respondBadRequest,
    respondUnauthorized,
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

    // 인증 확인
    const authHeader = req.headers.authorization
    const cookieTokenCandidates = [
        req.cookies?.token,
        req.cookies?.accessToken,
        req.cookies?.access_token,
    ].filter((t): t is string => typeof t === 'string' && t.length > 0)

    let token: string | undefined
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1]
    } else if (cookieTokenCandidates.length > 0) {
        token = cookieTokenCandidates[0]
    }

    if (!token) {
        respondUnauthorized(res, '인증이 필요합니다')
        return
    }

    let senderId: number
    try {
        const decoded = verifyToken(token)
        senderId = decoded.userId
    } catch {
        respondUnauthorized(res, '유효하지 않은 토큰입니다')
        return
    }

    const { receiverEmail, symbol, amount } = req.body ?? {}

    if (!receiverEmail || !symbol || !amount) {
        respondBadRequest(res, '수신자 이메일, 자산 종류, 수량이 필요합니다')
        return
    }

    const parsedAmount = parseFloat(String(amount))
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        respondBadRequest(res, '올바른 수량을 입력하세요')
        return
    }

    try {
        // 트랜잭션으로 송금 처리
        const result = await prisma.$transaction(async (tx) => {
            // 1) 수신자 확인
            const receiver = await tx.user.findUnique({
                where: { email: receiverEmail },
                select: { id: true, email: true }
            })

            if (!receiver) {
                throw new Error('RECEIVER_NOT_FOUND')
            }

            if (receiver.id === senderId) {
                throw new Error('SELF_TRANSFER')
            }

            // 2) 송신자 보유량 확인
            const senderHolding = await tx.holding.findFirst({
                where: { userId: senderId, symbol }
            })

            if (!senderHolding || senderHolding.amount < parsedAmount) {
                throw new Error('INSUFFICIENT_BALANCE')
            }

            // 3) 송신자 차감
            const newSenderAmount = senderHolding.amount - parsedAmount
            await tx.holding.update({
                where: { id: senderHolding.id },
                data: { amount: newSenderAmount }
            })

            // 4) 수신자 증가
            const receiverHolding = await tx.holding.findFirst({
                where: { userId: receiver.id, symbol }
            })

            if (receiverHolding) {
                const newReceiverAmount = receiverHolding.amount + parsedAmount
                await tx.holding.update({
                    where: { id: receiverHolding.id },
                    data: { amount: newReceiverAmount }
                })
            } else {
                await tx.holding.create({
                    data: {
                        userId: receiver.id,
                        symbol,
                        amount: parsedAmount
                    }
                })
            }

            // 5) Transfer 기록 생성
            const asset = await tx.asset.findFirst({
                where: { 
                    symbol: {
                        equals: symbol,
                        mode: 'insensitive'
                    }
                },
                select: { id: true }
            })

            if (asset) {
                // 송신자 출금 기록
                await tx.transfer.create({
                    data: {
                        userId: senderId,
                        assetId: asset.id,
                        type: 'WITHDRAWAL',
                        status: 'SUCCESS',
                        amount: parsedAmount,
                        address: receiverEmail,
                        requestedAt: new Date(),
                        processedAt: new Date()
                    }
                })

                // 수신자 입금 기록
                await tx.transfer.create({
                    data: {
                        userId: receiver.id,
                        assetId: asset.id,
                        type: 'DEPOSIT',
                        status: 'SUCCESS',
                        amount: parsedAmount,
                        address: null,
                        requestedAt: new Date(),
                        processedAt: new Date()
                    }
                })
            }

            return { receiver, amount: parsedAmount, symbol }
        }, {
            timeout: 10000,
            isolationLevel: Prisma.Prisma.TransactionIsolationLevel.Serializable
        })

        respondSuccess(res, {
            success: true,
            transfer: {
                to: result.receiver.email,
                symbol: result.symbol,
                amount: result.amount
            }
        })
    } catch (error: unknown) {
        console.error('Transfer send error:', error)
        
        const errorMessage = error instanceof Error ? error.message : 'UNKNOWN'
        
        if (errorMessage === 'RECEIVER_NOT_FOUND') {
            respondBadRequest(res, '수신자를 찾을 수 없습니다')
        } else if (errorMessage === 'SELF_TRANSFER') {
            respondBadRequest(res, '자기 자신에게는 전송할 수 없습니다')
        } else if (errorMessage === 'INSUFFICIENT_BALANCE') {
            respondBadRequest(res, '보유량이 부족합니다')
        } else {
            respondInternalError(res, '전송 중 오류가 발생했습니다')
        }
    }
}
