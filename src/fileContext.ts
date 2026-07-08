import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as vscode from 'vscode';
import { isImageFileUrl, normalizeFileUrl } from './imageHelper';
import { buildFilePart } from './parts';
import type { PromptPart } from './types';

const MAX_TEXT_FILE_BYTES = 1024 * 1024; // 1MB
const MAX_FOLDER_FILES = 50;
const SKIP_DIR_NAMES = new Set([
    'node_modules',
    '.git',
    'dist',
    'out',
    'build',
    '.next',
    '__pycache__',
    '.venv',
    'venv',
]);

function fileUrlToPath(url: string): string {
    const normalized = normalizeFileUrl(url.trim());
    try {
        return fileURLToPath(normalized);
    } catch {
        return normalized.replace(/^file:\/\//i, '').replace(/\//g, path.sep);
    }
}

function isBareFileUrl(text: string): boolean {
    const trimmed = text.trim();
    return /^file:\/\//i.test(trimmed) && !isImageFileUrl(trimmed);
}

/** Inline only legacy text parts that are exactly a file:// reference. */
export async function inlineFileUrlsInText(text: string): Promise<string> {
    if (!isBareFileUrl(text)) {
        return text;
    }

    try {
        const part = await readFileAsPart(fileUrlToPath(text));
        if (part.type === 'text') {
            return part.text;
        }
    } catch {
        return `[No se pudo leer el archivo adjunto: ${text.trim()}]`;
    }
    return text;
}

/** Read a local text file into a prompt part (content inlined, not a path). */
export async function readFileAsPart(filePath: string): Promise<PromptPart> {
    const stat = await fs.promises.stat(filePath);
    if (stat.size > MAX_TEXT_FILE_BYTES) {
        throw new Error(`supera 1MB: ${path.basename(filePath)}`);
    }
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
    return buildFilePart(filePath, doc.getText());
}

/** ponytail: legacy attach sent file:// paths as text — resolve once at send boundary */
export async function resolveLocalFileReferences(parts: PromptPart[]): Promise<PromptPart[]> {
    const out: PromptPart[] = [];
    for (const part of parts) {
        if (part.type === 'file' && !part.mime.startsWith('image/')) {
            try {
                out.push(await readFileAsPart(fileUrlToPath(part.url)));
            } catch {
                out.push({
                    type: 'text',
                    text: `No se pudo leer el archivo adjunto: ${part.filename ?? part.url}`,
                });
            }
            continue;
        }
        if (part.type === 'text') {
            if (isBareFileUrl(part.text)) {
                try {
                    out.push(await readFileAsPart(fileUrlToPath(part.text)));
                } catch {
                    out.push({
                        type: 'text',
                        text: `No se pudo leer el archivo adjunto: ${part.text.trim()}`,
                    });
                }
                continue;
            }
            out.push(part);
            continue;
        }
        out.push(part);
    }
    return out;
}

export interface FolderReadResult {
    parts: PromptPart[];
    added: number;
    skipped: number;
}

/** Read text files from a folder into inlined prompt parts. */
export async function readFolderAsParts(folderPath: string): Promise<FolderReadResult> {
    const parts: PromptPart[] = [];
    let added = 0;
    let skipped = 0;

    async function walk(dir: string, depth = 0): Promise<void> {
        if (depth > 10 || added >= MAX_FOLDER_FILES) {
            return;
        }
        let entries: fs.Dirent[];
        try {
            entries = await fs.promises.readdir(dir, { withFileTypes: true });
        } catch {
            return;
        }
        for (const entry of entries) {
            if (added >= MAX_FOLDER_FILES) {
                break;
            }
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (SKIP_DIR_NAMES.has(entry.name)) {
                    continue;
                }
                await walk(fullPath, depth + 1);
                continue;
            }
            try {
                parts.push(await readFileAsPart(fullPath));
                added++;
            } catch {
                skipped++;
            }
        }
    }

    await walk(folderPath);
    return { parts, added, skipped };
}
