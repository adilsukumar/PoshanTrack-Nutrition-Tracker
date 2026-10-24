import data from './usdaFoods.json';
import brandedData from './brandedFoods.json';
import type { CatalogFood } from './indianFoods';

type Row = [number, string, number, number, number, number, number | null, string, string, [string, number] | null];
export const USDA_FOODS: CatalogFood[] = ([...data, ...brandedData] as Row[]).map(([id, name, calories, proteinG, carbsG, fatG, fibreG, category, source, household]) => {
  // Keep per-100-g nutrition unless USDA supplies a usable count-to-weight conversion.
  const weight = household?.[1] ?? 100;
  const factor = weight / 100;
  const scaled = (n: number) => Math.round(n * factor * 100) / 100;
  return {
    name, portion: household ? `${household[0]} / ${weight} g` : '100 g edible portion; match raw/cooked description',
    calories: scaled(calories), proteinG: scaled(proteinG), carbsG: scaled(carbsG), fatG: scaled(fatG),
    fibreG: fibreG === null ? undefined : scaled(fibreG),
    region: source.startsWith('Branded') ? 'Packaged foods' : 'Global database', veg: null, aliases: [category], dataSource: `USDA ${source}`,
    notes: `USDA FoodData Central · ${source} · FDC ${id}. ${source.startsWith('Branded') ? 'Label-derived values: check the exact product and current packet label.' : 'Match the preparation and weigh the edible portion.'}${fibreG === null ? ' Fibre was not reported.' : ''}`,
  };
});
