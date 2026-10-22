-- Additive only: preserve all existing vouchers and order snapshots.
ALTER TABLE "Coupon" ADD COLUMN "startsAt" DATETIME;
ALTER TABLE "OrderItem" ADD COLUMN "originalQuantity" INTEGER;
ALTER TABLE "Inquiry" ADD COLUMN "userId" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Inquiry_userId_createdAt_idx" ON "Inquiry"("userId", "createdAt");
