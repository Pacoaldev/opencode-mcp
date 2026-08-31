import { spawn, type ChildProcess, type SpawnOptions } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { getOpenCodeSettings } from './settings';

function getSettingsBin(): string {
    try {
        return getOpenCodeSettings().opencodeBin;
    } catch {
        return '';
    }
}

export interface ManagedServer {
    url: string;
    close(): void;
}

function isRealExecutable(filePath: string): boolean {
    try {
        const stat = fs.statSync(filePath);
        if (!stat.isFile() || stat.size < 64 * 1024) {
            return false;
        }
        const fd = fs.openSync(filePath, 'r');
        const header = Buffer.alloc(2);
        fs.readSync(fd, header, 0, 2, 0);
        fs.closeSync(fd);
        return header[0] === 0x4d && header[1] === 0x5a;
    } catch {
        return false;
    }
}

function windowsOpencodeRoot(): string | undefined {
    const appData = process.env.APPDATA;
    if (!appData) {
        return undefined;
    }
    return path.join(appData, 'npm', 'node_modules', 'opencode-ai');
}

function resolveWindowsBinary(): string | undefined {
    const root = windowsOpencodeRoot();
    if (!root) {
        return undefined;
    }
    const candidates = [
        path.join(root, 'bin', 'opencode.exe'),
        path.join(root, 'node_modules', 'opencode-windows-x64', 'bin', 'opencode.exe'),
        path.join(root, 'node_modules', 'opencode-windows-x64-baseline', 'bin', 'opencode.exe'),
        path.join(root, 'node_modules', 'opencode-windows-arm64', 'bin', 'opencode.exe'),
    ];
    for (const candidate of candidates) {
        if (isRealExecutable(candidate)) {
            return candidate;
        }
    }
    return undefined;
}

export function opencodeCliRepairHint(): string {
    return (
        'Reinstala el CLI de OpenCode: npm install -g opencode-ai --allow-scripts=opencode-ai ' +
        '(npm puede bloquear el postinstall y dejar un opencode.exe inválido). ' +
        'Luego configura opencode.bin con la ruta al ejecutable real si hace falta.'
    );
}

function resolveOpencodeExecutable(): { command: string; argsPrefix: string[]; spawnOptions?: SpawnOptions } {
    const settingsBin = getSettingsBin();
    const envBin = settingsBin || process.env.OPENCODE_BIN;
    if (envBin && isRealExecutable(envBin)) {
        return { command: envBin, argsPrefix: [] };
    }

    if (process.platform === 'win32') {
        const winBinary = resolveWindowsBinary();
        if (winBinary) {
            return { command: winBinary, argsPrefix: [] };
        }
        return {
            command: 'npx',
            argsPrefix: ['opencode-ai'],
            spawnOptions: { shell: true },
        };
    }

    return { command: 'opencode', argsPrefix: [] };
}

export async function startOpencodeServer(
    port: number,
    cwd?: string,
    hostname = '127.0.0.1',
    timeoutMs = 20000
): Promise<ManagedServer> {
    const serveArgs = ['serve', `--hostname=${hostname}`, `--port=${port}`];
    const { command, argsPrefix, spawnOptions } = resolveOpencodeExecutable();
    const args = [...argsPrefix, ...serveArgs];

    const proc = spawn(command, args, {
        cwd: cwd || process.cwd(),
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
        ...spawnOptions,
    });

    const url = await waitForServerUrl(proc, timeoutMs);

    return {
        url,
        close: () => stopProcess(proc),
    };
}

function waitForServerUrl(proc: ChildProcess, timeoutMs: number): Promise<string> {
    return new Promise((resolve, reject) => {
        let output = '';
        let settled = false;

        const timer = setTimeout(() => {
            if (!settled) {
                settled = true;
                cleanup();
                reject(new Error(`Timeout esperando opencode serve (${timeoutMs}ms)`));
            }
        }, timeoutMs);

        const onData = (chunk: Buffer) => {
            if (settled) {
                return;
            }
            output += chunk.toString();
            for (const line of output.split('\n')) {
                if (line.includes('opencode server listening')) {
                    const match = line.match(/on\s+(https?:\/\/[^\s]+)/);
                    if (match) {
                        settled = true;
                        clearTimeout(timer);
                        resolve(match[1]);
                        return;
                    }
                }
            }
        };

        const cleanup = () => {
            proc.stdout?.off('data', onData);
            proc.stderr?.off('data', onData);
        };

        proc.stdout?.on('data', onData);
        proc.stderr?.on('data', onData);
        proc.on('error', (err) => {
            if (!settled) {
                settled = true;
                clearTimeout(timer);
                const hint =
                    err.message.includes('UNKNOWN') || err.message.includes('ENOENT')
                        ? ` ${opencodeCliRepairHint()}`
                        : ' Asegúrate de que opencode está en PATH o define OPENCODE_BIN.';
                reject(new Error(`${err.message}.${hint}`));
            }
        });
        proc.on('exit', (code) => {
            if (!settled) {
                settled = true;
                clearTimeout(timer);
                const stubHint =
                    output.includes('not a valid application') || output.includes('UNKNOWN')
                        ? ` ${opencodeCliRepairHint()}`
                        : '';
                reject(
                    new Error(
                        `opencode serve terminó con código ${code}. ${output}${stubHint}`.trim()
                    )
                );
            }
        });
    });
}

function stopProcess(proc: ChildProcess): void {
    if (!proc.killed) {
        proc.kill();
        setTimeout(() => {
            if (!proc.killed) {
                try {
                    proc.kill('SIGKILL');
                } catch {
                    // Ignore if process already dead
                }
            }
        }, 5000).unref();
    }
}
