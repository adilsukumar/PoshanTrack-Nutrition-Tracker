import { FoodItem, Meal, Nutrients, UserProfile } from './types';

export const emptyNutrients = (): Nutrients => ({ calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fibreG: 0 });

export function sumItems(items: FoodItem[]): Nutrients {
  return items.reduce(
    (total, item) => ({
      calories: total.calories + item.calories * item.quantity,
      proteinG: total.proteinG + item.proteinG * item.quantity,
      carbsG: total.carbsG + item.carbsG * item.quantity,
      fatG: total.fatG + item.fatG * item.quantity,
      fibreG: (total.fibreG ?? 0) + (item.fibreG ?? 0) * item.quantity,
    }),
    emptyNutrients(),
  );
}

export function sumMeals(meals: Meal[]): Nutrients {
  return meals.reduce((total, meal) => {
    const n = sumItems(meal.items);
    return {
      calories: total.calories + n.calories,
      proteinG: total.proteinG + n.proteinG,
      carbsG: total.carbsG + n.carbsG,
      fatG: total.fatG + n.fatG,
      fibreG: (total.fibreG ?? 0) + (n.fibreG ?? 0),
    };
  }, emptyNutrients());
}

export function recommendedTargets(profile: Pick<UserProfile, 'sex' | 'weightKg' | 'heightCm' | 'birthDate' | 'weeklyGainKg' | 'goalDirection' | 'stepTarget'>) {
  if (!profile.weightKg || !profile.heightCm || !profile.birthDate || profile.sex === 'unknown' || profile.sex === 'other') {
    return { maintenance: 0, calories: 0, protein: 0, carbs: 0, fat: 0, provisional: true };
  }
  const ageMs = Date.now() - new Date(profile.birthDate).getTime();
  const age = Math.floor(ageMs / 31557600000);
  if (age < 18 || age > 100) {
    return { maintenance: 0, calories: 0, protein: 0, carbs: 0, fat: 0, provisional: true };
  }
  const sexOffset = profile.sex === 'male' ? 5 : profile.sex === 'female' ? -161 : -78;
  const weight = profile.weightKg;
  const height = profile.heightCm;
  const bmr = 10 * weight + 6.25 * height - 5 * age + sexOffset;
  // Steps inform an initial activity estimate; weight trends refine it over time.
  const activity = !profile.stepTarget ? 1.45 : profile.stepTarget < 4000 ? 1.35 : profile.stepTarget < 8000 ? 1.45 : profile.stepTarget < 12000 ? 1.55 : 1.65;
  const maintenance = Math.round(bmr * activity / 50) * 50;
  const bmi = weight / ((height / 100) ** 2);
  const adjustment = profile.goalDirection === 'gain' ? 300 : profile.goalDirection === 'lose' && bmi >= 18.5 ? -300 : 0;
  const calories = Math.max(1500, maintenance + adjustment);
  return {
    maintenance,
    calories,
    protein: Math.round(weight * (profile.goalDirection === 'maintain' ? 1.2 : 1.6)),
    carbs: Math.round((calories * 0.5) / 4),
    fat: Math.round((calories * 0.27) / 9),
    provisional: false,
  };
}

export function walkingCalorieAdjustment(steps: number, typicalSteps = 8000) {
  const extraSteps = Math.max(0, steps - (typicalSteps || 8000));
  return Math.min(300, Math.floor(extraSteps / 2500) * 100);
}

export function isSameLocalDay(iso: string, date = new Date()) {
  const d = new Date(iso);
  return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth() && d.getDate() === date.getDate();
}

export function inferredMealType(date = new Date()): Meal['mealType'] {
  const h = date.getHours();
  if (h < 11) return 'Breakfast';
  if (h < 15) return 'Lunch';
  if (h < 18) return 'Snack';
  if (h < 22) return 'Dinner';
  return 'Late meal';
}
