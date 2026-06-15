import * as vscode from 'vscode';
import { ChatViewProvider } from './chatViewProvider';
import { OpenCodeService } from './opencodeService';

interface Template {
    name: string;
    content: string;
}

let chatProvider: ChatViewProvider | undefined;
let service: OpenCodeService | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    service = new OpenCodeService();
    chatProvider = new ChatViewProvider(context, service);

    context.subscriptions.push(
        service,
        vscode.window.registerWebviewViewProvider(
            ChatViewProvider.viewType,
            chatProvider,
            { webviewOptions: { retainContextWhenHidden: true } }
        )
    );

    await service.initialize(context);

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
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((e) => {
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
