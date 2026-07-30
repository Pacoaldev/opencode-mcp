import * as vscode from 'vscode';
import { ChatViewProvider } from './chatViewProvider';
import { OpenCodeService } from './opencodeService';
import { cleanupOldImages } from './imageHelper';
import { getChatLogger, logInfo } from './logger';
import { Template } from './types';

let chatProvider: ChatViewProvider | undefined;
let service: OpenCodeService | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    service = new OpenCodeService();
    chatProvider = new ChatViewProvider(context, service);

    context.subscriptions.push(
        service,
        { dispose: () => getChatLogger().dispose() },
        vscode.window.registerWebviewViewProvider(
            ChatViewProvider.viewType,
            chatProvider,
            { webviewOptions: { retainContextWhenHidden: true } }
        )
    );

     await service.initialize(context);
     logInfo('OpenCode Chat Panel activado');
     
     // Clean up old temporary images on activation
     cleanupOldImages();
     
     // Set up periodic cleanup every hour
     const cleanupInterval = setInterval(() => {
         cleanupOldImages();
     }, 60 * 60 * 1000); // 1 hour
     
     context.subscriptions.push(new vscode.Disposable(() => {
         clearInterval(cleanupInterval);
     }));

     const branchPoll = setInterval(() => {
         void chatProvider?.checkBranchChange();
     }, 4000);
     context.subscriptions.push(new vscode.Disposable(() => {
         clearInterval(branchPoll);
     }));

    context.subscriptions.push(
        vscode.commands.registerCommand('opencode.ask', () => {
            chatProvider?.focus();
        }),
        vscode.commands.registerCommand('opencode.reconnect', async () => {
            await service?.reconnect();
            await chatProvider?.refreshState();
        }),
        vscode.commands.registerCommand('opencode.newSession', async () => {
            await service?.newSession();
            await chatProvider?.refreshState();
            vscode.window.showInformationMessage('Nueva sesión OpenCode creada.');
        }),
        vscode.commands.registerCommand(
            'opencode.addFileToContext',
            async (uri?: vscode.Uri) => {
                const attachments = chatProvider?.getContextAttachments();
                if (!attachments) {
                    return;
                }
                if (uri) {
                    await attachments.addFileUri(uri);
                    chatProvider?.notifyContextChanged();
                    return;
                }
                const ok = await attachments.addCurrentFile();
                if (ok) {
                    chatProvider?.notifyContextChanged();
                }
            }
        ),
        vscode.commands.registerCommand('opencode.addSelectionToContext', async () => {
            const ok = await chatProvider
                ?.getContextAttachments()
                .addSelection();
            if (ok) {
                chatProvider?.notifyContextChanged();
            }
        }),
        vscode.commands.registerCommand('opencode.addOpenFilesToContext', async () => {
            const count = await chatProvider
                ?.getContextAttachments()
                .addOpenFiles();
            if (count && count > 0) {
                chatProvider?.notifyContextChanged();
                vscode.window.showInformationMessage(
                    `${count} archivo(s) añadidos al contexto.`
                );
            }
        }),
        vscode.commands.registerCommand('opencode.setApiKeys', async () => {
            const input = await vscode.window.showInputBox({
                prompt: 'Pega el JSON de configuración de API Keys para Failover',
                placeHolder: '{"openai": ["sk-..."], "anthropic": ["sk-..."]}',
                ignoreFocusOut: true
            });
            if (input) {
                try {
                    const parsed = JSON.parse(input);
                    await context.secrets.store('opencode.apis', JSON.stringify(parsed));
                    vscode.window.showInformationMessage('API Keys guardadas de forma segura en SecretStorage.');
                } catch (e) {
                    vscode.window.showErrorMessage('El formato JSON introducido es inválido.');
                }
            }
        }),
        vscode.commands.registerCommand('opencode.clearApiKeys', async () => {
            await context.secrets.delete('opencode.apis');
            vscode.window.showInformationMessage('API Keys borradas del almacenamiento seguro.');
        }),
        vscode.commands.registerCommand('opencode.addTemplate', async () => {
            const name = await vscode.window.showInputBox({ prompt: 'Nombre de la plantilla' });
            if (!name) return;
            const content = await vscode.window.showInputBox({ prompt: 'Contenido de la plantilla', ignoreFocusOut: true });
            if (content === undefined) return;
            const templates = context.workspaceState.get<Template[]>('templates') || [];
            const index = templates.findIndex(t => t.name === name);
            const template: Template = { name, content };
            if (index >= 0) {
                templates[index] = template;
            } else {
                templates.push(template);
            }
            await context.workspaceState.update('templates', templates);
            vscode.window.showInformationMessage(`Plantilla '${name}' guardada.`);
            if (chatProvider?.view) {
                chatProvider.view.webview.postMessage({ type: 'templatesUpdate', templates });
            }
        }),
        vscode.commands.registerCommand('opencode.selectTemplate', async () => {
            const templates = context.workspaceState.get<Template[]>('templates') || [];
            if (templates.length === 0) {
                vscode.window.showInformationMessage('No hay plantillas guardadas.');
                return;
            }
            const items = templates.map(t => ({
                label: t.name,
                description: t.content.length > 50 ? t.content.substring(0, 50) + '...' : t.content,
                template: t
            }));
            const selected = await vscode.window.showQuickPick(items, { placeHolder: 'Selecciona una plantilla para insertar' });
            if (!selected) return;
            if (chatProvider?.view) {
                chatProvider.view.webview.postMessage({ type: 'insertText', text: selected.template.content });
            }
        }),
        vscode.commands.registerCommand('opencode.showMetrics', async () => {
            await chatProvider?.view?.webview.postMessage({ type: 'getMetrics' });
        }),
        vscode.commands.registerCommand('opencode.explainCode', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) return;
            
            const selection = editor.selection;
            const text = editor.document.getText(selection);
            if (!text) return;
            
            await chatProvider?.focus();
            await chatProvider?.view?.webview.postMessage({ 
                type: 'send', 
                text: `Explica el siguiente código:\n\`\`\`\n${text}\n\`\`\``,
                agent: '',
                model: '',
                attachments: []
            });
        }),
        vscode.commands.registerCommand('opencode.generateTests', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) return;
            
            const selection = editor.selection;
            const text = editor.document.getText(selection);
            if (!text) return;
            
            await chatProvider?.focus();
            await chatProvider?.view?.webview.postMessage({ 
                type: 'send', 
                text: `Genera tests unitarios para el siguiente código:\n\`\`\`\n${text}\n\`\`\``,
                agent: '',
                model: '',
                attachments: []
            });
        }),
        vscode.commands.registerCommand('opencode.findBugs', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) return;
            
            const selection = editor.selection;
            const text = editor.document.getText(selection);
            if (!text) return;
            
            await chatProvider?.focus();
            await chatProvider?.view?.webview.postMessage({ 
                type: 'send', 
                text: `Busca posibles bugs o vulnerabilidades en el siguiente código:\n\`\`\`\n${text}\n\`\`\``,
                agent: '',
                model: '',
                attachments: []
            });
        }),
        vscode.commands.registerCommand('opencode.refactorCode', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) return;
            
            const selection = editor.selection;
            const text = editor.document.getText(selection);
            if (!text) return;
            
            await chatProvider?.focus();
            await chatProvider?.view?.webview.postMessage({ 
                type: 'send', 
                text: `Refactoriza el siguiente código para mejorar su legibilidad y rendimiento:\n\`\`\`\n${text}\n\`\`\``,
                agent: '',
                model: '',
                attachments: []
            });
        }),
        vscode.commands.registerCommand('opencode.explainFile', async (uri?: vscode.Uri) => {
            const document = uri ? 
                await vscode.workspace.openTextDocument(uri) : 
                vscode.window.activeTextEditor?.document;
            
            if (!document) return;
            
            const text = document.getText();
            const fileName = document.fileName;
            
            await chatProvider?.focus();
            await chatProvider?.view?.webview.postMessage({ 
                type: 'send', 
                text: `Explica el archivo ${fileName}:\n\`\`\`\n${text}\n\`\`\``,
                agent: '',
                model: '',
                attachments: []
            });
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (
                e.affectsConfiguration('opencode.localModeEnabled') ||
                e.affectsConfiguration('opencode.localModeUrl')
            ) {
                chatProvider?.reloadWebview();
                return;
            }
            if (e.affectsConfiguration('opencode')) {
                void service?.reconnect().then(() => chatProvider?.refreshState());
            }
        })
    );
}

export function deactivate(): void {
    service?.dispose();
    service = undefined;
    chatProvider = undefined;
}
