# MCP Markdown-Word 双向同步系统设计文档

## 📋 系统概述

### 核心目标
构建一个基于 **Model Context Protocol (MCP)** 的智能文档同步系统，实现 **Markdown ↔ Word/WPS 双向实时同步**，为开发者、写作者和学生提供无缝的文档工作流。
**当用户在 Markdown 文件中编辑时，系统会自动将变更同步到 Word 文档，反之亦然。**

### 系统定位
- **技术栈**：TypeScript 全栈实现
- **协议**：MCP (Model Context Protocol)
- **目标用户**：需要在 Markdown 和 Word 间切换的开发者、技术文档作者、学生
- **核心价值**：一次编写，多格式同步，AI 助手集成

## 🏗️ 系统架构

### 整体架构图
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI 助手       │    │   MCP 服务器    │    │   文件系统      │
│  (Claude/Cline) │◄──►│  (TypeScript)   │◄──►│  (本地/云端)    │
|   (trea/cursor) |    |                  |   |                 |
└─────────────────┘    └────────┬────────┘    └─────────────────┘
                                 │
                     ┌───────────┴───────────┐
                     │     同步引擎           │
                     │  ┌─────────────────┐  │
                     │  │   转换层        │  │
                     │  │  Markdown↔DOCX │  │
                     │  └─────────────────┘  │
                     │  ┌─────────────────┐  │
                     │  │   监控层        │  │
                     │  │   文件监听      │  │
                     │  └─────────────────┘  │
                     └───────────────────────┘
```

### 技术栈分层

| 层级 | 技术选择 | 职责 |
|------|---------|------|
| **协议层** | `@modelcontextprotocol/sdk` | MCP 协议实现，与 AI 助手通信 |
| **业务层** | TypeScript + OOP | 核心同步逻辑、转换算法 |
| **工具层** | `mammoth` + `marked` + `docx` | 文档格式转换 |
| **监控层** | `chokidar` | 文件系统监听 |
| **接口层** | CLI + WebSocket + REST API | 多入口用户交互 |
| **部署层** | npm 包 + Docker | 跨平台分发 |

## 📦 模块详细设计

### 1. MCP 服务器核心 (`src/core/McpServer.ts`)

```typescript
/**
 * MCP 服务器主类
 * 职责：处理 MCP 协议通信，路由工具调用
 */
export class MarkdownSyncMcpServer {
  private server: Server;
  private sessionManager: SessionManager;
  private toolRegistry: Map<string, ToolExecutor>;
  
  constructor(options: ServerOptions) {
    this.server = new Server({
      name: 'markdown-word-sync',
      version: '1.0.0',
      capabilities: {
        tools: {},
        resources: { subscribe: true },
        prompts: true
      }
    });
    
    this.initializeHandlers();
    this.registerBuiltinTools();
  }
  
  // 协议处理器映射
  private readonly HANDLERS = {
    'tools/list': this.handleListTools.bind(this),
    'tools/call': this.handleCallTool.bind(this),
    'resources/list': this.handleListResources.bind(this),
    'notifications/tool-updated': this.handleToolUpdated.bind(this)
  };
}
```

### 2. 双向同步引擎 (`src/core/SyncEngine.ts`)

```typescript
/**
 * 双向同步引擎 - 系统最核心组件
 * 实现 3-way merge 算法处理冲突
 */
export class BidirectionalSyncEngine {
  private syncSessions: Map<string, SyncSession>;
  private conflictResolver: ConflictResolver;
  private changeBuffer: ChangeBuffer;
  
  // 同步状态机
  private readonly SYNC_STATES = {
    IDLE: 'idle',
    CONVERTING: 'converting',
    SYNCING: 'syncing',
    RESOLVING_CONFLICT: 'resolving_conflict',
    ERROR: 'error'
  } as const;
  
