import { saveImageBuffer, saveBase64Image } from './imageHelper';
import { readFileAsPart, readFolderAsParts } from './fileContext';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { ContextAttachments } from './contextAttachments';
import { contextLabel, partsToDisplayText } from './parts';
import { OpenCodeService } from './opencodeService';
import { getOpenCodeSettings, getWorkspaceDirectory } from './settings';
import { PromptPart, Template } from './types';
import { gitProvider } from './gitProvider';

/**
 * Utility function to extract error message from unknown error type
 */
function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

// Tamaños máximos en bytes
const MAX_FOLDER_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;    // 10MB

export class ChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'opencode.mcp';

    public view: vscode.WebviewView | undefined;
    private readonly contextAttachments = new ContextAttachments();
    private selectedAgent = '';
    private lmStudioPromptShown = false;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly service: OpenCodeService
    ) {
        service.onStream((update) => {
            if (update.done) {
                if (update.error) {
                    this.post({ type: 'error', message: update.error });
                } else {
                     this.post({ type: 'assistantDone', text: update.text, metrics: update.metrics });
                     
                     // Actualizar costos en globalState
                     if (update.metrics) {
                         const today = new Date().toISOString().split('T')[0];
                         const model = this.service.getSelectedModel() || 'default';
                         
                          let costData: Record<string, any> = this.context.globalState.get('costData') as Record<string, any> || {};
                         
                         const cost = this.calculateCost(update.metrics.input, update.metrics.output, model);
                         
                         if (!costData[today]) {
                             costData[today] = {};
                         }
                         
                         if (!costData[today][model]) {
                             costData[today][model] = { usd: 0, eur: 0 };
                         }
                         
                         costData[today][model].usd += cost.usd;
                         costData[today][model].eur += cost.eur;
                         
                         this.context.globalState.update('costData', costData);
                     }
                }
                this.post({ type: 'status', state: 'idle' });
            } else {
                this.post({ type: 'assistantStream', text: update.text, statusDetail: update.statusDetail });
            }
        });

        service.onStatus((state, detail) => {
            this.post({
                type: 'connection',
                state,
                detail,
            });
        });
    }

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void {
        this.view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri],
        };
        webviewView.webview.html = this.getHtml(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (message) => {
            await this.onMessage(message);
        });

        void this.refreshState();
     }

      private calculateCost(inputTokens: number, outputTokens: number, model: string | undefined): { usd: number, eur: number } {
          const modelPrices: Record<string, { input: number, output: number }> = {
            'mistral-medium-latest': { input: 2.00, output: 6.00 },
            'default': { input: 2.00, output: 6.00 }
          };

          const price = modelPrices[model ?? 'default'] || modelPrices['default'];
          const usd = (inputTokens * price.input + outputTokens * price.output) / 1000000;
          const eur = usd * 0.92;

          return { usd, eur };
      }

      private async getFileCount(dir: string, visited = new Set<string>(), depth = 0): Promise<number> {
          if (depth > 10 || visited.has(dir)) {
              return 0;
          }
          visited.add(dir);
          let count = 0;
          try {
              const files = await fs.promises.readdir(dir);
              for (const file of files) {
                  const filePath = path.join(dir, file);
                  try {
                      const stats = await fs.promises.stat(filePath);
                      if (stats.isDirectory()) {
                          count += await this.getFileCount(filePath, visited, depth + 1);
                      } else {
                          count++;
                      }
                  } catch (e) {
                      // Ignore file stats error
                  }
              }
          } catch (e) {
              // Ignore readdir error
          }
          return count;
      }

     focus(): void {
        if (this.view) {
            this.view.show?.(true);
        } else {
            void vscode.commands.executeCommand('opencode.mcp.focus');
        }
    }

    async refreshState(): Promise<void> {
        const settings = getOpenCodeSettings();
        this.selectedAgent = settings.defaultAgent;
        const localMode = {
            enabled: settings.localModeEnabled,
            url: settings.localModeUrl,
            connected: settings.localModeEnabled
                ? await this.service.isLMStudioAvailable()
                : false,
        };
        try {
            let agents: Awaited<ReturnType<OpenCodeService['listAgents']>> = [];
            let models: Awaited<ReturnType<OpenCodeService['listModels']>> = [];

            if (settings.localModeEnabled) {
                models = await this.service.listModels();
                if (!localMode.connected) {
                    this.post({
                        type: 'error',
                        message:
                            `Modo LM Studio activo pero no hay respuesta en ${settings.localModeUrl}. ` +
                            'Inicia el servidor local en LM Studio.',
                    });
                } else if (models.length > 0) {
                    const current = this.service.getSelectedModel();
                    const valid = current && models.some((m) => m.id === current);
                    if (!valid) {
                        this.service.persistSelectedModel(models[0].id);
                    }
                }
            } else {
                agents = await this.service.listAgents();
                models = await this.service.listModels();
            }
            const primary = agents.filter((a) => a.mode === 'primary' || a.mode === 'all');
            const workspaceDir = getWorkspaceDirectory();
            let gitInfo = null;
            if (workspaceDir) {
                gitInfo = await gitProvider.getGitInfo(workspaceDir);
            }
            
            const sessionId = this.service.getSessionId() ?? '';
            let parsedMessages: any[] = [];
            if (sessionId) {
                try {
                    const messages = await this.service.listMessages(sessionId);
                    parsedMessages = messages.map(m => {
                        const hasError = !!m.info.error;
                        return {
                            role: hasError ? 'error' : m.info.role,
                            text: hasError
                                ? (m.info.error?.data?.message || m.info.error?.message || m.info.error?.name || 'Error del proveedor')
                                : partsToDisplayText(m.parts),
                            metrics: m.info.tokens
                        };
                    });
                } catch {
                    // Ignore message load error
                }
            }

                 let costData: Record<string, any> = JSON.parse(JSON.stringify(this.context.globalState.get('costData') || {}));

                  this.post({
                      type: 'init',
                      agents: primary.map((a) => ({
                          name: a.name,
                          description: a.description ?? '',
                      })),
                      models,
                      selectedAgent: this.selectedAgent,
                      selectedModel: this.service.getSelectedModel(),
                      context: this.contextAttachments
                          .getItems()
                          .map((p) => contextLabel(p)),
                      sessionId,
                      messages: parsedMessages,
                      quickActions: vscode.workspace.getConfiguration('opencode').get('quickActions') || [],
                      costData,
                      templates: this.context.workspaceState.get<Template[]>('templates') || [],
                      gitInfo,
                      localMode,
                  });
          } catch (error) {
              const msg = getErrorMessage(error);
              this.post({ type: 'error', message: msg });
          }
    }

    getContextAttachments(): ContextAttachments {
        return this.contextAttachments;
    }

    private post(payload: unknown): void {
        void this.view?.webview.postMessage(payload);
    }

     private async onMessage(message: any): Promise<void> {
         switch (message.type) {
             case 'ready':
                 await this.handleReadyMessage();
                 break;
             case 'send': {
                 await this.handleSendMessage(message);
                 break;
             }
             case 'setAgent':
                 this.handleSetAgentMessage(message);
                 break;
             case 'setModel':
                 this.handleSetModelMessage(message);
                 break;
             case 'reconnect':
                 await this.handleReconnectMessage();
                 break;
             case 'newSession':
                 await this.handleNewSessionMessage();
                 break;
             case 'clearChat': {
                 await this.handleClearChatMessage();
                 break;
             }
             case 'exportChat': {
                 await this.handleExportChatMessage();
                 break;
             }
             case 'abort':
                 await this.handleAbortMessage();
                 break;
             case 'openSettings':
                 this.handleOpenSettingsMessage();
                 break;
             case 'showHistory': {
                 await this.handleShowHistoryMessage();
                 break;
             }
              case 'addContextFile': {
                 await this.handleAddContextFileMessage();
                 break;
             }
             case 'removeContext': {
                 await this.handleRemoveContextMessage(message);
                 break;
             }
             case 'quickAction': {
                 await this.handleQuickActionMessage(message);
                 break;
             }
             case 'insertCodeBlock': {
                 await this.handleInsertCodeBlockMessage();
                 break;
             }
             case 'addCurrentFileToContext': {
                 await this.handleAddCurrentFileToContextMessage();
                 break;
             }
             case 'addSelectionToContext': {
                 await this.handleAddSelectionToContextMessage();
                 break;
             }
             case 'addOpenFilesToContext': {
                 await this.handleAddOpenFilesToContextMessage();
                 break;
             }
             case 'addGitToContext': {
                 await this.handleAddGitToContextMessage();
                 break;
             }
             case 'refreshGitInfo': {
                 await this.handleRefreshGitInfoMessage();
                 break;
             }
             case 'gitDiff': {
                 await this.handleGitDiffMessage();
                 break;
             }
               case 'attachFile':
                   await this.handleAttachFileMessage();
                   break;
               case 'attachFolder':
                   await this.handleAttachFolderMessage();
                   break;
              case 'processImageAttachment': {
                  await this.handleProcessImageAttachmentMessage(message);
                  break;
              }
             case 'loadCostData': {
                 await this.handleLoadCostDataMessage();
                 break;
             }
             case 'copyToClipboard': {
                 await this.handleCopyToClipboardMessage(message);
                 break;
             }
            default:
                break;
        }
    }

     notifyContextChanged(): void {
         this.post({
             type: 'context',
             items: this.contextAttachments.getItems().map((p) => contextLabel(p)),
         });
     }

     private async handleReadyMessage(): Promise<void> {
         await this.refreshState();
         await this.maybePromptLocalMode();
     }

     private async maybePromptLocalMode(): Promise<void> {
         if (this.lmStudioPromptShown) {
             return;
         }
         const settings = getOpenCodeSettings();
         if (settings.localModeEnabled) {
             return;
         }
         const available = await this.service.isLMStudioAvailable();
         if (!available) {
             return;
         }
         this.lmStudioPromptShown = true;
         const choice = await vscode.window.showInformationMessage(
             'LM Studio detectado, pero el modo local está desactivado. Ahora mismo el chat usa OpenCode en la nube.',
             'Activar modo local',
             'Ahora no'
         );
         if (choice !== 'Activar modo local') {
             return;
         }
         const target = vscode.workspace.workspaceFolders?.length
             ? vscode.ConfigurationTarget.Workspace
             : vscode.ConfigurationTarget.Global;
         const config = vscode.workspace.getConfiguration('opencode');
         await config.update('localModeEnabled', true, target);
         if (!config.get<string>('localModeUrl')) {
             await config.update('localModeUrl', 'http://127.0.0.1:5555', target);
         }
         await this.refreshState();
     }

     private async handleSendMessage(message: any): Promise<void> {
         const text = message.text?.trim();
         const attachments = message.attachments || [];
         if (!text && attachments.length === 0) {
             return;
         }
         const agent = message.agent || this.selectedAgent || undefined;
         const model = message.model || undefined;
         const contextParts = [...this.contextAttachments.getItems()];
         this.contextAttachments.clear();
         this.post({ type: 'status', state: 'busy' });
         this.post({
             type: 'context',
             items: [],
         });
         try {
             await this.service.sendPrompt(text || '', agent, model, contextParts, attachments);
          } catch (error) {
              const msg = getErrorMessage(error);
              this.post({ type: 'error', message: msg });
              this.post({ type: 'status', state: 'idle' });
          }
     }

     private handleSetAgentMessage(message: any): void {
         this.selectedAgent = message.agent ?? '';
     }

     private handleSetModelMessage(message: any): void {
         this.service.persistSelectedModel(message.model ?? '');
     }

     private async handleReconnectMessage(): Promise<void> {
         this.post({ type: 'status', state: 'connecting' });
          try {
              await this.service.reconnect();
              await this.refreshState();
          } catch (error) {
              const msg = getErrorMessage(error);
              this.post({ type: 'error', message: msg });
          }
     }

      private async handleNewSessionMessage(): Promise<void> {
          try {
              await this.service.newSession();
              await this.refreshState();
              this.post({ type: 'system', text: 'Nueva sesión creada.' });
          } catch (error) {
              const msg = getErrorMessage(error);
              this.post({ type: 'error', message: msg });
          }
      }

     private async handleClearChatMessage(): Promise<void> {
          const choice = await vscode.window.showWarningMessage(
              '¿Estás seguro de que quieres limpiar el chat? Esto iniciará una nueva sesión.',
              { modal: true },
              'Limpiar'
          );
         if (choice === 'Limpiar') {
             try {
                 await this.service.newSession();
                 await this.refreshState();
                 this.post({ type: 'chatCleared' });
          } catch (error) {
              const msg = getErrorMessage(error);
              this.post({ type: 'error', message: msg });
          }
         }
     }

     private async handleExportChatMessage(): Promise<void> {
         const sessionId = this.service.getSessionId();
         if (!sessionId) {
             vscode.window.showErrorMessage('No hay sesión activa para exportar.');
             return;
         }
         try {
             const messages = await this.service.listMessages(sessionId);
             if (messages.length === 0) {
                 vscode.window.showInformationMessage('La conversación está vacía.');
                 return;
             }

             const format = await vscode.window.showQuickPick(
                 ['Markdown (.md)', 'JSON (.json)', 'Texto plano (.txt)'],
                 { placeHolder: 'Selecciona el formato de exportación' }
             );
             if (!format) {
                 return;
             }

             let defaultExt = '.md';
             let filterName = 'Markdown Files';
             if (format.includes('JSON')) {
                 defaultExt = '.json';
                 filterName = 'JSON Files';
             } else if (format.includes('Texto')) {
                 defaultExt = '.txt';
                 filterName = 'Text Files';
             }

             const uri = await vscode.window.showSaveDialog({
                 defaultUri: vscode.Uri.file(path.join(getWorkspaceDirectory() || '', `chat-export${defaultExt}`)),
                 filters: { [filterName]: [defaultExt.substring(1)] }
             });

             if (!uri) {
                 return;
             }

             let content = '';
             if (defaultExt === '.json') {
                 const simpleMessages = messages.map(m => ({
                     role: m.info.role,
                     text: partsToDisplayText(m.parts),
                     timestamp: new Date().toISOString()
                 }));
                 content = JSON.stringify(simpleMessages, null, 2);
             } else if (defaultExt === '.md') {
                 content = `# Exportación de Conversación de OpenCode\n\n`;
                 messages.forEach(m => {
                     const roleDisplay = m.info.role === 'user' ? 'Tú' : 'OpenCode';
                     content += `### **${roleDisplay}**\n\n${partsToDisplayText(m.parts)}\n\n---\n\n`;
                 });
             } else {
                 messages.forEach(m => {
                     const roleDisplay = m.info.role === 'user' ? 'Tú' : 'OpenCode';
                     content += `[${roleDisplay}]:\n${partsToDisplayText(m.parts)}\n\n`;
                 });
             }

              try {
                  await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
                  vscode.window.showInformationMessage(`Conversación exportada exitosamente.`);
              } catch (writeError) {
                  vscode.window.showErrorMessage(`Error al guardar el archivo: ${getErrorMessage(writeError)}`);
              }
          } catch (error) {
              const msg = getErrorMessage(error);
              vscode.window.showErrorMessage(`Error al exportar conversación: ${msg}`);
          }
     }

      private async handleAbortMessage(): Promise<void> {
          try {
              await this.service.abortSession();
              this.post({ type: 'system', text: 'Sesión abortada.' });
              this.post({ type: 'status', state: 'idle' });
          } catch (error) {
              const msg = getErrorMessage(error);
              this.post({ type: 'error', message: msg });
          }
      }

     private handleOpenSettingsMessage(): void {
         void vscode.commands.executeCommand('workbench.action.openSettings', '@ext:local.opencode-mcp-vscode');
     }

     private async handleShowHistoryMessage(): Promise<void> {
         try {
             const sessions = await this.service.listSessions();
             if (sessions.length === 0) {
                 vscode.window.showInformationMessage('No hay sesiones anteriores.');
                 return;
             }
             const items = sessions.map((s) => ({
                 label: s.title || `Sesión ${s.id.slice(0, 8)}`,
                 description: s.id,
                 session: s,
             }));
             const selected = await vscode.window.showQuickPick(items, {
                 placeHolder: 'Selecciona una sesión para cargar',
             });
             if (selected) {
                 await this.service.selectSession(selected.session.id);
                 await this.refreshState();
             }
          } catch (error) {
              const msg = getErrorMessage(error);
              vscode.window.showErrorMessage(`Error al listar sesiones: ${msg}`);
          }
     }

     private async handleAddContextFileMessage(): Promise<void> {
         const fileUris = await vscode.window.showOpenDialog({
             canSelectMany: true,
             openLabel: 'Añadir al contexto',
             filters: {
                 'Archivos de código': ['ts', 'js', 'tsx', 'jsx', 'py', 'rs', 'go', 'java', 'cpp', 'c', 'h', 'cs', 'php', 'rb', 'swift', 'kt', 'scala', 'm', 'sh', 'sql', 'md', 'json', 'xml', 'yaml', 'yml', 'toml'],
                 'Archivos de texto': ['txt', 'log', 'conf', 'ini', 'cfg'],
                 'Archivos de imagen': ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'],
                 'Todos los archivos': ['*']
             }
         });
         if (fileUris && fileUris.length > 0) {
             let successCount = 0;
             let errorCount = 0;
             
              for (const uri of fileUris) {
                  try {
                      await this.contextAttachments.addFileUri(uri);
                      successCount++;
                  } catch (e) {
                      const errorMsg = `No se pudo añadir al contexto: ${path.basename(uri.fsPath)} - ${getErrorMessage(e)}`;
                      this.post({ type: 'error', message: errorMsg });
                      errorCount++;
                  }
              }
             
             if (successCount > 0) {
                 this.post({
                     type: 'system',
                     text: `Añadidos ${successCount} archivo(s) al contexto${errorCount > 0 ? `, ${errorCount} error(es)` : ''}.`
                 });
             }
             
              this.notifyContextChanged();
          }
      }

      private async handleRemoveContextMessage(message: any): Promise<void> {
          const index = message.index;
          if (typeof index === 'number') {
              this.contextAttachments.removePart(index);
              this.notifyContextChanged();
          }
      }

      private async handleQuickActionMessage(message: any): Promise<void> {
          const action = message.text;
          if (this.contextAttachments.getItems().length === 0) {
              await this.contextAttachments.addCurrentFile();
              this.notifyContextChanged();
          }
          const text = action;
          const agent = this.selectedAgent || undefined;
          const model = message.model || undefined;
          const contextParts = [...this.contextAttachments.getItems()];
          this.contextAttachments.clear();
          this.post({ type: 'status', state: 'busy' });
          this.post({
              type: 'context',
              items: [],
          });
          try {
              await this.service.sendPrompt(text || '', agent, model, contextParts, []);
          } catch (error) {
              const msg = getErrorMessage(error);
              this.post({ type: 'error', message: msg });
              this.post({ type: 'status', state: 'idle' });
          }
      }

      private async handleInsertCodeBlockMessage(): Promise<void> {
          const editor = vscode.window.activeTextEditor;
          if (editor) {
              const selection = editor.document.getText(editor.selection);
              const formatted = selection ? `\`\`\`\n${selection}\n\`\`\`` : `\`\`\`\n\n\`\`\``;
              this.post({ type: 'insertText', text: formatted });
          } else {
              this.post({ type: 'insertText', text: `\`\`\`\n\n\`\`\`` });
          }
      }

      private async handleAddCurrentFileToContextMessage(): Promise<void> {
          await this.contextAttachments.addCurrentFile();
          this.notifyContextChanged();
      }

      private async handleAddSelectionToContextMessage(): Promise<void> {
          await this.contextAttachments.addSelection();
          this.notifyContextChanged();
      }

      private async handleAddOpenFilesToContextMessage(): Promise<void> {
          const count = await this.contextAttachments.addOpenFiles();
          this.notifyContextChanged();
          this.post({
              type: 'system',
              text: `Añadidos ${count} archivo(s) abiertos al contexto.`
          });
      }

      private async handleAddGitToContextMessage(): Promise<void> {
          const workspaceDir = getWorkspaceDirectory();
          if (workspaceDir) {
              const gitInfo = await gitProvider.getGitInfo(workspaceDir);
              if (gitInfo) {
                  const formattedInfo = gitProvider.formatGitInfo(gitInfo);
                  this.contextAttachments.addPart({
                      type: 'text',
                      text: formattedInfo
                  });
                  this.notifyContextChanged();
                  this.post({
                      type: 'system',
                      text: `Información de Git añadida al contexto (branch: \`${gitInfo.branch}\`)`
                  });
              } else {
                  vscode.window.showInformationMessage('No se detectó un repositorio Git en el workspace.');
              }
          } else {
              vscode.window.showErrorMessage('No hay directorio de espacio de trabajo abierto.');
          }
      }

      private async handleRefreshGitInfoMessage(): Promise<void> {
          const workspaceDir = getWorkspaceDirectory();
          if (workspaceDir) {
              const gitInfo = await gitProvider.getGitInfo(workspaceDir);
              this.post({
                  type: 'gitInfoUpdate',
                  gitInfo
              });
          }
      }

      private async handleGitDiffMessage(): Promise<void> {
          const cwd = getWorkspaceDirectory();
          if (cwd) {
              execFile('git', ['diff'], { cwd }, (err, stdout, stderr) => {
                  if (err) {
                      vscode.window.showErrorMessage(`Error al ejecutar git diff: ${err.message || stderr}`);
                      return;
                  }
                  if (stdout) {
                      this.contextAttachments.addPart({
                          type: 'text',
                          text: `Archivo: git-diff.patch\n\`\`\`diff\n${stdout}\n\`\`\``
                      });
                      this.notifyContextChanged();
                  } else {
                      vscode.window.showInformationMessage('No hay cambios sin confirmar (git diff vacío).');
                  }
              });
          } else {
              vscode.window.showErrorMessage('No hay directorio de espacio de trabajo abierto.');
       }
    }

    private async handleAttachFolderMessage(): Promise<void> {
        const folderUri = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Adjuntar Carpeta',
        });
        if (folderUri && folderUri.length > 0) {
            const folderPath = folderUri[0].fsPath;
            
            try {
                // Verificar si la carpeta existe y es accesible
                const stats = await fs.promises.stat(folderPath);
                if (!stats.isDirectory()) {
                    this.post({ type: 'error', message: 'La ruta seleccionada no es una carpeta válida.' });
                    return;
                }
                
                // Limitar el tamaño de la carpeta (evitar carpetas demasiado grandes)
                const maxSize = MAX_FOLDER_SIZE;
                
                try {
                    const calculateFolderSize = async (dir: string, visited = new Set<string>(), depth = 0): Promise<number> => {
                        if (depth > 10 || visited.has(dir)) {
                            return 0;
                        }
                        visited.add(dir);
                        let size = 0;
                        const files = await fs.promises.readdir(dir);
                        for (const file of files) {
                            const filePath = path.join(dir, file);
                            try {
                                const fileStats = await fs.promises.stat(filePath);
                                if (fileStats.isDirectory()) {
                                    size += await calculateFolderSize(filePath, visited, depth + 1);
                                } else {
                                    size += fileStats.size;
                                    if (size > maxSize) {
                                        throw new Error('La carpeta es demasiado grande (máximo 100MB)');
                                    }
                                }
                            } catch (e) {
                                // Ignore file stats error
                            }
                        }
                        return size;
                    };
                    
                    await calculateFolderSize(folderPath);
                } catch (sizeError) {
                    this.post({ type: 'error', message: getErrorMessage(sizeError) });
                    return;
                }

                const { parts, added, skipped } = await readFolderAsParts(folderPath);
                if (added === 0) {
                    this.post({
                        type: 'error',
                        message:
                            'No se encontraron archivos de texto legibles en la carpeta (máx. 1MB y 50 archivos).',
                    });
                    return;
                }
                for (const part of parts) {
                    this.contextAttachments.addPart(part);
                }
                this.notifyContextChanged();
                this.post({
                    type: 'system',
                    text:
                        `Carpeta adjunta: ${folderPath} — ${added} archivo(s) incluido(s)` +
                        (skipped > 0 ? `, ${skipped} omitido(s)` : '') +
                        '.',
                });
                
             } catch (error) {
                 const errorMsg = `No se pudo adjuntar la carpeta: ${getErrorMessage(error)}`;
                 this.post({ type: 'error', message: errorMsg });
             }
         }
     }

     private async handleAttachFileMessage(): Promise<void> {
         const fileUris = await vscode.window.showOpenDialog({
             canSelectMany: true,
             openLabel: 'Adjuntar',
             filters: {
                 'Archivos de imagen': ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'],
                 'Archivos de código': ['ts', 'js', 'tsx', 'jsx', 'py', 'rs', 'go', 'java', 'cpp', 'c', 'h', 'cs', 'php', 'rb', 'swift', 'kt', 'scala', 'm', 'sh', 'sql', 'md', 'json', 'xml', 'yaml', 'yml', 'toml'],
                 'Archivos de texto': ['txt', 'log', 'conf', 'ini', 'cfg'],
                 'Todos los archivos': ['*']
             }
         });
         if (fileUris && fileUris.length > 0) {
             let successCount = 0;
             let errorCount = 0;
             
             for (const uri of fileUris) {
                 try {
                        const buffer = await vscode.workspace.fs.readFile(uri);
                      let mime = 'application/octet-stream';
                      const ext = path.extname(uri.fsPath).toLowerCase();
                      if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) {
                          mime = `image/${ext.replace('.', '').replace('jpg', 'jpeg')}`;
                          const tempUrl = saveImageBuffer(Buffer.from(buffer), path.basename(uri.fsPath), mime);
                          this.post({
                              type: 'fileAttached',
                              attachment: {
                                  type: 'file',
                                  mime,
                                  filename: path.basename(uri.fsPath),
                                  url: tempUrl,
                              },
                          });
                       } else {
                          // Validar tamaño del archivo para archivos de texto
                          const maxSize = MAX_FILE_SIZE;
                          if (buffer.length > maxSize) {
                             this.post({ 
                                 type: 'error', 
                                 message: `El archivo ${path.basename(uri.fsPath)} es demasiado grande (máximo 10MB)` 
                             });
                             errorCount++;
                             continue;
                         }

                          const part = await readFileAsPart(uri.fsPath);
                          this.post({
                              type: 'fileAttached',
                              attachment: {
                                  ...part,
                                  filename: path.basename(uri.fsPath),
                              },
                          });
                     }
                     successCount++;
                 } catch (e) {
                     const errorMsg = `No se pudo adjuntar: ${path.basename(uri.fsPath)} - ${getErrorMessage(e)}`;
                     this.post({ type: 'error', message: errorMsg });
                     errorCount++;
                 }
             }
             
if (successCount > 0) {
                  this.post({
                      type: 'system',
                      text: `Adjuntados ${successCount} archivo(s)${errorCount > 0 ? `, ${errorCount} error(es)` : ''}.`
                  });
              }
           }
       }

       private async handleProcessImageAttachmentMessage(message: any): Promise<void> {
           const attachment = message.attachment;
           if (!attachment || !attachment.url) {
               return;
           }
            try {
                const fileUrl = saveBase64Image(attachment.url, attachment.filename);
                this.post({
                    type: 'fileAttached',
                    attachment: {
                        type: 'file',
                        mime: attachment.mime || 'image/png',
                        filename: attachment.filename || `image-${Date.now()}.png`,
                        url: fileUrl,
                        previewUrl: attachment.url,
                    },
                });
           } catch (e) {
               const msg = getErrorMessage(e);
               this.post({ type: 'error', message: `Error al procesar imagen: ${msg}` });
           }
       }

        private async handleLoadCostDataMessage(): Promise<void> {
           let costData: Record<string, any> = JSON.parse(JSON.stringify(this.context.globalState.get('costData') || {}));
           this.post({ type: 'costDataUpdate', costData });
       }

       private async handleCopyToClipboardMessage(message: any): Promise<void> {
           if (message.text) {
               await vscode.env.clipboard.writeText(message.text);
           }
       }

       private getHtml(webview: vscode.Webview): string {
        const settings = getOpenCodeSettings();
        const lmStudio = settings.localModeEnabled;
        const isEnglish = !vscode.env.language.startsWith('es');
        const branding = lmStudio
            ? {
                  bodyClass: 'theme-lmstudio',
                  logoText: 'LM Studio',
                  pageTitle: 'LM Studio',
                  welcomeTitle: isEnglish ? 'LM Studio ready' : 'LM Studio listo',
                  typingAvatar: 'LS',
              }
            : {
                  bodyClass: '',
                  logoText: 'opencode',
                  pageTitle: 'OpenCode',
                  welcomeTitle: isEnglish ? 'OpenCode ready' : 'OpenCode listo',
                  typingAvatar: 'OC',
              };
        const htmlPath = path.join(
            this.context.extensionUri.fsPath,
            'resources',
            'webview',
            'index.html'
        );
        const scriptPath = path.join(
            this.context.extensionUri.fsPath,
            'resources',
            'webview',
            'main.js'
        );
        const logoPath = path.join(
            this.context.extensionUri.fsPath,
            'resources',
            'logo.svg'
        );
        let html = fs.readFileSync(htmlPath, 'utf8');
        const scriptUri = webview
            .asWebviewUri(vscode.Uri.file(scriptPath))
            .toString();
        const logoUri = webview
            .asWebviewUri(vscode.Uri.file(logoPath))
            .toString();
        const nonce = getNonce();
        const version = this.context.extension.packageJSON.version ?? '0';
        const scriptUriWithCache = `${scriptUri}?v=${encodeURIComponent(version)}`;

        html = html
            .replaceAll('{{cspSource}}', webview.cspSource)
            .replaceAll('{{nonce}}', nonce)
            .replaceAll('{{scriptUri}}', scriptUriWithCache)
            .replaceAll('{{logoUri}}', logoUri)
            .replaceAll('{{bodyClass}}', branding.bodyClass)
            .replaceAll('{{pageTitle}}', branding.pageTitle)
            .replaceAll('{{logoText}}', branding.logoText)
            .replaceAll('{{welcomeTitle}}', branding.welcomeTitle)
            .replaceAll('{{typingAvatar}}', branding.typingAvatar)
            .replace(
                '</head>',
                `<script nonce="${nonce}">window.vscodeLang="${vscode.env.language}";window.__localModeEnabled=${lmStudio};</script></head>`
            );

        return html;
    }

    reloadWebview(): void {
        if (!this.view) {
            return;
        }
        this.view.webview.html = this.getHtml(this.view.webview);
        void this.refreshState();
    }
}

function getNonce(): string {
    let text = '';
    const possible =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
