import chokidar from "chokidar";

export type ChangeSource = "markdown" | "docx";

export class FileWatcher {
  private mdWatcher?: chokidar.FSWatcher;
  private docxWatcher?: chokidar.FSWatcher;
  private lastEventAt = 0;
  private debounceMs: number;

  constructor(opts?: { debounceMs?: number }) {
    this.debounceMs = opts?.debounceMs ?? 500;
  }

  async watch(markdownPath: string | undefined, docxPath: string | undefined, onChange: (src: ChangeSource) => void) {
    if (markdownPath) {
      this.mdWatcher = chokidar.watch(markdownPath, { 
        ignoreInitial: true,
        awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 }
      });
      this.mdWatcher.on("change", () => {
        const now = Date.now();
        if (now - this.lastEventAt < this.debounceMs) return;
        this.lastEventAt = now;
        onChange("markdown");
      });
    }
    if (docxPath) {
      this.docxWatcher = chokidar.watch(docxPath, { 
        ignoreInitial: true,
        awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 }
      });
      this.docxWatcher.on("change", () => {
        const now = Date.now();
        if (now - this.lastEventAt < this.debounceMs) return;
        this.lastEventAt = now;
        onChange("docx");
      });
    }
  }

  async close() {
    await this.mdWatcher?.close();
    await this.docxWatcher?.close();
  }
}
