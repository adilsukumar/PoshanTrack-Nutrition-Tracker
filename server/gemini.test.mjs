import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeWithGemini, GeminiError } from './gemini.mjs';

const input = { apiKey: 'test-only', image: Buffer.from('photo-bytes'), mime: 'image/jpeg', context: '2 rotis', capturedAt: '2026-09-30T12:00:00Z', instructions: 'Estimate food' };

test('Gemini request sends one photo and context using structured JSON without a paid fallback', async () => {
  const expected = { dishSummary: 'Two rotis', items: [] };
  const result = await analyzeWithGemini({ ...input, fetchImpl: async (url, options) => {
    assert.match(url, /gemini-3\.8-flash:generateContent$/);
    assert.equal(options.headers['x-goog-api-key'], 'test-only');
    const body = JSON.parse(options.body);
    assert.equal(body.contents[0].parts[1].inline_data.data, input.image.toString('base64'));
    assert.equal(body.generationConfig.responseFormat.text.mimeType, 'APPLICATION_JSON');
    assert.equal(body.generationConfig.thinkingConfig.thinkingLevel, 'LOW');
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(expected) }] } }] }) };
  } });
  assert.deepEqual(result, expected);
});

test('quota exhaustion is reported and does not invoke another provider', async () => {
  let calls = 0;
  await assert.rejects(analyzeWithGemini({ ...input, fetchImpl: async () => { calls++; return { status: 429, ok: false }; } }), error => error instanceof GeminiError && error.status === 429);
  assert.equal(calls, 1);
});

test('missing Gemini key fails before any provider call', async () => {
  let calls = 0;
  await assert.rejects(analyzeWithGemini({ ...input, apiKey: '', fetchImpl: async () => { calls++; } }), error => error instanceof GeminiError && error.status === 503);
  assert.equal(calls, 0);
});

test('upstream failures preserve only numeric status and a safe explanation', async () => {
  for (const status of [400, 401, 403, 404, 500, 503]) {
    await assert.rejects(analyzeWithGemini({ ...input, fetchImpl: async () => ({ status, ok: false }) }), error => {
      assert.equal(error.upstreamStatus, status);
      assert.ok(!error.message.includes(input.apiKey));
      return error instanceof GeminiError;
    });
  }
});

test('thinking text and a surrounding JSON fence are not parsed as food data', async () => {
  const expected = { dishSummary: 'Dal', items: [] };
  const result = await analyzeWithGemini({ ...input, fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [
    { thought: true, text: 'private thinking is not JSON' }, { text: '```json\n' + JSON.stringify(expected) + '\n```' },
  ] } }] }) }) });
  assert.deepEqual(result, expected);
});

test('network, timeout, invalid response JSON and malformed answer get safe distinct codes', async () => {
  const cases = [
    ['network', async () => { throw new TypeError('secret response'); }],
    ['timeout', async () => { const error = new Error('secret'); error.name = 'TimeoutError'; throw error; }],
    ['response-json', async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('secret'); } })],
    ['analysis-json', async () => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'secret not JSON' }] } }] }) })],
    ['output-limit', async () => ({ ok: true, status: 200, json: async () => ({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{' }] } }] }) })],
  ];
  for (const [code, fetchImpl] of cases) await assert.rejects(analyzeWithGemini({ ...input, fetchImpl }), error => {
    assert.equal(error.code, code); assert.ok(!error.message.includes('secret')); return error instanceof GeminiError;
  });
});
