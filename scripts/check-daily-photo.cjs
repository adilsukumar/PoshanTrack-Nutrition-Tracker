// Regression checks: real SDK multipart serialization, simulated local midnight
// and foreground after Android suspends timers. No provider calls or user photos.
/* global __dirname, Buffer */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
process.env.TZ = 'Asia/Kolkata';
const realDate = Date;
let now = new realDate('2026-10-06T23:59:59.950+05:30').getTime();
class ClockDate extends realDate { constructor(...args) { super(...(args.length ? args : [now])); } }
let nextTimer = 0;
const timers = new Map();
const fakeSetTimeout = (fn, delay) => { const id = ++nextTimer; timers.set(id, { fn, due: now + delay }); return id; };
const fakeClearTimeout = id => timers.delete(id);
function advanceTo(target) {
  while (true) {
    const next = [...timers.entries()].filter(([, value]) => value.due <= target).sort((a, b) => a[1].due - b[1].due)[0];
    if (!next) break;
    now = next[1].due; timers.delete(next[0]); next[1].fn();
  }
  now = target;
}
function compile(file, requireModule, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = { exports: {}, require: requireModule, Date: realDate, Blob, TextEncoder, AbortController, setTimeout, clearTimeout, ...globals };
  vm.runInNewContext(code, context);
  return context.exports;
}
const clockGlobals = { Date: ClockDate, setTimeout: fakeSetTimeout, clearTimeout: fakeClearTimeout };
const daily = compile('src/dailyClock.ts', () => { throw new Error('Unexpected import'); }, clockGlobals);
let snapshot, cleanup, foreground;
const hook = compile('src/useLocalDay.ts', name => {
  if (name === './dailyClock') return daily;
  if (name === 'react') return {
    useState: init => { if (!snapshot) snapshot = init(); return [snapshot, fn => { snapshot = fn(snapshot); }]; },
    useEffect: fn => { if (!cleanup) cleanup = fn(); },
  };
  if (name === 'react-native') return { AppState: { addEventListener: (_event, fn) => {
    foreground = fn; return { remove: () => { foreground = undefined; } };
  } } };
  throw new Error(name);
}, clockGlobals);
const nutrition = compile('src/nutrition.ts', () => { throw new Error('Unexpected import'); }, clockGlobals);
const meals = [{ createdAt: '2026-10-06T20:00:00+05:30', items: [{ calories: 450, proteinG: 15, carbsG: 70, fatG: 12, quantity: 1 }] }];
const total = () => nutrition.sumMeals(meals.filter(meal => nutrition.isSameLocalDay(meal.createdAt, hook.useLocalDay()))).calories;
assert.equal(total(), 450);
const beforeMidnight = snapshot;
advanceTo(new realDate('2026-10-07T00:00:00.060+05:30').getTime());
assert.notEqual(snapshot, beforeMidnight);
assert.equal(total(), 0);
assert.equal(meals.length, 1); // Yesterday's diary survives the daily reset.
const currentSnapshot = snapshot;
advanceTo(now + 60000);
assert.equal(snapshot, currentSnapshot); // No needless rerender during the same day.
now = new realDate('2026-10-09T08:00:00+05:30').getTime(); // Simulate suspended timers.
foreground('active');
assert.equal(daily.localDayKey(hook.useLocalDay()), '2026-10-09');
assert.equal(total(), 0);
cleanup();
assert.equal(timers.size, 0);
assert.equal(foreground, undefined);

async function checkPhotoUpload() {
  // Use Expo's actual FormData patch and actual serializer, not a hand-written
  // imitation of the API that originally rejected the legacy URI object.
  const formModule = compile('node_modules/expo/src/winter/FormData.ts', () => { throw new Error('Unexpected import'); });
  class NativeFormData { constructor() { this._parts = []; } }
  const FormData = formModule.installFormDataPatch(NativeFormData);
  const converter = compile('node_modules/expo/src/winter/fetch/convertFormData.ts', () => ({ blobToArrayBufferAsync: blob => blob.arrayBuffer() }));
  const legacy = new FormData();
  legacy.append('image', { uri: 'file:///meal.jpg', name: 'meal.jpg', type: 'image/jpeg' });
  await assert.rejects(converter.convertFormDataAsync(legacy), /Unsupported FormDataPart/);
  const bytes = Uint8Array.from([255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 255, 217]);
  class LocalFile {
    constructor(uri) { this.uri = uri; this.name = uri.endsWith('.png') ? 'meal.png' : 'meal.jpg'; this.type = uri.endsWith('.png') ? 'image/png' : 'image/jpeg'; this.exists = !uri.includes('missing'); this.size = uri.includes('large') ? 7 * 1024 * 1024 : bytes.length; }
    bytes() { return Promise.resolve(bytes); }
  }
  let sent = 0;
  const contextText = '2 idlis, 1 tsp ghee';
  const timestamp = '2026-10-06T12:00:00.000Z';
  const client = compile('src/mealAnalysis.ts', name => {
    if (name === 'expo-file-system') return { File: LocalFile };
    if (name === './apiConfig') return { getApiUrl: () => 'https://example.invalid', getBackendKey: async () => 'test-only-private-code' };
    if (name === 'expo/fetch') return { fetch: async (url, options) => {
      sent++;
      if (url.endsWith('/api/status')) return new Response(JSON.stringify({ ready: true }), { status: 200 });
      assert.equal(url, 'https://example.invalid/api/analyse-meal');
      assert.equal(options.headers['X-Client-Key'], 'test-only-private-code');
      assert.equal(options.headers['Content-Type'], undefined); // Serializer supplies the boundary.
      const { body, boundary } = await converter.convertFormDataAsync(options.body);
      const parsed = await new Response(body, { headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` } }).formData();
      const image = parsed.get('image');
      assert.ok(Buffer.from(await image.arrayBuffer()).equals(Buffer.from(bytes)));
      assert.equal(image.type, 'image/jpeg');
      assert.equal(image.name, 'meal.jpg');
      assert.equal(parsed.get('context'), contextText);
      assert.equal(parsed.get('capturedAt'), timestamp);
      assert.equal([...parsed.keys()].length, 3);
      return new Response(JSON.stringify({ items: [{ name: 'Idli', calories: 130, quantity: 1 }] }), { status: 200 });
    } };
    throw new Error(name);
  }, { FormData });
  const result = await client.analyseMealPhoto('file:///meal.jpg', contextText, timestamp);
  assert.equal(result.items[0].name, 'Idli');
  await assert.rejects(client.analyseMealPhoto('file:///missing.jpg'), /no longer available/);
  await assert.rejects(client.analyseMealPhoto('file:///large.jpg'), /larger than 6 MB/);
  assert.equal(sent, 2); // Readiness/wake-up, then multipart analysis.
}
checkPhotoUpload().then(() => console.log('Daily midnight/foreground reset and SDK multipart photo-upload checks passed.')).catch(error => { console.error(error); process.exitCode = 1; });
