-- CreateTable
CREATE TABLE "public"."IdempotencyKey" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_key_key" ON "public"."IdempotencyKey"("key");

-- CreateIndex
CREATE INDEX "IdempotencyKey_userId_purpose_idx" ON "public"."IdempotencyKey"("userId", "purpose");
