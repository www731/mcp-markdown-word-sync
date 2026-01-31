import { startMcpServer } from "./mcp/server.js";
import { SyncEngine } from "./sync/syncEngine.js";

const engine = new SyncEngine();
const transport = process.env.MCP_TRANSPORT;
if (transport === "stdio") {
  startMcpServer(engine).catch((err) => {
    process.stderr.write(String(err) + "\n");
    process.exit(1);
  });
}

