import * as vscode from 'vscode';

interface PromptSuggestion {
    text: string;
    score: number;
    category: string;
}

interface SmartTemplate {
    id: string;
    name: string;
    text: string;
    category: string;
    usageCount: number;
    lastUsed: number;
    contextKeywords: string[];
}

export class PromptManager {
    private static readonly PROMPT_HISTORY_STATE_KEY = 'opencode.promptHistory';
    private prompts: string[] = [];
    private templates: Map<string, SmartTemplate> = new Map();
    private suggestions: PromptSuggestion[] = [];
    private globalState: vscode.Memento | undefined;

    constructor(context?: vscode.ExtensionContext) {
        this.globalState = context?.globalState;
        this.loadHistory();
        this.initializeSmartTemplates();
    }

    private loadHistory(): void {
        const history = this.globalState?.get<string[]>(PromptManager.PROMPT_HISTORY_STATE_KEY, []) || [];
        this.prompts = history.slice(-100); // Keep last 100 prompts
    }

    private saveHistory(): void {
        void this.globalState?.update(PromptManager.PROMPT_HISTORY_STATE_KEY, this.prompts);
    }

    private initializeSmartTemplates(): void {
        const defaultTemplates: SmartTemplate[] = [
            {
                id: 'explain-code',
                name: 'Explicar código',
                text: 'Explica el siguiente código detalladamente:',
                category: 'code',
                usageCount: 0,
                lastUsed: 0,
                contextKeywords: ['código', 'función', 'clase', 'método']
            },
            {
                id: 'find-bugs',
                name: 'Buscar bugs',
                text: 'Encuentra posibles errores o problemas de seguridad en este código:',
                category: 'analysis',
                usageCount: 0,
                lastUsed: 0,
                contextKeywords: ['bug', 'error', 'seguridad', 'vulnerabilidad']
            },
            {
                id: 'generate-tests',
                name: 'Generar tests',
                text: 'Genera tests unitarios para las siguientes funciones:',
                category: 'testing',
                usageCount: 0,
                lastUsed: 0,
                contextKeywords: ['test', 'prueba', 'unitario', 'assert']
            },
            {
                id: 'refactor',
                name: 'Refactorizar',
                text: 'Refactoriza este código para mejorar su legibilidad y rendimiento:',
                category: 'refactoring',
                usageCount: 0,
                lastUsed: 0,
                contextKeywords: ['refactor', 'mejora', 'optimización', 'legibilidad']
            },
            {
                id: 'documentation',
                name: 'Generar documentación',
                text: 'Genera documentación detallada para este código:',
                category: 'documentation',
                usageCount: 0,
                lastUsed: 0,
                contextKeywords: ['doc', 'comentario', 'documentación', 'README']
            }
        ];

        defaultTemplates.forEach(template => {
            this.templates.set(template.id, template);
        });
    }

    addPrompt(prompt: string): void {
        this.prompts.push(prompt);
        if (this.prompts.length > 100) {
            this.prompts.shift();
        }
        this.saveHistory();
        this.updateSuggestions();
    }

    getSuggestions(input: string, limit: number = 5): PromptSuggestion[] {
        this.updateSuggestions();
        return this.suggestions
            .filter(s => s.text.toLowerCase().includes(input.toLowerCase()))
            .slice(0, limit);
    }

    private updateSuggestions(): void {
        this.suggestions = [];
        
        // Analyze recent prompts for patterns
        const recentPrompts = this.prompts.slice(-20);
        
        // Add suggestions based on frequency
        const promptFreq = new Map<string, number>();
        recentPrompts.forEach(prompt => {
            const words = prompt.toLowerCase().split(/\s+/);
            words.forEach(word => {
                if (word.length > 3) {
                    promptFreq.set(word, (promptFreq.get(word) || 0) + 1);
                }
            });
        });

        // Generate suggestions from frequent words
        promptFreq.forEach((count, word) => {
            if (count > 2) {
                this.suggestions.push({
                    text: word,
                    score: count,
                    category: 'frequent'
                });
            }
        });

        // Add template suggestions
        this.templates.forEach(template => {
            this.suggestions.push({
                text: template.name,
                score: template.usageCount,
                category: template.category
            });
        });

        // Sort by score and remove duplicates
        this.suggestions = this.suggestions
            .sort((a, b) => b.score - a.score)
            .filter((s, i, arr) => arr.findIndex(x => x.text === s.text) === i);
    }

    getTemplate(id: string): SmartTemplate | undefined {
        return this.templates.get(id);
    }

    getTemplatesByCategory(category: string): SmartTemplate[] {
        return Array.from(this.templates.values())
            .filter(t => t.category === category);
    }

    getAllTemplates(): SmartTemplate[] {
        return Array.from(this.templates.values());
    }

    useTemplate(id: string): string | undefined {
        const template = this.templates.get(id);
        if (template) {
            template.usageCount++;
            template.lastUsed = Date.now();
            this.templates.set(id, template);
            return template.text;
        }
        return undefined;
    }

    generateSmartTemplate(context: string): string {
        const fileExtension = this.getFileExtension();
        const language = this.getLanguage();
        
        // Context-aware template suggestions
        if (context.includes('bug') || context.includes('error')) {
            return this.useTemplate('find-bugs') || 'Analiza este código en busca de posibles errores:';
        }
        
        if (context.includes('test') || context.includes('prueba')) {
            return this.useTemplate('generate-tests') || 'Genera tests para este código:';
        }
        
        if (context.includes('doc') || context.includes('documentación')) {
            return this.useTemplate('documentation') || 'Genera documentación para este código:';
        }
        
        if (context.includes('refactor') || context.includes('optimizar')) {
            return this.useTemplate('refactor') || 'Mejora este código:';
        }
        
        // Default based on file type
        if (fileExtension === 'ts' || fileExtension === 'js') {
            return this.useTemplate('explain-code') || 'Explica este código TypeScript/JavaScript:';
        }
        
        return this.useTemplate('explain-code') || 'Explica este código:';
    }

    private getFileExtension(): string {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const fileName = editor.document.fileName;
            return fileName.split('.').pop()?.toLowerCase() || '';
        }
        return '';
    }

    private getLanguage(): string {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            return editor.document.languageId;
        }
        return '';
    }

    getTemplateCategories(): string[] {
        const categories = new Set<string>();
        this.templates.forEach(template => {
            categories.add(template.category);
        });
        return Array.from(categories);
    }
}