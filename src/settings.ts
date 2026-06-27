import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';

export interface OpenCodeSettings {
    serverUrl: string;
    serverUsername: string;
    serverPassword: string;
    autoStartServer: boolean;
    serverPort: number;
    opencodePath: string;
    defaultAgent: string;
    autoApprovePermissions: boolean;
    opencodeBin: string;
    localModeEnabled: boolean;
    localModeUrl: string;
}

export function getOpenCodeSettings(): OpenCodeSettings {
    const config = vscode.workspace.getConfiguration('opencode');
    return {
        serverUrl: config.get<string>('serverUrl', 'http://127.0.0.1:4096'),
        serverUsername: config.get<string>('serverUsername', 'opencode'),
        serverPassword: config.get<string>('serverPassword', ''),
        autoStartServer: config.get<boolean>('autoStartServer', true),
        serverPort: config.get<number>('serverPort', 4096),
        opencodePath: config.get<string>('opencodePath', 'opencode'),
        defaultAgent: config.get<string>('defaultAgent', ''),
        autoApprovePermissions: config.get<boolean>('autoApprovePermissions', false),
        opencodeBin: config.get<string>('bin', ''),
        localModeEnabled: config.get<boolean>('localModeEnabled', false),
        localModeUrl: config.get<string>('localModeUrl', 'http://127.0.0.1:1234'),
    };
}

export function getAuthPath(): string {
    return process.env.OPENCODE_AUTH_PATH || path.join(os.homedir(), '.local', 'share', 'opencode', 'auth.json');
}

export function getWorkspaceDirectory(): string | undefined {
    const folder = vscode.workspace.workspaceFolders?.[0];
    return folder?.uri.fsPath;
}
