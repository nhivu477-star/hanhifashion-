-- CreateIndex
CREATE INDEX "Product_categoryId_active_createdAt_idx" ON "Product"("categoryId", "active", "createdAt");

-- CreateIndex
CREATE INDEX "Product_featured_isNew_idx" ON "Product"("featured", "isNew");

-- CreateIndex
CREATE INDEX "ProductVariant_stock_idx" ON "ProductVariant"("stock");
