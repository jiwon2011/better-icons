import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { AgentConfig } from "./types.js";
import { PACKAGE_NAME } from "./constants.js";

export function getAgentConfigs(): AgentConfig[] {
  const home = homedir();
  const isMac = process.platform === "darwin";
  const isWindows = process.platform === "win32";

  return [
    {
      name: "cursor",
      displayName: "Cursor",
      configPath: join(home, ".cursor", "mcp.json"),
      detected: existsSync(join(home, ".cursor")),
    },
    {
      name: "claude-code",
      displayName: "Claude Code",
      configPath: isMac
        ? join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json")
        : isWindows
          ? join(home, "AppData", "Roaming", "Claude", "claude_desktop_config.json")
          : join(home, ".config", "claude", "claude_desktop_config.json"),
      detected: isMac
        ? existsSync(join(home, "Library", "Application Support", "Claude"))
        : isWindows
          ? existsSync(join(home, "AppData", "Roaming", "Claude"))
          : existsSync(join(home, ".config", "claude")),
    },
    {
      name: "windsurf",
      displayName: "Windsurf",
      configPath: join(home, ".windsurf", "mcp.json"),
      detected: existsSync(join(home, ".windsurf")),
    },
    {
      name: "vscode",
      displayName: "VS Code (Copilot)",
      configPath: join(home, ".vscode", "mcp.json"),
      detected: existsSync(join(home, ".vscode")),
    },
    {
      name: "opencode",
      displayName: "OpenCode",
      configPath: join(home, ".opencode", "mcp.json"),
      detected: existsSync(join(home, ".opencode")),
    },
    {
      name: "cline",
      displayName: "Cline / Roo",
      configPath: join(home, ".cline", "mcp.json"),
      detected: existsSync(join(home, ".cline")),
    },
    {
      name: "aider",
      displayName: "Aider",
      configPath: join(home, ".aider", "mcp.json"),
      detected: existsSync(join(home, ".aider")),
    },
  ];
}

export function getMcpServerConfig() {
  return {
    "better-icons": {
      command: "npx",
      args: ["-y", PACKAGE_NAME],
    },
  };
}
