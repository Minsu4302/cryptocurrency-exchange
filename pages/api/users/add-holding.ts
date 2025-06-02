import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { userId, symbol, amount } = req.body;
    if (!userId || !symbol || !amount || amount <= 0) {
        return res.status(400).json({ error: "입력값 오류" });
    }

    const existing = await prisma.holding.findFirst({ where: { userId, symbol } });

    if (existing) {
        const updated = await prisma.holding.update({
        where: { id: existing.id },
        data: { amount: { increment: amount } }
        });
        return res.status(200).json(updated);
    }

    const created = await prisma.holding.create({
        data: { userId, symbol, amount }
    });

    return res.status(201).json(created);
}
