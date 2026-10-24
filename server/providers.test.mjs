import test from 'node:test';
import assert from 'node:assert/strict';
import { GeminiError } from './gemini.mjs';
import { analyzeFreePhoto } from './providers.mjs';

const input = { geminiKey: 'free-gemini', groqKey: 'free-groq', image: Buffer.from('photo'), mime: 'image/jpeg' };
const passthrough = value => value;

test('successful Gemini result never sends a photo to Groq', async () => {
  let groqCalls = 0;
  const result = await analyzeFreePhoto(input, {
    validate: passthrough,
    gemini: async () => ({ dishSummary: 'Dal' }),
    groq: async () => { groqCalls++; },
  });
  assert.equal(result.dishSummary, 'Dal');
  assert.equal(groqCalls, 0);
});

test('Gemini quota exhaustion triggers one Groq fallback', async () => {
  let groqCalls = 0;
  const result = await analyzeFreePhoto(input, {
    validate: passthrough,
    gemini: async () => { throw new GeminiError(429, 'Free AI limit reached.'); },
    groq: async ({ apiKey }) => { groqCalls++; assert.equal(apiKey, 'free-groq'); return { dishSummary: 'Dal' }; },
  });
  assert.equal(result.dishSummary, 'Dal');
  assert.equal(groqCalls, 1);
});

test('Gemini temporary failures use configured Groq once', async () => {
  let groqCalls = 0;
  await analyzeFreePhoto(input, {
    validate: passthrough,
    gemini: async () => { throw new GeminiError(502, 'Unavailable'); },
    groq: async () => { groqCalls++; },
  });
  assert.equal(groqCalls, 1);
});

test('Groq-only works if configured, and no keys means no call', async () => {
  let groqCalls = 0;
  const result = await analyzeFreePhoto({ ...input, geminiKey: '' }, {
    validate: passthrough,
    gemini: async () => assert.fail('Gemini must be skipped'),
    groq: async () => { groqCalls++; return { dishSummary: 'Rice' }; },
  });
  assert.equal(result.dishSummary, 'Rice');
  await assert.rejects(analyzeFreePhoto({ ...input, geminiKey: '', groqKey: '' }, {
    gemini: async () => assert.fail('Gemini must be skipped'),
    groq: async () => assert.fail('Groq must be skipped'),
  }));
  assert.equal(groqCalls, 1);
});

test('safety/no-analysis and parent cancellation never fall back', async () => {
  for (const code of ['no-analysis', 'aborted']) await assert.rejects(analyzeFreePhoto(input, {
    gemini: async () => { throw new GeminiError(502, 'Stopped', undefined, code); },
    groq: async () => assert.fail('Unsafe fallback'),
  }));
  const controller = new AbortController(); controller.abort();
  await assert.rejects(analyzeFreePhoto({ ...input, signal: controller.signal }, {
    gemini: async () => { throw new GeminiError(504, 'Timeout'); }, groq: async () => assert.fail('Cancelled fallback'),
  }));
});

test('invalid nutrition triggers fallback and invalid fallback is rejected', async () => {
  let calls = 0;
  await assert.rejects(analyzeFreePhoto(input, {
    gemini: async () => ({ invalid: true }), groq: async () => { calls++; return { invalid: true }; },
  }), /nutrition safety/);
  assert.equal(calls, 1);
});
