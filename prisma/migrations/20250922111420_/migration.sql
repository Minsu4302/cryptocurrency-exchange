/*
  Warnings:

  - You are about to drop the column `purpose` on the `IdempotencyKey` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "IdemStatus" AS ENUM ('PROCESSING', 'DONE');

-- DropIndex
DROP INDEX "IdempotencyKey_key_key";

-- DropIndex
DROP INDEX "IdempotencyKey_userId_purpose_idx";

-- AlterTable
ALTER TABLE "IdempotencyKey" DROP COLUMN "purpose",
ADD COLUMN     "response" JSONB,
ADD COLUMN     "status" "IdemStatus" NOT NULL DEFAULT 'PROCESSING';