  /**
   * 执行双向同步
   * @param change 检测到的文件变更
   * @returns 同步结果
   */
  async sync(change: FileChange): Promise<SyncResult> {
    // 1. 验证变更
    await this.validateChange(change);
    
    // 2. 确定同步方向
    const direction = this.determineDirection(change);
    
    // 3. 执行转换
    const converted = await this.convertContent(change, direction);
    
    // 4. 检查冲突
    const conflicts = await this.detectConflicts(converted);
    
    if (conflicts.length > 0) {
      return await this.resolveConflicts(conflicts);
    }
    
    // 5. 应用变更
    return await this.applyChanges(converted);
  }
  
  /**
   * 智能冲突解决策略
   */
  private async resolveConflicts(conflicts: Conflict[]): Promise<SyncResult> {
    // 策略1：基于时间戳的自动解决
    // 策略2：保留两者并标记
    // 策略3：调用用户定义的解决器
    // 策略4：生成解决建议供用户选择
    
    return {
      status: 'resolved',
      resolutions: conflicts.map(conflict => ({
        type: conflict.type,
        solution: this.chooseResolutionStrategy(conflict),
        applied: true
      }))
    };
  }
}
```

### 3. 文档转换器 (`src/converter/DocumentConverter.ts`)

```typescript
/**
 * 智能文档转换器
 * 支持 Markdown ↔ DOCX 双向转换，保留格式和元数据
 */
export class IntelligentDocumentConverter {
  private readonly MARKDOWN_TO_DOCX_RULES: ConversionRule[] = [
    // 标题转换规则
    { 
      pattern: /^# (.*$)/gm, 
      docxStyle: 'Heading1',
      preserve: ['emphasis', 'links']
    },
    // 列表转换规则
    {
      pattern: /^[\-\*\+] (.*$)/gm,
      docxStyle: 'ListBullet',
      nestedRules: {
        level2: { pattern: /^ {2}[\-\*\+] /, style: 'ListBullet2' }
      }
    },
    // 代码块转换规则
    {
      pattern: /```(\w+)?\n([\s\S]*?)\n```/g,
      handler: this.convertCodeBlock.bind(this),
      preserveSyntaxHighlighting: true
    }
  ];
  
  /**
   * 转换文档（核心方法）
   */
  async convert(
    source: DocumentSource,
    targetFormat: DocumentFormat,
    options: ConversionOptions = {}
  ): Promise<ConversionResult> {
    // 解析源文档结构
    const ast = await this.parseDocument(source);
    
    // 应用转换规则链
    const converted = await this.applyConversionRules(ast, {
      from: source.format,
      to: targetFormat,
      rules: this.getConversionRules(source.format, targetFormat)
    });
    
    // 后处理：样式优化、链接修复等
    return await this.postProcess(converted, options);
  }
  
  /**
   * 保留文档语义的转换策略
   */
  private preserveSemantics(
    sourceElement: DocumentElement,
    targetElement: DocumentElement
  ): void {
    // 保留链接关系
    // 保持引用完整性
    // 转换相对路径为绝对路径
    // 处理交叉引用
  }
}
```

### 4. 文件监控服务 (`src/services/FileWatcher.ts`)

```typescript
/**
 * 智能文件监控服务
 * 支持防抖、批量处理、事件优先级
 */
export class IntelligentFileWatcher {
  private watchers: Map<string, chokidar.FSWatcher>;
  private eventQueue: PriorityQueue<FileEvent>;
  private debounceTimers: Map<string, NodeJS.Timeout>;
  
  // 监控策略配置
  private readonly WATCH_STRATEGIES = {
    DEFAULT: {
      debounce: 500,
      priority: 'normal',
      batch: true,
      ignorePatterns: [/(^|[\/\\])\../, /\.tmp$/]
    },
    INTENSIVE: {
      debounce: 100,
      priority: 'high',
      batch: false,
      deepWatch: true
    }
  };
  
