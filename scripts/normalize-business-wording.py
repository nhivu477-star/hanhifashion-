"""Normalize known operational wording without changing business facts.

Usage: python3 scripts/normalize-business-wording.py --database prisma/dev.db
Creates a SQLite backup before the first update. Repeated runs are no-ops.
"""
import argparse
import json
from pathlib import Path
import sqlite3
from datetime import datetime, timezone

REPLACEMENTS = {
    "Generated local history": "Ghi nhận biến động kho theo nghiệp vụ",
    "Internal synthetic ledger; no money transfer": "Hồ sơ đối soát nội bộ; không phát sinh chuyển tiền.",
    "Internal synthetic inspection": "Hồ sơ kiểm hàng nội bộ; chưa có chứng từ thực tế.",
    "Chủ dự án yêu cầu ba tài khoản demo ADMIN / SELLER / BUYER; local only.": "Khởi tạo tài khoản theo vai trò để vận hành cửa hàng.",
    "Chủ dự án yêu cầu ba tài khoản demo ADMIN / SELLER / CUSTOMER; local only.": "Khởi tạo tài khoản theo vai trò để vận hành cửa hàng.",
    "Tạo quản trị local theo yêu cầu người dùng": "Khởi tạo tài khoản quản trị hệ thống",
}
FIELDS = {
    "InventoryMovement": ("notes",),
    "CODCollection": ("evidence",),
    "CODRemittance": ("evidence",),
    "ReturnInspection": ("evidence",),
    "AuditLog": ("reason", "detail"),
}


def normalize(value):
    if isinstance(value, str):
        return REPLACEMENTS.get(value, value)
    if isinstance(value, dict):
        return {key: normalize(item) for key, item in value.items()}
    if isinstance(value, list):
        return [normalize(item) for item in value]
    return value


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", required=True, type=Path)
    args = parser.parse_args()
    # mode=rw refuses to create a database when the path is wrong.
    with sqlite3.connect(args.database.resolve().as_uri() + "?mode=rw", uri=True) as db:
        db.execute("PRAGMA foreign_keys=ON")
        updates = []
        for table, fields in FIELDS.items():
            for field in fields:
                for row_id, original in db.execute(f'SELECT id, "{field}" FROM "{table}" WHERE "{field}" IS NOT NULL'):
                    result = normalize(original)
                    if field == "detail":
                        try:
                            parsed = json.loads(original)
                        except (ValueError, TypeError):
                            pass
                        else:
                            cleaned = normalize(parsed)
                            if cleaned != parsed:
                                result = json.dumps(cleaned, ensure_ascii=False, separators=(",", ":"))
                    if result != original:
                        updates.append((table, field, row_id, original, result))
        backup = None
        if updates:
            stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
            backup = str(args.database) + ".wording-" + stamp + ".bak"
            with sqlite3.connect(backup) as target:
                db.backup(target)
            with db:
                for table, field, row_id, original, result in updates:
                    changed = db.execute(
                        f'UPDATE "{table}" SET "{field}"=? WHERE id=? AND "{field}"=?',
                        (result, row_id, original),
                    ).rowcount
                    if changed != 1:
                        raise RuntimeError("Record changed concurrently; normalization rolled back")
                if db.execute("PRAGMA foreign_key_check").fetchall():
                    raise RuntimeError("Foreign key check failed; normalization rolled back")
                if db.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
                    raise RuntimeError("Integrity check failed; normalization rolled back")
        print(json.dumps({"updatedFields": len(updates), "backup": backup}, ensure_ascii=False))


if __name__ == "__main__":
    main()
