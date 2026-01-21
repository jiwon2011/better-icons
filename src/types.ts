export interface McpConfig {
  mcpServers?: Record<string, {
    command: string;
    args?: string[];
    env?: Record<string, string>;
  }>;
}

export interface AgentConfig {
  name: string;
  displayName: string;
  configPath: string;
  detected: boolean;
}

export interface InstallResult {
  agent: string;
  success: boolean;
  path: string;
  error?: string;
}
