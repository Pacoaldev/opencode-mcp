import * as vscode from 'vscode';

const CHANNEL_NAME = 'OpenCode Chat';

let channel: vscode.OutputChannel | undefined;

export function getChatLogger(): vscode.OutputChannel {
    if (!channel) {
        channel = vscode.window.createOutputChannel(CHANNEL_NAME);
    }
    return channel;
}

function stamp(): string {
    return new Date().toISOString();
}

export function logInfo(message: string): void {
    getChatLogger().appendLine(`[${stamp()}] ${message}`);
}

export function truncate(text: string, max = 512): string {
    if (text.length <= max) {
        return text;
    }
    return `${text.slice(0, max)}…`;
}

/** Strip credentials from URLs before logging. */
export function sanitizeUrl(url: string): string {
    try {
        const parsed = new URL(url);
        parsed.username = '';
        parsed.password = '';
        return parsed.toString();
    } catch {
        return url.replace(/(Bearer\s+)\S+/gi, '$1***');
    }
}

export interface SendLogInfo {
    mode: 'opencode' | 'lmstudio';
    model?: string;
    agent?: string;
    contextParts: number;
    attachmentParts: number;
    promptChars: number;
    estimatedTokens: number;
}

export function logSend(info: SendLogInfo): void {
    logInfo(
        `SEND mode=${info.mode} model=${info.model ?? '(default)'} agent=${info.agent ?? '(default)'} ` +
            `contextParts=${info.contextParts} attachments=${info.attachmentParts} ` +
            `chars=${info.promptChars} ~tokens=${info.estimatedTokens}`
    );
}

export function logHttpError(
    method: string,
    pathOrUrl: string,
    status: number,
    body: string
): void {
    logInfo(
        `HTTP ${method} ${sanitizeUrl(pathOrUrl)} → ${status} ${truncate(body.replace(/\s+/g, ' ').trim())}`
    );
}

export function logSse(event: string, detail?: string): void {
    logInfo(`SSE ${event}${detail ? `: ${detail}` : ''}`);
}

export function logReconnect(attempt: number, max: number, delayMs: number): void {
    logInfo(`RECONNECT attempt ${attempt}/${max} in ${delayMs}ms`);
}

export function logFailover(from: string, to: string, reason: string): void {
    logInfo(`FAILOVER ${from} → ${to} (${truncate(reason, 200)})`);
}

export function estimateTokensFromChars(chars: number): number {
    return Math.max(1, Math.ceil(chars / 4));
}

export function partsCharCount(parts: { type: string; text?: string }[]): number {
    return parts.reduce((sum, p) => sum + (p.type === 'text' && p.text ? p.text.length : 0), 0);
}
