import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { AppState } from './types';

const LEGACY_KEY = '@poshantrack/state/v1';
const keyFor = (userId: string) => `poshan.diary.${userId}`;
// Each account has a separate encrypted journal. Commit the pointer last so
// interrupted writes never replace the last complete diary.
type Journal = { version: string; chunks: number };
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
async function readJournal(key: string) {
  const raw = await SecureStore.getItemAsync(key, options);
  if (!raw) return null;
  const journal = JSON.parse(raw) as Journal;
  if (!Number.isInteger(journal.chunks) || journal.chunks < 1 || journal.chunks > 2048 || !/^[a-z0-9-]+$/.test(journal.version)) throw new Error('Stored diary is invalid.');
  return journal;
}
async function removeJournal(key: string, journal: Journal) {
  for (let i = 0; i < journal.chunks; i++) await SecureStore.deleteItemAsync(`${key}.${journal.version}.${i}`, options);
}

export const initialState: AppState = {
  profile: {
    name: '',
    sex: 'unknown',
    birthDate: '',
    goalDirection: 'unsure',
    livingSituation: 'unknown',
    blenderAvailable: 'unknown',
    previousWeightKg: 0,
    weightChangeMonths: 0,
    serverUrl: '',
    heightCm: 0,
    weightKg: 0,
    goalWeightKg: 0,
    calorieTarget: 0,
    proteinTarget: 0,
    stepTarget: 0,
    weeklyGainKg: 0.25,
    onboardingComplete: false,
  },
  meals: [],
  weights: [],
  supplements: [],
  lastStepCount: 0,
  stepHistory: [],
  circle: { members: [], cheers: [] },
};

export async function loadState(userId = 'personal'): Promise<AppState> {
  const key = keyFor(userId);
  const journal = await readJournal(key);
  let raw = '';
  if (journal) for (let i = 0; i < journal.chunks; i++) {
    const chunk = await SecureStore.getItemAsync(`${key}.${journal.version}.${i}`, options);
    if (chunk === null) throw new Error('Could not read your complete diary.');
    raw += chunk;
  }
  if (!raw) raw = await AsyncStorage.getItem(LEGACY_KEY) || '';
  if (!raw) return initialState;
  const parsed = JSON.parse(raw) as Partial<AppState>;
  const loaded: AppState = {
    ...initialState,
    ...parsed,
    profile: { ...initialState.profile, ...parsed.profile },
    meals: parsed.meals ?? [],
    weights: parsed.weights ?? [],
    supplements: parsed.supplements ?? [],
    stepHistory: parsed.stepHistory ?? [],
    circle: initialState.circle,
  };
  if (!journal) { await saveState(loaded, userId); await AsyncStorage.removeItem(LEGACY_KEY); }
  return loaded;
}

let pending: Promise<void> = Promise.resolve();
export function saveState(state: AppState, userId = 'personal') {
  const write = async () => {
    const key = keyFor(userId);
    const raw = JSON.stringify(state);
    const chunks = Math.ceil(raw.length / 1500);
    if (chunks > 2048) throw new Error('Diary is too large for encrypted device storage.');
    const old = await readJournal(key);
    const version = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    for (let i = 0; i < chunks; i++) await SecureStore.setItemAsync(`${key}.${version}.${i}`, raw.slice(i*1500,(i+1)*1500), options);
    await SecureStore.setItemAsync(key, JSON.stringify({ version, chunks }), options);
    if (old) await removeJournal(key, old).catch(() => undefined);
  };
  const next = pending.catch(() => undefined).then(write);
  pending = next;
  return next;
}

export async function eraseLocalDiary(userId: string) {
  await pending.catch(() => undefined);
  const key = keyFor(userId); const journal = await readJournal(key);
  if (journal) await removeJournal(key, journal);
  await SecureStore.deleteItemAsync(key, options);
}

// Earlier personal APK data belongs to no account. Import only after explicit
// confirmation on a shared device; never silently attach it to a new login.
export async function importLegacyDiary(userId: string) {
  const raw = await AsyncStorage.getItem(LEGACY_KEY);
  if (!raw) throw new Error('No diary from the earlier personal APK was found.');
  const legacy = JSON.parse(raw) as AppState;
  const next = { ...initialState, ...legacy, circle: initialState.circle, profile: { ...initialState.profile, ...legacy.profile } };
  await saveState(next, userId);
  await AsyncStorage.removeItem(LEGACY_KEY);
  return next;
}

export async function exportState(state: AppState) {
  return JSON.stringify({ exportedAt: new Date().toISOString(), version: 1, ...state }, null, 2);
}
