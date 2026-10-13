const assert = require('assert/strict');
const { test } = require('node:test');

const {
    getEurRate,
    getEurRateValue,
    usdToEur,
    restoreEurRate,
    estimateCostUsd,
    resolveCost,
    __resetPricingState,
    FALLBACK_EUR_RATE,
} = require('../out/pricing');

test('getEurRate devuelve el tipo fijo de referencia cuando no hay vivo', () => {
    __resetPricingState();
    const r = getEurRate();
    assert.equal(r.source, 'fixed');
    assert.equal(r.rate, FALLBACK_EUR_RATE);
    assert.ok(r.asOf);
});

test('restoreEurRate instala un tipo vivo vigente', () => {
    __resetPricingState();
    restoreEurRate(0.9, 'frankfurter 2026-10-13', Date.now());
    const r = getEurRate();
    assert.equal(r.source, 'live');
    assert.equal(r.rate, 0.9);
});

test('restoreEurRate ignora valores inválidos', () => {
    __resetPricingState();
    restoreEurRate(0, 'x', Date.now());
    restoreEurRate(NaN, 'x', Date.now());
    restoreEurRate(-1, 'x', Date.now());
    assert.equal(getEurRate().source, 'fixed');
});

test('restoreEurRate descarta un tipo vivo caducado (más de 24h)', () => {
    __resetPricingState();
    restoreEurRate(0.5, 'viejo', Date.now() - 25 * 60 * 60 * 1000);
    assert.equal(getEurRate().source, 'fixed');
});

test('usdToEur aplica el tipo vigente', () => {
    __resetPricingState();
    restoreEurRate(0.5, 'test', Date.now());
    assert.equal(getEurRateValue(), 0.5);
    assert.equal(usdToEur(10), 5);
});

test('estimateCostUsd usa la tarifa de respaldo por modelo', () => {
    // 1M input + 1M output a 2$/6$ = 8$
    assert.equal(estimateCostUsd(1_000_000, 1_000_000, 'mistral-medium-latest'), 8);
    // Modelo desconocido cae en default (2/6)
    assert.equal(estimateCostUsd(1_000_000, 1_000_000, 'modelo-raro'), 8);
});

test('resolveCost prioriza el coste REAL de OpenCode', () => {
    __resetPricingState();
    restoreEurRate(0.5, 'test', Date.now());
    const c = resolveCost(0.1234, 1_000_000, 1_000_000, 'mistral-medium-latest');
    assert.equal(c.usd, 0.1234);
    assert.equal(c.eur, 0.0617); // 0.1234 * 0.5 = 0.0617
});

test('resolveCost cae al estimado cuando no hay coste real', () => {
    __resetPricingState();
    restoreEurRate(0.5, 'test', Date.now());
    const c = resolveCost(undefined, 1_000_000, 1_000_000, 'mistral-medium-latest');
    assert.equal(c.usd, 8);
    assert.equal(c.eur, 4);
});

test('resolveCost ignora costes reales inválidos y estima', () => {
    __resetPricingState();
    restoreEurRate(0.5, 'test', Date.now());
    assert.equal(resolveCost(NaN, 1_000_000, 0, 'mistral-medium-latest').usd, 2);
    assert.equal(resolveCost(-3, 1_000_000, 0, 'mistral-medium-latest').usd, 2);
});

test('resolveCost con 0 tokens y sin coste real da 0', () => {
    __resetPricingState();
    const c = resolveCost(undefined, 0, 0, 'default');
    assert.equal(c.usd, 0);
    assert.equal(c.eur, 0);
});

test('resolveCost acepta coste real 0 (LM Studio local gratis)', () => {
    __resetPricingState();
    const c = resolveCost(0, 1_000_000, 1_000_000, 'mistral-medium-latest');
    assert.equal(c.usd, 0);
    assert.equal(c.eur, 0);
});
