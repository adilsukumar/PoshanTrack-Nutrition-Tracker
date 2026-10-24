import type { FoodItem } from './types';

export type FoodUnit = NonNullable<FoodItem['loggedUnit']>;
export type MeasureOption = { unit: FoodUnit; baseAmount: number; label: string };

// Only offer a conversion when the catalogue describes a usable reference amount.
// Grams in parentheses can mean raw ingredients rather than cooked food.
export function measureOptions(food: Pick<FoodItem, 'name' | 'portion'>): MeasureOption[] {
  const portion = food.portion.trim();
  const options: MeasureOption[] = [];
  const mixed = portion.includes('+');
  const pieces = !mixed && (portion.match(/^(\d+(?:\.\d+)?)\s+(?:medium|large|small|mini|pieces?|rolls?|slices?|nests?|rings?|balls?|fillets?)(?:\b|\s|\/)/i)
    ?? portion.match(/\/\s*(\d+(?:\.\d+)?)\s+(?:pieces?|rolls?|slices?)\b/i));
  const grams = !mixed && (portion.match(/^(\d+(?:\.\d+)?)\s*g\b/i) ?? portion.match(/\/\s*(\d+(?:\.\d+)?)\s*g\b/i));
  const millilitres = !mixed && (portion.match(/^(\d+(?:\.\d+)?)\s*ml\b/i) ?? portion.match(/\/\s*(\d+(?:\.\d+)?)\s*ml\b/i));
  if (pieces) options.push({ unit: 'pieces', baseAmount: Number(pieces[1]), label: 'pieces' });
  if (/^\d+(?:\.\d+)?\s*g\b/i.test(portion) && grams) options.push({ unit: 'g', baseAmount: Number(grams[1]), label: 'grams' });
  if (/^\d+(?:\.\d+)?\s*ml\b/i.test(portion) && millilitres) options.push({ unit: 'ml', baseAmount: Number(millilitres[1]), label: 'mL' });
  options.push({ unit: 'servings', baseAmount: 1, label: 'servings' });
  if (grams && !options.some(option => option.unit === 'g')) options.push({ unit: 'g', baseAmount: Number(grams[1]), label: 'grams' });
  if (millilitres && !options.some(option => option.unit === 'ml')) options.push({ unit: 'ml', baseAmount: Number(millilitres[1]), label: 'mL' });
  return options.filter(option => Number.isFinite(option.baseAmount) && option.baseAmount > 0);
}

export function currentMeasure(item: FoodItem): MeasureOption {
  const options = measureOptions(item);
  return options.find(option => option.unit === item.loggedUnit) ?? options[0];
}

export function amountFor(item: FoodItem, option = currentMeasure(item)): number {
  return Math.round(item.quantity * option.baseAmount * 100) / 100;
}

export function applyMeasure(item: FoodItem, unit: FoodUnit, amount: number): FoodItem {
  const option = measureOptions(item).find(candidate => candidate.unit === unit);
  if (!option || !Number.isFinite(amount) || amount <= 0 || amount > option.baseAmount * 20) throw new Error('Enter a positive amount of up to 20 reference servings.');
  return { ...item, quantity: amount / option.baseAmount, loggedAmount: amount, loggedUnit: unit };
}

export function parseAmount(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (!/^(?:\d+\.?\d*|\.\d+)$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}
