/** ponytail: static seeds until OpenCode marks models deprecated in /provider */
const KNOWN_EOL_MODEL_IDS = new Set([
    'glm-5.2',
    'z-ai/glm-5.2',
    'zhipuai::glm-5.2',
    'z-ai::glm-5.2',
    'z-ai::z-ai/glm-5.2',
    'nvidia/nemotron-nano-12b-v2-vl',
    'nvidia::nvidia/nemotron-nano-12b-v2-vl',
    'microsoft/phi-4-multimodal-instruct',
    'nvidia::microsoft/phi-4-multimodal-instruct',
]);

const LEGACY_PROVIDER_ALIASES: Record<string, string> = {
    'z-ai': 'zhipuai',
};

const PROVIDER_FALLBACK_PREFER: Record<string, RegExp[]> = {
    zhipuai: [/glm-5\.3/i],
    nvidia: [/nemotron-3-nano-30b/i, /nemotron-3-nano/i, /llama-3\.3-nemotron-super/i],
};

let runtimeEolKeys = new Set<string>();

export function loadRuntimeEolModels(ids: string[]): void {
    runtimeEolKeys = new Set();
    for (const id of ids) {
        for (const key of normalizeModelKeys(id)) {
            runtimeEolKeys.add(key);
        }
    }
}

export function getRuntimeEolModelsForPersistence(): string[] {
    return [...runtimeEolKeys].sort();
}

export function rememberEolModel(ref: string | undefined): void {
    if (!ref) {
        return;
    }
    for (const key of normalizeModelKeys(ref)) {
        runtimeEolKeys.add(key);
    }
}

export function normalizeModelKeys(modelId: string): string[] {
    const keys = new Set<string>();
    const lower = modelId.toLowerCase();
    keys.add(lower);

    if (modelId.includes('::')) {
        const [provider, ...rest] = modelId.split('::');
        const bare = rest.join('::');
        keys.add(bare.toLowerCase());
        keys.add(`${provider}/${bare}`.toLowerCase());
        keys.add(`${provider}::${bare}`.toLowerCase());
        if (!bare.startsWith(`${provider}/`)) {
            keys.add(`${provider}::${provider}/${bare}`.toLowerCase());
            keys.add(`${provider}/${provider}/${bare}`.toLowerCase());
        }
        return [...keys];
    }

    const slash = modelId.indexOf('/');
    if (slash > 0) {
        const provider = modelId.slice(0, slash);
        const bare = modelId.slice(slash + 1);
        keys.add(`${provider}::${modelId}`.toLowerCase());
        keys.add(`${provider}::${bare}`.toLowerCase());
    }

    return [...keys];
}

function isKeyEol(key: string): boolean {
    if (KNOWN_EOL_MODEL_IDS.has(key)) {
        return true;
    }
    return runtimeEolKeys.has(key);
}

export function looksLikeProviderErrorText(text: string | undefined): boolean {
    if (!text) {
        return false;
    }
    if (isModelEolMessage(text)) {
        return true;
    }
    const trimmed = text.trim();
    return /^(gone|error|aborted)\b/i.test(trimmed) || trimmed.includes('"status":410');
}

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
    return normalizeModelKeys(modelId).some((key) => isKeyEol(key));
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

function pickPreferredModel(
    provider: string,
    models: { id: string }[]
): string | undefined {
    const patterns = PROVIDER_FALLBACK_PREFER[provider] ?? [];
    for (const pattern of patterns) {
        const hit = models.find((m) => pattern.test(m.id));
        if (hit) {
            return hit.id;
        }
    }
    return models[0]?.id;
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

    return pickPreferredModel(mappedProvider, sameProvider);
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
        const provider = current.split('::')[0];
        const sameProvider = pool.filter((m) => m.id.startsWith(`${provider}::`));
        if (sameProvider.length > 0) {
            return pickPreferredModel(provider, sameProvider);
        }
    }
    return pool[0]?.id;
}

/** ponytail: smallest runnable check — node -e "require('./out/modelPolicy')._selfCheck()" */
export function _selfCheck(): void {
    loadRuntimeEolModels([]);
    if (!isModelEolMessage('The model z-ai/glm-5.2 has reached its end of life')) {
        throw new Error('EOL message detection failed');
    }
    if (!modelIdIsKnownEol('zhipuai::glm-5.2')) {
        throw new Error('EOL model id detection failed');
    }
    if (!modelIdIsKnownEol('nvidia::nvidia/nemotron-nano-12b-v2-vl')) {
        throw new Error('Nvidia EOL model id detection failed');
    }

    rememberEolModel('vendor/foo-bar');
    if (!modelIdIsKnownEol('vendor::vendor/foo-bar')) {
        throw new Error('runtime EOL registration failed');
    }

    const models = [
        { id: 'zhipuai::glm-5.2' },
        { id: 'zhipuai::glm-5.3' },
    ];
    const picked = resolveSelectedModel(models, 'z-ai::glm-5.2');
    if (picked !== 'zhipuai::glm-5.3') {
        throw new Error(`expected glm-5.3 fallback, got ${picked}`);
    }

    const nvidiaModels = [
        { id: 'nvidia::nvidia/nemotron-nano-12b-v2-vl' },
        { id: 'nvidia::nvidia/nemotron-3-nano-30b-a3b' },
    ];
    const nvidiaPick = resolveSelectedModel(
        nvidiaModels,
        'nvidia::nvidia/nemotron-nano-12b-v2-vl'
    );
    if (nvidiaPick !== 'nvidia::nvidia/nemotron-3-nano-30b-a3b') {
        throw new Error(`expected nemotron-3-nano fallback, got ${nvidiaPick}`);
    }
}
