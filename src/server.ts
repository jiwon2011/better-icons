import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { VERSION, ICONIFY_API } from "./constants.js";
import { 
  resolveIconAlias, 
  buildSvg, 
  sortByPreferredCollections,
  sortByLearnedPreferences,
  type IconSet 
} from "./icon-utils.js";
import {
  trackUsage,
  getPreferredCollections,
  loadPreferences,
  clearPreferences,
  getRecentIcons,
} from "./memory.js";

interface IconifySearchResult {
  icons: string[];
  total: number;
  limit: number;
  start: number;
  collections: Record<string, number>;
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

interface IconifyCollection {
  name: string;
  total: number;
  author?: { name: string; url?: string };
  license?: { title: string; spdx?: string; url?: string };
  samples?: string[];
  height?: number | number[];
  category?: string;
  palette?: boolean;
}

export async function runServer(): Promise<void> {
  const server = new McpServer({
    name: "better-icons",
    version: VERSION,
  });

  // Tool: Search Icons
  server.registerTool(
    "search_icons",
    {
      description: "Search for icons across 200+ icon libraries powered by Iconify. Returns icon identifiers that can be used with get_icon.",
      inputSchema: {
        query: z.string().describe("Search query (e.g., 'arrow', 'home', 'user', 'check')"),
        limit: z.number().min(1).max(999).default(32).describe("Maximum number of results (1-999, default: 32)"),
        prefix: z.string().optional().describe("Filter by icon collection prefix (e.g., 'mdi', 'lucide', 'heroicons')"),
        category: z.string().optional().describe("Filter by category (e.g., 'General', 'Emoji', 'Thematic')"),
      },
    },
    async ({ query, limit = 32, prefix, category }) => {
      const params = new URLSearchParams({ query, limit: limit.toString() });
      if (prefix) params.set("prefix", prefix);
      if (category) params.set("category", category);

      const response = await fetch(`${ICONIFY_API}/search?${params}`);
      if (!response.ok) {
        return { content: [{ type: "text" as const, text: `Error: ${response.statusText}` }], isError: true };
      }

      const data = (await response.json()) as IconifySearchResult;
      
      // Sort by learned preferences (most used collections first)
      const learnedPrefs = getPreferredCollections();
      const sortedIcons = sortByLearnedPreferences(data.icons, learnedPrefs);
      
      const iconList = sortedIcons.map((icon) => {
        const [prefix, name] = icon.split(":");
        return { id: icon, prefix, name };
      });

      const prefNote = learnedPrefs.length > 0 
        ? `\n\n_Results prioritized from your frequently used collections: ${learnedPrefs.slice(0, 3).join(", ")}_`
        : "";

      return {
        content: [{
          type: "text" as const,
          text: `Found ${data.total} icons (showing ${iconList.length})\n\n**Icons:**\n${iconList.map((i) => `- \`${i.id}\``).join("\n")}\n\nUse \`get_icon\` with any icon ID to get the SVG code.${prefNote}`,
        }],
      };
    }
  );

  // Tool: Get Icon
  server.registerTool(
    "get_icon",
    {
      description: "Get the SVG code for a specific icon. Use the icon ID from search_icons results.",
      inputSchema: {
        icon_id: z.string().describe("Icon identifier in format 'prefix:name' (e.g., 'mdi:home', 'lucide:arrow-right')"),
        color: z.string().optional().describe("Icon color (e.g., '#ff0000', 'currentColor')"),
        size: z.number().optional().describe("Icon size in pixels"),
      },
    },
    async ({ icon_id, color, size }) => {
      const [prefix, name] = icon_id.split(":");
      if (!prefix || !name) {
        return { content: [{ type: "text" as const, text: "Invalid icon ID. Use 'prefix:name' format." }], isError: true };
      }

      const dataResponse = await fetch(`${ICONIFY_API}/${prefix}.json?icons=${name}`);
      if (!dataResponse.ok) {
        return { content: [{ type: "text" as const, text: `Error: ${dataResponse.statusText}` }], isError: true };
      }

      const iconSet = (await dataResponse.json()) as IconSet;
      const resolvedName = resolveIconAlias(iconSet, name);
      
      const iconData = iconSet.icons?.[resolvedName];
      if (!iconData) {
        return { content: [{ type: "text" as const, text: `Icon '${icon_id}' not found` }], isError: true };
      }

      const svg = buildSvg(iconData, { width: iconSet.width, height: iconSet.height }, { size, color });
      const width = iconData.width || iconSet.width || 24;
      const height = iconData.height || iconSet.height || 24;

      // Track usage for auto-learning preferences and history
      trackUsage(prefix, icon_id);

      return {
        content: [{
          type: "text" as const,
          text: `# Icon: ${icon_id}\n\n**Dimensions:** ${width}x${height}\n\n## SVG\n\n\`\`\`svg\n${svg}\n\`\`\`\n\n## React/JSX\n\n\`\`\`jsx\n${svg.replace(/class=/g, 'className=')}\n\`\`\`\n\n## Iconify\n\n\`\`\`jsx\nimport { Icon } from '@iconify/react';\n<Icon icon="${icon_id}" />\n\`\`\``,
        }],
      };
    }
  );

  // Tool: List Collections
  server.registerTool(
    "list_collections",
    {
      description: "List available icon collections/libraries.",
      inputSchema: {
        category: z.string().optional().describe("Filter by category"),
        search: z.string().optional().describe("Search collections by name"),
      },
    },
    async ({ category, search }) => {
      const response = await fetch(`${ICONIFY_API}/collections`);
      if (!response.ok) {
        return { content: [{ type: "text" as const, text: `Error: ${response.statusText}` }], isError: true };
      }

      const collections = (await response.json()) as Record<string, IconifyCollection>;
      let filtered = Object.entries(collections);
      
      if (category) filtered = filtered.filter(([_, c]) => c.category?.toLowerCase().includes(category.toLowerCase()));
      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(([p, c]) => p.toLowerCase().includes(s) || c.name.toLowerCase().includes(s));
      }

      filtered.sort((a, b) => b[1].total - a[1].total);
      const top = filtered.slice(0, 50);

      return {
        content: [{
          type: "text" as const,
          text: `# Icon Collections\n\nFound ${filtered.length} collections (showing top 50)\n\n${top.map(([p, c]) => `- **${p}** - ${c.name} (${c.total} icons)`).join("\n")}\n\n**Popular:** mdi, lucide, heroicons, tabler, ph, ri`,
        }],
      };
    }
  );

  // Tool: Recommend Icons
  server.registerTool(
    "recommend_icons",
    {
      description: "Get icon recommendations for a specific use case.",
      inputSchema: {
        use_case: z.string().describe("Describe what you need (e.g., 'navigation menu', 'settings button')"),
        style: z.enum(["solid", "outline", "any"]).default("any").describe("Preferred style"),
        limit: z.number().min(1).max(20).default(10).describe("Number of recommendations"),
      },
    },
    async ({ use_case, style = "any", limit = 10 }) => {
      const response = await fetch(`${ICONIFY_API}/search?query=${encodeURIComponent(use_case)}&limit=${limit * 2}`);
      if (!response.ok) {
        return { content: [{ type: "text" as const, text: `Error: ${response.statusText}` }], isError: true };
      }

      const data = (await response.json()) as IconifySearchResult;
      const learnedPrefs = getPreferredCollections();
      const sorted = sortByPreferredCollections(data.icons, style, learnedPrefs).slice(0, limit);

      const prefNote = learnedPrefs.length > 0 
        ? `\n\n_Prioritized from your frequently used collections: ${learnedPrefs.slice(0, 3).join(", ")}_`
        : "";

      return {
        content: [{
          type: "text" as const,
          text: `# Recommendations for "${use_case}"\n\n${sorted.map((i) => `- \`${i}\``).join("\n")}\n\nUse \`get_icon\` to get SVG code.${prefNote}`,
        }],
      };
    }
  );

  // Tool: Get Preferences
  server.registerTool(
    "get_icon_preferences",
    {
      description: "View your learned icon collection preferences. The server automatically learns which icon collections you use most frequently.",
      inputSchema: {},
    },
    async () => {
      const prefs = loadPreferences();
      const collections = Object.entries(prefs.collections)
        .sort((a, b) => b[1].count - a[1].count);

      if (collections.length === 0) {
        return {
          content: [{
            type: "text" as const,
            text: "No icon preferences learned yet. Use `get_icon` to retrieve icons and the server will automatically learn your preferences.",
          }],
        };
      }

      const list = collections.map(([prefix, usage]) => 
        `- **${prefix}**: ${usage.count} uses (last: ${new Date(usage.lastUsed).toLocaleDateString()})`
      ).join("\n");

      return {
        content: [{
          type: "text" as const,
          text: `# Your Icon Preferences\n\nThe server has learned these collection preferences based on your usage:\n\n${list}\n\nSearch results and recommendations will prioritize icons from these collections.`,
        }],
      };
    }
  );

  // Tool: Clear Preferences
  server.registerTool(
    "clear_icon_preferences",
    {
      description: "Reset all learned icon preferences. Use this if you want to start fresh with a different icon style.",
      inputSchema: {},
    },
    async () => {
      clearPreferences();
      return {
        content: [{
          type: "text" as const,
          text: "Icon preferences have been cleared. The server will start learning your preferences again from scratch.",
        }],
      };
    }
  );

  // Tool: Find Similar Icons
  server.registerTool(
    "find_similar_icons",
    {
      description: "Find similar icons or variations of a given icon. Useful for finding the same icon in different styles (solid, outline) or from different collections.",
      inputSchema: {
        icon_id: z.string().describe("Icon identifier in format 'prefix:name' (e.g., 'lucide:home')"),
        limit: z.number().min(1).max(50).default(10).describe("Maximum number of similar icons to return"),
      },
    },
    async ({ icon_id, limit = 10 }) => {
      const [currentPrefix, iconName] = icon_id.split(":");
      if (!currentPrefix || !iconName) {
        return { content: [{ type: "text" as const, text: "Invalid icon ID. Use 'prefix:name' format." }], isError: true };
      }

      // Search for icons with the same name
      const response = await fetch(`${ICONIFY_API}/search?query=${encodeURIComponent(iconName)}&limit=100`);
      if (!response.ok) {
        return { content: [{ type: "text" as const, text: `Error: ${response.statusText}` }], isError: true };
      }

      const data = (await response.json()) as IconifySearchResult;
      
      // Find icons with exact name match in different collections
      const exactMatches = data.icons.filter(icon => {
        const [prefix, name] = icon.split(":");
        return name === iconName && prefix !== currentPrefix;
      });

      // Find icons with similar names (contains the icon name)
      const similarMatches = data.icons.filter(icon => {
        const [prefix, name] = icon.split(":");
        return name !== iconName && name?.includes(iconName) && prefix !== currentPrefix;
      });

      // Combine and limit results, prioritizing exact matches
      const combined = [...exactMatches, ...similarMatches].slice(0, limit);
      
      // Sort by learned preferences
      const learnedPrefs = getPreferredCollections();
      const sorted = sortByLearnedPreferences(combined, learnedPrefs);

      if (sorted.length === 0) {
        return {
          content: [{
            type: "text" as const,
            text: `No similar icons found for \`${icon_id}\`. Try searching with \`search_icons\` using related keywords.`,
          }],
        };
      }

      const exactList = sorted.filter(i => i.split(":")[1] === iconName);
      const similarList = sorted.filter(i => i.split(":")[1] !== iconName);

      let text = `# Similar Icons for \`${icon_id}\`\n\n`;
      
      if (exactList.length > 0) {
        text += `**Same icon in other collections:**\n${exactList.map(i => `- \`${i}\``).join("\n")}\n\n`;
      }
      
      if (similarList.length > 0) {
        text += `**Related icons:**\n${similarList.map(i => `- \`${i}\``).join("\n")}\n\n`;
      }

      text += `Use \`get_icon\` to retrieve any of these icons.`;

      return {
        content: [{ type: "text" as const, text }],
      };
    }
  );

  // Tool: Batch Get Icons
  server.registerTool(
    "get_icons",
    {
      description: "Get multiple icons at once. More efficient than calling get_icon multiple times. Returns all SVGs together.",
      inputSchema: {
        icon_ids: z.array(z.string()).min(1).max(20).describe("Array of icon IDs in format 'prefix:name' (max 20)"),
        color: z.string().optional().describe("Icon color for all icons (e.g., '#ff0000', 'currentColor')"),
        size: z.number().optional().describe("Icon size in pixels for all icons"),
      },
    },
    async ({ icon_ids, color, size }) => {
      const results: { id: string; svg: string; error?: string }[] = [];

      // Group icons by prefix for efficient fetching
      const byPrefix = new Map<string, string[]>();
      for (const id of icon_ids) {
        const [prefix, name] = id.split(":");
        if (!prefix || !name) {
          results.push({ id, svg: "", error: "Invalid format" });
          continue;
        }
        if (!byPrefix.has(prefix)) byPrefix.set(prefix, []);
        byPrefix.get(prefix)!.push(name);
      }

      // Fetch icons grouped by prefix
      for (const [prefix, names] of byPrefix) {
        const dataResponse = await fetch(`${ICONIFY_API}/${prefix}.json?icons=${names.join(",")}`);
        if (!dataResponse.ok) {
          for (const name of names) {
            results.push({ id: `${prefix}:${name}`, svg: "", error: dataResponse.statusText });
          }
          continue;
        }

        const iconSet = (await dataResponse.json()) as IconSet;
        
        for (const name of names) {
          const iconId = `${prefix}:${name}`;
          const resolvedName = resolveIconAlias(iconSet, name);
          const iconData = iconSet.icons?.[resolvedName];
          
          if (!iconData) {
            results.push({ id: iconId, svg: "", error: "Not found" });
            continue;
          }

          const svg = buildSvg(iconData, { width: iconSet.width, height: iconSet.height }, { size, color });
          results.push({ id: iconId, svg });
          
          // Track usage
          trackUsage(prefix, iconId);
        }
      }

      // Sort results to match input order
      const sortedResults = icon_ids.map(id => results.find(r => r.id === id)!);
      
      const successful = sortedResults.filter(r => !r.error);
      const failed = sortedResults.filter(r => r.error);

      let text = `# ${successful.length} Icons Retrieved\n\n`;
      
      for (const result of successful) {
        text += `## ${result.id}\n\n\`\`\`svg\n${result.svg}\n\`\`\`\n\n`;
      }

      if (failed.length > 0) {
        text += `**Failed to retrieve:**\n${failed.map(r => `- \`${r.id}\`: ${r.error}`).join("\n")}\n`;
      }

      return {
        content: [{ type: "text" as const, text }],
      };
    }
  );

  // Tool: Get Recent Icons
  server.registerTool(
    "get_recent_icons",
    {
      description: "View your recently used icons. Useful for quickly reusing icons you've already retrieved.",
      inputSchema: {
        limit: z.number().min(1).max(50).default(20).describe("Number of recent icons to show (default: 20)"),
      },
    },
    async ({ limit = 20 }) => {
      const recent = getRecentIcons(limit);

      if (recent.length === 0) {
        return {
          content: [{
            type: "text" as const,
            text: "No icon history yet. Use `get_icon` to retrieve icons and they'll appear here.",
          }],
        };
      }

      const list = recent.map((entry, i) => {
        const date = new Date(entry.timestamp);
        const timeAgo = getTimeAgo(date);
        return `${i + 1}. \`${entry.iconId}\` - ${timeAgo}`;
      }).join("\n");

      return {
        content: [{
          type: "text" as const,
          text: `# Recent Icons\n\n${list}\n\nUse \`get_icon\` or \`get_icons\` to retrieve any of these again.`,
        }],
      };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Better Icons MCP server running");
}
