ALTER TABLE "Order" ADD COLUMN "shippingStatus" TEXT NOT NULL DEFAULT 'NOT_DISPATCHED';
ALTER TABLE "Order" ADD COLUMN "shippingReference" TEXT;
ALTER TABLE "OrderStatusHistory" ADD COLUMN "previousStatus" TEXT;
ALTER TABLE "OrderStatusHistory" ADD COLUMN "actorId" TEXT;
ALTER TABLE "OrderStatusHistory" ADD COLUMN "actorLabel" TEXT;
ALTER TABLE "OrderStatusHistory" ADD COLUMN "event" TEXT NOT NULL DEFAULT 'STATUS_CHANGE';
ALTER TABLE "Payment" ADD COLUMN "collectedAt" DATETIME;
ALTER TABLE "Payment" ADD COLUMN "collectedBy" TEXT;
ALTER TABLE "Payment" ADD COLUMN "collectionReference" TEXT;
ALTER TABLE "InventoryMovement" ADD COLUMN "orderId" TEXT;
ALTER TABLE "InventoryMovement" ADD COLUMN "actorId" TEXT;
-- Derived legacy shipping state only; no invented carrier/collection evidence.
UPDATE "Order" SET "shippingStatus" = CASE WHEN "status" = 'SHIPPING' THEN 'IN_TRANSIT' WHEN "status" IN ('DELIVERED','COMPLETED') THEN 'DELIVERED' ELSE 'NOT_DISPATCHED' END;
