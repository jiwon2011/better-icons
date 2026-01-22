# Better Icons

An MCP (Model Context Protocol) server for searching and retrieving 200,000 icons from 150+ icon sets, powered by [Iconify](https://iconify.design/) - the same data source behind [icones.js.org](https://icones.js.org).

## Why?

When doing AI-assisted coding, icons are often a pain point. AI models struggle to:
- Know what icons are available
- Provide correct SVG code
- Suggest appropriate icons for UI elements

This MCP server solves that by giving AI models direct access to search and retrieve icons from the massive Iconify collection (200,000+ icons!).

## Auto-Learning Preferences

Better Icons automatically learns which icon collections you prefer based on your usage. When you retrieve icons using `get_icon`, the server tracks which collections you use most frequently and prioritizes them in future searches and recommendations.

- **Consistent style**: Icons from your preferred collections appear first in search results
- **Zero configuration**: Just use the server normally and it learns your preferences
- **Global memory**: Preferences are stored in `~/.better-icons/preferences.json` and apply across all projects
- **Full control**: View preferences with `get_icon_preferences` or reset with `clear_icon_preferences`

## Quick Setup

```bash
npx better-icons setup
```

This will interactively configure the MCP server for:
- **Cursor**
- **Claude Code**
- **OpenCode**
- **Windsurf**
- **VS Code (Copilot)**

## Add AI Skills (Optional)

Teach your AI assistant best practices for using better-icons:

```bash
npx skills add better-auth/better-icons
```

This ensures AI assistants will:
- ✅ Use the `better-icons` MCP instead of installing icon packages
- ✅ For React, create a single `icons.tsx` file with all icons
- ✅ Reuse existing icons before adding new ones
- ✅ Follow consistent naming conventions

## Manual Installation

### Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "better-icons": {
      "command": "npx",
      "args": ["-y", "better-icons"]
    }
  }
}
```

### Claude Code (CLI)

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "better-icons": {
      "command": "npx",
      "args": ["-y", "better-icons"]
    }
  }
}
```

## Tools

### `search_icons`

Search for icons across 200+ icon libraries.

```
Search for "arrow" icons
Search for "home" icons in the lucide collection
```

**Parameters:**
- `query` (required): Search query (e.g., 'arrow', 'home', 'user')
- `limit` (optional): Maximum results (1-999, default: 32)
- `prefix` (optional): Filter by collection (e.g., 'mdi', 'lucide')
- `category` (optional): Filter by category

### `get_icon`

Get the SVG code for a specific icon with multiple usage formats.

```
Get the SVG for mdi:home
Get a URL for mdi:home
Get lucide:arrow-right with size 24
```

**Parameters:**
- `icon_id` (required): Icon ID in format 'prefix:name' (e.g., 'mdi:home')
- `color` (optional): Icon color (e.g., '#ff0000', 'currentColor')
- `size` (optional): Icon size in pixels
- `format` (optional): 'svg' (default) or 'url'

**Returns:**
- Raw SVG code
- React/JSX component code
- Iconify component usage
- Direct SVG URL (when `format: "url"`)

### `list_collections`

List available icon collections/libraries.

```
List all icon collections
Search for "material" collections
```

**Parameters:**
- `category` (optional): Filter by category
- `search` (optional): Search collections by name

### `recommend_icons`

Get icon recommendations for a specific use case.

```
What icon should I use for a settings button?
Recommend icons for user authentication
```

**Parameters:**
- `use_case` (required): Describe what you need
- `style` (optional): 'solid', 'outline', or 'any'
- `limit` (optional): Number of recommendations (1-20)

### `get_icon_preferences`

View your learned icon collection preferences with usage statistics.

```
Show my icon preferences
What icon collections do I use most?
```

### `clear_icon_preferences`

Reset all learned icon preferences to start fresh.

```
Clear my icon preferences
Reset icon preferences
```

### `find_similar_icons`

Find similar icons or variations of a given icon across different collections and styles.

```
Find icons similar to lucide:home
What other arrow icons are there like mdi:arrow-right?
```

**Parameters:**
- `icon_id` (required): Icon ID to find variations of
- `limit` (optional): Maximum number of similar icons (1-50, default: 10)

### `get_icons`

Get multiple icons at once (batch retrieval). More efficient than multiple `get_icon` calls.

```
Get these icons: lucide:home, lucide:settings, lucide:user
```

**Parameters:**
- `icon_ids` (required): Array of icon IDs (max 20)
- `color` (optional): Color for all icons
- `size` (optional): Size in pixels for all icons

### `get_recent_icons`

View your recently used icons for quick reuse.

```
Show my recent icons
What icons have I used recently?
```

**Parameters:**
- `limit` (optional): Number of recent icons to show (1-50, default: 20)

## Popular Icon Collections

| Prefix | Name | Style | Icons |
|--------|------|-------|-------|
| `mdi` | Material Design Icons | Solid | 7,000+ |
| `lucide` | Lucide Icons | Outline | 1,500+ |
| `heroicons` | Heroicons | Both | 300+ |
| `tabler` | Tabler Icons | Outline | 5,000+ |
| `ph` | Phosphor Icons | Multiple | 9,000+ |
| `ri` | Remix Icons | Both | 2,800+ |
| `fa6-solid` | Font Awesome 6 | Solid | 2,000+ |
| `simple-icons` | Simple Icons | Logos | 3,000+ |

## CLI Commands

```bash
npx better-icons              # Run the MCP server (for tool configs)
npx better-icons setup        # Interactive setup wizard
npx better-icons setup -y     # Setup with auto-confirm (global)
npx better-icons setup -s project  # Setup for current project only
npx better-icons config       # Show manual config instructions
npx better-icons --help       # Show help
```

### Options

| Option | Description |
|--------|-------------|
| `-y, --yes` | Skip confirmation prompts |
| `-a, --agent <agents...>` | Specify agents (cursor, claude-code, opencode, windsurf, vscode) |
| `-s, --scope <scope>` | Config scope: `global` (default) or `project` |

### Scope

- **Global**: Configures MCP server for all projects (stored in home directory)
- **Project**: Configures MCP server for current project only (stored in project root)

## Development

```bash
# Install dependencies
bun install

# Run locally
bun run dev

# Build
bun run build
```

## License

MIT
