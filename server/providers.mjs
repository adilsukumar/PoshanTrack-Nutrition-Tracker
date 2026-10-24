import { analyzeWithGemini, GeminiError } from './gemini.mjs';
import { analyzeWithGroq } from './groq.mjs';
import { validateAnalysis } from './analysisValidation.mjs';

async function bounded(provider, input, milliseconds, validate) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new DOMException('Provider timeout', 'TimeoutError')), milliseconds);
  try {
    const signal = input.signal ? AbortSignal.any([input.signal, controller.signal]) : controller.signal;
    const result = await provider({ ...input, signal });
    try { return validate(result); } catch {
      throw new GeminiError(502, 'AI food estimates did not pass nutrition safety checks. Try another photo or manual search.', undefined, 'invalid-analysis');
    }
  } finally { clearTimeout(timeout); }
}

export async function analyzeFreePhoto(options, dependencies = {}) {
  const gemini = dependencies.gemini ?? analyzeWithGemini;
  const groq = dependencies.groq ?? analyzeWithGroq;
  const validate = dependencies.validate ?? validateAnalysis;
  const { geminiKey, groqKey, ...input } = options;
  if (geminiKey) {
    try {
      return await bounded(gemini, { ...input, apiKey: geminiKey }, 25000, validate);
    } catch (error) {
      // Never retry cancelled uploads or safety-blocked/no-food responses.
      const recoverable = error instanceof GeminiError &&
        ([429, 503, 504].includes(error.status) ||
          (error.status === 502 && !['no-analysis', 'aborted'].includes(error.code)));
      if (input.signal?.aborted || !recoverable || !groqKey) throw error;
      console.info('meal_analysis_fallback', JSON.stringify({ from: 'gemini', to: 'groq', status: error.status }));
    }
  }
  if (groqKey) return bounded(groq, { ...input, apiKey: groqKey }, 20000, validate);
  throw new GeminiError(503, 'No free photo AI provider is configured. Use manual food search.');
}
