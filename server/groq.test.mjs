import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeWithGroq, GroqError } from './groq.mjs';

const input = { apiKey: 'test-only', image: Buffer.from('photo-bytes'), mime: 'image/jpeg', context: '2 rotis', capturedAt: '2026-10-02T12:00:00Z', instructions: 'Estimate food' };

test('Groq vision request uses the documented image and JSON mode format', async () => {
  const expected = { dishSummary: 'Two rotis', items: [] };
  const result = await analyzeWithGroq({ ...input, fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
    assert.equal(options.headers.Authorization, 'Bearer test-only');
    const body = JSON.parse(options.body);
    assert.equal(body.model, 'qwen/qwen3.8-27b');
    assert.equal(body.messages[1].content[1].image_url.url, `data:image/jpeg;base64,${input.image.toString('base64')}`);
    assert.deepEqual(body.response_format, { type: 'json_object' });
    return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(expected) } }] }) };
  } });
  assert.deepEqual(result, expected);
});

test('Groq quota and missing-key paths fail closed', async () => {
  let calls = 0;
  await assert.rejects(analyzeWithGroq({ ...input, fetchImpl: async () => { calls++; return { status: 429, ok: false }; } }), error => error instanceof GroqError && error.status === 429);
  await assert.rejects(analyzeWithGroq({ ...input, apiKey: '', fetchImpl: async () => { calls++; } }), error => error instanceof GroqError && error.status === 503);
  assert.equal(calls, 1);
});
