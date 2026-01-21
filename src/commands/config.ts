import * as p from "@clack/prompts";
import chalk from "chalk";
import { getMcpServerConfig } from "../agents.js";

export function configCommand() {
  console.log();
  p.intro(chalk.bgBlue.black(" better-icons config "));
  
  p.note(
    JSON.stringify({ mcpServers: getMcpServerConfig() }, null, 2),
    "MCP Configuration"
  );

  const locations = [
    `${chalk.cyan("Cursor:")} ~/.cursor/mcp.json`,
    `${chalk.cyan("Claude Desktop:")} ~/Library/Application Support/Claude/claude_desktop_config.json`,
    `${chalk.cyan("VS Code:")} ~/.vscode/mcp.json`,
    `${chalk.cyan("Windsurf:")} ~/.windsurf/mcp.json`,
    `${chalk.cyan("OpenCode:")} ~/.opencode/mcp.json`,
  ];

  p.note(locations.join("\n"), "Config File Locations");
  p.outro("Add the configuration above to your agent's config file");
}
