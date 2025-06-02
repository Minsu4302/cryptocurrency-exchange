import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma"; // Prisma Client 인스턴스
import { z, ZodError } from "zod";

const SellOrderSchema = z.object({
    userId: z.coerce.number().int(),
    symbol: z.string().toLowerCase(),
    orderType: z.enum(["market", "limit"]),
    amount: z.coerce.number().positive(),
    limitPrice: z.coerce.number().positive().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

    try {
        const parsed = SellOrderSchema.parse(req.body);
        const { userId, symbol, orderType, amount, limitPrice } = parsed;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ error: "사용자 없음" });

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

        const holding = await prisma.holding.findFirst({
            where: { userId, symbol },
        });

        if (!holding || holding.amount < amount) {
            return res.status(400).json({ error: "보유 수량 부족", required: amount, current: holding?.amount || 0 });
        }

        const totalGain = price * amount;

        const result = await prisma.$transaction(async (tx) => {
            await tx.holding.update({
                where: { id: holding.id },
                data: { amount: { decrement: amount } },
            });

            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: { balance: { increment: totalGain } },
            });

            return updatedUser.balance;
        });

        return res.status(200).json({
            status: "success",
            symbol,
            amount,
            price,
            totalGain,
            newBalance: result,
        });

    } catch (err) {
        if (err instanceof ZodError) {
            return res.status(400).json({ error: "입력값 오류", details: err.errors });
        }
        console.error(err);
        return res.status(500).json({ error: "서버 오류" });
    }
}
