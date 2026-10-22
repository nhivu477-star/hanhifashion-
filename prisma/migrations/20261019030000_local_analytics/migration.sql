-- CreateTable
CREATE TABLE "VisitorSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "keyHash" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'direct',
    "medium" TEXT NOT NULL DEFAULT '',
    "campaign" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "term" TEXT NOT NULL DEFAULT ''
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventKey" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "productId" TEXT,
    "authenticated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    CONSTRAINT "AnalyticsEvent_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "VisitorSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CartAnalyticsCycle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cartId" TEXT NOT NULL,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderId" TEXT,
    "convertedAt" DATETIME,
    "snapshotJson" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "CartAnalyticsCycle_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CartAnalyticsCycle_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderAttribution" (
    "orderId" TEXT NOT NULL PRIMARY KEY,
    "visitorId" TEXT,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "medium" TEXT NOT NULL,
    "campaign" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    CONSTRAINT "OrderAttribution_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrderAttribution_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "VisitorSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductCostHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "unitCost" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "effectiveFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductCostHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProductCostHistory_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderLineAnalytics" (
    "orderItemId" TEXT NOT NULL PRIMARY KEY,
    "netAmount" INTEGER NOT NULL,
    "unitCost" INTEGER,
    "costSource" TEXT,
    "costCapturedAt" DATETIME,
    CONSTRAINT "OrderLineAnalytics_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "VisitorSession_keyHash_key" ON "VisitorSession"("keyHash");

-- CreateIndex
CREATE INDEX "VisitorSession_startedAt_idx" ON "VisitorSession"("startedAt");

-- CreateIndex
CREATE INDEX "VisitorSession_expiresAt_idx" ON "VisitorSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsEvent_eventKey_key" ON "AnalyticsEvent"("eventKey");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_visitorId_type_createdAt_idx" ON "AnalyticsEvent"("visitorId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_type_createdAt_idx" ON "AnalyticsEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_productId_createdAt_idx" ON "AnalyticsEvent"("productId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CartAnalyticsCycle_orderId_key" ON "CartAnalyticsCycle"("orderId");

-- CreateIndex
CREATE INDEX "CartAnalyticsCycle_firstSeenAt_lastActivityAt_idx" ON "CartAnalyticsCycle"("firstSeenAt", "lastActivityAt");

-- CreateIndex
CREATE INDEX "CartAnalyticsCycle_cartId_orderId_idx" ON "CartAnalyticsCycle"("cartId", "orderId");

-- CreateIndex
CREATE INDEX "OrderAttribution_source_campaign_idx" ON "OrderAttribution"("source", "campaign");

-- CreateIndex
CREATE INDEX "ProductCostHistory_productId_variantId_effectiveFrom_idx" ON "ProductCostHistory"("productId", "variantId", "effectiveFrom");


-- Only one live cohort per cart; conversion retains its immutable cohort.
CREATE UNIQUE INDEX "CartAnalyticsCycle_one_open" ON "CartAnalyticsCycle"("cartId") WHERE "orderId" IS NULL;
CREATE INDEX "OrderItem_orderId_analytics_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_productId_analytics_idx" ON "OrderItem"("productId");
CREATE INDEX "MockRefund_orderId_status_analytics_idx" ON "MockRefund"("orderId", "status");
