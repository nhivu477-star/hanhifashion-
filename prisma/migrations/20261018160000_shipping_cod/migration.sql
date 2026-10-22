-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'LOCAL_MANUAL',
    "carrierReference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "shippingFee" INTEGER NOT NULL,
    "expectedCOD" INTEGER NOT NULL,
    "collectedCOD" INTEGER NOT NULL DEFAULT 0,
    "remittedCOD" INTEGER NOT NULL DEFAULT 0,
    "outstandingCOD" INTEGER NOT NULL DEFAULT 0,
    "reconciliationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "reconciledAt" DATETIME,
    "reconciledBy" TEXT,
    "reconciliationNote" TEXT,
    "discrepancyNote" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "recipientName" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "recipientAddress" TEXT NOT NULL,
    "parcelDescription" TEXT NOT NULL,
    "weightGrams" INTEGER NOT NULL,
    "parcelCount" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Shipment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShipmentEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shipmentId" TEXT NOT NULL,
    "previousStatus" TEXT,
    "status" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'LOCAL_MANUAL',
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShipmentEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeliveryAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shipmentId" TEXT NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeliveryAttempt_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CODCollection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shipmentId" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "evidence" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL,
    "actorId" TEXT NOT NULL,
    "correctsId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CODCollection_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CODCollection_correctsId_fkey" FOREIGN KEY ("correctsId") REFERENCES "CODCollection" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CODRemittance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shipmentId" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "evidence" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL,
    "actorId" TEXT NOT NULL,
    "correctsId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CODRemittance_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CODRemittance_correctsId_fkey" FOREIGN KEY ("correctsId") REFERENCES "CODRemittance" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CODReconciliation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shipmentId" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previousStatus" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "expected" INTEGER NOT NULL,
    "collected" INTEGER NOT NULL,
    "remitted" INTEGER NOT NULL,
    "outstanding" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CODReconciliation_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_orderId_key" ON "Shipment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_paymentId_key" ON "Shipment"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_reference_key" ON "Shipment"("reference");

-- CreateIndex
CREATE INDEX "Shipment_status_createdAt_idx" ON "Shipment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Shipment_reconciliationStatus_createdAt_idx" ON "Shipment"("reconciliationStatus", "createdAt");

-- CreateIndex
CREATE INDEX "ShipmentEvent_shipmentId_createdAt_idx" ON "ShipmentEvent"("shipmentId", "createdAt");

-- CreateIndex
CREATE INDEX "DeliveryAttempt_shipmentId_createdAt_idx" ON "DeliveryAttempt"("shipmentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CODCollection_eventKey_key" ON "CODCollection"("eventKey");

-- CreateIndex
CREATE INDEX "CODCollection_shipmentId_occurredAt_idx" ON "CODCollection"("shipmentId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "CODCollection_provider_reference_key" ON "CODCollection"("provider", "reference");

-- CreateIndex
CREATE UNIQUE INDEX "CODRemittance_eventKey_key" ON "CODRemittance"("eventKey");

-- CreateIndex
CREATE INDEX "CODRemittance_shipmentId_occurredAt_idx" ON "CODRemittance"("shipmentId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "CODRemittance_provider_reference_key" ON "CODRemittance"("provider", "reference");

-- CreateIndex
CREATE UNIQUE INDEX "CODReconciliation_eventKey_key" ON "CODReconciliation"("eventKey");

-- CreateIndex
CREATE INDEX "CODReconciliation_shipmentId_createdAt_idx" ON "CODReconciliation"("shipmentId", "createdAt");

