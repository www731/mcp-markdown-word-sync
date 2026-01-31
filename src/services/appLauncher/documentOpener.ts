import path from "node:path";
import fs from "node:fs/promises";
import { execAsync, fileExists, spawnDetached, normalizeWin } from "./platformUtils.js";

export type OpenOptions = {
  wait?: boolean;
  silent?: boolean;
  args?: string[];
  preferWord?: boolean;
};

export type OpenResult = {
  success: boolean;
  method: string;
};

export class IntelligentDocumentOpener {
  private platform: NodeJS.Platform;
  private defaultApps: Map<string, string> = new Map();
  private initialized = false;

  constructor() {
    this.platform = process.platform;
  }

  async openDocument(filePath: string, options: OpenOptions = {}): Promise<OpenResult> {
    await this.ensureInitialized();
    await this.validateFile(filePath);
    switch (this.platform) {
      case "win32":
        return await this.openWindows(filePath, options);
      case "darwin":
        return await this.openMacOS(filePath, options);
      default:
        return await this.openLinux(filePath, options);
    }
  }

  private async ensureInitialized() {
    if (this.initialized) return;
    switch (this.platform) {
      case "win32":
        await this.detectWindowsApps();
        break;
      case "darwin":
        await this.detectMacApps();
        break;
      case "linux":
        await this.detectLinuxApps();
        break;
    }
    this.initialized = true;
  }

  private async validateFile(filePath: string) {
    const abs = path.resolve(filePath);
    await fs.access(abs, fs.constants.R_OK);
  }

  private async detectWindowsApps() {
    const msPaths = [
      "C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE",
      "C:\\Program Files (x86)\\Microsoft Office\\root\\Office16\\WINWORD.EXE",
      "C:\\Program Files\\Microsoft Office\\Office15\\WINWORD.EXE",
      `${process.env.LOCALAPPDATA}\\Microsoft\\WindowsApps\\WINWORD.EXE`
    ];
    for (const p of msPaths) {
      if (await fileExists(p)) {
        this.defaultApps.set("word", p);
        break;
      }
    }
    const wpsPaths = [
      "C:\\Program Files\\WPS Office\\ksolaunch.exe",
      "C:\\Program Files (x86)\\WPS Office\\ksolaunch.exe",
      `${process.env.LOCALAPPDATA}\\Kingsoft\\WPS Office\\ksolaunch.exe`
    ];
    for (const p of wpsPaths) {
      if (await fileExists(p)) {
        this.defaultApps.set("wps", p);
        break;
      }
    }
  }

  private async detectMacApps() {
    const apps = ["/Applications/Microsoft Word.app", "/Applications/WPS Office.app", "/Applications/LibreOffice.app"];
    for (const app of apps) {
      if (await fileExists(app)) {
        this.defaultApps.set("word", app);
        break;
      }
    }
  }

  private async detectLinuxApps() {
    const apps = ["wps", "libreoffice", "soffice", "onlyoffice"];
    for (const app of apps) {
      try {
        await execAsync(`which ${app}`);
        this.defaultApps.set("word", app);
        break;
      } catch {}
    }
  }

  private async openWindows(filePath: string, options: OpenOptions): Promise<OpenResult> {
    const normalizedPath = normalizeWin(filePath);
    try {
      const command = options.wait ? `start /wait "" "${normalizedPath}"` : `start "" "${normalizedPath}"`;
      await execAsync(command);
      return { success: true, method: "start-command" };
    } catch {}
    try {
      await execAsync(`explorer "${normalizedPath}"`);
      return { success: true, method: "explorer" };
    } catch {}
    const prefer = options.preferWord ? this.defaultApps.get("word") : this.defaultApps.get("wps");
    const fallback = this.defaultApps.get("word") || this.defaultApps.get("wps");
    const app = prefer || fallback;
    if (app) {
      spawnDetached(app, [normalizedPath, ...(options.args ?? [])]);
      return { success: true, method: "direct-executable" };
    }
    throw new Error("无法打开文档，请确认已安装 Word 或 WPS");
  }

  private async openMacOS(filePath: string, options: OpenOptions): Promise<OpenResult> {
    const normalizedPath = path.resolve(filePath);
    try {
      const args: string[] = ["open", normalizedPath];
      if (options.wait) args.push("-W");
      await execAsync(args.join(" "));
      return { success: true, method: "open-command" };
    } catch {}
    const apps = ["/Applications/Microsoft Word.app", "/Applications/WPS Office.app", "/Applications/LibreOffice.app"];
    for (const app of apps) {
      if (await fileExists(app)) {
        await execAsync(`open -a "${app}" "${normalizedPath}"`);
        return { success: true, method: "specific-app" };
      }
    }
    throw new Error("未找到可用的文档编辑软件");
  }

  private async openLinux(filePath: string, options: OpenOptions): Promise<OpenResult> {
    const normalizedPath = path.resolve(filePath);
    try {
      spawnDetached("xdg-open", [normalizedPath]);
      return { success: true, method: "xdg-open" };
    } catch {}
    const apps = ["wps", "libreoffice", "soffice", "onlyoffice", "gnome-open", "kde-open"];
    for (const app of apps) {
      try {
        await execAsync(`which ${app}`);
        spawnDetached(app, [normalizedPath]);
        return { success: true, method: app };
      } catch {}
    }
    throw new Error("请安装 WPS、LibreOffice 或 OnlyOffice");
  }
}

