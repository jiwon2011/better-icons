import { existsSync } from "node:fs";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { getAgentConfigs, getMcpServerConfig } from "../agents.js";
import { shortenPath, readJsonFile, writeJsonFile } from "../utils.js";
import type { AgentConfig, InstallResult } from "../types.js";

const LOGO = `
  ${chalk.bold.white("██████╗ ███████╗████████╗████████╗███████╗██████╗ ")}
  ${chalk.bold.white("██╔══██╗██╔════╝╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗")}
  ${chalk.bold.white("██████╔╝█████╗     ██║      ██║   █████╗  ██████╔╝ ")}
  ${chalk.bold.white("██╔══██╗██╔══╝     ██║      ██║   ██╔══╝  ██╔══██╗")}
  ${chalk.bold.white("██████╔╝███████╗   ██║      ██║   ███████╗██║  ██║")}
  ${chalk.bold.white("╚═════╝ ╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝")}

  ${chalk.bold.yellow("██╗ ██████╗ ██████╗ ███╗   ██╗███████╗")}
  ${chalk.bold.yellow("██║██╔════╝██╔═══██╗████╗  ██║██╔════╝")}
  ${chalk.bold.yellow("██║██║     ██║   ██║██╔██╗ ██║███████╗")}
  ${chalk.bold.yellow("██║██║     ██║   ██║██║╚██╗██║╚════██║")}
  ${chalk.bold.yellow("██║╚██████╗╚██████╔╝██║ ╚████║███████║")}
  ${chalk.bold.yellow("╚═╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝")}

  ${chalk.dim("500,000+ icons from 200+ collections via Iconify")}
`;

interface SetupOptions {
  yes?: boolean;
  agent?: string[];
}

export async function setupCommand(options: SetupOptions) {
  console.log(LOGO);
  p.intro(chalk.bgCyan.black(" setup "));

  const agents = getAgentConfigs();
  const detectedAgents = agents.filter((a) => a.detected);

  // Agent selection
  let targetAgents: AgentConfig[];

  if (options.agent && options.agent.length > 0) {
    const validNames = agents.map((a) => a.name);
    const invalid = options.agent.filter((a) => !validNames.includes(a));
    
    if (invalid.length > 0) {
      p.log.error(`Invalid agents: ${invalid.join(", ")}`);
      p.log.info(`Valid agents: ${validNames.join(", ")}`);
      process.exit(1);
    }
    
    targetAgents = agents.filter((a) => options.agent!.includes(a.name));
  } else if (options.yes) {
    targetAgents = detectedAgents.length > 0 ? detectedAgents : agents;
    p.log.info(`Installing to: ${targetAgents.map((a) => chalk.cyan(a.displayName)).join(", ")}`);
  } else {
    const agentChoices = agents.map((a) => ({
      value: a.name,
      label: a.displayName,
      hint: a.detected ? chalk.green("detected") : chalk.dim("not detected"),
    }));

    const selected = await p.multiselect({
      message: "Select agents to configure",
      options: agentChoices,
      initialValues: detectedAgents.map((a) => a.name),
      required: true,
    });

    if (p.isCancel(selected)) {
      p.cancel("Setup cancelled");
      process.exit(0);
    }

    targetAgents = agents.filter((a) => (selected as string[]).includes(a.name));
  }

  if (targetAgents.length === 0) {
    p.log.warn("No agents selected");
    p.outro(chalk.yellow("Setup cancelled"));
    process.exit(0);
  }

  // Installation summary
  const summaryLines = targetAgents.map((a) => {
    const shortPath = shortenPath(a.configPath);
    const exists = existsSync(a.configPath);
    const status = exists ? chalk.yellow("(will update)") : chalk.green("(will create)");
    return `  ${chalk.cyan(a.displayName)} → ${chalk.dim(shortPath)} ${status}`;
  });

  p.note(summaryLines.join("\n"), "Installation Summary");

  // Confirmation
  if (!options.yes) {
    const confirmed = await p.confirm({
      message: "Proceed with installation?",
    });

    if (p.isCancel(confirmed) || !confirmed) {
      p.cancel("Setup cancelled");
      process.exit(0);
    }
  }

  // Install
  const spinner = p.spinner();
  spinner.start("Configuring MCP server...");

  const results: InstallResult[] = [];
  const serverConfig = getMcpServerConfig();

  for (const agent of targetAgents) {
    try {
      const config = readJsonFile(agent.configPath);
      config.mcpServers = { ...config.mcpServers, ...serverConfig };
      writeJsonFile(agent.configPath, config);
      results.push({ agent: agent.displayName, success: true, path: agent.configPath });
    } catch (error) {
      results.push({
        agent: agent.displayName,
        success: false,
        path: agent.configPath,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  spinner.stop("Configuration complete");

  // Results
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  if (successful.length > 0) {
    const resultLines = successful.map((r) => 
      `  ${chalk.green("✓")} ${r.agent} → ${chalk.dim(shortenPath(r.path))}`
    );
    p.note(resultLines.join("\n"), chalk.green(`Configured ${successful.length} agent(s)`));
  }

  if (failed.length > 0) {
    p.log.error(chalk.red(`Failed to configure ${failed.length} agent(s)`));
    for (const r of failed) {
      p.log.message(`  ${chalk.red("✗")} ${r.agent}: ${chalk.dim(r.error)}`);
    }
  }

  p.note(
    `${chalk.dim("Try asking your AI:")}\n  ${chalk.cyan('"Search for arrow icons"')}\n  ${chalk.cyan('"Get the SVG for lucide:home"')}`,
    "Next Steps"
  );

  p.outro(chalk.green("Restart your editor to load the MCP server"));
}
