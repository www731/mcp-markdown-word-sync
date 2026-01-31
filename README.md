# Markdown ↔ Word/WPS Real-Time Bidirectional Sync (MCP + CLI)
## Features
- Bidirectional real-time sync: Markdown ⇄ DOCX
- Auto-open local Word/WPS (cross-platform: Windows/macOS/Linux)
- Write-lock retry & fallback: handles EBUSY/EPERM/EACCES, creates `.pending` as fallback
- Watch debounce & loop suppression: prevents cycles caused by mutual triggers
- Dual entry: CLI for direct use, or invoke tools inside AI clients via MCP
## Prerequisites
- Node.js ≥ 18
- Windows/macOS/Linux; Microsoft Word or WPS Office recommended
- Enable auto-save in your editor/Word for a “truly live” sync experience
## Install & Build
- Install dependencies
  - `npm install`
- Build
  - `npm run build`
- Optional: register global commands (plan B)
  - `npm link`
  - Adds `mdsync-mcp`, `mdsync`, etc. to your system PATH
## Quick Start (CLI)
- Start sync and auto-open DOCX
  - `node dist/cli/index.js sync <path-to.md-or.docx> --open --prefer-word`
  - Example (Windows):
    - `node dist/cli/index.js sync d:\projects\mdMCP\demo\example.md --open --prefer-word`
- Optional: use the commands exposed by `npm link`
  - `mdsync sync <path> --open --prefer-word`
- Common flags
  - `--open` on by default; `--no-open` to disable auto-open
  - `--bidirectional` on by default; `--watch` on by default
  - `--prefer-word` on by default (tries Word first)
## Use in Claude (MCP)
- Background: this project bundles an MCP server (stdio) exposing:
  - `convert_and_sync` (establish sync)
  - `sync_status` (query status)
- Plan B: use the global command `mdsync-mcp`
  - Make sure you’ve run `npm run build && npm link`
  - Add to Claude’s mcpServers config:
    ```json
    {
      "mcpServers": {
        "MarkdownSync": {
          "command": "mdsync-mcp",
          "args": [],
          "env": { "MCP_TRANSPORT": "stdio" }
        }
      }
    }
    ```
  - Restart Claude; it auto-connects and lists the tools
  - Invocation example (UI):
    - `convert_and_sync` params:
      - supply at least one of `markdownPath` or `docxPath`
      - `bidirectional` (bool, default true)
      - `watch` (bool, default true)
      - `openDocx` (bool, default true)
      - `preferWord` (bool, default true)
    - `sync_status` param:
      - `sessionId` (optional; omit to list all sessions)
## Use in Cursor/Trea (MCP)
- Same setup as Claude: add an mcpServers entry pointing to `mdsync-mcp`
  - `command`: `mdsync-mcp`
  - `args`: `[]`
  - `env`: `{ "MCP_TRANSPORT": "stdio" }`
- Once connected, the client shows the tool list; pick and invoke
## How It Works (short version)
- Core components
  - Converter: Markdown→DOCX (marked + docx), DOCX→Markdown (mammoth + turndown)
  - Watcher: `chokidar` monitors file changes with `awaitWriteFinish` for stability
  - Sync engine: bidirectional watch, debounce & loop suppression, write-lock retry
  - Auto-opener: platform-specific `start/open/xdg-open` or Word/WPS executable
- Key files
  - CLI entry: [src/cli/index.ts](file:///d:/projects/mdMCP/src/cli/index.ts)
  - MCP server: [src/mcp/server.ts](file:///d:/projects/mdMCP/src/mcp/server.ts)
  - MCP服务器：[src/mcp/server.ts](file:///d:/projects/mdMCP/src/mcp/server.ts)
  - 同步引擎：[src/sync/syncEngine.ts](file:///d:/projects/mdMCP/src/sync/syncEngine.ts)
  - 转换器：[src/converter/DocumentConverter.ts](file:///d:/projects/mdMCP/src/converter/DocumentConverter.ts)
  - 打开器（模块化）：
    - [appLauncher.ts](file:///d:/projects/mdMCP/src/services/appLauncher/appLauncher.ts)
    - [documentOpener.ts](file:///d:/projects/mdMCP/src/services/appLauncher/documentOpener.ts)
    - [platformUtils.ts](file:///d:/projects/mdMCP/src/services/appLauncher/platformUtils.ts)
    - [appConfig.ts](file:///d:/projects/mdMCP/src/services/appLauncher/appConfig.ts)

## Usage Tips
- Enable auto-save
  - VS Code: `files.autoSave = afterDelay`, `files.autoSaveDelay ≈ 800ms`
  - Word/WPS: turn on AutoSave (365) or shorten the auto-save interval
- On Windows, if you encounter `spawn winword ENOENT`
  - it means Word is not found in system PATH; the project will automatically fall back to `start`/default associated app
- EBUSY caused by DOCX write-lock
  - retry and `.pending` fallback are implemented; wait for unlock or save again to write successfully

## Common Commands
- Build: `npm run build`
- Type-check: `npm run typecheck`
- Start MCP server (local test):
  - PowerShell: `$env:MCP_TRANSPORT='stdio'; node dist/index.js`
  - or `mdsync-mcp` (requires `npm link`)
- Start CLI sync:
  - `node dist/cli/index.js sync <file> --open --prefer-word`


