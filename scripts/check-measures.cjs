// Offline portion-math checks; catalogue numbers remain rough estimates.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/foodMeasures.ts'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const context = { exports: {} };
vm.runInNewContext(code, context);
const { measureOptions, applyMeasure, amountFor, parseAmount } = context.exports;
const item = (name, portion, calories) => ({ id: name, name, portion, calories, proteinG: 0, carbsG: 0, fatG: 0, quantity: 1 });

const idli = item('Plain idli', '2 medium', 130);
assert.equal(measureOptions(idli)[0].unit, 'pieces');
assert.equal(measureOptions(idli)[0].baseAmount, 2);
const threeIdlis = applyMeasure(idli, 'pieces', 3);
assert.equal(threeIdlis.quantity, 1.5);
assert.equal(threeIdlis.calories * threeIdlis.quantity, 195);
assert.equal(amountFor(threeIdlis), 3);
assert.equal(measureOptions(item('Plain dosa', '1 large', 210))[0].unit, 'pieces');

const powder = item('Sattu powder', '30 g dry', 120);
assert.equal(measureOptions(powder)[0].unit, 'g');
assert.equal(applyMeasure(powder, 'g', 45).quantity, 1.5);
assert.equal(measureOptions(item('Steamed rice', '1 katori / 150 g', 195)).find(option => option.unit === 'g').baseAmount, 150);
assert.equal(measureOptions(item('Milk', '250 ml', 190))[0].unit, 'ml');
assert.equal(measureOptions(item('Puttu with curry', '1 cylinder + 1 small bowl curry', 560)).length, 1);
assert.equal(parseAmount('2.5'), 2.5);
assert.equal(parseAmount('0'), null);
assert.equal(parseAmount('abc'), null);
assert.throws(() => applyMeasure(powder, 'g', 0));
assert.throws(() => applyMeasure(powder, 'g', 10000));
console.log('Portion unit and nutrient-scaling checks passed.');
