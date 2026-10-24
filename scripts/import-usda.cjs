// Generates the small offline app asset from official downloaded USDA JSON.
// Usage: node scripts/import-usda.cjs
/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const datasets = [
  ['SR Legacy', '.food-source-cache/sr/FoodData_Central_sr_legacy_food_json_2018-04.json', 'SRLegacyFoods'],
  ['FNDDS 2021–2023', '.food-source-cache/survey/surveyDownload.json', 'SurveyFoods'],
];
const rows = [];
const seen = new Set();
const report = [];
for (const [source, file, key] of datasets) {
  const bytes = fs.readFileSync(path.join(root, file));
  const foods = JSON.parse(bytes)[key];
  let accepted = 0;
  for (const food of foods) {
    const name = food.description.trim().replace(/\s+/g, ' ');
    const normalized = name.toLowerCase();
    if (seen.has(normalized) || /\bbabyfood\b|\binfant\b|\bhuman milk\b/i.test(name)) continue;
    const nutrients = new Map(food.foodNutrients.map(n => [n.nutrient.id, n.amount]));
    // USDA nutrient amounts here are per 100 g. Energy 1008 is kcal (not kJ 1062).
    const values = [1008, 1003, 1005, 1004, 1079].map(id => nutrients.get(id));
    if (!values.slice(0, 4).every(n => Number.isFinite(n) && n >= 0)) continue;
    if (values[0] > 1000 || values.slice(1, 4).some(n => n > 100)) continue;
    const category = food.foodCategory?.description ?? food.wweiaFoodCategory?.wweiaFoodCategoryDescription ?? 'Other foods';
    const portion = (food.foodPortions ?? []).find(p => p.gramWeight > 0 &&
      /^1\s+(?:medium|large|small|slice|piece|roll|fillet|patty|muffin|biscuit|egg)\b/i.test(p.portionDescription ?? `${p.amount} ${p.modifier}`));
    const household = portion ? [portion.portionDescription ?? `${portion.amount} ${portion.modifier}`, portion.gramWeight] : null;
    rows.push([food.fdcId, name, ...values.map(n => Number.isFinite(n) ? Math.round(n * 100) / 100 : null), category, source, household]);
    seen.add(normalized);
    accepted++;
  }
  report.push({ source, inputRecords: foods.length, accepted, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
}
rows.sort((a, b) => a[1].localeCompare(b[1], 'en'));
if (rows.length < 10000) throw new Error(`Only ${rows.length} complete distinct records; inspect the import.`);
fs.writeFileSync(path.join(root, 'src/usdaFoods.json'), JSON.stringify(rows));
fs.writeFileSync(path.join(root, 'src/usdaImportReport.json'), JSON.stringify({ rows: rows.length, basis: 'per 100 g edible portion; original raw/cooked descriptions retained', datasets: report }, null, 2) + '\n');
console.log(`Imported ${rows.length} distinct USDA foods (${fs.statSync(path.join(root, 'src/usdaFoods.json')).size} bytes).`);
