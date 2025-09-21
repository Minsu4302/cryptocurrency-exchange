-- CreateIndex
CREATE INDEX "SupportTicket_userId_updatedAt_idx" ON "public"."SupportTicket"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "SupportTicket_status_updatedAt_idx" ON "public"."SupportTicket"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "TicketMessage_ticketId_createdAt_idx" ON "public"."TicketMessage"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "Trade_orderId_idx" ON "public"."Trade"("orderId");

-- CreateIndex
CREATE INDEX "Transfer_txId_idx" ON "public"."Transfer"("txId");
