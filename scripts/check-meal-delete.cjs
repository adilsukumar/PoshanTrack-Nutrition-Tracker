/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
function load(file, imports, suffix = '') {
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8') + suffix, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const context = { exports: {}, require: name => imports[name] ?? {} };
  vm.runInNewContext(code, context);
  return context.exports;
}
const nutrition = load('src/nutrition.ts', {});
const theme = load('src/theme.ts', {});
const meal = (id, calories) => ({ id, createdAt: new Date().toISOString(), mealType: 'Lunch', items: [{ name: id, calories, quantity: 1, proteinG: 5, carbsG: 10, fatG: 2 }], source: 'manual' });
let state = { profile: { onboardingComplete: true }, meals: [meal('chosen', 200), meal('keep', 300)], weights: [{ weightKg: 50 }] };
let hookIndex = 0;
const alerts = [];
const React = {
  createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
  useMemo: fn => fn(), useEffect: () => {},
  useState: init => { const i = hookIndex++; return [i === 0 ? state : i === 1 ? true : typeof init === 'function' ? init() : init, update => { if (i === 0) state = update(state); }]; },
};
const app = load('App.tsx', {
  react: React, 'react-native': { StyleSheet: { create: value => value }, Alert: { alert: (...args) => alerts.push(args) }, View: 'View', Text: 'Text', Pressable: 'Pressable' },
  'expo-router': { useLocalSearchParams: () => ({ section: 'Meals' }) },
  './src/storage': { initialState: state }, './src/nutrition': nutrition, './src/theme': theme,
  './src/useLocalDay': { useLocalDay: () => new Date() },
}, '\nexport { MealRow };');
function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (predicate(node)) return node;
  for (const child of (node.children ?? []).flat(Infinity)) { const result = find(child, predicate); if (result) return result; }
}
const screen = find(app.default(), node => node.type?.name === 'MealsScreen');
assert.ok(screen.props.onDeleteMeal);
const row = app.MealRow({ meal: state.meals[0], onDelete: screen.props.onDeleteMeal });
const menu = find(row, node => node.props.accessibilityLabel?.startsWith('Meal options'));
assert.ok(menu);
menu.props.onPress();
assert.equal(state.meals.length, 2); // Opening/dismissing the menu never deletes.
assert.equal(alerts[0][2][0].text, 'Cancel');
alerts[0][2].find(button => button.text === 'Delete meal').onPress();
assert.equal(alerts[1][0], 'Delete this meal?');
assert.equal(state.meals.length, 2); // Confirmation is required.
alerts[1][2].find(button => button.text === 'Delete meal').onPress();
assert.deepEqual(state.meals.map(entry => entry.id), ['keep']);
assert.equal(nutrition.sumMeals(state.meals).calories, 300);
assert.equal(state.weights[0].weightKg, 50);
assert.equal(find(app.MealRow({ meal: state.meals[0] }), node => node.props.accessibilityLabel?.startsWith('Meal options')), undefined);
console.log('Meal menu, confirmation, targeted deletion and calorie-update checks passed.');
