export function validateAnalysis(value) {
  if (!value || typeof value !== 'object' || !['Breakfast','Lunch','Snack','Dinner','Late meal'].includes(value.mealType)) throw new Error('Invalid analysis');
  if (!Array.isArray(value.items) || value.items.length < 1 || value.items.length > 15) throw new Error('Invalid items');
  const confidence = ['low','medium','high'];
  if (!confidence.includes(value.overallConfidence)) throw new Error('Invalid confidence');
  for (const key of ['dishSummary','caution']) if (typeof value[key] !== 'string' || value[key].length > 2000) throw new Error('Invalid text');
  for (const key of ['questions','assumptions']) if (!Array.isArray(value[key]) || value[key].length > 8 || value[key].some(text => typeof text !== 'string' || text.length > 1000)) throw new Error('Invalid questions');
  for (const item of value.items) {
    for (const key of ['id','name','regionalName','portion','notes']) if (typeof item[key] !== 'string' || item[key].length > 1000) throw new Error('Invalid item text');
    for (const [key,max] of Object.entries({quantity:20,calories:5000,caloriesLow:5000,caloriesHigh:5000,proteinG:500,carbsG:1000,fatG:500,fibreG:100})) if (!Number.isFinite(item[key]) || item[key] < 0 || item[key] > max) throw new Error('Invalid nutrients');
    if (item.quantity < 0.1 || !confidence.includes(item.confidence) || item.caloriesLow > item.calories || item.calories > item.caloriesHigh) throw new Error('Invalid range');
    // quantity is a multiplier; all nutrients/ranges refer to one described serving.
    const macroEnergy = item.proteinG*4 + item.carbsG*4 + item.fatG*9;
    if (Math.abs(macroEnergy - item.calories) > Math.max(100, item.calories*0.4)) throw new Error('Inconsistent nutrients');
  }
  return value;
}
