/*
  Warnings:

  - Added the required column `orderType` to the `Trade` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."OrderType" AS ENUM ('MARKET', 'LIMIT');

-- AlterTable
ALTER TABLE "public"."Trade" ADD COLUMN     "orderType" "public"."OrderType" NOT NULL,
ALTER COLUMN "fee" DROP DEFAULT,
ALTER COLUMN "executedAt" DROP DEFAULT;
