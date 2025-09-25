// pages/api/users/resolve-by-email.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method Not Allowed' });
        return;
    }

    try {
        const emailRaw = req.query.email;
        const email = Array.isArray(emailRaw) ? emailRaw[0] : emailRaw;
        if (!email || typeof email !== 'string') {
            res.status(400).json({ error: 'email is required' });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true }
        });

        if (!user) {
            res.status(404).json({ error: 'user_not_found' });
            return;
        }

        res.status(200).json({ ok: true, userId: user.id });
    } catch (e: any) {
        res.status(500).json({ error: e?.message ?? 'internal error' });
    }
}