  /**
   * 智能监控文件对
   */
  watchPair(
    markdownPath: string,
    wordPath: string,
    options: WatchOptions = {}
  ): WatchSession {
    const sessionId = this.generateSessionId(markdownPath, wordPath);
    
    // 创建智能监控器
    const watcher = chokidar.watch([markdownPath, wordPath], {
      ignored: options.ignorePatterns || this.WATCH_STRATEGIES.DEFAULT.ignorePatterns,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: options.debounce || 1000,
        pollInterval: 100
      },
      depth: options.deepWatch ? 10 : undefined
    });
    
    // 设置事件处理器链
    this.setupEventHandlers(watcher, sessionId, options);
    
    return {
      id: sessionId,
      stop: () => this.stopWatching(sessionId),
      getStatus: () => this.getSessionStatus(sessionId)
    };
  }
  
  /**
   * 智能事件处理
   */
  private handleFileEvent(event: FileEvent): void {
    // 1. 去重和防抖
    if (this.shouldIgnoreEvent(event)) return;
    
    // 2. 设置优先级
    const priority = this.calculateEventPriority(event);
    
    // 3. 加入处理队列
    this.eventQueue.enqueue(event, priority);
    
    // 4. 触发处理（基于优先级）
    this.processEventQueue();
  }
}
```

### 5. CLI 交互界面 (`src/cli/InteractiveCli.ts`)

```typescript
/**
 * 交互式 CLI 界面
 * 提供直观的命令行体验
 */
export class InteractiveCli {
  private readonly COMMANDS = {
    INIT: {
      command: 'init',
      description: '初始化新的同步项目',
      options: {
        template: ['-t, --template <name>', '项目模板'],
        directory: ['-d, --dir <path>', '项目目录']
      },
      action: this.handleInit.bind(this)
    },
    SYNC: {
      command: 'sync <file>',
      description: '开始同步文件',
      options: {
        bidirectional: ['-b, --bidirectional', '双向同步'],
        watch: ['-w, --watch', '监控模式']
      },
      action: this.handleSync.bind(this)
    },
    STATUS: {
      command: 'status [session]',
      description: '查看同步状态',
      action: this.handleStatus.bind(this)
    }
  };
  
  /**
   * 交互式初始化向导
   */
  async initWizard(): Promise<ProjectConfig> {
    const prompts = [
      {
        type: 'select',
        name: 'template',
        message: '选择项目模板:',
        choices: [
          { title: '技术文档', value: 'tech-docs' },
          { title: '学术论文', value: 'academic' },
          { title: '商业报告', value: 'business' },
          { title: '自定义', value: 'custom' }
        ]
      },
      {
        type: 'text',
        name: 'markdownPath',
        message: 'Markdown 文件路径:',
        validate: (value: string) => 
          value.endsWith('.md') ? true : '必须是 .md 文件'
      },
      {
        type: 'toggle',
        name: 'autoSync',
        message: '启用自动同步?',
        initial: true,
        active: '是',
        inactive: '否'
      }
    ];
    
    const answers = await enquirer.prompt(prompts);
    return await this.generateProjectConfig(answers);
  }
  
  /**
   * 实时状态展示
   */
  showLiveStatus(session: SyncSession): void {
    // 创建终端仪表盘
    const dashboard = new Dashboard({
      title: '同步状态监控',
      refreshRate: 1000,
      widgets: [
        {
          type: 'gauge',
          title: '同步进度',
          value: session.progress,
          maxValue: 100
        },
        {
          type: 'log',
          title: '最近活动',
          lines: session.recentActivities.slice(-10)
        },
        {
          type: 'table',
          title: '文件状态',
          columns: ['文件', '状态', '最后同步'],
          rows: session.files.map(f => [f.name, f.status, f.lastSynced])
        }
      ]
    });
    
    dashboard.render();
  }
}
```

### 6. Web 管理界面 (`src/web/SyncDashboard.ts`)

```typescript
/**
 * Web 管理界面
 * 实时显示同步状态，提供可视化控制
 */
