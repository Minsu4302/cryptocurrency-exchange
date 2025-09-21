/*
  Warnings:

  - You are about to drop the `Price` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `coingeckoId` on table `Asset` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Asset" ALTER COLUMN "coingeckoId" SET NOT NULL;

-- DropTable
DROP TABLE "public"."Price";
