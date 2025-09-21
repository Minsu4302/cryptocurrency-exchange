-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DELISTED');

-- CreateEnum
CREATE TYPE "TradeSide" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "TransferType" AS ENUM ('DEPOSIT', 'WITHDRAWAL');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'PENDING', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "MessageAuthor" AS ENUM ('USER', 'ADMIN');

-- CreateTable
CREATE TABLE "Asset" (
    "id" SERIAL NOT NULL,
    "coingeckoId" TEXT,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "precision" INTEGER NOT NULL DEFAULT 18,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "assetId" INTEGER NOT NULL,
    "side" "TradeSide" NOT NULL,
    "quantity" DECIMAL(38,18) NOT NULL,
    "price" DECIMAL(38,18) NOT NULL,
    "fee" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "feeCurrency" TEXT NOT NULL DEFAULT 'KRW',
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priceSource" TEXT NOT NULL DEFAULT 'coingecko',
    "priceAsOf" TIMESTAMP(3) NOT NULL,
    "orderId" TEXT,
    "externalRef" TEXT,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transfer" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "TransferType" NOT NULL,
    "status" "TransferStatus" NOT NULL,
    "assetId" INTEGER NOT NULL,
    "amount" DECIMAL(38,18) NOT NULL,
    "fee" DECIMAL(38,18),
    "network" TEXT,
    "address" TEXT,
    "txId" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BalanceSnapshot" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "assetId" INTEGER NOT NULL,
    "amount" DECIMAL(38,18) NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BalanceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketMessage" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorType" "MessageAuthor" NOT NULL DEFAULT 'USER',
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Asset_coingeckoId_key" ON "Asset"("coingeckoId");

-- CreateIndex
CREATE INDEX "Asset_symbol_idx" ON "Asset"("symbol");

-- CreateIndex
CREATE INDEX "Trade_userId_executedAt_idx" ON "Trade"("userId", "executedAt");

-- CreateIndex
CREATE INDEX "Trade_assetId_executedAt_idx" ON "Trade"("assetId", "executedAt");

-- CreateIndex
CREATE INDEX "Transfer_userId_requestedAt_idx" ON "Transfer"("userId", "requestedAt");

-- CreateIndex
CREATE INDEX "Transfer_assetId_requestedAt_idx" ON "Transfer"("assetId", "requestedAt");

-- CreateIndex
CREATE INDEX "Transfer_type_status_idx" ON "Transfer"("type", "status");

-- CreateIndex
CREATE INDEX "BalanceSnapshot_userId_takenAt_idx" ON "BalanceSnapshot"("userId", "takenAt");

-- CreateIndex
CREATE UNIQUE INDEX "BalanceSnapshot_userId_assetId_takenAt_key" ON "BalanceSnapshot"("userId", "assetId", "takenAt");

-- CreateIndex
CREATE INDEX "Holding_userId_symbol_idx" ON "Holding"("userId", "symbol");

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceSnapshot" ADD CONSTRAINT "BalanceSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceSnapshot" ADD CONSTRAINT "BalanceSnapshot_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