@Controller('/api/sync')
export class SyncDashboardController {
  private syncSessions: Map<string, SyncSession>;
  private webSocketServer: WebSocket.Server;
  
  @Get('/sessions')
  async getActiveSessions(@Res() res: Response): Promise<void> {
    const sessions = Array.from(this.syncSessions.values()).map(session => ({
      id: session.id,
      files: session.files,
      status: session.status,
      stats: {
        syncCount: session.syncCount,
        lastSync: session.lastSynced,
        conflictsResolved: session.conflictsResolved
      }
    }));
    
    res.json({ sessions });
  }
  
  @Post('/session/:id/pause')
  async pauseSession(
    @Param('id') sessionId: string,
    @Body() body: { duration?: number }
  ): Promise<ApiResponse> {
    const session = this.syncSessions.get(sessionId);
    if (!session) {
      throw new NotFoundException(`会话 ${sessionId} 不存在`);
    }
    
    await session.pause(body.duration);
    
    // 广播状态更新
    this.broadcastStatusUpdate(sessionId, 'paused');
    
    return { success: true, message: '会话已暂停' };
  }
  
  /**
   * WebSocket 实时更新
   */
  @WebSocketGateway('/ws/sync')
  export class SyncWebSocketGateway {
    @WebSocketServer()
    server: WebSocket.Server;
    
    @SubscribeMessage('subscribe')
    handleSubscribe(
      @ConnectedSocket() client: WebSocket,
      @MessageBody() data: { sessionId: string }
    ): void {
      // 加入会话房间
      client.join(`session:${data.sessionId}`);
      
      // 发送当前状态
      const session = this.getSession(data.sessionId);
      client.send(JSON.stringify({
        type: 'INITIAL_STATE',
        payload: session.getState()
      }));
    }
  }
}
```

## 🔧 配置系统

### 1. 配置文件结构 (`config/default.yaml`)

```yaml
# 系统默认配置
system:
  name: "markdown-word-sync"
  version: "1.0.0"
  logLevel: "info"
  maxConcurrentSyncs: 5

# 同步引擎配置
sync:
  strategy: "bidirectional"
  debounceMs: 500
  conflictResolution: "smart"
  backup:
    enabled: true
    maxBackups: 10
    location: "./.sync-backups"

# 转换器配置
conversion:
  markdownToDocx:
    preserveFormatting: true
    imageHandling: "embed"
    tableStyle: "GridTable4-Accent1"
  docxToMarkdown:
    preserveStyles: true
    headingStyle: "atx"
    listStyle: "dash"

# MCP 配置
mcp:
  server:
    transport: "stdio"
    capabilities:
      tools: true
      resources: true
      prompts: true
  tools:
    - name: "convert_and_sync"
      description: "Convert markdown to word and establish sync"
    - name: "sync_status"
      description: "Check sync status"

# 监控配置
monitoring:
  enabled: true
  metrics:
    - "sync_duration"
    - "conflict_count"
    - "conversion_quality"
  alerts:
    - condition: "conflict_count > 5"
      action: "notify_user"
```

### 2. 环境配置

```typescript
// src/config/Environment.ts
export class EnvironmentConfig {
  static load(): AppConfig {
    const env = process.env.NODE_ENV || 'development';
    
    // 基础配置
    const baseConfig = yaml.load(
      fs.readFileSync(`./config/${env}.yaml`, 'utf8')
    ) as BaseConfig;
    
    // 环境变量覆盖
    const envOverrides = {
      databaseUrl: process.env.DATABASE_URL,
      logLevel: process.env.LOG_LEVEL,
      maxSyncSessions: parseInt(process.env.MAX_SYNC_SESSIONS || '10')
    };
    
    // 用户配置合并
    const userConfig = this.loadUserConfig();
    
    return deepMerge(baseConfig, envOverrides, userConfig);
  }
  
