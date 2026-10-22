import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migration = fileURLToPath(new URL("../prisma/migrations/20261022000000_canonical_account_roles/migration.sql", import.meta.url));

describe("Canonical role data migration", () => {
  it("preserves users, credentials and business references while revoking changed grants", () => {
    const result = execFileSync("python3", ["-c", String.raw`
import pathlib, sqlite3, sys
connection = sqlite3.connect(':memory:')
connection.execute('PRAGMA foreign_keys=ON')
connection.executescript('''
CREATE TABLE "User" (id TEXT PRIMARY KEY, role TEXT NOT NULL DEFAULT 'CUSTOMER', passwordHash TEXT NOT NULL, permissionVersion INTEGER NOT NULL DEFAULT 0);
CREATE TABLE "Session" (id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES "User"(id));
CREATE TABLE "Order" (id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES "User"(id), total INTEGER NOT NULL);
''')
roles = ['CUSTOMER', 'SELLER', 'ADMIN', 'SUPER_ADMIN', 'STORE_MANAGER', 'PRODUCT_STAFF', 'INVENTORY_STAFF', 'ORDER_STAFF', 'CUSTOMER_SUPPORT', 'CONTENT_STAFF', 'MARKETING_STAFF', 'FINANCE_STAFF', 'BUYER', 'STAFF', 'UNKNOWN']
for role in roles:
    connection.execute('INSERT INTO "User" VALUES (?, ?, ?, 7)', (role, role, 'preserved-hash-' + role))
    connection.execute('INSERT INTO "Session" VALUES (?, ?)', ('session-' + role, role))
    connection.execute('INSERT INTO "Order" VALUES (?, ?, ?)', ('order-' + role, role, 123456))
connection.commit()
connection.executescript(pathlib.Path(sys.argv[1]).read_text())
rows = connection.execute('SELECT id, role, passwordHash, permissionVersion FROM "User" ORDER BY id').fetchall()
assert len(rows) == len(roles)
for identity, role, password, version in rows:
    expected = identity if identity in ['CUSTOMER', 'SELLER', 'ADMIN'] else ('ADMIN' if identity == 'SUPER_ADMIN' else ('SELLER' if identity in roles[4:12] else 'CUSTOMER'))
    assert role == expected, (identity, role, expected)
    assert password == 'preserved-hash-' + identity
    assert version == (7 if identity == 'CUSTOMER' else 8)
assert connection.execute('SELECT userId FROM "Session"').fetchall() == [('CUSTOMER',)]
assert connection.execute('SELECT COUNT(*), SUM(total) FROM "Order"').fetchone() == (len(roles), 123456 * len(roles))
assert connection.execute('PRAGMA foreign_key_check').fetchall() == []
for statement in ['INSERT INTO "User" VALUES (\'invalid\', \'SUPER_ADMIN\', \'hash\', 0)', 'UPDATE "User" SET role=\'STAFF\' WHERE id=\'CUSTOMER\'']:
    try:
        connection.execute(statement)
    except sqlite3.IntegrityError:
        pass
    else:
        raise AssertionError('Noncanonical role accepted')
connection.execute('UPDATE "User" SET role=\'ADMIN\' WHERE id=\'SELLER\'')
print('preserved')
`, migration], { encoding: "utf8" });
    expect(result.trim()).toBe("preserved");
  });
});
