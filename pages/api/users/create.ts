// capstone_design/pages/api/users/create.ts

import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma";
import bcrypt from "bcrypt";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { email, password, initialBalance } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "email, password는 필수입니다" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        return res.status(409).json({ error: "이미 존재하는 사용자입니다" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
        email,
        password: hashedPassword,
        balance: initialBalance ?? 1000000  // 기본 잔고 100만원
        }
    });

    return res.status(201).json({ userId: user.id, email: user.email, balance: user.balance });
}