  private static loadUserConfig(): Partial<AppConfig> {
    const configPaths = [
      './.syncrc',
      './.syncrc.json',
      './.syncrc.yaml',
      path.join(os.homedir(), '.config', 'markdown-sync', 'config.yaml')
    ];
    
    for (const configPath of configPaths) {
      if (fs.existsSync(configPath)) {
        return this.parseConfigFile(configPath);
      }
    }
    
    return {};
  }
}
```

## 🚀 部署与分发

### 1. npm 包配置 (`package.json` 关键部分)

```json
{
  "name": "markdown-word-sync",
  "version": "1.0.0",
  "description": "Intelligent bidirectional sync between Markdown and Word documents",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "mdsync": "./dist/cli/index.js",
    "markdown-sync": "./dist/cli/index.js"
  },
  "files": [
    "dist",
    "templates",
    "config"
  ],
  "scripts": {
    "build": "tsc && chmod +x dist/cli/index.js",
    "dev": "nodemon --watch src --exec ts-node src/index.ts",
    "start:mcp": "node dist/index.js",
    "start:web": "node dist/web/server.js",
    "test": "jest --coverage",
    "package": "npm run build && npm pack",
    "publish:beta": "npm run build && npm publish --tag beta"
  },
  "keywords": [
    "markdown",
    "word",
    "sync",
    "mcp",
    "claude",
    "document-conversion"
  ],
  "mcp": {
    "servers": {
      "markdown-sync": {
        "command": "node",
        "args": ["${npm_package_main}"],
        "env": {
          "MCP_LOG_LEVEL": "info"
        }
      }
    }
  }
}
```

### 2. Docker 部署

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# 生产镜像
FROM node:18-alpine
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/templates ./templates
COPY --from=builder /app/config ./config

RUN addgroup -g 1001 -S syncuser && \
    adduser -S syncuser -u 1001 && \
    chown -R syncuser:syncuser /app

USER syncuser

EXPOSE 3000
ENV NODE_ENV=production
ENV MCP_TRANSPORT=stdio

CMD ["node", "dist/index.js"]
```

## 📊 监控与指标

### 1. 关键性能指标

```typescript
// src/metrics/SyncMetrics.ts
export class SyncMetricsCollector {
  private metrics: Map<string, MetricSeries>;
  
  // 收集的关键指标
  trackSyncOperation(operation: SyncOperation): void {
    this.recordMetric('sync_duration_ms', operation.duration);
    this.recordMetric('file_size_bytes', operation.fileSize);
    this.recordMetric('conversion_quality', operation.qualityScore);
    
    if (operation.conflicts > 0) {
      this.recordMetric('conflicts_total', operation.conflicts);
      this.recordMetric('conflicts_resolved', operation.resolvedConflicts);
    }
  }
  
  // 生成健康报告
  generateHealthReport(): HealthReport {
    return {
      timestamp: new Date(),
      uptime: process.uptime(),
      sessions: this.syncSessions.size,
      metrics: {
        averageSyncTime: this.calculateAverage('sync_duration_ms'),
        successRate: this.calculateSuccessRate(),
        conflictRate: this.calculateConflictRate(),
        resourceUsage: {
          memory: process.memoryUsage(),
          cpu: this.getCpuUsage()
        }
      },
      alerts: this.checkAlerts()
    };
  }
}
```

### 2. 日志系统

```typescript
// src/logging/StructuredLogger.ts
export class StructuredLogger {
  private logger: winston.Logger;
  
  constructor() {
    this.logger = winston.createLogger({
      level: config.get('logLevel'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ 
          filename: 'logs/error.log', 
          level: 'error' 
        }),
        new winston.transports.File({ 
          filename: 'logs/combined.log' 
        }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });
  }
  
  logSyncEvent(event: SyncEvent): void {
    this.logger.info('同步事件', {
      eventType: event.type,
      sessionId: event.sessionId,
      filePath: event.filePath,
      direction: event.direction,
      duration: event.duration,
      success: event.success,
      metadata: event.metadata
    });
  }
}
```

