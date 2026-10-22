ALTER TABLE "Address" ADD COLUMN "countryCode" TEXT NOT NULL DEFAULT 'VN';
ALTER TABLE "Address" ADD COLUMN "postalCode" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Order" ADD COLUMN "countryCode" TEXT NOT NULL DEFAULT 'VN';
ALTER TABLE "Order" ADD COLUMN "postalCode" TEXT NOT NULL DEFAULT '';
CREATE TABLE "ShopperPreference"("id" TEXT NOT NULL PRIMARY KEY,"userId" TEXT,"guestKey" TEXT,"language" TEXT NOT NULL DEFAULT 'vi',"region" TEXT NOT NULL DEFAULT 'VN',"currency" TEXT NOT NULL DEFAULT 'VND',"updatedAt" DATETIME NOT NULL,CONSTRAINT "ShopperPreference_userId_fkey" FOREIGN KEY("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE UNIQUE INDEX "ShopperPreference_userId_key" ON "ShopperPreference"("userId");
CREATE UNIQUE INDEX "ShopperPreference_guestKey_key" ON "ShopperPreference"("guestKey");
