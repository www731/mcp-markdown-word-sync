# Markdown ↔ Word/WPS 实时双向同步（MCP + CLI）

## 功能特性
- 实时双向同步：Markdown ⇄ DOCX
- 自动打开本地 Word/WPS（跨平台：Windows/macOS/Linux）
- 写锁重试与降级：自动处理 EBUSY/EPERM/EACCES，生成 `.pending` 文件作为降级方案
- 监听防抖与循环抑制：防止双向触发导致的同步死循环
- 双入口：CLI 直接调用，或在 AI 客户端内通过 MCP 调用工具

## 前置要求
- Node.js ≥ 18
- Windows/macOS/Linux；推荐安装 Microsoft Word 或 WPS Office
- 在编辑器/Word 中开启自动保存，获得“真·实时”同步体验

## 安装与构建
- 安装依赖
  - `npm install`
- 构建
  - `npm run build`
- 可选：注册全局命令
  - `npm link`
  - 将 `mdsync-mcp`、`mdsync` 等加入系统 PATH

## 快速开始（CLI）
- 启动同步并自动打开 DOCX
  - `node dist/cli/index.js sync <path-to.md-or.docx> --open --prefer-word`
  - Windows 示例：
    - `node dist/cli/index.js sync d:\projects\mdMCP\demo\example.md --open --prefer-word`
- 可选：使用通过 `npm link` 注册的全局命令
  - `mdsync sync <path> --open --prefer-word`
- 常用参数
  - 自动打开：默认开启；使用 `--no-open` 关闭
  - 双向同步与监控：`--bidirectional`、`--watch` 均默认开启
  - 打开偏好：`--prefer-word` 默认启用（优先使用 Word）

## 在 Claude 中使用（MCP）
- 背景：项目内置 MCP 服务器（stdio），对外提供以下工具：
  - `convert_and_sync`（建立同步）
  - `sync_status`（查询状态）
- ：使用全局命令 `mdsync-mcp`
  - 确保已执行 `npm run build && npm link`
  - 添加到 Claude 的 mcpServers 配置：
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
  - 重启 Claude；自动连接并列出工具
  - 工具调用示例（界面内）：
    - `convert_and_sync` 参数：
      - 至少提供 `markdownPath` 或 `docxPath` 之一
      - `bidirectional`（布尔，默认 true）
      - `watch`（布尔，默认 true）
      - `openDocx`（布尔，默认 true）
      - `preferWord`（布尔，默认 true）
    - `sync_status` 参数：
      - `sessionId`（可选；留空列出所有会话）

## 在 Cursor/Trea 中使用（MCP）
- 与 Claude 相同：添加指向 `mdsync-mcp` 的 mcpServers 条目
  - `command`: `mdsync-mcp`
  - `args`: `[]`
  - `env`: `{ "MCP_TRANSPORT": "stdio" }`
- 连接后客户端显示工具列表；选择并调用即可

## 工作原理（简述）
- 核心组件
  - 转换器：Markdown→DOCX（marked + docx），DOCX→Markdown（mammoth + turndown）
  - 监听器：`chokidar` 监控文件变更，带 `awaitWriteFinish` 保证稳定
  - 同步引擎：双向监听、防抖与循环抑制、写锁重试
  - 自动打开器：平台相关的 `start/open/xdg-open` 或 Word/WPS 可执行文件
- 关键文件
  - CLI 入口：[src/cli/index.ts](src/cli/index.ts)
  - MCP 服务器：[src/mcp/server.ts](src/mcp/server.ts)
  - 同步引擎：[src/sync/syncEngine.ts](src/sync/syncEngine.ts)
  - 转换器：[src/converter/DocumentConverter.ts](src/converter/DocumentConverter.ts)
  - 打开器（模块化）：
    - [appLauncher.ts](src/services/appLauncher/appLauncher.ts)
    - [documentOpener.ts](src/services/appLauncher/documentOpener.ts)
    - [platformUtils.ts](src/services/appLauncher/platformUtils.ts)
    - [appConfig.ts](src/services/appLauncher/appConfig.ts)

## 使用小贴士
- 开启自动保存
  - VS Code：`files.autoSave = afterDelay`，`files.autoSaveDelay ≈ 800ms`
  - Word/WPS：打开自动保存（365）或缩短自动保存间隔
- Windows `spawn winword ENOENT`
  - PATH 中未找到 Word；工具自动降级为 `start`/系统默认关联应用
- DOCX 写锁（EBUSY）
  - 已内置重试与 `.pending` 降级；等待解锁或再次保存即可

## 常用命令
- 构建：`npm run build`
- 类型检查：`npm run typecheck`
- 启动 MCP 服务器（本地测试）：
  - PowerShell：`$env:MCP_TRANSPORT='stdio'; node dist/index.js`
  - 或 `mdsync-mcp`（需 `npm link`）
- 启动 CLI 同步：
  - `node dist/cli/index.js sync <file> --open --prefer-word`
