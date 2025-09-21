// /lib/sanitize.ts
'use client';

import DOMPurify from 'dompurify';

/**
 * 클라이언트 전용 sanitize 유틸.
 * SSR 환경에선 원문을 그대로 반환하고, 브라우저에선 DOMPurify로 정화.
 */
export function sanitize(html: string | undefined | null): string {
    if (typeof window === 'undefined') {
        // 서버 사이드에서는 렌더링하지 않음(클라에서 다시 sanitize됨)
        return html ?? '';
    }
    return DOMPurify.sanitize(html ?? '');
}
