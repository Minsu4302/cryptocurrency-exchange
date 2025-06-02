// src/types/bcrypto.d.ts

declare module 'bcrypto' {
    import { Buffer } from 'buffer';

    export function randomBytes(size: number): Buffer;

    export function sha256(data: Buffer | string): Buffer;
    export function sha512(data: Buffer | string): Buffer;

    export const SHA256: {
        new (): {
        init(): void;
        update(data: Buffer | string): void;
        final(): Buffer;
        };
    };

    export const SHA512: {
        new (): {
        init(): void;
        update(data: Buffer | string): void;
        final(): Buffer;
        };
    };

  // 필요한 함수 추가 가능
}
