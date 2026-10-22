import { bootstrapOwner } from "../src/lib/staff";
import { db } from "../src/lib/db";
if (!process.argv.includes("--owner-approved-existing-admin"))
  throw Error("Chỉ chạy sau khi chủ dự án duyệt nâng ADMIN hiện tại.");
await bootstrapOwner();
await db.$disconnect();
console.log(
  "Đã nâng ADMIN hiện tại theo phê duyệt của chủ dự án; phiên cũ đã thu hồi. Không đổi mật khẩu.",
);
