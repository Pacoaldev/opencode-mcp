import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import type { Session, SessionMessage } from './types';

export class LocalSessionManager {
    private storageDir: string;

    constructor(context: vscode.ExtensionContext) {
        this.storageDir = path.join(context.globalStorageUri.fsPath, 'local-sessions');
        if (!fs.existsSync(this.storageDir)) {
            fs.mkdirSync(this.storageDir, { recursive: true });
        }
    }

    private getSessionFile(sessionId: string): string {
        return path.join(this.storageDir, `${sessionId}.json`);
    }

    async createSession(title: string): Promise<Session> {
        const id = `loc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const session: Session = { id, title };
        const data = { session, messages: [] };
        await fs.promises.writeFile(this.getSessionFile(id), JSON.stringify(data, null, 2), 'utf8');
        return session;
    }

    async listSessions(): Promise<Session[]> {
        const sessions: Session[] = [];
        if (!fs.existsSync(this.storageDir)) {
            return sessions;
        }
        const files = await fs.promises.readdir(this.storageDir);
        for (const file of files) {
            if (file.endsWith('.json')) {
                try {
                    const content = await fs.promises.readFile(path.join(this.storageDir, file), 'utf8');
                    const parsed = JSON.parse(content);
                    if (parsed && parsed.session) {
                        sessions.push(parsed.session);
                    }
                } catch {
                    // Ignore corrupted files
                }
            }
        }
        
        sessions.sort((a, b) => {
            const timeA = this.extractTime(a.id);
            const timeB = this.extractTime(b.id);
            return timeB - timeA;
        });
        return sessions;
    }

    private extractTime(id: string): number {
        const parts = id.split('-');
        if (parts.length >= 2) {
            return parseInt(parts[1], 10) || 0;
        }
        return 0;
    }

    async listMessages(sessionId: string): Promise<SessionMessage[]> {
        const file = this.getSessionFile(sessionId);
        if (fs.existsSync(file)) {
            try {
                const content = await fs.promises.readFile(file, 'utf8');
                const parsed = JSON.parse(content);
                return parsed.messages || [];
            } catch {
                return [];
            }
        }
        return [];
    }

    async appendMessages(sessionId: string, newMessages: SessionMessage[]): Promise<void> {
        const file = this.getSessionFile(sessionId);
        if (!fs.existsSync(file)) {
            return;
        }
        try {
            const content = await fs.promises.readFile(file, 'utf8');
            const parsed = JSON.parse(content);
            parsed.messages = (parsed.messages || []).concat(newMessages);
            await fs.promises.writeFile(file, JSON.stringify(parsed, null, 2), 'utf8');
        } catch {
            // Ignore write error
        }
    }
}
