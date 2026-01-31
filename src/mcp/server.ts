import { SyncEngine } from "../sync/syncEngine.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

export async function startMcpServer(engine: SyncEngine) {
  const server = new Server(
    {
      name: "markdown-word-sync",
      version: "0.1.0"
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "convert_and_sync",
          description: "Convert and start sync between Markdown and DOCX",
          inputSchema: {
            type: "object",
            properties: {
              markdownPath: { type: "string" },
              docxPath: { type: "string" },
              bidirectional: { type: "boolean" },
              watch: { type: "boolean" },
              openDocx: { type: "boolean" },
              preferWord: { type: "boolean" }
            }
          }
        },
        {
          name: "sync_status",
          description: "Get sync sessions status",
          inputSchema: {
            type: "object",
            properties: {
              sessionId: { type: "string" }
            }
          }
        }
      ]
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const args = request.params.arguments ?? {};
    if (name === "convert_and_sync") {
      const md = (args as any).markdownPath;
      const docx = (args as any).docxPath;
      const bi = Boolean((args as any).bidirectional ?? true);
      const watch = Boolean((args as any).watch ?? true);
      const openDocxOpt = Boolean((args as any).openDocx ?? true);
      const preferWordOpt = Boolean((args as any).preferWord ?? true);
      if (!md && !docx) {
        return {
          content: [{ type: "text", text: "markdownPath 或 docxPath 至少提供一个" }]
        };
      }
      const sessionId = await engine.startSession({ markdownPath: md, docxPath: docx, bidirectional: bi, watch, openDocx: openDocxOpt, preferWord: preferWordOpt });
      return {
        content: [{ type: "text", text: `会话已启动: ${sessionId}` }]
      };
    }
    if (name === "sync_status") {
      const status = engine.getStatus((args as any).sessionId);
      return {
        content: [{ type: "text", text: JSON.stringify(status) }]
      };
    }
    throw new Error(`Unknown tool: ${name}`);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
