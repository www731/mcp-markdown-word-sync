import path from "node:path";
import fs from "node:fs/promises";
import { DocumentConverter } from "../converter/DocumentConverter.js";
import { FileWatcher, ChangeSource } from "../services/fileWatcher.js";
import { openDocx } from "../services/appLauncher/appLauncher.js";

export type SyncSessionOptions = {
  markdownPath?: string;
  docxPath?: string;
  bidirectional?: boolean;
  watch?: boolean;
  openDocx?: boolean;
  preferWord?: boolean;
};

export type SyncSessionStatus = {
  id: string;
  markdownPath?: string;
  docxPath?: string;
  active: boolean;
  lastSync?: number;
};

export class SyncEngine {
  private sessions = new Map<string, SyncSession>();
  private converter = new DocumentConverter();

  async startSession(opts: SyncSessionOptions) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const session = new SyncSession(id, opts, this.converter);
    this.sessions.set(id, session);
    await session.start();
    return id;
  }

  getStatus(id?: string) {
    if (id) {
      const s = this.sessions.get(id);
      if (!s) return null;
      return s.status();
    }
    return Array.from(this.sessions.values()).map((s) => s.status());
  }
}

class SyncSession {
  private id: string;
  private markdownPath?: string;
  private docxPath?: string;
  private bidirectional: boolean;
  private watch: boolean;
  private lastSync = 0;
  private watcher?: FileWatcher;
  private converter: DocumentConverter;
  private preferWord = true;
  private ignoreDocxUntil = 0;
  private ignoreMdUntil = 0;

  constructor(id: string, opts: SyncSessionOptions, converter: DocumentConverter) {
    this.id = id;
    this.markdownPath = opts.markdownPath ? path.resolve(opts.markdownPath) : undefined;
    this.docxPath = opts.docxPath ? path.resolve(opts.docxPath) : undefined;
    this.bidirectional = Boolean(opts.bidirectional ?? true);
    this.watch = Boolean(opts.watch ?? true);
    this.converter = converter;
    this.preferWord = Boolean(opts.preferWord ?? true);
  }

  async start() {
    if (this.markdownPath && !this.docxPath) {
      this.docxPath = this.converter.defaultDocxPath(this.markdownPath);
      await this.converter.markdownToDocx(this.markdownPath, this.docxPath);
      this.lastSync = Date.now();
      if (this.docxPath && (this.openDocxEnabled())) {
        await openDocx(this.docxPath, this.preferWord);
      }
    } else if (this.docxPath && !this.markdownPath) {
      this.markdownPath = this.converter.defaultMarkdownPath(this.docxPath);
      await this.converter.docxToMarkdown(this.docxPath, this.markdownPath);
      this.lastSync = Date.now();
      if (this.docxPath && (this.openDocxEnabled())) {
        await openDocx(this.docxPath, this.preferWord);
      }
    } else if (this.docxPath && (this.openDocxEnabled())) {
      await openDocx(this.docxPath, this.preferWord);
    }
    if (this.watch) {
      this.watcher = new FileWatcher({ debounceMs: 500 });
      await this.watcher.watch(this.markdownPath, this.bidirectional ? this.docxPath : undefined, async (src) => {
        if (src === "markdown" && this.markdownPath && this.docxPath) {
          if (Date.now() < this.ignoreDocxUntil) return;
          console.log(`[sync] markdown -> docx ${this.markdownPath} => ${this.docxPath}`);
          await this.converter.markdownToDocx(this.markdownPath, this.docxPath);
          this.lastSync = Date.now();
          this.ignoreDocxUntil = Date.now() + 1000;
        } else if (src === "docx" && this.bidirectional && this.docxPath && this.markdownPath) {
          if (Date.now() < this.ignoreMdUntil) return;
          console.log(`[sync] docx -> markdown ${this.docxPath} => ${this.markdownPath}`);
          await this.converter.docxToMarkdown(this.docxPath, this.markdownPath);
          this.lastSync = Date.now();
          this.ignoreMdUntil = Date.now() + 1000;
        }
      });
    }
  }

  private openDocxEnabled() {
    return true;
  }

  status(): SyncSessionStatus {
    return {
      id: this.id,
      markdownPath: this.markdownPath,
      docxPath: this.docxPath,
      active: Boolean(this.watcher),
      lastSync: this.lastSync
    };
  }
}
