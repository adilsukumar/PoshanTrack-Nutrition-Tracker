import { localDayKey } from './dailyClock';
import { sumMeals } from './nutrition';
import { AppState, StepEntry } from './types';

export type DailyProgress = { day: string; calories: number | null; steps: number | null; weightKg: number | null; today: boolean };

export function mergeStepHistory(current: StepEntry[] = [], incoming: StepEntry[]): StepEntry[] {
  const rows = new Map(current.map(row => [row.day, row]));
  for (const row of incoming) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.day) || !Number.isFinite(row.steps) || row.steps < 0 || !Number.isFinite(Date.parse(row.syncedAt))) continue;
    const old = rows.get(row.day);
    if (!old || Date.parse(row.syncedAt) >= Date.parse(old.syncedAt)) rows.set(row.day, { ...row, steps: Math.round(row.steps) });
  }
  return [...rows.values()].sort((a, b) => a.day.localeCompare(b.day));
}

export function saveStepResult(state: AppState, steps: number, timestamp: string): AppState {
  return { ...state, lastStepCount: steps, lastStepSync: timestamp,
    stepHistory: mergeStepHistory(state.stepHistory, [
      ...(state.lastStepSync ? [{ day: localDayKey(new Date(state.lastStepSync)), steps: state.lastStepCount, syncedAt: state.lastStepSync }] : []),
      { day: localDayKey(new Date(timestamp)), steps, syncedAt: timestamp },
    ]) };
}

export function dailyProgress(state: AppState, days: number, now = new Date()): DailyProgress[] {
  const stepHistory = mergeStepHistory(state.stepHistory, state.lastStepSync ? [{ day: localDayKey(new Date(state.lastStepSync)), steps: state.lastStepCount, syncedAt: state.lastStepSync }] : []);
  const steps = new Map(stepHistory.map(row => [row.day, row.steps]));
  const meals = new Map<string, AppState['meals']>();
  for (const meal of state.meals) {
    const date = new Date(meal.createdAt);
    if (!Number.isFinite(+date)) continue;
    const key = localDayKey(date); meals.set(key, [...(meals.get(key) ?? []), meal]);
  }
  const weights = new Map<string, AppState['weights'][number]>();
  for (const entry of state.weights) {
    const date = new Date(entry.date);
    if (!Number.isFinite(+date) || !Number.isFinite(entry.weightKg) || entry.weightKg <= 0) continue;
    const key = localDayKey(date); const old = weights.get(key);
    if (!old || +date > Date.parse(old.date)) weights.set(key, entry);
  }
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(now); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() - days + 1 + index);
    const day = localDayKey(date); const logged = meals.get(day);
    return { day, calories: logged ? sumMeals(logged).calories : null, steps: steps.get(day) ?? null,
      weightKg: weights.get(day)?.weightKg ?? null, today: day === localDayKey(now) };
  });
}
