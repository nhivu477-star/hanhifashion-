import { constants } from "node:fs";
import { lstat, mkdir, open, readFile, realpath } from "node:fs/promises";
import path from "node:path";

export const demoRoot = path.resolve(".local-demo");
export function demoName(args = process.argv.slice(2)) {
  const name = args[0] ?? "portfolio";
  if (args.length > 1 || !/^[a-z0-9][a-z0-9-]{0,47}$/.test(name))
    throw Error("Use a single demo name containing lowercase letters, numbers and hyphens.");
  return name;
}
export async function regularFile(filename: string) {
  const info = await lstat(filename);
  if (!info.isFile() || info.isSymbolicLink() || await realpath(filename) !== filename)
    throw Error("Demo file must be a regular file, not a symbolic link.");
  return info;
}
export async function demoWorkspace(name: string) {
  const workspace = path.join(demoRoot, name);
  for (const directory of [demoRoot, workspace]) {
    const info = await lstat(directory);
    if (!info.isDirectory() || info.isSymbolicLink() || await realpath(directory) !== directory)
      throw Error("Demo directories must not contain symbolic links.");
  }
  return { workspace, database: path.join(workspace, "demo.db") };
}
export async function reserveDemo(name: string) {
  // Canonicalize the repository first; no caller-selected path or DATABASE_URL is trusted.
  if (await realpath(process.cwd()) !== process.cwd())
    throw Error("Run setup from the repository's real path, not a symbolic link.");
  try { await mkdir(demoRoot, { mode: 0o700 }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
  const rootInfo = await lstat(demoRoot);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink() || await realpath(demoRoot) !== demoRoot)
    throw Error("Refusing a linked or non-directory demo root.");
  // mkdir is exclusive: even an empty directory or dangling symlink is never reused.
  await mkdir(path.join(demoRoot, name), { mode: 0o700 });
  const result = await demoWorkspace(name);
  const file = await open(result.database, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
  await file.close();
  return result;
}
export async function writePrivate(filename: string, value: unknown) {
  const file = await open(filename, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
  try { await file.writeFile(JSON.stringify(value, null, 2) + "\n"); await file.sync(); }
  finally { await file.close(); }
}
export async function assertSeedTarget() {
  const name = process.env.DEMO_SEED_NAME;
  if (!name || demoName([name]) !== name) throw Error("Seed is restricted to setup-demo.ts and a new isolated demo database.");
  const target = await demoWorkspace(name);
  await regularFile(target.database);
  if (process.env.DATABASE_URL !== `file:${target.database}`)
    throw Error("Seed target does not match the exclusively reserved demo database.");
  await writePrivate(path.join(target.workspace, "seed-lock.json"), { version: 1 });
  return target;
}
export async function readyDemo(name: string) {
  const target = await demoWorkspace(name);
  const manifest = path.join(target.workspace, "workspace.json");
  await regularFile(manifest);
  const record = JSON.parse(await readFile(manifest, "utf8"));
  await regularFile(target.database);
  if (record.version !== 1 || record.status !== "READY" || record.database !== target.database)
    throw Error("Demo setup is incomplete or belongs to another path; choose a new demo name.");
  return target;
}
