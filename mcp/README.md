# Element Node MCP Server

Official [Model Context Protocol](https://modelcontextprotocol.io) server for [Element Node CMS](https://elementnode.cloud).
Lets any MCP-capable AI agent — Claude Code, Cursor, Windsurf, Zed… — build and manage Element Node sites.

> Claude Code users: the [official skill](https://github.com/LorenzArtik/element-node/tree/main/skill) is the deeper integration (full site builds with visual refinement). The MCP server is the standard interface for everything else.

## Tools

| Tool | What it does |
|---|---|
| `site_export` / `site_import` | Full Site Blueprint export/import (pages, theme blocks, forms, popups) |
| `list_pages` / `get_page` / `create_page` / `update_page` | Page CRUD |
| `get_site_settings` / `update_theme` | Read settings, non-destructive theme merge |
| `list_media` / `upload_media_from_url` | Media library |
| `widget_reference` / `widget_quirks` | Always-fresh widget docs straight from this repo |

## Setup

Requirements: Node ≥ 18.17, an Element Node install, an API key (CMS → Settings → API, scopes `site.import`+`site.export`) and an admin account.

No install needed — the server is on npm ([`element-node-mcp`](https://www.npmjs.com/package/element-node-mcp)) and runs via `npx`.

### Claude Code

```bash
claude mcp add element-node \
  -e ELEMENT_NODE_URL=https://your-site.com \
  -e ELEMENT_NODE_API_KEY=en_live_... \
  -e ELEMENT_NODE_EMAIL=admin@your-site.com \
  -e ELEMENT_NODE_PASSWORD=... \
  -- npx -y element-node-mcp
```

### Cursor / Windsurf / generic (mcp.json)

```json
{
  "mcpServers": {
    "element-node": {
      "command": "npx",
      "args": ["-y", "element-node-mcp"],
      "env": {
        "ELEMENT_NODE_URL": "https://your-site.com",
        "ELEMENT_NODE_API_KEY": "en_live_...",
        "ELEMENT_NODE_EMAIL": "admin@your-site.com",
        "ELEMENT_NODE_PASSWORD": "..."
      }
    }
  }
}
```

`ELEMENT_NODE_API_KEY` powers `site_export`/`site_import`; the email/password session powers the rest. Provide both for full functionality.

## Typical agent workflow

1. `widget_reference` → learn available widgets and fields
2. `site_export` → understand current structure
3. Build a blueprint → `site_import` with `strategy: "merge"` (use `dryRun: true` first)
4. `update_theme` for brand colors/fonts
5. `upload_media_from_url` for images, then reference the returned `/uploads/…` URLs

⚠️ Check the site's license tier before using pro widgets — widgets outside the plan render in the editor but are hidden on the public site (see `widget_reference`, section "Enforcement").
