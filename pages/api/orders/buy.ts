import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma"; // Prisma Client 인스턴스
import { z, ZodError } from "zod";

// 입력값 스키마 정의
const BuyOrderSchema = z.object({
    userId: z.coerce.number().int(), // 문자열 숫자도 int로 자동 변환
    symbol: z.string().toLowerCase(),
    orderType: z.enum(["market", "limit"]),
    amount: z.coerce.number().positive(),         // ← 변경됨
    limitPrice: z.coerce.number().positive().optional() // ← 변경됨
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        const parsed = BuyOrderSchema.parse(req.body);
        const { userId, symbol, orderType, amount, limitPrice } = parsed;

        // 사용자 확인
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ error: "사용자 없음" });

        // 가격 결정
        let price: number;
        if (orderType === "market") {
        const latestPrice = await prisma.price.findFirst({
            where: { symbol },
            orderBy: { fetchedAt: "desc" },
        });
        if (!latestPrice) return res.status(400).json({ error: "가격 정보 없음" });
        price = latestPrice.price;
        } else {
        if (!limitPrice) return res.status(400).json({ error: "지정가 주문에 limitPrice 필요" });
        price = limitPrice;
        }

        const totalCost = price * amount;
        if (user.balance < totalCost) {
        return res.status(400).json({ error: "잔고 부족", required: totalCost, current: user.balance });
        }

        // 트랜잭션으로 매수 처리
        const result = await prisma.$transaction(async (tx) => {
        // 잔고 차감
        const updatedUser = await tx.user.update({
            where: { id: userId },
            data: {
            balance: { decrement: totalCost },
            },
        });

        // 기존 보유 코인 조회
        const holding = await tx.holding.findFirst({
            where: { userId, symbol },
        });

        if (holding) {
            await tx.holding.update({
            where: { id: holding.id },
            data: {
                amount: { increment: amount },
            },
            });
        } else {
            await tx.holding.create({
            data: {
                userId,
                symbol,
                amount,
            },
            });
        }

        return updatedUser.balance;
        });

        return res.status(200).json({
        status: "success",
        symbol,
        amount,
        price,
        totalCost,
        newBalance: result,
        });
    } catch (err: unknown) {
        if (err instanceof ZodError) {
            return res.status(400).json({ error: "입력값 오류", details: err.errors });
        }

        console.error(err);
        return res.status(500).json({ error: "서버 오류" });
    }
}
