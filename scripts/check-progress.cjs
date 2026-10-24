/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const assert = require('node:assert/strict');
function load(name) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', `${name}.ts`), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = { exports: {}, Date, require: name => load(name.replace('./', '')) };
  vm.runInNewContext(code, context);
  return context.exports;
}
const { dailyProgress, mergeStepHistory, saveStepResult } = load('progress');
const now = new Date(2026, 9, 8, 15);
const iso = (day, hour = 12) => new Date(2026, 9, day, hour).toISOString();
const meal = (id, day, calories) => ({ id, createdAt: iso(day), items: [{ calories, proteinG: 1, carbsG: 1, fatG: 1, quantity: 2 }] });
let state = { meals: [meal('a', 7, 100), meal('b', 7, 50), meal('c', 8, 200)],
  weights: [{ date: iso(7, 18), weightKg: 47 }, { date: iso(7, 7), weightKg: 46.9 }],
  lastStepSync: iso(7), lastStepCount: 9000 };
state = saveStepResult(state, 1200, iso(8));
let rows = dailyProgress(state, 7, now);
assert.equal(rows.length, 7);
assert.equal(rows[5].day, '2026-10-07');
assert.equal(rows[5].calories, 300);
assert.equal(rows[5].steps, 9000); // Legacy snapshot preserved, never summed with today.
assert.equal(rows[5].weightKg, 47); // Last same-day measurement, regardless of list order.
assert.equal(rows[6].calories, 400);
assert.equal(rows[6].steps, 1200);
assert.equal(rows[6].weightKg, null); // No invented/carry-forward daily weight.
assert.equal(rows[6].today, true);
assert.equal(rows[0].calories, null); assert.equal(rows[0].steps, null);
state = saveStepResult(state, 1800, iso(8, 18));
assert.equal(state.stepHistory.length, 2);
assert.equal(dailyProgress(state, 7, now)[6].steps, 1800); // Upsert, not accumulating syncs.
assert.equal(mergeStepHistory(state.stepHistory, [{ day: '2026-10-08', steps: 500, syncedAt: iso(8, 7) }])[1].steps, 1800);
const afterDelete = { ...state, meals: state.meals.filter(m => m.id !== 'a') };
assert.equal(dailyProgress(afterDelete, 7, now)[5].calories, 100);
assert.equal(dailyProgress(JSON.parse(JSON.stringify(state)), 7, now)[5].steps, 9000);
const month = dailyProgress(state, 30, new Date(2026, 10, 1, 12));
assert.equal(month[0].day, '2026-10-03'); assert.equal(month[29].day, '2026-11-01');
const zero = saveStepResult(state, 0, iso(8, 19));
assert.equal(dailyProgress(zero, 7, now)[6].steps, 0); // Measured zero distinct from unknown.
const late = saveStepResult(state, 10000, iso(7, 23));
assert.equal(dailyProgress(late, 7, now)[5].steps, 10000); // Query tagged by sample date.
assert.equal(mergeStepHistory([], [{ day: 'bad', steps: 1, syncedAt: iso(8) }, { day: '2026-10-08', steps: -1, syncedAt: iso(8) }]).length, 0);
console.log('Daily progress, legacy step migration, repeat syncs, deletion, unknown data, serialization and month-rollover checks passed.');
