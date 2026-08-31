/** ponytail: blocklist until OpenCode marks models deprecated in /provider */
const KNOWN_EOL_MODEL_IDS = new Set([
    'glm-5.2',
    'z-ai/glm-5.2',
    'zhipuai::glm-5.2',
    'z-ai::glm-5.2',
    'z-ai::z-ai/glm-5.2',
]);

const LEGACY_PROVIDER_ALIASES: Record<string, string> = {
    'z-ai': 'zhipuai',
};

export function isModelEolMessage(message: string): boolean {
    const msg = message.toLowerCase();
    return (
        msg.includes('410') ||
        msg.includes('"gone"') ||
        msg.includes('status":410') ||
        msg.includes('end of life') ||
        msg.includes('no longer available') ||
        msg.includes('has reached its end of life')
    );
}

export function modelIdIsKnownEol(modelId: string | undefined): boolean {
    if (!modelId) {
        return false;
    }
    const lower = modelId.toLowerCase();
    if (KNOWN_EOL_MODEL_IDS.has(lower)) {
        return true;
    }
    const bare = modelId.includes('::') ? modelId.split('::').slice(1).join('::') : modelId;
    return KNOWN_EOL_MODEL_IDS.has(bare.toLowerCase());
}

export function filterAvailableModels<T extends { id: string }>(models: T[]): T[] {
    const filtered = models.filter((m) => !modelIdIsKnownEol(m.id));
    return filtered.length > 0 ? filtered : models;
}

export function extractModelRefFromEolError(message: string): string | undefined {
    const quoted = message.match(/model\s+['"]([^'"]+)['"]/i)?.[1];
    if (quoted) {
        return quoted;
    }
    const jsonId = message.match(/"id"\s*:\s*"([^"]+)"/i)?.[1];
    return jsonId;
}

export function remapLegacyProviderModelId(
    modelId: string,
    models: { id: string }[]
): string | undefined {
    const split = modelId.split('::');
    if (split.length < 2) {
        return undefined;
    }
    const [provider, ...rest] = split;
    const bareModel = rest.join('::');
    const mappedProvider = LEGACY_PROVIDER_ALIASES[provider] ?? provider;
    const direct = `${mappedProvider}::${bareModel}`;
    if (models.some((m) => m.id === direct) && !modelIdIsKnownEol(direct)) {
        return direct;
    }

    const sameProvider = filterAvailableModels(
        models.filter((m) => m.id.startsWith(`${mappedProvider}::`))
    );
    if (sameProvider.length === 0) {
        return undefined;
    }

    const prefer = sameProvider.find((m) => /glm-5\.3/i.test(m.id)) ?? sameProvider[0];
    return prefer.id;
}

export function resolveSelectedModel(
    models: { id: string }[],
    current: string | undefined
): string | undefined {
    const pool = filterAvailableModels(models);
    if (pool.length === 0) {
        return current;
    }
    if (current && pool.some((m) => m.id === current) && !modelIdIsKnownEol(current)) {
        return current;
    }
    if (current) {
        const remapped = remapLegacyProviderModelId(current, pool);
        if (remapped) {
            return remapped;
        }
    }
    return pool[0]?.id;
}

/** ponytail: smallest runnable check — node -e "require('./out/modelPolicy')._selfCheck()" */
export function _selfCheck(): void {
    if (!isModelEolMessage('The model z-ai/glm-5.2 has reached its end of life')) {
        throw new Error('EOL message detection failed');
    }
    if (!modelIdIsKnownEol('zhipuai::glm-5.2')) {
        throw new Error('EOL model id detection failed');
    }
    const models = [
        { id: 'zhipuai::glm-5.2' },
        { id: 'zhipuai::glm-5.3' },
    ];
    const picked = resolveSelectedModel(models, 'z-ai::glm-5.2');
    if (picked !== 'zhipuai::glm-5.3') {
        throw new Error(`expected glm-5.3 fallback, got ${picked}`);
    }
}
