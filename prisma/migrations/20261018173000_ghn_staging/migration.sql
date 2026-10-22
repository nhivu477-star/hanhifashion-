-- AlterTable
ALTER TABLE "ShipmentEvent" ADD COLUMN "disposition" TEXT;
ALTER TABLE "ShipmentEvent" ADD COLUMN "providerEventKey" TEXT;
ALTER TABLE "ShipmentEvent" ADD COLUMN "providerEventType" TEXT;
ALTER TABLE "ShipmentEvent" ADD COLUMN "providerPayload" TEXT;
ALTER TABLE "ShipmentEvent" ADD COLUMN "providerStatus" TEXT;
ALTER TABLE "ShipmentEvent" ADD COLUMN "providerTimestamp" DATETIME;

-- Additive compatibility fields retained from discontinued Phase 2B. No table rebuild.
ALTER TABLE "Shipment" ADD COLUMN "lengthCm" INTEGER;
ALTER TABLE "Shipment" ADD COLUMN "widthCm" INTEGER;
ALTER TABLE "Shipment" ADD COLUMN "heightCm" INTEGER;
ALTER TABLE "Shipment" ADD COLUMN "insuredValue" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Shipment" ADD COLUMN "providerClientRef" TEXT;
ALTER TABLE "Shipment" ADD COLUMN "providerShopId" INTEGER;
ALTER TABLE "Shipment" ADD COLUMN "providerCode" TEXT;
ALTER TABLE "Shipment" ADD COLUMN "providerSyncStatus" TEXT NOT NULL DEFAULT 'NOT_SUBMITTED';
ALTER TABLE "Shipment" ADD COLUMN "providerVerification" TEXT NOT NULL DEFAULT 'UNVERIFIED';
ALTER TABLE "Shipment" ADD COLUMN "providerSubmittedAt" DATETIME;
ALTER TABLE "Shipment" ADD COLUMN "providerLastSyncedAt" DATETIME;
ALTER TABLE "Shipment" ADD COLUMN "providerLastEventAt" DATETIME;
ALTER TABLE "Shipment" ADD COLUMN "providerCorrelationId" TEXT;
ALTER TABLE "Shipment" ADD COLUMN "providerRequestDigest" TEXT;
ALTER TABLE "Shipment" ADD COLUMN "providerErrorCode" TEXT;
ALTER TABLE "Shipment" ADD COLUMN "providerErrorAt" DATETIME;

CREATE UNIQUE INDEX "Shipment_providerClientRef_key" ON "Shipment"("providerClientRef");
CREATE UNIQUE INDEX "Shipment_providerCode_key" ON "Shipment"("providerCode");
CREATE UNIQUE INDEX "ShipmentEvent_providerEventKey_key" ON "ShipmentEvent"("providerEventKey");
