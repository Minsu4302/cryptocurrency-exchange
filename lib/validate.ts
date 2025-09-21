// lib/validate.ts
import { z } from 'zod'

export function parseBody<T extends z.ZodTypeAny>(schema: T, body: unknown) {
    const result = schema.safeParse(body)
    if (!result.success) {
        const message = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')
        const err = new Error(`invalid_input: ${message}`)
        ;(err as any).statusCode = 400
        throw err
    }
    return result.data as z.infer<T>
}
