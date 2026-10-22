-- Additive RBAC metadata only. Existing roles and records are unchanged.
ALTER TABLE "User" ADD COLUMN "permissionVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lastLoginAt" DATETIME;
ALTER TABLE "Session" ADD COLUMN "permissionVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AuditLog" ADD COLUMN "resourceType" TEXT NOT NULL DEFAULT 'LEGACY';
ALTER TABLE "AuditLog" ADD COLUMN "result" TEXT NOT NULL DEFAULT 'SUCCESS';
ALTER TABLE "AuditLog" ADD COLUMN "beforeJson" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "afterJson" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "reason" TEXT;
