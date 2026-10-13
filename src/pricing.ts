/**
 * Conversión de costes de AI a EUR.
 *
 * El coste real (USD) lo reporta OpenCode en `assistant.info.cost`, ya calculado
 * con los precios/cache/descuentos del provider. Aquí solo se convierte a EUR.
 *
 * Estrategia de conversión (por orden de preferencia):
 *  1. Tipo de cambio vivo cacheado (si una fuente lo actualizó en las últimas 24h).
 *  2. Tipo de cambio fijo de referencia (FALLBACK_EUR_RATE), actualizado a mano.
 *
 * El tipo vivo se obtiene con {@link refreshEurRate}: consulta una API pública
 * gratuita (sin clave), sin bloquear el flujo de chat. Si falla o no hay red,
 * se mantiene el valor fijo sin romper nada (degradación silenciosa).
 */

/** Fecha en la que se fijó el tipo de referencia (para mostrarlo en la UI). */
export const FALLBACK_EUR_RATE_DATE = '2026-10-13';

/**
 * Tipo de cambio fijo USD→EUR de referencia.
 * Se usa cuando no hay un tipo vivo disponible.
 * Actualizar a mano cuando se revise el proyecto (ver FALLBACK_EUR_RATE_DATE).
 */
export const FALLBACK_EUR_RATE = 0.92;

/** Endpoint público, gratuito y sin API key: https://www.frankfurter.app (BCE). */
const RATE_ENDPOINT = 'https://api.frankfurter.app/latest?from=USD&to=EUR';

/** Vigencia del tipo cacheado antes de considerarlo obsoleto (24h). */
const RATE_TTL_MS = 24 * 60 * 60 * 1000;

/** Tiempo máximo que esperamos a la API antes de rendirnos. */
const RATE_FETCH_TIMEOUT_MS = 5000;

interface CachedRate {
    rate: number;
    fetchedAt: number;
    source: string;
}

interface RateState {
    /** Tipo vivo cacheado; `undefined` si nunca se obtuvo o caducó. */
    live?: CachedRate;
}

const state: RateState = {};

/**
 * Redondea a 4 decimales para mostrar el tipo de cambio sin ruido.
 */
function round4(value: number): number {
    return Math.round(value * 10000) / 10000;
}

/**
 * Devuelve el tipo de cambio USD→EUR a usar, junto con metadatos de origen.
 * Síncrono: nunca hace red. Usa el tipo vivo cacheado si está vigente,
 * si no el fijo de referencia.
 */
export function getEurRate(): { rate: number; source: 'live' | 'fixed'; asOf: string } {
    const live = state.live;
    if (live && Date.now() - live.fetchedAt < RATE_TTL_MS) {
        return { rate: live.rate, source: 'live', asOf: live.source };
    }
    return { rate: FALLBACK_EUR_RATE, source: 'fixed', asOf: FALLBACK_EUR_RATE_DATE };
}

/** Igual que {@link getEurRate} pero devuelve solo el número. */
export function getEurRateValue(): number {
    return getEurRate().rate;
}

/** Convierte un importe en USD a EUR usando el tipo vigente. */
export function usdToEur(usd: number): number {
    return usd * getEurRateValue();
}

/**
 * Refresca el tipo de cambio vivo desde la API pública (best-effort, no bloquea).
 * Si ya hay un tipo vivo vigente, no vuelve a consultar.
 * Guarda el resultado en un setter inyectable para poder persistirlo en globalState.
 */
export async function refreshEurRate(
    persist?: (rate: number, source: string, fetchedAt: number) => void
): Promise<void> {
    if (state.live && Date.now() - state.live.fetchedAt < RATE_TTL_MS) {
        return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), RATE_FETCH_TIMEOUT_MS);
    try {
        const response = await fetch(RATE_ENDPOINT, { signal: controller.signal });
        if (!response.ok) {
            return;
        }
        const body = (await response.json()) as { rates?: { EUR?: number }; date?: string };
        const rate = body?.rates?.EUR;
        if (typeof rate !== 'number' || !isFinite(rate) || rate <= 0) {
            return;
        }
        const fetchedAt = Date.now();
        const source = body?.date ? `frankfurter ${body.date}` : 'frankfurter live';
        state.live = { rate, fetchedAt, source };
        persist?.(rate, source, fetchedAt);
    } catch {
        // Silencioso: sin red o API caída => seguimos con el tipo fijo.
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Restaura un tipo vivo previamente persistido (p. ej. desde globalState).
 * Se ignora si ya caducó.
 */
export function restoreEurRate(rate: number, source: string, fetchedAt: number): void {
    if (typeof rate === 'number' && isFinite(rate) && rate > 0) {
        state.live = { rate, fetchedAt, source };
    }
}

/** Solo para tests. */
export function __resetPricingState(): void {
    state.live = undefined;
}

// ---------------------------------------------------------------------------
// Estimación de coste para caminos SIN coste real (p. ej. LM Studio local).
// ---------------------------------------------------------------------------

/**
 * Precios de referencia por millón de tokens (USD) usados SOLO como respaldo
 * cuando el proveedor no reporta `info.cost`. No pretende ser exacto; el coste
 * real siempre que exista lo da OpenCode.
 */
const FALLBACK_MODEL_PRICES: Record<string, { input: number; output: number }> = {
    'mistral-medium-latest': { input: 2.0, output: 6.0 },
    default: { input: 2.0, output: 6.0 },
};

/**
 * Calcula un coste estimado en USD a partir de tokens. SOLO debe usarse como
 * fallback cuando no hay `info.cost` (p. ej. LM Studio local, cuyo coste real
 * de API es 0). NUNCA sustituye al coste real de OpenCode.
 */
export function estimateCostUsd(
    inputTokens: number,
    outputTokens: number,
    model: string | undefined
): number {
    const price = FALLBACK_MODEL_PRICES[model ?? 'default'] ?? FALLBACK_MODEL_PRICES.default;
    return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}

/**
 * Deriva el coste (USD/EUR) de un evento con coste real o estimado.
 *
 * @param costUsd  Coste real reportado por OpenCode, si lo hay.
 * @param inputTokens / outputTokens / model  Datos para el fallback estimado.
 * @returns `{ usd, eur }` redondeados para acumulación estable.
 */
export function resolveCost(
    costUsd: number | undefined,
    inputTokens: number,
    outputTokens: number,
    model: string | undefined
): { usd: number; eur: number } {
    const usd =
        typeof costUsd === 'number' && isFinite(costUsd) && costUsd >= 0
            ? costUsd
            : estimateCostUsd(inputTokens, outputTokens, model);
    return { usd: round4(usd), eur: round4(usdToEur(usd)) };
}
