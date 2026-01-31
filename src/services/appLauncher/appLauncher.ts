import path from "node:path";
import { IntelligentDocumentOpener } from "./documentOpener.js";

export async function openDocx(docxPath: string, preferWord: boolean = true) {
  const opener = new IntelligentDocumentOpener();
  const abs = path.resolve(docxPath);
  await opener.openDocument(abs, { wait: false, preferWord });
}

export async function openDocument(filePath: string, preferWord: boolean = true) {
  const opener = new IntelligentDocumentOpener();
  const abs = path.resolve(filePath);
  await opener.openDocument(abs, { wait: false, preferWord });
}

