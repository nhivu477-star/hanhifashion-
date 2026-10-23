import { beforeEach, describe, expect, it, vi } from "vitest";
import path from "node:path";
import sharp from "sharp";
import { NextRequest } from "next/server";
import type * as Authentication from "../src/lib/auth";
import type * as FileSystem from "node:fs/promises";

const state = vi.hoisted(() => ({
  files: new Map<string, Buffer>(),
  currentAccount: vi.fn(),
  successfulAudit: vi.fn(),
  deniedAudit: vi.fn(),
  failWrite: false,
}));
vi.mock("../src/lib/db", () => ({
  db: {
    $transaction: async (operation: (client: unknown) => Promise<unknown>) => operation({
      user: { findUnique: state.currentAccount },
      auditLog: { create: state.successfulAudit },
    }),
    auditLog: { create: state.deniedAudit },
  },
}));
vi.mock("../src/lib/auth", async (original) => ({
  ...await original<typeof Authentication>(),
  requireUser: async () => ({ id: "upload-admin", role: "ADMIN", active: true, permissionVersion: 4 }),
  currentUser: async () => null,
}));
vi.mock("node:fs/promises", async (original) => ({
  ...await original<typeof FileSystem>(),
  realpath: async (filename: string) => path.resolve(filename),
  mkdir: async () => undefined,
  open: async (filename: string) => {
    state.files.set(filename, Buffer.alloc(0));
    return {
      writeFile: async (bytes: Buffer) => {
        if (state.failWrite) {
          state.files.set(filename, bytes.subarray(0, 8));
          throw new Error("Storage write failed");
        }
        state.files.set(filename, bytes);
      },
      close: async () => undefined,
    };
  },
  unlink: async (filename: string) => { state.files.delete(filename); },
}));

import { POST } from "../src/app/api/[...action]/route";

beforeEach(() => {
  vi.clearAllMocks();
  state.files.clear();
  state.failWrite = false;
  state.currentAccount.mockResolvedValue({ id: "upload-admin", role: "ADMIN", active: true, permissionVersion: 4 });
  state.successfulAudit.mockResolvedValue({ id: "upload-audit" });
  state.deniedAudit.mockResolvedValue({ id: "rejection-audit" });
});

describe("Upload authorization after reading the multipart body", () => {
  it.each([
    { active: false, role: "ADMIN", permissionVersion: 4 },
    { active: true, role: "ADMIN", permissionVersion: 5 },
    { active: true, role: "CUSTOMER", permissionVersion: 4 },
  ])("rejects a revoked upload without publishing a file: %j", async (account) => {
    const bytes = await sharp({ create: { width: 16, height: 16, channels: 3, background: "#eeeeee" } }).png().toBuffer();
    const form = new FormData();
    form.set("file", new File([Uint8Array.from(bytes)], "fixture.png", { type: "image/png" }));
    const bodyRequested = Promise.withResolvers<void>();
    const receivedBody = Promise.withResolvers<FormData>();
    const request = new NextRequest("http://localhost:3000/api/admin/upload", { method: "POST" });
    vi.spyOn(request, "formData").mockImplementation(() => {
      bodyRequested.resolve();
      return receivedBody.promise;
    });
    const pending = POST(request, { params: Promise.resolve({ action: ["admin", "upload"] }) });
    await bodyRequested.promise;
    state.currentAccount.mockResolvedValue({ id: "upload-admin", ...account });
    receivedBody.resolve(form);
    const response = await pending;
    expect(response.status).toBe(403);
    expect(state.files.size).toBe(0);
  });

  it("removes the newly published file if its audit transaction fails", async () => {
    const bytes = await sharp({ create: { width: 16, height: 16, channels: 3, background: "#eeeeee" } }).png().toBuffer();
    const form = new FormData();
    form.set("file", new File([Uint8Array.from(bytes)], "fixture.png", { type: "image/png" }));
    const request = new NextRequest("http://localhost:3000/api/admin/upload", { method: "POST", body: form });
    state.successfulAudit.mockRejectedValue(new Error("Audit storage unavailable"));
    const response = await POST(request, { params: Promise.resolve({ action: ["admin", "upload"] }) });
    expect(response.status).toBe(400);
    expect(state.files.size).toBe(0);
  });

  it("removes a partially written file when the exclusive handle write fails", async () => {
    const bytes = await sharp({ create: { width: 16, height: 16, channels: 3, background: "#eeeeee" } }).png().toBuffer();
    const form = new FormData();
    form.set("file", new File([Uint8Array.from(bytes)], "fixture.png", { type: "image/png" }));
    const request = new NextRequest("http://localhost:3000/api/admin/upload", { method: "POST", body: form });
    state.failWrite = true;
    const response = await POST(request, { params: Promise.resolve({ action: ["admin", "upload"] }) });
    expect(response.status).toBe(400);
    expect(state.files.size).toBe(0);
  });
});
