import * as vscode from 'vscode';
import { PromptPart } from './types';

interface CachedContext {
    files: string[];
    gitStatus: string;
    openFiles: string[];
    timestamp: number;
    hitCount: number;
}

interface CacheConfig {
    maxSize: number;
    ttl: number;
}

export class ContextCache {
    private cache = new Map<string, CachedContext>();
    private config: CacheConfig;

    constructor() {
        this.config = {
            maxSize: 50,
            ttl: 5 * 60 * 1000, // 5 minutos
        };
    }

    private getCacheKey(): string {
        const workspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || 'no-workspace';
        const branch = this.getCurrentBranch();
        return `${workspace}::${branch}`;
    }

    private getCurrentBranch(): string {
        const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
        if (gitExtension) {
            const gitAPI = gitExtension.getAPI(1);
            const repo = gitAPI.repositories[0];
            return repo?.state?.HEAD?.name || 'main';
        }
        return 'main';
    }

    private getOpenFiles(): string[] {
        return vscode.workspace.textDocuments
            .filter(doc => doc.uri.scheme === 'file')
            .map(doc => doc.uri.fsPath)
            .slice(0, 10); // Limit to 10 files
    }

    private getGitStatus(): string {
        const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
        if (gitExtension) {
            const gitAPI = gitExtension.getAPI(1);
            const repo = gitAPI.repositories[0];
            if (repo) {
                const status = repo.state.workingTreeChanges;
                return `${status.length} cambios pendientes`;
            }
        }
        return 'sin cambios';
    }

    get(): CachedContext | null {
        const key = this.getCacheKey();
        const cached = this.cache.get(key);
        
        if (!cached) return null;
        
        // Check TTL
        if (Date.now() - cached.timestamp > this.config.ttl) {
            this.cache.delete(key);
            return null;
        }
        
        // Update hit count
        cached.hitCount++;
        this.cache.set(key, cached);
        
        return cached;
    }

    set(): void {
        const key = this.getCacheKey();
        
        // Clean old entries if cache is full
        if (this.cache.size >= this.config.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            if (typeof oldestKey === 'string') {
                this.cache.delete(oldestKey);
            }
        }
        
        const context: CachedContext = {
            files: this.getFrequentFiles(),
            gitStatus: this.getGitStatus(),
            openFiles: this.getOpenFiles(),
            timestamp: Date.now(),
            hitCount: 0
        };
        
        this.cache.set(key, context);
    }

    private getFrequentFiles(): string[] {
        // VS Code no expone recentFiles como API publica; usamos archivos abiertos recientes.
        const files = vscode.workspace.textDocuments
            .filter((doc) => doc.uri.scheme === 'file')
            .map((doc) => doc.uri.fsPath);
        return Array.from(new Set(files)).slice(0, 5);
    }

    clear(): void {
        this.cache.clear();
    }

    getStats(): { size: number, keys: string[], hits: number } {
        let totalHits = 0;
        const keys = Array.from(this.cache.keys());
        
        keys.forEach(key => {
            totalHits += this.cache.get(key)?.hitCount || 0;
        });
        
        return {
            size: this.cache.size,
            keys,
            hits: totalHits
        };
    }
}