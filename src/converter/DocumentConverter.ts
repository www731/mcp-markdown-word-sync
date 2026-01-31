import fs from "node:fs/promises";
import path from "node:path";
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";
import mammoth from "mammoth";
import TurndownService from "turndown";
import { marked } from "marked";

export class DocumentConverter {
  async markdownToDocx(markdownPath: string, docxPath?: string) {
    const absMd = path.resolve(markdownPath);
    const md = await fs.readFile(absMd, "utf8");
    const tokens = marked.lexer(md);
    const children: Paragraph[] = [];
    for (const t of tokens) {
      if (t.type === "heading") {
        children.push(new Paragraph({ text: t.text, heading: this.heading(t.depth) }));
      } else if (t.type === "paragraph") {
        children.push(new Paragraph({ children: [new TextRun(t.text)] }));
      } else if (t.type === "text") {
        children.push(new Paragraph({ children: [new TextRun(t.text)] }));
      } else if (t.type === "list") {
        for (const item of t.items ?? []) {
          children.push(new Paragraph({ text: item.text }));
        }
      } else if (t.type === "code") {
        children.push(new Paragraph({ children: [new TextRun({ text: t.text })] }));
      }
    }
    const doc = new Document({ sections: [{ properties: {}, children }] });
    const outPath = path.resolve(docxPath ?? this.defaultDocxPath(absMd));
    const buf = await Packer.toBuffer(doc);
    await this.writeFileWithRetry(outPath, buf);
    return outPath;
  }

  async docxToMarkdown(docxPath: string, markdownPath?: string) {
    const absDocx = path.resolve(docxPath);
    const result = await mammoth.convertToHtml({ path: absDocx });
    const html = result.value;
    const turndown = new TurndownService();
    const md = turndown.turndown(html);
    const outPath = path.resolve(markdownPath ?? this.defaultMarkdownPath(absDocx));
    await this.writeFileWithRetry(outPath, Buffer.from(md, "utf8"));
    return outPath;
  }

  heading(depth: number) {
    if (depth <= 1) return HeadingLevel.TITLE;
    if (depth === 2) return HeadingLevel.HEADING_1;
    if (depth === 3) return HeadingLevel.HEADING_2;
    if (depth === 4) return HeadingLevel.HEADING_3;
    if (depth === 5) return HeadingLevel.HEADING_4;
    return HeadingLevel.HEADING_5;
  }

  defaultDocxPath(mdPath: string) {
    const dir = path.dirname(mdPath);
    const base = path.basename(mdPath, path.extname(mdPath));
    return path.join(dir, `${base}.docx`);
  }

  defaultMarkdownPath(docxPath: string) {
    const dir = path.dirname(docxPath);
    const base = path.basename(docxPath, path.extname(docxPath));
    return path.join(dir, `${base}.md`);
  }

  private async writeFileWithRetry(filePath: string, data: Buffer) {
    const maxAttempts = 8;
    let attempt = 0;
    let delayMs = 200;
    while (attempt < maxAttempts) {
      try {
        await fs.writeFile(filePath, data);
        return;
      } catch (e: any) {
        const code = e?.code;
        if (code === "EBUSY" || code === "EPERM" || code === "EACCES") {
          await new Promise((r) => setTimeout(r, delayMs));
          attempt += 1;
          delayMs = Math.min(delayMs * 2, 3000);
          continue;
        }
        throw e;
      }
    }
    const dir = path.dirname(filePath);
    const base = path.basename(filePath);
    const tempPath = path.join(dir, `${base}.pending`);
    try {
      await fs.writeFile(tempPath, data);
    } catch (e) {
      // give up if even temp can't be written
      throw e;
    }
  }
}
