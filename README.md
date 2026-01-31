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

## 使用建议
- 开启自动保存
  - VS Code：`files.autoSave = afterDelay`、`files.autoSaveDelay ≈ 800ms`
  - Word/WPS：开启 AutoSave（365）或缩短自动保存间隔
- Windows 下如果遇到 `spawn winword ENOENT`
  - 说明系统 PATH 未找到 Word；本项目会自动回退到 `start`/默认关联应用
- DOCX 写锁导致的 EBUSY
  - 已实现重试与 `.pending` 回退；等待解锁或再次保存即可正常写入

## 常见命令
- 构建：`npm run build`
- 类型检查：`npm run typecheck`
- 启动 MCP 服务器（本地测试）：
  - PowerShell：`$env:MCP_TRANSPORT='stdio'; node dist/index.js`
  - 或 `mdsync-mcp`（需 `npm link`）
- 启动 CLI 同步：
  - `node dist/cli/index.js sync <文件> --open --prefer-word`



