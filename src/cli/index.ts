import { Command } from "commander";
import path from "node:path";
import { SyncEngine } from "../sync/syncEngine.js";

const program = new Command();
const engine = new SyncEngine();

program
  .name("mdsync")
  .description("Markdown ↔ DOCX 双向同步")
  .version("0.1.0");

program
  .command("sync")
  .argument("<file>", "Markdown(.md) 或 DOCX(.docx) 文件路径")
  .option("-b, --bidirectional", "启用双向同步", true)
  .option("-w, --watch", "启用文件监控", true)
  .option("-o, --open", "启动后自动打开DOCX（Word/WPS）", true)
  .option("--prefer-word", "优先用 Microsoft Word 打开", true)
  .action(async (file: string, options: { bidirectional?: boolean; watch?: boolean; open?: boolean; preferWord?: boolean }) => {
    const abs = path.resolve(file);
    const isMd = abs.toLowerCase().endsWith(".md");
    const isDocx = abs.toLowerCase().endsWith(".docx");
    if (!isMd && !isDocx) {
      process.stderr.write("请输入 .md 或 .docx 文件\n");
      process.exit(1);
    }
    const sessionId = await engine.startSession({
      markdownPath: isMd ? abs : undefined,
      docxPath: isDocx ? abs : undefined,
      bidirectional: Boolean(options.bidirectional ?? true),
      watch: Boolean(options.watch ?? true),
      openDocx: Boolean(options.open ?? true),
      preferWord: Boolean(options.preferWord ?? true)
    });
    process.stdout.write(`会话启动: ${sessionId}\n`);
  });

program.parseAsync(process.argv);
