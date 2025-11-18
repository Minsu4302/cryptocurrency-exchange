// lib/api-response.ts
import type { NextApiResponse } from 'next'

export type ApiErrorResponse = {
    error: string
    message?: string
}

export type ApiSuccessResponse<T = any> = {
    ok: true
    data?: T
} & Record<string, any>

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * 표준화된 에러 응답 (응답 전송)
 */
export function respondError(
    res: NextApiResponse<ApiErrorResponse>,
    statusCode: number,
    errorCode: string,
    message?: string
): void {
    const response: ApiErrorResponse = { error: errorCode }
    if (message) {
        response.message = message
    }
    res.status(statusCode).json(response)
}

/**
 * 표준화된 성공 응답 (응답 전송)
 */
export function respondSuccess<T = any>(
    res: NextApiResponse<ApiSuccessResponse<T>>,
    data?: T,
    statusCode = 200
): void {
    const response: ApiSuccessResponse<T> = { ok: true }
    if (data !== undefined) {
        response.data = data
    }
    res.status(statusCode).json(response)
}

/**
 * 405 Method Not Allowed (Allow 헤더 포함)
 */
export function respondMethodNotAllowed(
    res: NextApiResponse<ApiErrorResponse>,
    allowed: string[] = []
): void {
    if (allowed.length > 0) {
        res.setHeader('Allow', allowed.join(', '))
    }
    respondError(res, 405, 'method_not_allowed', 'Method Not Allowed')
}

/**
 * 400 Bad Request
 */
export function respondBadRequest(
    res: NextApiResponse<ApiErrorResponse>,
    message: string
): void {
    respondError(res, 400, 'bad_request', message)
}

/**
 * 401 Unauthorized
 */
export function respondUnauthorized(
    res: NextApiResponse<ApiErrorResponse>,
    message = 'Unauthorized'
): void {
    respondError(res, 401, 'unauthorized', message)
}

/**
 * 403 Forbidden
 */
export function respondForbidden(
    res: NextApiResponse<ApiErrorResponse>,
    message = 'Forbidden'
): void {
    respondError(res, 403, 'forbidden', message)
}

/**
 * 404 Not Found
 */
export function respondNotFound(
    res: NextApiResponse<ApiErrorResponse>,
    message = 'Not Found'
): void {
    respondError(res, 404, 'not_found', message)
}

/**
 * 409 Conflict
 */
export function respondConflict(
    res: NextApiResponse<ApiErrorResponse>,
    message: string
): void {
    respondError(res, 409, 'conflict', message)
}

/**
 * 429 Too Many Requests
 */
export function respondRateLimited(
    res: NextApiResponse<ApiErrorResponse>,
    retryAfterSec: number
): void {
    res.setHeader('Retry-After', String(retryAfterSec))
    respondError(res, 429, 'rate_limited', 'Too Many Requests')
}

/**
 * 500 Internal Server Error
 */
export function respondInternalError(
    res: NextApiResponse<ApiErrorResponse>,
    message = 'Internal Server Error'
): void {
    respondError(res, 500, 'internal_error', message)
}
