import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname } from "node:path";
import type { McpConfig } from "./types.js";

export function shortenPath(fullPath: string): string {
  const home = homedir();
  const cwd = process.cwd();
  if (fullPath.startsWith(cwd)) {
    return "." + fullPath.slice(cwd.length);
  }
  if (fullPath.startsWith(home)) {
    return fullPath.replace(home, "~");
  }
  return fullPath;
}

export function readJsonFile(path: string): McpConfig {
  try {
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, "utf-8"));
    }
  } catch {
    // File doesn't exist or is invalid JSON
  }
  return {};
}

export function writeJsonFile(path: string, data: McpConfig): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}
