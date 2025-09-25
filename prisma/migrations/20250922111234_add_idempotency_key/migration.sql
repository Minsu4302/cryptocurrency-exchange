-- 1) 새 컬럼을 일단 NULL 허용으로 추가 (또는 임시 DEFAULT 포함)
ALTER TABLE "public"."IdempotencyKey" ADD COLUMN IF NOT EXISTS "scope" TEXT;
ALTER TABLE "public"."IdempotencyKey" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);

-- 2) 기존 데이터 백필
-- scope는 현재 사용중인 스코프가 'trade:create' 하나 뿐이라면 일괄 채워도 무방
UPDATE "public"."IdempotencyKey"
SET "scope" = COALESCE("scope", 'trade:create')
WHERE "scope" IS NULL;

-- updatedAt은 없던 값이면 createdAt으로 채우는 편이 이력상 자연스러움
UPDATE "public"."IdempotencyKey"
SET "updatedAt" = COALESCE("updatedAt", "createdAt")
WHERE "updatedAt" IS NULL;

-- 3) 이제 NOT NULL로 전환
ALTER TABLE "public"."IdempotencyKey" ALTER COLUMN "scope" SET NOT NULL;
ALTER TABLE "public"."IdempotencyKey" ALTER COLUMN "updatedAt" SET NOT NULL;

-- 4) @updatedAt은 Prisma가 write 시 자동 갱신하므로 DB default는 없어도 됨
--    다만 새 행 삽입시 안전하게 now() 기본값을 두고 싶다면 아래 사용(선택):
-- ALTER TABLE "public"."IdempotencyKey" ALTER COLUMN "updatedAt" SET DEFAULT NOW();

-- 5) 유니크 제약 조건 교체 (기존 unique 인덱스명은 환경마다 다름 → 존재시 드롭)
--    예: 과거가 @@unique([userId, key]) 였다면 인덱스명이 "IdempotencyKey_userId_key_key"일 수 있음
DROP INDEX IF EXISTS "IdempotencyKey_userId_key_key";
DROP INDEX IF EXISTS "IdempotencyKey_userId_key_idx";
-- 새 유니크 인덱스 생성 (Prisma가 생성할 이름과 다를 수 있으나 동작엔 문제 없음)
CREATE UNIQUE INDEX IF NOT EXISTS "IdempotencyKey_userId_scope_key_key"
ON "public"."IdempotencyKey"("userId","scope","key");

-- 6) createdAt 인덱스가 필요하면(Prisma schema에 @@index([createdAt]) 있다면) 보장
CREATE INDEX IF NOT EXISTS "IdempotencyKey_createdAt_idx"
ON "public"."IdempotencyKey"("createdAt");
