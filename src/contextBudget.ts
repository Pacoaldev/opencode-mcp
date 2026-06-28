import type { PromptPart } from './types';
import { estimateTokensFromChars, partsCharCount } from './logger';

export type ContextPriority = 'critical' | 'ref';

const PRIORITY_PREFIX: Record<ContextPriority, string> = {
    critical: '[CRÍTICO] ',
    ref: '[REF] ',
};

export function applyPriorityPrefix(part: PromptPart, priority?: ContextPriority): PromptPart {
    if (!priority || part.type !== 'text') {
        return part;
    }
    const prefix = PRIORITY_PREFIX[priority];
    if (part.text.startsWith(prefix)) {
        return part;
    }
    return { ...part, text: prefix + part.text };
}

export function partCharSize(part: PromptPart): number {
    if (part.type === 'text') {
        return part.text.length;
    }
    return 0;
}

export function estimateContextTokens(
    promptText: string,
    contextParts: readonly PromptPart[],
    attachmentParts: readonly PromptPart[] = []
): number {
    const chars =
        promptText.length +
        partsCharCount(contextParts as { type: string; text?: string }[]) +
        partsCharCount(attachmentParts as { type: string; text?: string }[]);
    return estimateTokensFromChars(chars);
}

export function priorityLabelPrefix(priority?: ContextPriority): string {
    if (priority === 'critical') {
        return '[CRÍTICO] ';
    }
    if (priority === 'ref') {
        return '[REF] ';
    }
    return '';
}
