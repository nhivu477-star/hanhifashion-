-- CreateTable
CREATE TABLE "ProductReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProductReview_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProductReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReviewReply" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reviewId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewReply_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "ProductReview" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReviewReply_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InquiryReply" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inquiryId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InquiryReply_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InquiryReply_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Stocktake" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "reason" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Stocktake_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StocktakeLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stocktakeId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "bookStock" INTEGER NOT NULL,
    "countedStock" INTEGER NOT NULL,
    "damagedStock" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "StocktakeLine_stocktakeId_fkey" FOREIGN KEY ("stocktakeId") REFERENCES "Stocktake" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StocktakeLine_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Additive columns only. Preserve historical rows and all existing indexes.
ALTER TABLE "Address" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "packingRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "packedAt" DATETIME;
ALTER TABLE "Order" ADD COLUMN "packedBy" TEXT;
ALTER TABLE "Order" ADD COLUMN "packingHoldReason" TEXT;
ALTER TABLE "Order" ADD COLUMN "assignedTo" TEXT;
ALTER TABLE "Order" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'NORMAL';
CREATE UNIQUE INDEX "Address_one_default_per_user" ON "Address"("userId") WHERE "isDefault" = 1;

-- CreateIndex
CREATE INDEX "ProductReview_productId_hidden_createdAt_idx" ON "ProductReview"("productId", "hidden", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductReview_userId_orderId_productId_key" ON "ProductReview"("userId", "orderId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewReply_eventKey_key" ON "ReviewReply"("eventKey");

-- CreateIndex
CREATE UNIQUE INDEX "InquiryReply_eventKey_key" ON "InquiryReply"("eventKey");

-- CreateIndex
CREATE UNIQUE INDEX "Stocktake_eventKey_key" ON "Stocktake"("eventKey");

-- CreateIndex
CREATE INDEX "Stocktake_status_createdAt_idx" ON "Stocktake"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StocktakeLine_stocktakeId_variantId_key" ON "StocktakeLine"("stocktakeId", "variantId");

