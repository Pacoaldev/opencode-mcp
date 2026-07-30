import * as vscode from 'vscode';
import * as crypto from 'crypto';
import * as path from 'path';

export interface SecurityConfig {
    encryptionKey: string;
    allowedFileTypes: string[];
    maxFileSize: number;
    sensitivePatterns: RegExp[];
    auditLogging: boolean;
}

export interface SecurityEvent {
    timestamp: number;
    type: 'file_access' | 'api_call' | 'data_transmission' | 'auth_attempt';
    userId?: string;
    resource?: string;
    action: string;
    result: 'success' | 'failure' | 'blocked';
    details?: any;
}

export class SecurityManager {
    private static readonly SECURITY_KEY_STATE = 'opencode.securityKey';
    private static readonly SECURITY_EVENTS_STATE = 'opencode.securityEvents';
    private config: SecurityConfig;
    private auditLog: SecurityEvent[] = [];
    private encryptionKey: string;
    private globalState: vscode.Memento | undefined;

    constructor(context?: vscode.ExtensionContext) {
        this.globalState = context?.globalState;
        this.config = this.loadConfig();
        this.encryptionKey = this.resolveEncryptionKey();
        this.auditLog = this.getPersistedEvents();
    }

    setExtensionContext(context: vscode.ExtensionContext): void {
        this.globalState = context.globalState;
        this.encryptionKey = this.resolveEncryptionKey();
        this.auditLog = this.getPersistedEvents();
    }

