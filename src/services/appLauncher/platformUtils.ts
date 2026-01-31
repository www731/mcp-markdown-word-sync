import { exec, spawn } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";

export const execAsync = promisify(exec);

export async function fileExists(p?: string) {
  if (!p) return false;
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export function spawnDetached(cmd: string, args: string[]) {
  const child = spawn(cmd, args, { detached: true, stdio: "ignore" });
  child.unref();
}

export function normalizeWin(p: string) {
  return path.resolve(p).replace(/\//g, "\\");
}

