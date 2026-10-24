// Offline integrity checks only: does not certify nutritional accuracy.
/* global __dirname */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
const vm = require('node:vm');
const path = require('node:path');
function load(name) {
  assert.ok(name.startsWith('./'));
  const file = path.join(__dirname, '../src', name);
  if (name.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const code = ts.transpileModule(fs.readFileSync(`${file}.ts`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const context = { exports: {}, require: load };
  vm.runInNewContext(code, context);
  return context.exports;
}
const { INDIAN_FOODS: foods, searchFoods, seedToFoodItem } = load('./indianFoods');
assert.ok(foods.length > 50000);
assert.equal(new Set(foods.map(food => food.name.toLowerCase())).size, foods.length);
for (const food of foods) {
  assert.ok(food.name && food.portion && food.region);
  for (const key of ['calories', 'proteinG', 'carbsG', 'fatG']) assert.ok(Number.isFinite(food[key]) && food[key] >= 0, `${food.name}: ${key}`);
  assert.ok(food.fibreG === undefined || (Number.isFinite(food.fibreG) && food.fibreG >= 0));
  assert.equal(seedToFoodItem(food).quantity, 1);
}
assert.equal(searchFoods('', foods.length).length, foods.length);
assert.ok(searchFoods('foxtail').some(food => food.name === 'Thinai pongal'));
assert.ok(searchFoods('  DOSA  ').length > 5);
assert.ok(searchFoods('', foods.length, 'Kerala').length > 10);
assert.ok(searchFoods('', foods.length, 'Western').length > 10);
assert.ok(searchFoods('rice', foods.length, 'Kerala').every(food => food.region === 'Kerala'));
assert.equal(searchFoods('no-such-food-xyz').length, 0);
for (const query of ['kootu', 'sundal', 'thoran', 'kashmir', 'sattu', 'gongura', 'thukpa', 'paratha', 'kulcha']) {
  assert.ok(searchFoods(query).length > 0, `Missing search coverage: ${query}`);
}
assert.ok(searchFoods('turai').some(food => food.name.includes('Ridge gourd')));
assert.ok(searchFoods('Recipe estimate').length === 0); // internal notes are not search terms
assert.ok(searchFoods('chicken roasted', foods.length, 'Global database').length > 0);
assert.ok(searchFoods('banana raw', foods.length, 'Global database').length > 0);
const { USDA_FOODS } = load('./usdaFoods');
const raw = load('./usdaFoods.json');
const bananaRow = raw.find(row => row[1] === 'Bananas, raw');
const banana = USDA_FOODS.find(food => food.name === 'Bananas, raw');
assert.ok(banana && bananaRow);
const { measureOptions, applyMeasure } = load('./foodMeasures');
const grams = measureOptions(banana).find(option => option.unit === 'g');
assert.ok(grams);
const fiftyGrams = applyMeasure(seedToFoodItem(banana), 'g', 50);
assert.ok(Math.abs(fiftyGrams.calories * fiftyGrams.quantity - bananaRow[2] * 0.5) < 0.02);
assert.ok(USDA_FOODS.every(food => food.dataSource && food.notes.includes('FDC ')));
const packaged = foods.filter(food => food.region === 'Packaged foods');
assert.ok(packaged.length >= 38000);
assert.ok(packaged.every(food => food.name.includes(' — ') && food.notes.includes('Label-derived')));
const labelRows = load('./brandedFoods.json');
const withLabelServing = labelRows.find(row => row[9]);
const labelFood = packaged.find(food => food.name === withLabelServing[1]);
const labelGrams = applyMeasure(seedToFoodItem(labelFood), 'g', 50);
assert.ok(Math.abs(labelGrams.calories * labelGrams.quantity - withLabelServing[2] * 0.5) < 0.05);
assert.ok(foods.slice(0, 1271).every(food => food.region !== 'Global database'));
console.log(`Catalogue checks passed: ${foods.length} distinct foods across ${new Set(foods.map(food => food.region)).size} regions/categories.`);
