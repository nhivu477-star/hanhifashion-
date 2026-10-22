-- Preserve user identities, password hashes and business data. Any changed
-- staff grants require reauthentication; existing CUSTOMER sessions remain valid.
BEGIN TRANSACTION;

DELETE FROM "Session"
WHERE "userId" IN (SELECT "id" FROM "User" WHERE "role" <> 'CUSTOMER');

UPDATE "User"
SET "permissionVersion" = "permissionVersion" + 1
WHERE "role" <> 'CUSTOMER';

UPDATE "User"
SET "role" = CASE
  WHEN "role" = 'SUPER_ADMIN' THEN 'ADMIN'
  WHEN "role" IN (
    'STORE_MANAGER', 'PRODUCT_STAFF', 'INVENTORY_STAFF', 'ORDER_STAFF',
    'CUSTOMER_SUPPORT', 'CONTENT_STAFF', 'MARKETING_STAFF', 'FINANCE_STAFF'
  ) THEN 'SELLER'
  ELSE 'CUSTOMER'
END
WHERE "role" NOT IN ('CUSTOMER', 'SELLER', 'ADMIN');

-- SQLite role guards avoid rebuilding User or disturbing its foreign keys.
CREATE TRIGGER "User_canonical_role_insert"
BEFORE INSERT ON "User"
WHEN NEW."role" NOT IN ('CUSTOMER', 'SELLER', 'ADMIN')
BEGIN
  SELECT RAISE(ABORT, 'Invalid account role');
END;

CREATE TRIGGER "User_canonical_role_update"
BEFORE UPDATE OF "role" ON "User"
WHEN NEW."role" NOT IN ('CUSTOMER', 'SELLER', 'ADMIN')
BEGIN
  SELECT RAISE(ABORT, 'Invalid account role');
END;

COMMIT;
