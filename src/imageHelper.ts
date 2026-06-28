import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { pathToFileUrl } from './parts';
import type { PromptPart } from './types';

const TEMP_DIR = path.join(os.tmpdir(), 'opencode-mcp-images');
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|svg)$/i;

export function isImageFileUrl(value: string): boolean {
    const trimmed = value.trim();
    if (trimmed.startsWith('data:image/')) {
        return true;
    }
    if (!trimmed.includes('file://') && !IMAGE_EXT.test(trimmed)) {
        return false;
    }
    const pathLike = trimmed.replace(/^(file:\/\/)+/i, '').split('?')[0];
    return IMAGE_EXT.test(pathLike);
}

/** ponytail: legacy attachments sometimes carried file://file://... */
export function normalizeFileUrl(raw: string): string {
    let url = raw.trim();
    while (/^file:\/\//i.test(url) && /^file:\/\//i.test(url.replace(/^file:\/\//i, ''))) {
        url = url.replace(/^file:\/\//i, '');
    }
    if (!/^file:\/\//i.test(url)) {
        return pathToFileUrl(url.replace(/^file:\/\//i, ''));
    }
    return url;
}

export function guessImageMime(url: string): string {
    const ext = path.extname(url.replace(/^file:\/\//i, '').split('?')[0]).toLowerCase();
    const map: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.bmp': 'image/bmp',
        '.svg': 'image/svg+xml',
    };
    return map[ext] ?? 'image/png';
}

function fileUrlToPath(url: string): string {
    const normalized = normalizeFileUrl(url);
    try {
        return fileURLToPath(normalized);
    } catch {
        return normalized.replace(/^file:\/\//i, '').replace(/\//g, path.sep);
    }
}

export async function readImageAsDataUrl(url: string, mime: string): Promise<string | null> {
    if (url.startsWith('data:image/')) {
        return url;
    }
    try {
        const buffer = await fs.promises.readFile(fileUrlToPath(url));
        return `data:${mime};base64,${buffer.toString('base64')}`;
    } catch {
        return null;
    }
}

/** Upgrade legacy text parts that only contain a local image path. */
export function coerceImageParts(parts: PromptPart[]): PromptPart[] {
    const out: PromptPart[] = [];
    for (const part of parts) {
        if (part.type === 'file' && part.mime.startsWith('image/')) {
            out.push({ ...part, url: normalizeFileUrl(part.url) });
            continue;
        }
        if (part.type === 'text' && isImageFileUrl(part.text)) {
            const trimmed = part.text.trim();
            if (trimmed.startsWith('data:')) {
                out.push({
                    type: 'file',
                    mime: trimmed.match(/^data:(image\/[^;]+)/)?.[1] ?? 'image/png',
                    filename: `image-${Date.now()}.png`,
                    url: trimmed,
                });
                continue;
            }
            const url = normalizeFileUrl(trimmed);
            out.push({
                type: 'file',
                mime: guessImageMime(url),
                filename: path.basename(fileUrlToPath(url)),
                url,
            });
            continue;
        }
        out.push(part);
    }
    return out;
}

export async function inlineImageDataUrls(parts: PromptPart[]): Promise<PromptPart[]> {
    const out: PromptPart[] = [];
    for (const part of parts) {
        if (part.type === 'file' && part.mime.startsWith('image/')) {
            const dataUrl = await readImageAsDataUrl(part.url, part.mime);
            if (dataUrl) {
                out.push({ ...part, url: dataUrl });
                continue;
            }
        }
        out.push(part);
    }
    return out;
}

/**
 * Ensures the temporary image directory exists.
 */
export function ensureTempDir(): void {
    if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
}

/**
 * Saves a base64 data URI to a temporary file and returns a file:// URL.
 * @param dataUrl - The data URL (e.g., data:image/png;base64,...)
 * @param filename - Optional filename hint
 * @returns The file:// URL of the saved image
 */
export function saveBase64Image(dataUrl: string, filename?: string): string {
    ensureTempDir();
    
    const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) {
        throw new Error('Invalid data URL format');
    }
    
    const ext = match[1];
    const base64Data = match[2];
    const actualFilename = filename || `image-${Date.now()}.${ext}`;
    const filePath = path.join(TEMP_DIR, actualFilename);
    
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    return pathToFileUrl(filePath);
}

/**
 * Saves a buffer to a temporary file and returns a file:// URL.
 * @param buffer - The image buffer
 * @param filename - The filename
 * @param mimeType - The MIME type (e.g., 'image/png')
 * @returns The file:// URL of the saved image
 */
export function saveImageBuffer(buffer: Buffer, filename: string, mimeType: string): string {
    ensureTempDir();
    
    const ext = path.extname(filename) || `.${mimeType.split('/')[1]}` || '.png';
    const actualFilename = filename || `image-${Date.now()}${ext}`;
    const filePath = path.join(TEMP_DIR, actualFilename);
    
    fs.writeFileSync(filePath, buffer);

    return pathToFileUrl(filePath);
}

/**
 * Cleans up old temporary images (older than 24 hours).
 */
export function cleanupOldImages(): void {
    try {
        if (!fs.existsSync(TEMP_DIR)) {
            return;
        }
        
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        
        const files = fs.readdirSync(TEMP_DIR);
        for (const file of files) {
            const filePath = path.join(TEMP_DIR, file);
            const stats = fs.statSync(filePath);
            if (now - stats.mtimeMs > oneDay) {
                fs.unlinkSync(filePath);
            }
        }
    } catch {
        // Ignore cleanup errors
    }
}