## 🎯 使用场景示例

### 场景1：技术文档编写
```
用户: /claude 帮我把API文档草稿转成Word格式给产品经理看
系统: ✅ 已转换并建立同步
       - README.md → API_Spec.docx
       - 双向同步已启用
       - Word文档已自动打开
       
产品经理在Word中添加反馈 → 自动同步回Markdown
开发者在Markdown中更新接口 → 自动更新Word文档
```

### 场景2：学术论文协作
```
教授: 用Word写论文草稿，需要版本控制
学生: 用Markdown写代码和公式
系统: 建立双向同步，保持格式一致
      自动处理参考文献编号
      保留LaTeX数学公式
```

### 场景3：敏捷开发文档
```
开发: Markdown写需求文档 (Git版本控制)
测试: Word写测试用例 (与测试系统集成)
PM: 实时查看最新状态
系统: 自动生成变更日志
      冲突智能解决
      备份历史版本
```

## 🔄 工作流集成

### 与开发工具集成
```yaml
# .vscode/settings.json
{
  "markdown-word-sync.autoSync": true,
  "markdown-word-sync.syncOnSave": true,
  "markdown-word-sync.defaultWordTemplate": "./templates/tech-doc.dotx"
}

# Git hooks
# .git/hooks/pre-commit
#!/bin/bash
mdsync backup --before-commit
```

### CI/CD 流水线
```yaml
# .github/workflows/docs-sync.yml
name: Document Sync
on:
  push:
    paths:
      - 'docs/**/*.md'
      
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      
      - name: Sync Markdown to Word
        run: |
          npm install markdown-word-sync
          mdsync convert docs/**/*.md --output-dir ./word-docs
          
      - name: Upload Word documents
        uses: actions/upload-artifact@v3
        with:
          name: word-documents
          path: ./word-docs/*.docx
```

## 📈 路线图

### Phase 1: MVP (当前)
- ✓ Markdown ↔ DOCX 基础转换
- ✓ 文件监控与单向同步
- ✓ MCP 基础集成
- ✓ CLI 工具

### Phase 2: 增强版 (1-2个月)
- 双向同步引擎
- 冲突解决算法
- Web 管理界面
- 模板系统
- 性能优化

### Phase 3: 企业版 (3-4个月)
- 多用户协作
- 云存储集成 (Google Drive, OneDrive)
- API 服务
- 高级分析面板
- 插件系统

### Phase 4: AI 增强 (未来)
- AI 辅助格式优化
- 智能内容建议
- 自动摘要生成
- 多语言支持

---

这份文档为你的 AI 助手（如 Claude/Trae）提供了完整的系统理解。它现在可以：

1. **理解系统架构**和设计决策
2. **协助代码编写**，了解各模块职责
3. **调试问题**，知道系统如何工作
4. **规划新功能**，基于现有架构
5. **解释工作原理**，向他人说明系统

你可以将此文档保存在项目中，随时让 AI 助手参考，它会基于这个完整上下文提供更精准的协助！

运行步骤npm run typecheck
npm run typecheck
npm run build
node dist/index.js

- 启动 MCP 服务器
  - node dist/index.js
- 启动同步并自动打开 DOCX
  - node dist/cli/index.js sync d:\projects\mdMCP\demo\sample.md --open --prefer-word
- 只启动同步，不自动打开
  - node dist/cli/index.js sync <文件> --no-open
相关文件

- CLI入口: cli/index.ts
- 同步引擎: syncEngine.ts
- 自动打开（按你的文档拆分模块化）:
  - appLauncher.ts
  - documentOpener.ts
  - platformUtils.ts
  - appConfig.ts