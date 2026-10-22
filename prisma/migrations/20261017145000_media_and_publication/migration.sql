-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "localPath" TEXT NOT NULL,
    "originalSourceUrl" TEXT NOT NULL,
    "creator" TEXT NOT NULL DEFAULT '',
    "licenseType" TEXT NOT NULL,
    "licenseReference" TEXT NOT NULL,
    "retrievedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorizedUse" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'DEVELOPMENT',
    "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "verificationNotes" TEXT NOT NULL DEFAULT '',
    "garmentVerified" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" DATETIME,
    "productId" TEXT,
    "colorId" TEXT,
    "focalX" REAL NOT NULL DEFAULT 50,
    "focalY" REAL NOT NULL DEFAULT 50,
    CONSTRAINT "MediaAsset_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MediaAsset_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "ProductColor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ColorImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "colorId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "mediaAssetId" TEXT,
    CONSTRAINT "ColorImage_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "ProductColor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ColorImage_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ColorImage" ("alt", "colorId", "id", "position", "url") SELECT "alt", "colorId", "id", "position", "url" FROM "ColorImage";
DROP TABLE "ColorImage";
ALTER TABLE "new_ColorImage" RENAME TO "ColorImage";
CREATE INDEX "ColorImage_colorId_position_idx" ON "ColorImage"("colorId", "position");
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "fit" TEXT NOT NULL,
    "occasion" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "salePrice" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "searchText" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "subcategoryId" TEXT,
    "sleeveType" TEXT NOT NULL DEFAULT '',
    "length" TEXT NOT NULL DEFAULT '',
    "styleTags" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "care" TEXT NOT NULL DEFAULT '',
    "styling" TEXT NOT NULL DEFAULT '',
    "fitClass" TEXT NOT NULL DEFAULT 'regular',
    "stretchVerified" BOOLEAN NOT NULL DEFAULT false,
    "stretchAllowance" REAL NOT NULL DEFAULT 0,
    "enrichmentVersion" INTEGER NOT NULL DEFAULT 0,
    "publicationStatus" TEXT NOT NULL DEFAULT 'PENDING_ASSETS',
    "merchandiseVerified" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Product_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("active", "care", "categoryId", "createdAt", "description", "details", "enrichmentVersion", "featured", "fit", "fitClass", "id", "isNew", "length", "material", "name", "occasion", "price", "salePrice", "searchText", "sku", "sleeveType", "slug", "stretchAllowance", "stretchVerified", "style", "styleTags", "styling", "subcategoryId", "updatedAt") SELECT "active", "care", "categoryId", "createdAt", "description", "details", "enrichmentVersion", "featured", "fit", "fitClass", "id", "isNew", "length", "material", "name", "occasion", "price", "salePrice", "searchText", "sku", "sleeveType", "slug", "stretchAllowance", "stretchVerified", "style", "styleTags", "styling", "subcategoryId", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
CREATE INDEX "Product_categoryId_active_createdAt_idx" ON "Product"("categoryId", "active", "createdAt");
CREATE INDEX "Product_featured_isNew_idx" ON "Product"("featured", "isNew");
CREATE TABLE "new_ProductImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "mediaAssetId" TEXT,
    CONSTRAINT "ProductImage_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ProductImage" ("alt", "id", "position", "productId", "url") SELECT "alt", "id", "position", "productId", "url" FROM "ProductImage";
DROP TABLE "ProductImage";
ALTER TABLE "new_ProductImage" RENAME TO "ProductImage";
CREATE TABLE "new_ProductVariant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL,
    "colorId" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "stockOrigin" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "priceOverride" INTEGER,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductVariant_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "ProductColor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ProductVariant" ("color", "colorHex", "colorId", "id", "productId", "size", "sku", "stock", "updatedAt") SELECT "color", "colorHex", "colorId", "id", "productId", "size", "sku", "stock", "updatedAt" FROM "ProductVariant";
DROP TABLE "ProductVariant";
ALTER TABLE "new_ProductVariant" RENAME TO "ProductVariant";
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");
CREATE INDEX "ProductVariant_stock_idx" ON "ProductVariant"("stock");
CREATE UNIQUE INDEX "ProductVariant_productId_size_color_key" ON "ProductVariant"("productId", "size", "color");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_localPath_key" ON "MediaAsset"("localPath");

-- CreateIndex
CREATE INDEX "MediaAsset_reviewStatus_role_idx" ON "MediaAsset"("reviewStatus", "role");
