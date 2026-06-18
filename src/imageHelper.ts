import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const TEMP_DIR = path.join(os.tmpdir(), 'opencode-mcp-images');

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
    
    // Return file:// URL - the server can access this since it's local
    return `file://${filePath}`;
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
    
    return `file://${filePath}`;
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