    private loadConfig(): SecurityConfig {
        const config = vscode.workspace.getConfiguration('opencode.security');
        
        return {
            encryptionKey: config.get('encryptionKey', ''),
            allowedFileTypes: config.get('allowedFileTypes', [
                '.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.cpp', '.c', '.cs', 
                '.go', '.rs', '.php', '.rb', '.swift', '.kt', '.scala', '.sh'
            ]),
            maxFileSize: config.get('maxFileSize', 1024 * 1024), // 1MB
            sensitivePatterns: [
                /password\s*[:=]\s*['"]\w+['"]/i,
                /api[_-]?key\s*[:=]\s*['"]\w+['"]/i,
                /secret\s*[:=]\s*['"]\w+['"]/i,
                /token\s*[:=]\s*['"]\w+['"]/i,
                /private[_-]?key\s*[:=]\s*['"].+['"]/i
            ].map(pattern => new RegExp(pattern.source)),
            auditLogging: config.get('auditLogging', true)
        };
    }

    private resolveEncryptionKey(): string {
        if (this.config.encryptionKey && this.config.encryptionKey.trim().length > 0) {
            return this.config.encryptionKey;
        }

        const stored = this.globalState?.get<string>(SecurityManager.SECURITY_KEY_STATE);
        if (stored && stored.trim().length > 0) {
            return stored;
        }

        const generated = crypto.randomBytes(32).toString('hex');
        void this.globalState?.update(SecurityManager.SECURITY_KEY_STATE, generated);
        return generated;
    }

    private deriveAesKey(): Buffer {
        return crypto.createHash('sha256').update(this.encryptionKey, 'utf8').digest();
    }

    private encryptData(data: string): string {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', this.deriveAesKey(), iv);
        const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
        const authTag = cipher.getAuthTag();
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
    }

    private decryptData(encrypted: string): string {
        const [ivHex, tagHex, dataHex] = encrypted.split(':');
        if (!ivHex || !tagHex || !dataHex) {
            throw new Error('Formato de payload cifrado inválido');
        }
        const decipher = crypto.createDecipheriv(
            'aes-256-gcm',
            this.deriveAesKey(),
            Buffer.from(ivHex, 'hex')
        );
        decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
        const decrypted = Buffer.concat([
            decipher.update(Buffer.from(dataHex, 'hex')),
            decipher.final(),
        ]);
        return decrypted.toString('utf8');
    }

    private getPersistedEvents(): SecurityEvent[] {
        const saved = this.globalState?.get<SecurityEvent[]>(SecurityManager.SECURITY_EVENTS_STATE, []);
        return Array.isArray(saved) ? saved.slice(-1000) : [];
    }

    private getErrorMessage(error: unknown): string {
        return error instanceof Error ? error.message : String(error);
    }

    async validateFileAccess(uri: vscode.Uri): Promise<boolean> {
        const filePath = uri.fsPath;
        const fileName = path.basename(filePath);
        
        // Check file type
        const fileExtension = path.extname(fileName).toLowerCase();
        if (!this.config.allowedFileTypes.includes(fileExtension)) {
            this.logSecurityEvent({
                timestamp: Date.now(),
                type: 'file_access',
                resource: filePath,
                action: 'read',
                result: 'blocked',
                details: { reason: 'File type not allowed', extension: fileExtension }
            });
            return false;
        }

        // Check file size
        try {
            const stats = await vscode.workspace.fs.stat(uri);
            if (stats.size > this.config.maxFileSize) {
                this.logSecurityEvent({
                    timestamp: Date.now(),
                    type: 'file_access',
                    resource: filePath,
                    action: 'read',
                    result: 'blocked',
                    details: { reason: 'File size exceeds limit', size: stats.size }
                });
                return false;
            }
        } catch (error) {
            this.logSecurityEvent({
                timestamp: Date.now(),
                type: 'file_access',
                resource: filePath,
                action: 'read',
                result: 'failure',
                details: { error: this.getErrorMessage(error) }
            });
            return false;
        }

        // Check for sensitive data patterns
        try {
            const content = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
            const matches = this.findSensitiveData(content);
            
            if (matches.length > 0) {
                this.logSecurityEvent({
                    timestamp: Date.now(),
                    type: 'file_access',
                    resource: filePath,
                    action: 'read',
                    result: 'blocked',
                    details: { reason: 'Sensitive data detected', patterns: matches }
                });
                return false;
            }
        } catch (error) {
            this.logSecurityEvent({
                timestamp: Date.now(),
                type: 'file_access',
                resource: filePath,
                action: 'read',
                result: 'failure',
                details: { error: this.getErrorMessage(error) }
            });
            return false;
        }

        this.logSecurityEvent({
            timestamp: Date.now(),
            type: 'file_access',
            resource: filePath,
            action: 'read',
            result: 'success'
        });

        return true;
    }

    validatePromptPayload(promptText: string, payloadSegments: string[]): { allowed: boolean; reason?: string } {
        const segments = [promptText, ...payloadSegments].filter(Boolean);
        for (const content of segments) {
            const matches = this.findSensitiveData(content);
            if (matches.length > 0) {
                this.logSecurityEvent({
                    timestamp: Date.now(),
                    type: 'data_transmission',
                    action: 'prompt_validation',
                    result: 'blocked',
                    details: { reason: 'Sensitive data detected in prompt payload', patterns: matches }
                });
                return {
                    allowed: false,
                    reason: 'Se detectaron datos sensibles en el contenido a enviar.'
                };
            }
        }

        return { allowed: true };
    }

    findSensitiveData(content: string): string[] {
        const matches: string[] = [];
        
        for (const pattern of this.config.sensitivePatterns) {
            const found = content.match(pattern);
            if (found) {
                matches.push(found[0]);
            }
        }
        
        return matches;
    }

    async secureApiRequest(endpoint: string, data: any): Promise<any> {
        // Log API request
        this.logSecurityEvent({
            timestamp: Date.now(),
            type: 'api_call',
            resource: endpoint,
            action: 'request',
            result: 'success'
        });

        // Encrypt sensitive data
        const sensitiveFields = ['password', 'key', 'secret', 'token'];
        const encryptedData = { ...data };
        
        for (const field of sensitiveFields) {
            if (encryptedData[field]) {
                encryptedData[field] = this.encryptData(String(encryptedData[field]));
            }
        }

        try {
            // Make the API request
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Security-Token': this.generateSecurityToken()
                },
                body: JSON.stringify(encryptedData)
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.statusText}`);
            }

            const result = (await response.json()) as {
                encrypted?: boolean;
                data?: string;
                [key: string]: unknown;
            };
            
            // Decrypt response if needed
            if (result.encrypted && typeof result.data === 'string') {
                result.data = this.decryptData(result.data);
            }

            return result;
        } catch (error) {
            this.logSecurityEvent({
                timestamp: Date.now(),
                type: 'api_call',
                resource: endpoint,
                action: 'request',
                result: 'failure',
                details: { error: this.getErrorMessage(error) }
            });
            throw error;
        }
    }

    auditDataTransmission(action: string, result: 'success' | 'failure' | 'blocked', details?: any): void {
        this.logSecurityEvent({
            timestamp: Date.now(),
            type: 'data_transmission',
            action,
            result,
            details,
        });
    }

    auditApiCall(resource: string, action: string, result: 'success' | 'failure' | 'blocked', details?: any): void {
        this.logSecurityEvent({
            timestamp: Date.now(),
            type: 'api_call',
            resource,
            action,
            result,
            details,
        });
    }

    private generateSecurityToken(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    private logSecurityEvent(event: SecurityEvent): void {
        if (this.config.auditLogging) {
            this.auditLog.push(event);
            
            // Keep only last 1000 events
            if (this.auditLog.length > 1000) {
                this.auditLog = this.auditLog.slice(-1000);
            }
            
            void this.globalState?.update(SecurityManager.SECURITY_EVENTS_STATE, this.auditLog);
        }
    }

    getAuditLog(): SecurityEvent[] {
        return [...this.auditLog];
    }

    generateSecurityReport(): string {
        const report = {
            generatedAt: new Date().toISOString(),
            totalEvents: this.auditLog.length,
            eventsByType: {} as Record<string, number>,
            eventsByResult: {} as Record<string, number>,
            recentFailures: this.auditLog
                .filter(e => e.result === 'failure' || e.result === 'blocked')
                .slice(-10)
        };

        // Count events by type
        this.auditLog.forEach(event => {
            report.eventsByType[event.type] = (report.eventsByType[event.type] || 0) + 1;
            report.eventsByResult[event.result] = (report.eventsByResult[event.result] || 0) + 1;
        });

        return JSON.stringify(report, null, 2);
    }

    async scanWorkspaceForSecurityIssues(): Promise<{
        sensitiveFiles: string[];
        largeFiles: string[];
        suspiciousPatterns: Array<{ file: string; pattern: string; line: number }>;
    }> {
        const results = {
            sensitiveFiles: [] as string[],
            largeFiles: [] as string[],
            suspiciousPatterns: [] as Array<{ file: string; pattern: string; line: number }>
        };

        const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**');
        
        for (const file of files) {
            // Check file type
            const extension = path.extname(file.fsPath).toLowerCase();
            if (!this.config.allowedFileTypes.includes(extension)) {
                continue;
            }

            try {
                const stats = await vscode.workspace.fs.stat(file);
                const content = Buffer.from(await vscode.workspace.fs.readFile(file)).toString('utf8');
                
                // Check file size
                if (stats.size > this.config.maxFileSize) {
                    results.largeFiles.push(file.fsPath);
                    continue;
                }

                // Check for sensitive data
                const matches = this.findSensitiveData(content);
                if (matches.length > 0) {
                    results.sensitiveFiles.push(file.fsPath);
                }

                // Check for suspicious patterns
                const lines = content.split('\n');
                lines.forEach((line, index) => {
                    for (const pattern of this.config.sensitivePatterns) {
                        if (pattern.test(line)) {
                            results.suspiciousPatterns.push({
                                file: file.fsPath,
                                pattern: pattern.source,
                                line: index + 1
                            });
                        }
                    }
                });

            } catch (error) {
                // Skip files that can't be read
                continue;
            }
        }

        return results;
    }
}