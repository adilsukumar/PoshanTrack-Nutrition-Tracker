import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, AppState as NativeAppState, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { readTodaySteps, readRecentStepHistory } from './src/healthConnect';
import { setApiUrl, getApiUrl, configureBackend, getBackendKey, restoreBackend } from './src/apiConfig';
import { INDIAN_FOODS, searchFoods, seedToFoodItem } from './src/indianFoods';
import { amountFor, applyMeasure, currentMeasure, measureOptions, parseAmount, type FoodUnit } from './src/foodMeasures';
import { analyseMealPhoto, checkPhotoServer } from './src/mealAnalysis';
import { inferredMealType, isSameLocalDay, recommendedTargets, sumItems, sumMeals, walkingCalorieAdjustment } from './src/nutrition';
import { initialState, loadState, saveState } from './src/storage';
import { colours, spacing } from './src/theme';
import { AppState, FoodAnalysis, FoodItem, GoalDirection, KnowableYesNo, LivingSituation, Meal, Sex, SupplementEntry, WeightEntry } from './src/types';
import HealthConnectGuide from './src/HealthConnectGuide';
import { useLocalDay } from './src/useLocalDay';
import { mergeStepHistory, saveStepResult } from './src/progress';
import ProgressCharts from './src/ProgressCharts';

type Tab = 'Today' | 'Meals' | 'Progress' | 'Circle' | 'Profile';
type ModalName = 'photo' | 'manual' | 'weight' | 'supplement' | null;
const num = (value: string) => Number(value.replace(',', '.')) || 0;
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const round = (value: number) => Math.round(value);

export default function App() {
  const [state, setState] = useState<AppState>(initialState);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const { section } = useLocalSearchParams<{ section?: string }>();
  const tab: Tab = ['Today', 'Meals', 'Progress', 'Circle', 'Profile'].includes(section ?? '') ? section as Tab : 'Today';
  const setTab = (next: Tab) => router.setParams({ section: next });
  const [modal, setModal] = useState<ModalName>(null);
  const localDay = useLocalDay();

  useEffect(() => {
    if (!ready || !state.profile.onboardingComplete) return;
    let stopped = false;
    let reading = false;
    let historyRead = false;
    const sync = async () => {
      if (reading || NativeAppState.currentState !== 'active') return;
      reading = true;
      try {
        const result = await readTodaySteps(); // Never prompt for permission during automatic refresh.
        if (!stopped && result.permissionGranted && result.hasData !== false) setState(current => {
          const now = result.sampledAt ?? new Date().toISOString();
          if (current.lastStepCount === result.steps && current.lastStepSync && isSameLocalDay(current.lastStepSync) && Date.now() - Date.parse(current.lastStepSync) < 300000) return current;
          return saveStepResult(current, result.steps, now);
        });
        if (!stopped && result.permissionGranted && !historyRead) {
          historyRead = true;
          const history = await readRecentStepHistory().catch(() => []);
          if (!stopped && history.length) setState(current => ({ ...current, stepHistory: mergeStepHistory(current.stepHistory, history) }));
        }
      } finally { reading = false; }
    };
    void sync();
    const timer = setInterval(() => void sync(), 60000);
    const listener = NativeAppState.addEventListener('change', next => { if (next === 'active') void sync(); });
    return () => { stopped = true; clearInterval(timer); listener.remove(); };
  }, [ready, state.profile.onboardingComplete, localDay]);

  useEffect(() => { loadState().then(async (loaded) => { setApiUrl(loaded.profile.serverUrl); await restoreBackend(); setState(loaded); setReady(true); }).catch(() => setLoadError('Your encrypted diary could not be opened. Close and reopen the app; no diary was overwritten.')); }, []);
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => saveState(state).catch(() => Alert.alert('Not saved', 'Could not save your encrypted diary. Keep the app open and try again.')), 300);
    return () => clearTimeout(timer);
  }, [state, ready]);
  const update = (fn: (current: AppState) => AppState) => setState((current) => fn(current));
  const todayMeals = useMemo(() => state.meals.filter((meal) => isSameLocalDay(meal.createdAt, localDay)), [state.meals, localDay]);
  const today = useMemo(() => sumMeals(todayMeals), [todayMeals]);

  if (loadError) return <SafeAreaView><Text>{loadError}</Text></SafeAreaView>;
  if (!ready) return <LoadingScreen label="Opening your encrypted nutrition diary…" />;
  if (!state.profile.onboardingComplete) return <Onboarding state={state} onSave={setState} />;

  return <SafeAreaView style={styles.safe}>
    <StatusBar style="dark" />
    <View style={styles.app}>
      {tab === 'Today' && <TodayScreen state={state} totals={today} meals={todayMeals} onAddPhoto={() => setModal('photo')} onAddManual={() => setModal('manual')} onSyncSteps={async (request) => {
        const result = await readTodaySteps(request);
        if (result.permissionGranted) {
          if (result.hasData !== false) update(s => saveStepResult(s, result.steps, result.sampledAt ?? new Date().toISOString()));
          const history = await readRecentStepHistory().catch(() => []);
          if (history.length) update(s => ({ ...s, stepHistory: mergeStepHistory(s.stepHistory, history) }));
        }
        else if (result.message) Alert.alert('Step access', result.message);
      }} />}
      {tab === 'Meals' && <MealsScreen meals={state.meals} onAddPhoto={() => setModal('photo')} onAddManual={() => setModal('manual')} onDeleteMeal={id => update(current => ({ ...current, meals: current.meals.filter(meal => meal.id !== id) }))} />}
      {tab === 'Progress' && <ProgressCharts state={state} now={localDay} onAddWeight={() => setModal('weight')} />}
      {tab === 'Circle' && <CircleScreen state={state} todayCalories={today.calories} />}
      {tab === 'Profile' && <ProfileScreen state={state} onChange={(profile) => update((s) => ({ ...s, profile }))} onSupplement={() => setModal('supplement')} />}
      <TabBar tab={tab} onChange={setTab} />
    </View>
    <PhotoMealModal visible={modal === 'photo'} onClose={() => setModal(null)} onSave={(meal) => { update((s) => ({ ...s, meals: [meal, ...s.meals] })); setModal(null); setTab('Today'); }} />
    <ManualMealModal visible={modal === 'manual'} onClose={() => setModal(null)} onSave={(meal) => { update((s) => ({ ...s, meals: [meal, ...s.meals] })); setModal(null); setTab('Today'); }} />
    <WeightModal visible={modal === 'weight'} onClose={() => setModal(null)} onSave={(entry) => { update((s) => ({ ...s, weights: [entry, ...s.weights], profile: { ...s.profile, weightKg: entry.weightKg } })); setModal(null); }} />
    <SupplementModal visible={modal === 'supplement'} onClose={() => setModal(null)} onSave={(entry) => { update((s) => ({ ...s, supplements: [entry, ...s.supplements] })); setModal(null); }} />
  </SafeAreaView>;
}

function Onboarding({ state, onSave }: { state: AppState; onSave: (state: AppState) => void }) {
  const [name, setName] = useState(state.profile.name);
  const [goalDirection, setGoalDirection] = useState<GoalDirection>(state.profile.goalDirection ?? 'unsure');
  const [sex, setSex] = useState<Sex>(state.profile.sex ?? 'unknown');
  const [living, setLiving] = useState<LivingSituation>(state.profile.livingSituation ?? 'unknown');
  const [blender, setBlender] = useState<KnowableYesNo>(state.profile.blenderAvailable ?? 'unknown');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState(state.profile.weightKg ? String(state.profile.weightKg) : '');
  const [goal, setGoal] = useState(state.profile.goalWeightKg ? String(state.profile.goalWeightKg) : '');
  const [height, setHeight] = useState(state.profile.heightCm ? String(state.profile.heightCm) : '');
  const [steps, setSteps] = useState(state.profile.stepTarget ? String(state.profile.stepTarget) : '');
  const [previousWeight, setPreviousWeight] = useState(state.profile.previousWeightKg ? String(state.profile.previousWeightKg) : '');
  const [weightMonths, setWeightMonths] = useState(state.profile.weightChangeMonths ? String(state.profile.weightChangeMonths) : '');
  const submit = () => {
    if (age && (!Number.isInteger(num(age)) || num(age) < 1 || num(age) > 100)) return Alert.alert('Check your age', 'Enter an age from 1 to 100, or choose “I don’t know”.');
    if (height && (num(height) < 80 || num(height) > 250)) return Alert.alert('Check your height', 'Enter your height in centimetres, or choose “I don’t know”.');
    if (steps && (num(steps) < 1 || num(steps) > 100000)) return Alert.alert('Check your steps', 'Enter your typical daily steps, or choose “I don’t know”.');
    if (previousWeight && (num(previousWeight) < 25 || num(previousWeight) > 300)) return Alert.alert('Check previous weight', 'Enter a realistic previous weight, or choose “I don’t know”.');
    if (weight && (num(weight) < 25 || num(weight) > 300)) return Alert.alert('Check your weight', 'Enter a realistic weight, or choose “I don’t know”.');
    if (goal && weight && goalDirection === 'gain' && num(goal) <= num(weight)) return Alert.alert('Check your goal', 'For weight gain, the goal should be above your current weight.');
    if (goal && weight && goalDirection === 'lose' && num(goal) >= num(weight)) return Alert.alert('Check your goal', 'For weight loss, the goal should be below your current weight.');
    const approximateBirthday = new Date();
    approximateBirthday.setFullYear(approximateBirthday.getFullYear() - num(age));
    const birthDate = age ? approximateBirthday.toISOString() : '';
    const base = { ...state.profile, name: name.trim() || 'You', sex, birthDate, goalDirection, livingSituation: living, blenderAvailable: blender, previousWeightKg: num(previousWeight), weightChangeMonths: num(weightMonths), weightKg: num(weight), goalWeightKg: num(goal), heightCm: num(height), stepTarget: num(steps) };
    const target = recommendedTargets(base);
    onSave({ ...state, profile: { ...base, calorieTarget: target.calories, proteinTarget: target.protein, onboardingComplete: true }, weights: num(weight) ? [{ id: makeId(), date: new Date().toISOString(), weightKg: num(weight) }] : [] });
  };
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.onboarding} keyboardShouldPersistTaps="handled">
    <View style={styles.brandMark}><Text style={styles.brandEmoji}>🌿</Text></View><Text style={styles.kicker}>POSHANTRACK</Text>
    <Text style={styles.heroTitle}>Your body.{`\n`}Your direction.</Text>
    <Text style={styles.body}>Gain, lose or maintain with Indian-food-first tracking. Nothing here is compulsory—choose “I don’t know” whenever you are unsure.</Text>
    <View style={styles.field}><View style={styles.optionalHeader}><Text style={styles.fieldLabel}>What should we call you?</Text><Pressable onPress={() => setName('')}><Text style={styles.unknownButton}>{name ? 'I don’t know' : 'Unknown ✓'}</Text></Pressable></View><TextInput value={name} onChangeText={setName} placeholder="Your name (optional)" placeholderTextColor="#9AA39D" style={styles.input} /></View>
    <Text style={styles.fieldLabel}>What is your goal?</Text><ChoiceRow value={goalDirection} onChange={(v) => setGoalDirection(v as GoalDirection)} options={[['gain', 'Gain'], ['lose', 'Lose'], ['maintain', 'Maintain'], ['unsure', 'I don’t know']]} />
    <Text style={styles.fieldLabel}>How do you describe yourself?</Text><ChoiceRow value={sex} onChange={(v) => setSex(v as Sex)} options={[['male', 'Man'], ['female', 'Woman'], ['other', 'Another'], ['unknown', 'I don’t know / prefer not to say']]} />
    <OptionalField label="Age" value={age} setValue={setAge} placeholder="Years" />
    <OptionalField label="Height (cm)" value={height} setValue={setHeight} placeholder="e.g. 171" />
    <OptionalField label="Current weight (kg)" value={weight} setValue={setWeight} placeholder="e.g. 46.7" />
    <OptionalField label="Previous weight (kg)" value={previousWeight} setValue={setPreviousWeight} placeholder="If it changed recently" />
    <OptionalField label="Months since previous weight" value={weightMonths} setValue={setWeightMonths} placeholder="e.g. 4" />
    <OptionalField label="First goal weight (kg)" value={goal} setValue={setGoal} placeholder="A first milestone" />
    <OptionalField label="Typical daily steps" value={steps} setValue={setSteps} placeholder="e.g. 8000" />
    <Text style={styles.fieldLabel}>Where do you usually eat?</Text><ChoiceRow value={living} onChange={(v) => setLiving(v as LivingSituation)} options={[['hostel', 'Hostel/mess'], ['home', 'Home'], ['other', 'Other'], ['unknown', 'I don’t know']]} />
    <Text style={styles.fieldLabel}>Do you have a blender?</Text><ChoiceRow value={blender} onChange={(v) => setBlender(v as KnowableYesNo)} options={[['yes', 'Yes'], ['no', 'No'], ['unknown', 'I don’t know']]} />
    <InfoBox text="The first targets are adjustable estimates. For unexplained weight change or a very low/high BMI, get medical guidance rather than relying only on the app." /><PrimaryButton title="Create my plan" onPress={submit} />
  </ScrollView></SafeAreaView>;
}

function TodayScreen({ state, totals, meals, onAddPhoto, onAddManual, onSyncSteps }: { state: AppState; totals: ReturnType<typeof sumMeals>; meals: Meal[]; onAddPhoto: () => void; onAddManual: () => void; onSyncSteps: (request: boolean) => void }) {
  const todaySteps = state.lastStepSync && isSameLocalDay(state.lastStepSync) ? state.lastStepCount : 0;
  const walkingExtra = state.profile.calorieTarget > 0 && state.profile.goalDirection === 'gain' ? walkingCalorieAdjustment(todaySteps, state.profile.stepTarget) : 0;
  const dailyTarget = state.profile.calorieTarget + walkingExtra;
  const remaining = Math.max(0, dailyTarget - totals.calories);
  const direction = state.profile.goalDirection === 'gain' ? 'gain' : state.profile.goalDirection === 'lose' ? 'loss' : state.profile.goalDirection === 'maintain' ? 'maintenance' : 'wellbeing';
  const recentLoss = state.profile.previousWeightKg > 0 && state.profile.weightKg > 0 && state.profile.weightKg < state.profile.previousWeightKg * 0.95 && state.profile.weightChangeMonths > 0 && state.profile.weightChangeMonths <= 12;
  const bmi = state.profile.weightKg > 0 && state.profile.heightCm > 0 ? state.profile.weightKg / ((state.profile.heightCm / 100) ** 2) : 0;
  return <ScrollView contentContainerStyle={styles.screen}>
    <View style={styles.headerRow}><View><Text style={styles.kicker}>TODAY · {direction.toUpperCase()}</Text><Text style={styles.title}>Keep the streak gentle.</Text></View><View style={styles.avatar}><Text style={styles.avatarText}>{state.profile.name.slice(0, 1).toUpperCase()}</Text></View></View>
    <View style={styles.heroCard}><Text style={styles.heroCardLabel}>ENERGY REMAINING</Text><Text style={styles.bigNumber}>{dailyTarget ? round(remaining) : '—'}<Text style={styles.bigUnit}> kcal</Text></Text><Progress value={totals.calories} max={dailyTarget || 1} colour={colours.saffron} /><View style={styles.metricRow}><Metric label="Eaten" value={`${round(totals.calories)}`} unit="kcal" /><Metric label="Target" value={dailyTarget ? `${dailyTarget}` : 'Unknown'} unit="kcal" /><Metric label="Protein" value={state.profile.proteinTarget ? `${round(totals.proteinG)}/${state.profile.proteinTarget}` : `${round(totals.proteinG)}`} unit="g" /></View>{walkingExtra > 0 && <Text style={styles.heroFootnote}>+{walkingExtra} kcal for today’s campus walking</Text>}</View>
    <View style={styles.twoCol}>
      <View style={[styles.card, styles.flex]}><Text style={styles.cardIcon}>👟</Text><Text style={styles.cardLabel}>STEPS</Text><Text style={styles.cardNumber}>{todaySteps.toLocaleString('en-IN')}</Text><Text style={styles.caption}>{state.profile.stepTarget ? `of ${state.profile.stepTarget.toLocaleString('en-IN')}` : 'No target set'}</Text><Progress value={todaySteps} max={state.profile.stepTarget || 1} colour={colours.blue} /><Pressable onPress={() => onSyncSteps(true)}><Text style={styles.textButton}>Sync Health Connect</Text></Pressable><Text style={styles.caption}>{state.lastStepSync && isSameLocalDay(state.lastStepSync) ? `Last sync ${new Date(state.lastStepSync).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })} · refreshes while open` : 'Not synced today · tap Sync to allow access'}</Text></View>
      <View style={[styles.card, styles.flex]}><Text style={styles.cardIcon}>⚖️</Text><Text style={styles.cardLabel}>WEIGHT</Text><Text style={styles.cardNumber}>{state.profile.weightKg || '—'}<Text style={styles.cardUnit}> kg</Text></Text><Text style={styles.caption}>{state.profile.goalWeightKg ? `Goal ${state.profile.goalWeightKg} kg` : 'No goal weight set'}</Text><Text style={styles.miniNote}>Trend matters more than a single day.</Text></View>
    </View>
    <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Log a meal</Text><Text style={styles.sectionHint}>Photos stay timestamped</Text></View>
    <View style={styles.actionRow}><Pressable style={[styles.actionCard, { backgroundColor: colours.green }]} onPress={onAddPhoto}><Text style={styles.actionIcon}>📷</Text><Text style={styles.actionTitleLight}>Photograph meal</Text><Text style={styles.actionBodyLight}>AI estimate + your confirmation</Text></Pressable><Pressable style={[styles.actionCard, { backgroundColor: colours.saffronSoft }]} onPress={onAddManual}><Text style={styles.actionIcon}>🔎</Text><Text style={styles.actionTitle}>Search food</Text><Text style={styles.actionBody}>Indian database + custom portions</Text></Pressable></View>
    {state.profile.goalDirection === 'gain' && (state.profile.livingSituation === 'hostel' || state.profile.blenderAvailable === 'no') && <View style={styles.planCard}><Text style={styles.planEyebrow}>NO-BLENDER HOSTEL BOOST</Text><Text style={styles.planTitle}>A substantial snack between meals</Text><Text style={styles.planLine}>🥛 300 ml full-fat/UHT milk</Text><Text style={styles.planLine}>🥄 30–40 g full-cream milk powder + 30 g sattu in a shaker</Text><Text style={styles.planLine}>🍌 Eat 1 banana and 1 tbsp peanut butter separately</Text><Text style={styles.caption}>Roughly 600–700 kcal, depending on brands. Start with half if bloated. Add to meals; do not replace them.</Text></View>}
    {state.profile.goalDirection === 'gain' && <InfoBox text="Prefer a packaged powder? Choose a clearly labelled nutrition drink with calories and protein per serving, mix it in a shaker as directed, and count it alongside meals. Whey alone supplies protein but usually far fewer calories." />}
    <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Today’s meals</Text><Text style={styles.sectionHint}>{meals.length} logged</Text></View>
    {meals.length === 0 ? <Empty text="Nothing logged yet. Your first photo can be breakfast, a snack, chai—anything." /> : meals.map((meal) => <MealRow key={meal.id} meal={meal} />)}
    <HealthConnectGuide />
    <InfoBox text="Photo nutrition is an estimate. Hidden oil, ghee, sugar and portion depth are the biggest sources of error—answer the follow-up questions when they appear." />
    {!state.profile.calorieTarget && <InfoBox text="No calorie target is set. Some profile details may be unknown, or you may need age-specific advice. You can enter a target in Profile after discussing it with a clinician or dietitian." />}
    {state.profile.goalDirection === 'lose' && bmi > 0 && bmi < 18.5 && <InfoBox text="Your entered BMI is below the usual adult range. The app does not set a calorie deficit at this weight; speak with a clinician before pursuing weight loss." />}
    {(recentLoss || (bmi > 0 && bmi < 17)) && <InfoBox text="Your entries suggest significant recent weight loss or a BMI below 17. Arrange a medical review; nutrition supplements should support care, not replace it." />}
  </ScrollView>;
}

function MealsScreen({ meals, onAddPhoto, onAddManual, onDeleteMeal }: { meals: Meal[]; onAddPhoto: () => void; onAddManual: () => void; onDeleteMeal: (id: string) => void }) {
  const grouped = meals.reduce<Record<string, Meal[]>>((acc, meal) => { const key = new Date(meal.createdAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }); (acc[key] ??= []).push(meal); return acc; }, {});
  return <ScrollView contentContainerStyle={styles.screen}><Text style={styles.kicker}>MEAL DIARY</Text><Text style={styles.title}>Every plate, remembered.</Text><View style={styles.actionRow}><PrimaryButton title="📷 Add photo" onPress={onAddPhoto} compact /><SecondaryButton title="Search food" onPress={onAddManual} compact /></View><Text style={styles.caption}>Tap ⋮ beside a meal for options, including Delete meal.</Text>{Object.keys(grouped).length === 0 ? <Empty text="Your meal history will appear here with the original timestamp and photo." /> : Object.entries(grouped).map(([date, entries]) => <View key={date}><Text style={styles.dateHeading}>{date}</Text>{entries.map((meal) => <MealRow key={meal.id} meal={meal} onDelete={onDeleteMeal} />)}</View>)}</ScrollView>;
}

function CircleScreen({ state, todayCalories }: { state: AppState; todayCalories: number }) {
  const share = () => Share.share({ message: 'PoshanTrack update from ' + (state.profile.name || 'me') + ': ' + Math.round(todayCalories) + ' kcal logged today. Steps: ' + (state.lastStepSync && isSameLocalDay(state.lastStepSync) ? state.lastStepCount : 'unknown') + '. Goal: ' + state.profile.goalDirection + '. Let’s encourage each other!' }).catch(() => Alert.alert('Could not share', 'Try again later.'));
  return <ScrollView contentContainerStyle={styles.screen}><Text style={styles.kicker}>TOGETHER</Text><Text style={styles.title}>Encourage each other.</Text><InfoBox text="No accounts or shared database. Choose when to share a short progress update using your phone’s share menu. Friends cannot automatically see your diary or photos. Messages sent to another app follow that app’s privacy rules." /><PrimaryButton title="Share today’s update" onPress={() => Alert.alert('Share progress?', 'This shares today’s calories, steps and goal—not your weight, meals or photos.', [{ text: 'Cancel' }, { text: 'Share', onPress: share }])} /></ScrollView>;
}
function BackendSettings() {
  const [url, setUrl] = useState(getApiUrl()); const [key, setKey] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { getBackendKey().then(setKey).catch(() => undefined); }, []);
  const save = async () => { setBusy(true); try { await configureBackend(url.trim(), key.trim()); await checkPhotoServer(); Alert.alert('Server reached', 'Private access verified and provider key configured. No photo or paid AI request was sent. A real meal analysis is still needed to verify the provider key works.'); } catch (error) { Alert.alert('Connection check', error instanceof Error ? error.message : 'Could not reach the server. Settings may have been saved; check the address and retry.'); } finally { setBusy(false); } };
  return <View style={styles.card}><Text style={styles.sectionTitle}>Private photo AI connection</Text><Text style={styles.caption}>Use only your own trusted HTTPS server with free-tier Gemini and optional free-tier Groq fallback. No other provider is called. You must keep both provider accounts on their Free plans; this app cannot verify their billing status. Never enter an AI provider key here. A free Render server may need a minute to wake up.</Text><Field label="Server address" value={url} onChangeText={setUrl} placeholder="https://poshantrack-photo-ai.onrender.com" autoCapitalize="none" autoCorrect={false} /><Field label="Private access code" value={key} onChangeText={setKey} secureTextEntry autoCapitalize="none" autoCorrect={false} placeholder="32- or 64-character server access code" /><PrimaryButton title={busy ? 'Checking server…' : 'Save & check AI connection'} disabled={busy} onPress={save} /></View>;
}

function ProfileScreen({ state, onChange, onSupplement }: { state: AppState; onChange: (profile: AppState['profile']) => void; onSupplement: () => void }) {
  const p = state.profile; const [calories, setCalories] = useState(p.calorieTarget ? String(p.calorieTarget) : ''); const [protein, setProtein] = useState(p.proteinTarget ? String(p.proteinTarget) : ''); const [steps, setSteps] = useState(p.stepTarget ? String(p.stepTarget) : ''); const [direction, setDirection] = useState<GoalDirection>(p.goalDirection);
  const save = () => { onChange({ ...p, serverUrl: '', goalDirection: direction, calorieTarget: num(calories), proteinTarget: num(protein), stepTarget: num(steps) }); Alert.alert('Saved', 'Your plan was updated.'); };
  return <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
    <Text style={styles.kicker}>YOUR PLAN</Text><Text style={styles.title}>Useful, adjustable, yours.</Text>
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Goal and daily targets</Text>
      <ChoiceRow value={direction} onChange={(v) => setDirection(v as GoalDirection)} options={[['gain', 'Gain'], ['lose', 'Lose'], ['maintain', 'Maintain'], ['unsure', 'I don’t know']]} />
      <OptionalField label="Calories (kcal)" value={calories} setValue={setCalories} placeholder="Daily target" />
      <OptionalField label="Protein (g)" value={protein} setValue={setProtein} placeholder="Daily target" />
      <OptionalField label="Steps" value={steps} setValue={setSteps} placeholder="Daily target" />
    </View>
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Private by default</Text>
      <Text style={styles.caption}>Your diary is encrypted on this device, without an account or cloud backup. Only photos you choose to analyse and their food descriptions are sent to your private analysis server and Google Gemini. Configured Groq may receive the same photo if Gemini reaches quota, times out or cannot return usable estimates. Google says free-tier data may be used to improve its products. Confirm estimates before saving. There are no payments or subscriptions in this app.</Text>
      <PrimaryButton title="Save plan" onPress={save} />
    </View>
    <BackendSettings />
    <HealthConnectGuide />
    <View style={styles.card}>
      <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Supplements</Text><Pressable onPress={onSupplement}><Text style={styles.textButton}>+ Log</Text></Pressable></View>
      <Text style={styles.caption}>Keep every tablet and nutrition powder in one list to spot duplicated vitamins and minerals.</Text>
      {state.supplements.length === 0 ? <Empty text="No supplements logged." /> : state.supplements.slice(0, 8).map((entry) => <View style={styles.historyRow} key={entry.id}><View><Text style={styles.historyDate}>{entry.name}</Text><Text style={styles.caption}>{entry.dose}</Text></View><Text style={styles.caption}>{new Date(entry.takenAt).toLocaleDateString('en-IN')}</Text></View>)}
    </View>
    <InfoBox text="A multivitamin adds little energy. For weight gain, add food or a labelled calorie-and-protein drink. Check an existing ‘energy tablet’ before adding another multivitamin; do not double up on iron or other nutrients." />
    <InfoBox text="Targets are planning tools, not medical prescriptions. Persistent unexplained weight change, major fatigue, diarrhoea, racing heartbeat, or excessive thirst/urination deserves medical review." />
    <Text style={styles.caption}>Food library: {INDIAN_FOODS.length} foods, including Indian regional dishes and USDA food records. Recipe portions remain estimates.</Text>
  </ScrollView>;
}

function PhotoMealModal({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (meal: Meal) => void }) {
  const [photo, setPhoto] = useState<string>(); const [context, setContext] = useState(''); const [analysis, setAnalysis] = useState<FoodAnalysis>(); const [loading, setLoading] = useState(false); const [confirmed, setConfirmed] = useState(false); const [capturedAt, setCapturedAt] = useState('');
  const reset = () => { setPhoto(undefined); setContext(''); setAnalysis(undefined); setLoading(false); setConfirmed(false); }; const close = () => { if (!loading) { reset(); onClose(); } };
  const pick = async (camera: boolean) => {
    try {
      const permission = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return Alert.alert('Permission needed', camera ? 'Allow camera access to photograph meals.' : 'Allow photo access to choose a meal image.');
      const result = camera ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
      if (!result.canceled) { setPhoto(result.assets[0].uri); setCapturedAt(new Date().toISOString()); setAnalysis(undefined); setConfirmed(false); }
    } catch { Alert.alert('Photo unavailable', 'Could not open camera/gallery. Try again or use food search.'); }
  };
  const analyse = async () => {
    if (!photo || loading) return;
    Alert.alert('Send this meal photo?', 'Only this photo, its timestamp and your food description go to your private server and Google Gemini, or Groq if Gemini reaches its free quota. Google says free-tier data may be used to improve its products. No diary, weight or step history is uploaded. Results are estimates, not measurements.', [{ text: 'Cancel' }, { text: 'Analyse', onPress: async () => {
      setLoading(true); setConfirmed(false); try { setAnalysis(await analyseMealPhoto(photo, context, capturedAt)); } catch (error) { Alert.alert('Could not analyse this photo', error instanceof Error ? error.message : 'Try again or use manual search.'); } finally { setLoading(false); }
    } }]);
  };
  const save = async () => {
    if (!analysis || !photo || !confirmed || loading) return;
    if (analysis.items.every(item => item.calories === 0)) return Alert.alert('No food recognised', 'Retake the photo or use manual food search.');
    setLoading(true); try {
      if (!FileSystem.documentDirectory) throw new Error('Device storage unavailable');
      const id = makeId(); const directory = FileSystem.documentDirectory + 'meal-photos/';
      await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
      const photoUri = directory + id + '.jpg'; await FileSystem.copyAsync({ from: photo, to: photoUri });
      onSave({ id, createdAt: capturedAt, mealType: analysis.mealType, photoUri, items: analysis.items, notes: [...analysis.assumptions, context].filter(Boolean).join(' · '), source: 'photo-ai' }); reset();
    } catch { Alert.alert('Not saved', 'Could not preserve the photo. Check available phone storage and try again.'); } finally { setLoading(false); }
  };
  return <Sheet visible={visible} title="Photograph a meal" onClose={close}>{!photo ? <View style={styles.photoChoices}><Pressable style={styles.photoChoice} onPress={() => pick(true)}><Text style={styles.photoChoiceIcon}>📷</Text><Text style={styles.actionTitle}>Use camera</Text></Pressable><Pressable style={styles.photoChoice} onPress={() => pick(false)}><Text style={styles.photoChoiceIcon}>🖼️</Text><Text style={styles.actionTitle}>Choose photo</Text></Pressable></View> : <><Image source={{ uri: photo }} style={styles.mealPhoto} /><Text style={styles.caption}>Meal timestamp: {new Date(capturedAt).toLocaleString('en-IN')} (time selected, not photo EXIF)</Text><InfoBox text="For a better estimate: use good light, show the whole plate, describe bowl size or measured cooked grams, oil/ghee and how much you ate. Include a side photo for deep bowls. A photo cannot measure exact calories." /><Field label="Portions, ingredients or answers to AI questions" value={context} onChangeText={(value) => { setContext(value); setConfirmed(false); }} placeholder="e.g. 150 g cooked rice, 2 rotis, 1 tsp ghee; unknown if unsure" multiline maxLength={1500} /><PrimaryButton title={loading ? 'Please wait…' : analysis ? 'Re-analyse with my answers' : 'Analyse nutrition'} onPress={analyse} disabled={loading} />{analysis && <AnalysisReview analysis={analysis} onChange={(next) => { setAnalysis(next); setConfirmed(false); }} />}{analysis && <><Pressable disabled={loading} accessibilityRole="checkbox" accessibilityState={{ checked: confirmed }} onPress={() => setConfirmed(!confirmed)}><Text style={styles.body}>{confirmed ? '☑' : '☐'} I checked the dish names, servings and what I actually ate; I understand these are estimates.</Text></Pressable><PrimaryButton title="Save confirmed meal" onPress={save} disabled={!confirmed || loading} /></>}<SecondaryButton title="Use another photo" onPress={() => { if (!loading) { setPhoto(undefined); setAnalysis(undefined); setConfirmed(false); } }} /></>}</Sheet>;
}

function AnalysisReview({ analysis, onChange }: { analysis: FoodAnalysis; onChange: (analysis: FoodAnalysis) => void }) {
  const edit = (index: number, key: keyof FoodItem, value: string) => onChange({ ...analysis, items: analysis.items.map((item, i) => {
    if (i !== index) return item;
    if (key === 'name' || key === 'portion') return { ...item, [key]: value };
    const number = Math.max(0, Math.min(key === 'calories' ? 5000 : key === 'quantity' ? 20 : 1000, num(value)));
    return key === 'calories' ? { ...item, calories: number, caloriesLow: Math.min(item.caloriesLow ?? number, number), caloriesHigh: Math.max(item.caloriesHigh ?? number, number), confidence: 'low' as const } : { ...item, [key]: number };
  }) });
  const total = sumItems(analysis.items); const changeQty = (index: number, delta: number) => onChange({ ...analysis, items: analysis.items.map((item, i) => i === index ? { ...item, quantity: Math.min(20, Math.max(0.25, Math.round((item.quantity + delta) * 4) / 4)) } : item) });
  return <View style={styles.review}><View style={styles.sectionRow}><Text style={styles.sectionTitle}>{analysis.dishSummary}</Text><Confidence value={analysis.overallConfidence} /></View>{analysis.items.map((item, index) => <View style={styles.reviewItem} key={`${item.id}-${index}`}><View style={styles.flex}><Text style={styles.reviewName}>{item.name}</Text><Text style={styles.caption}>{item.portion} · {round((item.caloriesLow ?? item.calories) * item.quantity)}–{round((item.caloriesHigh ?? item.calories) * item.quantity)} kcal for {item.quantity} servings</Text></View><View style={styles.quantity}><Pressable onPress={() => changeQty(index, -0.25)}><Text style={styles.qtyButton}>−</Text></Pressable><Text style={styles.qtyValue}>{item.quantity}×</Text><Pressable onPress={() => changeQty(index, 0.25)}><Text style={styles.qtyButton}>＋</Text></Pressable></View><View style={{ flexBasis: '100%', gap: 4 }}><Field label="Dish name" value={item.name} onChangeText={v => edit(index, 'name', v)} /><Field label="One serving / cooked grams if known" value={item.portion} onChangeText={v => edit(index, 'portion', v)} />{(['calories','proteinG','carbsG','fatG'] as const).map(key => <Field key={key} label={key + ' per ONE serving (edit if known)'} value={String(item[key])} onChangeText={v => edit(index,key,v)} keyboardType="decimal-pad" />)}</View></View>)}<View style={styles.totalBox}><Text style={styles.totalNumber}>{round(total.calories)} kcal</Text><Text style={styles.caption}>Estimated range: {round(analysis.items.reduce((s,i) => s+(i.caloriesLow ?? i.calories)*i.quantity,0))}–{round(analysis.items.reduce((s,i) => s+(i.caloriesHigh ?? i.calories)*i.quantity,0))} kcal</Text><Text style={styles.totalMacros}>P {round(total.proteinG)} g · C {round(total.carbsG)} g · F {round(total.fatG)} g</Text></View>{analysis.questions.length > 0 && <View style={styles.questionBox}><Text style={styles.questionTitle}>Confirm before saving</Text>{analysis.questions.map((q) => <Text key={q} style={styles.question}>• {q}</Text>)}<Text style={styles.caption}>Answer these in the food description above and re-analyse, or edit servings directly. Weighed cooked grams or a known recipe help more than visual guessing.</Text></View>}<Text style={styles.caution}>{analysis.caution}</Text></View>;
}

function ManualMealModal({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (meal: Meal) => void }) {
  const [query, setQuery] = useState(''); const [region, setRegion] = useState(''); const [shown, setShown] = useState(30); const [items, setItems] = useState<FoodItem[]>([]); const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({});
  const matches = useMemo(() => searchFoods(query, INDIAN_FOODS.length, region), [query, region]);
  const regions = useMemo(() => [...new Set(INDIAN_FOODS.map(food => food.region))].sort(), []);
  const total = sumItems(items);
  const validAmount = (item: FoodItem) => { const amount = parseAmount(amountDrafts[item.id] ?? String(amountFor(item))); return amount !== null && amount <= currentMeasure(item).baseAmount * 20; };
  const canSave = items.length > 0 && items.every(validAmount);
  const reset = () => { setItems([]); setAmountDrafts({}); setQuery(''); setRegion(''); setShown(30); };
  const close = () => { reset(); onClose(); };
  const save = () => { if (!canSave) return Alert.alert('Check the amount', 'Enter a positive amount for each food, or tap “I don’t know” to use its listed serving.'); onSave({ id: makeId(), createdAt: new Date().toISOString(), mealType: inferredMealType(), items, source: 'manual' }); reset(); };
  const addFood = (food: (typeof INDIAN_FOODS)[number]) => { const seed = seedToFoodItem(food); const option = measureOptions(seed)[0]; const item = applyMeasure(seed, option.unit, option.baseAmount); setItems(current => [...current, item]); setAmountDrafts(current => ({ ...current, [item.id]: String(option.baseAmount) })); };
  const changeAmount = (item: FoodItem, value: string) => { setAmountDrafts(current => ({ ...current, [item.id]: value })); const amount = parseAmount(value); if (amount !== null && amount <= currentMeasure(item).baseAmount * 20) setItems(current => current.map(entry => entry.id === item.id ? applyMeasure(entry, currentMeasure(entry).unit, amount) : entry)); };
  const changeUnit = (item: FoodItem, unit: FoodUnit) => { const option = measureOptions(item).find(candidate => candidate.unit === unit); if (!option) return; const amount = amountFor(item, option); setItems(current => current.map(entry => entry.id === item.id ? applyMeasure(entry, unit, amount) : entry)); setAmountDrafts(current => ({ ...current, [item.id]: String(amount) })); };
  const resetToServing = (item: FoodItem) => { setItems(current => current.map(entry => entry.id === item.id ? applyMeasure(entry, 'servings', 1) : entry)); setAmountDrafts(current => ({ ...current, [item.id]: '1' })); };
  return <Sheet visible={visible} title="Search food" onClose={close}>
    <TextInput style={styles.search} placeholder="Try dosa, rajma, litti, biryani…" value={query} onChangeText={value => { setQuery(value); setShown(30); }} placeholderTextColor={colours.muted} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false}><ChoiceRow value={region} onChange={value => { setRegion(value); setShown(30); }} options={[["", "All regions"], ...regions.map(value => [value, value] as [string, string])]} /></ScrollView>
    <Text style={styles.caption}>{matches.length} matches · {INDIAN_FOODS.length} foods in the library</Text>
    <Text style={styles.caption}>Indian dishes appear first. Global database has USDA foods; Packaged foods has branded products. Match the preparation or exact product, check the current packet label, and use grams for weight-based portions.</Text>
    {items.length > 0 && <View style={styles.basket}><Text style={styles.basketTitle}>{items.length} food{items.length > 1 ? 's' : ''} · {round(total.calories)} kcal</Text><PrimaryButton title="Save meal" onPress={save} disabled={!canSave} compact /></View>}
    {items.map(item => <View style={styles.loggedFood} key={item.id}><View style={styles.foodRow}><View style={styles.flex}><Text style={styles.foodName}>{item.name}</Text><Text style={styles.caption}>Reference: {item.portion}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`Remove ${item.name}`} onPress={() => setItems(current => current.filter(entry => entry.id !== item.id))}><Text style={styles.textButton}>Remove</Text></Pressable></View><ChoiceRow value={currentMeasure(item).unit} onChange={value => changeUnit(item, value as FoodUnit)} options={measureOptions(item).map(option => [option.unit, option.label])} /><View style={styles.amountRow}><View style={styles.flex}><Field label={`Amount (${currentMeasure(item).label})`} value={amountDrafts[item.id] ?? String(amountFor(item))} onChangeText={value => changeAmount(item, value)} keyboardType="decimal-pad" /></View><Pressable accessibilityRole="button" onPress={() => resetToServing(item)}><Text style={styles.textButton}>I don’t know</Text></Pressable></View><Text style={styles.caption}>{validAmount(item) ? `${round(item.calories * item.quantity)} kcal estimated · P ${round(item.proteinG * item.quantity)} g` : 'Enter a positive amount, or use the listed serving.'}</Text></View>)}
    <Text style={styles.caption}>Amounts scale the listed serving’s estimated calories and nutrients. Select pieces, grams, mL or servings where the reference permits. For mixed dishes and powders, check the recipe or packet label.</Text>
    {!matches.length && <Empty text="No match. Try a simpler name or choose All regions." />}
    {matches.slice(0, shown).map((food) => <Pressable style={styles.foodRow} key={`${food.name}-${food.portion}`} onPress={() => addFood(food)}><View style={styles.flex}><Text style={styles.foodName}>{food.name}</Text><Text style={styles.caption}>{food.region} · {food.regionalName ? `${food.regionalName} · ` : ''}{food.portion}</Text></View><View style={styles.foodEnergy}><Text style={styles.foodKcal}>{food.calories}</Text><Text style={styles.caption}>kcal  ＋</Text></View></Pressable>)}
    {shown < matches.length && <SecondaryButton title={`Show more (${matches.length - shown} remaining)`} onPress={() => setShown(current => current + 30)} />}
  </Sheet>;
}

function WeightModal({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (entry: WeightEntry) => void }) { const [weight, setWeight] = useState(''); return <Sheet visible={visible} title="Log weight" onClose={onClose}><Field label="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="e.g. 56.4" /><InfoBox text="For a comparable trend, weigh in the morning under similar conditions." /><PrimaryButton title="Save weight" onPress={() => { if (num(weight) < 30) return Alert.alert('Check the value'); onSave({ id: makeId(), date: new Date().toISOString(), weightKg: num(weight) }); setWeight(''); }} /></Sheet>; }
function SupplementModal({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (entry: SupplementEntry) => void }) { const [name, setName] = useState(''); const [dose, setDose] = useState(''); const [ingredients, setIngredients] = useState(''); return <Sheet visible={visible} title="Log supplement" onClose={onClose}><Field label="Product" value={name} onChangeText={setName} placeholder="Exact label name" /><Field label="Dose" value={dose} onChangeText={setDose} placeholder="e.g. 1 tablet after lunch" /><Field label="Ingredients (optional)" value={ingredients} onChangeText={setIngredients} placeholder="Paste vitamins/minerals from label" multiline /><InfoBox text="Never stack multiple multivitamins. Log the exact ‘energy tablet’ too so overlapping iron, vitamin A, D, B6, zinc and magnesium can be checked." /><PrimaryButton title="Save supplement" onPress={() => { if (!name.trim()) return; onSave({ id: makeId(), name: name.trim(), dose: dose.trim(), ingredients: ingredients.trim(), takenAt: new Date().toISOString() }); setName(''); setDose(''); setIngredients(''); }} /></Sheet>; }
function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode }) { return <Modal visible={visible} animationType="slide" onRequestClose={onClose}><SafeAreaView style={styles.safe}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><View style={styles.sheetHeader}><Pressable onPress={onClose}><Text style={styles.close}>‹ Back</Text></Pressable><Text style={styles.sheetTitle}>{title}</Text><View style={{ width: 45 }} /></View><ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">{children}</ScrollView></KeyboardAvoidingView></SafeAreaView></Modal>; }
function MealRow({ meal, onDelete }: { meal: Meal; onDelete?: (id: string) => void }) {
  const total = sumItems(meal.items);
  const names = meal.items.map(i => i.name).slice(0, 2).join(' + ');
  const confirmDelete = () => Alert.alert('Delete this meal?', `${names}\n${new Date(meal.createdAt).toLocaleString('en-IN')}\n\nThis removes the meal from your diary and updates that day’s calories and nutrients.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete meal', style: 'destructive', onPress: () => onDelete?.(meal.id) },
  ], { cancelable: true });
  const openMenu = () => Alert.alert('Meal options', names, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete meal', style: 'destructive', onPress: confirmDelete },
  ], { cancelable: true });
  return <View style={styles.mealRow}>{meal.photoUri ? <Image source={{ uri: meal.photoUri }} style={styles.mealThumb} /> : <View style={styles.mealThumbFallback}><Text>🍽️</Text></View>}<View style={styles.flex}><Text style={styles.mealName}>{meal.items.map((i) => `${i.name}${i.loggedAmount && i.loggedUnit ? ` (${i.loggedAmount} ${i.loggedUnit})` : ''}`).slice(0, 2).join(' + ')}</Text><Text style={styles.caption}>{meal.mealType} · {new Date(meal.createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</Text><Text style={styles.mealMacros}>P {round(total.proteinG)}g · C {round(total.carbsG)}g · F {round(total.fatG)}g</Text></View><Text style={styles.mealCalories}>{round(total.calories)}{`\n`}<Text style={styles.caption}>kcal</Text></Text>{onDelete && <Pressable accessibilityRole="button" accessibilityLabel={`Meal options for ${names}`} onPress={openMenu} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colours.muted, fontSize: 26 }}>⋮</Text></Pressable>}</View>;
}
function TabBar({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) { const tabs: [Tab, string][] = [['Today', '⌂'], ['Meals', '◉'], ['Progress', '↗'], ['Circle', '♡'], ['Profile', '☰']]; return <View style={styles.tabBar}>{tabs.map(([name, icon]) => <Pressable key={name} style={styles.tab} onPress={() => onChange(name)}><Text style={[styles.tabIcon, tab === name && styles.tabActive]}>{icon}</Text><Text style={[styles.tabLabel, tab === name && styles.tabActive]}>{name}</Text></Pressable>)}</View>; }
function Progress({ value, max, colour }: { value: number; max: number; colour: string }) { return <View style={styles.progress}><View style={[styles.progressFill, { backgroundColor: colour, width: `${Math.min(100, max ? (value / max) * 100 : 0)}%` }]} /></View>; }
function Metric({ label, value, unit }: { label: string; value: string; unit: string }) { return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value} <Text style={styles.metricUnit}>{unit}</Text></Text></View>; }
function Empty({ text }: { text: string }) { return <View style={styles.empty}><Text style={styles.emptyText}>{text}</Text></View>; }
function InfoBox({ text }: { text: string }) { return <View style={styles.info}><Text style={styles.infoIcon}>i</Text><Text style={styles.infoText}>{text}</Text></View>; }
function Confidence({ value }: { value: string }) { return <View style={styles.confidence}><Text style={styles.confidenceText}>{value} confidence</Text></View>; }
function LoadingScreen({ label }: { label: string }) { return <SafeAreaView style={[styles.safe, styles.center]}><ActivityIndicator color={colours.green} /><Text style={styles.body}>{label}</Text></SafeAreaView>; }
function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) { const { label, multiline, ...rest } = props; return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput {...rest} multiline={multiline} placeholderTextColor="#9AA39D" style={[styles.input, multiline && styles.multiline]} /></View>; }
function OptionalField({ label, value, setValue, placeholder }: { label: string; value: string; setValue: (value: string) => void; placeholder: string }) { return <View style={styles.field}><View style={styles.optionalHeader}><Text style={styles.fieldLabel}>{label}</Text><Pressable onPress={() => setValue('')}><Text style={styles.unknownButton}>{value ? 'I don’t know' : 'Unknown ✓'}</Text></Pressable></View><TextInput value={value} onChangeText={setValue} keyboardType="decimal-pad" placeholder={value ? placeholder : 'Optional — enter if known'} placeholderTextColor="#9AA39D" style={styles.input} /></View>; }
function ChoiceRow({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: [string, string][] }) { return <View style={styles.choiceRow}>{options.map(([key, label]) => <Pressable key={key} onPress={() => onChange(key)} style={[styles.choice, value === key && styles.choiceActive]}><Text style={[styles.choiceText, value === key && styles.choiceTextActive]}>{label}</Text></Pressable>)}</View>; }
function PrimaryButton({ title, onPress, compact, disabled }: { title: string; onPress: () => void; compact?: boolean; disabled?: boolean }) { return <Pressable disabled={disabled} onPress={onPress} style={[styles.primary, compact && styles.compactButton, disabled && styles.disabled]}><Text style={styles.primaryText}>{title}</Text></Pressable>; }
function SecondaryButton({ title, onPress, compact }: { title: string; onPress: () => void; compact?: boolean }) { return <Pressable onPress={onPress} style={[styles.secondary, compact && styles.compactButton]}><Text style={styles.secondaryText}>{title}</Text></Pressable>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.paper }, app: { flex: 1 }, flex: { flex: 1 }, center: { alignItems: 'center', justifyContent: 'center', gap: 12 }, screen: { padding: spacing.xl, paddingBottom: 112, gap: spacing.md }, onboarding: { padding: spacing.xl, paddingTop: 48, gap: spacing.md },
  brandMark: { width: 58, height: 58, borderRadius: 18, backgroundColor: colours.greenSoft, alignItems: 'center', justifyContent: 'center' }, brandEmoji: { fontSize: 28 }, kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 1.8, color: colours.green }, heroTitle: { fontSize: 38, lineHeight: 44, fontWeight: '800', color: colours.ink, letterSpacing: -1.2 }, title: { fontSize: 27, lineHeight: 33, fontWeight: '800', color: colours.ink, letterSpacing: -0.6 }, body: { fontSize: 15, lineHeight: 22, color: colours.muted }, caption: { fontSize: 12, lineHeight: 17, color: colours.muted },
  row: { flexDirection: 'row', gap: spacing.md }, twoCol: { flexDirection: 'row', gap: spacing.md }, headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, avatar: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colours.ink }, avatarText: { color: 'white', fontWeight: '800', fontSize: 18 },
  heroCard: { backgroundColor: colours.ink, borderRadius: 24, padding: spacing.xl, gap: spacing.md }, heroCardLabel: { color: '#B6C5B9', letterSpacing: 1.5, fontSize: 11, fontWeight: '800' }, bigNumber: { color: 'white', fontSize: 42, fontWeight: '800', letterSpacing: -1 }, bigUnit: { color: '#B6C5B9', fontSize: 18, fontWeight: '600' }, heroFootnote: { color: '#D7E9DC', fontSize: 11, fontWeight: '700' }, metricRow: { flexDirection: 'row', justifyContent: 'space-between' }, metric: { gap: 2 }, metricLabel: { color: '#9EB0A2', fontSize: 11 }, metricValue: { color: 'white', fontSize: 15, fontWeight: '700' }, metricUnit: { fontSize: 10, color: '#9EB0A2' }, progress: { height: 7, borderRadius: 10, overflow: 'hidden', backgroundColor: '#DCE3DE' }, progressFill: { height: '100%', borderRadius: 10 },
  card: { backgroundColor: colours.surface, borderRadius: 20, padding: spacing.lg, gap: spacing.sm, borderWidth: 1, borderColor: colours.border }, cardIcon: { fontSize: 20 }, cardLabel: { color: colours.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.4 }, cardNumber: { color: colours.ink, fontSize: 25, fontWeight: '800' }, cardUnit: { fontSize: 13, color: colours.muted }, miniNote: { fontSize: 10, lineHeight: 14, color: colours.muted }, textButton: { color: colours.green, fontWeight: '800', fontSize: 12, paddingVertical: 6 }, sectionRow: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, sectionTitle: { fontSize: 18, fontWeight: '800', color: colours.ink, flexShrink: 1 }, sectionHint: { fontSize: 11, color: colours.muted },
  actionRow: { flexDirection: 'row', gap: spacing.md }, actionCard: { flex: 1, minHeight: 130, padding: spacing.lg, borderRadius: 20, justifyContent: 'flex-end' }, actionIcon: { fontSize: 25, marginBottom: 14 }, actionTitle: { fontSize: 15, fontWeight: '800', color: colours.ink }, actionTitleLight: { fontSize: 15, fontWeight: '800', color: 'white' }, actionBody: { fontSize: 11, color: colours.muted, marginTop: 4 }, actionBodyLight: { fontSize: 11, color: '#D7E9DC', marginTop: 4 },
  planCard: { padding: spacing.lg, borderRadius: 20, backgroundColor: colours.saffronSoft, gap: 7 }, planEyebrow: { color: colours.saffron, fontSize: 10, fontWeight: '900', letterSpacing: 1.3 }, planTitle: { color: colours.ink, fontSize: 19, fontWeight: '800', marginBottom: 4 }, planLine: { color: colours.ink, fontSize: 13, lineHeight: 19 },
  mealRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12, backgroundColor: colours.surface, borderRadius: 17, borderWidth: 1, borderColor: colours.border }, mealThumb: { width: 54, height: 54, borderRadius: 13, backgroundColor: colours.border }, mealThumbFallback: { width: 54, height: 54, borderRadius: 13, backgroundColor: colours.saffronSoft, alignItems: 'center', justifyContent: 'center' }, mealName: { fontSize: 14, fontWeight: '800', color: colours.ink }, mealMacros: { fontSize: 11, color: colours.green, marginTop: 3, fontWeight: '700' }, mealCalories: { textAlign: 'right', color: colours.ink, fontSize: 15, fontWeight: '800' },
  info: { flexDirection: 'row', padding: 14, borderRadius: 15, backgroundColor: colours.blueSoft, gap: 10, marginTop: 6 }, infoIcon: { width: 19, height: 19, textAlign: 'center', borderRadius: 10, color: 'white', backgroundColor: colours.blue, fontWeight: '800' }, infoText: { flex: 1, fontSize: 12, lineHeight: 18, color: '#34536F' }, empty: { borderWidth: 1, borderColor: colours.border, borderStyle: 'dashed', borderRadius: 17, padding: spacing.lg }, emptyText: { textAlign: 'center', color: colours.muted, lineHeight: 20, fontSize: 13 }, dateHeading: { marginTop: 14, marginBottom: 6, fontSize: 13, fontWeight: '800', color: colours.muted }, historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colours.border }, historyDate: { fontSize: 14, color: colours.ink, fontWeight: '700' }, historyValue: { fontSize: 15, color: colours.green, fontWeight: '800' },
  tabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 82, paddingBottom: 12, flexDirection: 'row', backgroundColor: colours.surface, borderTopWidth: 1, borderTopColor: colours.border }, tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 }, tabIcon: { color: '#8B968F', fontSize: 20 }, tabLabel: { color: '#8B968F', fontSize: 10, fontWeight: '700' }, tabActive: { color: colours.green },
  field: { gap: 6, marginTop: 4 }, fieldLabel: { fontSize: 12, color: colours.ink, fontWeight: '700' }, optionalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, unknownButton: { color: colours.blue, fontSize: 11, fontWeight: '800' }, input: { minHeight: 48, backgroundColor: colours.surface, borderRadius: 14, borderWidth: 1, borderColor: colours.border, paddingHorizontal: 14, color: colours.ink, fontSize: 15 }, multiline: { minHeight: 88, paddingTop: 13, textAlignVertical: 'top' }, choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, choice: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 20, backgroundColor: colours.surface, borderWidth: 1, borderColor: colours.border }, choiceActive: { backgroundColor: colours.green, borderColor: colours.green }, choiceText: { color: colours.ink, fontSize: 11, fontWeight: '700' }, choiceTextActive: { color: 'white' }, primary: { minHeight: 50, paddingHorizontal: 18, backgroundColor: colours.green, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 8 }, primaryText: { color: 'white', fontWeight: '800', fontSize: 14 }, secondary: { minHeight: 48, paddingHorizontal: 18, backgroundColor: colours.surface, borderWidth: 1, borderColor: colours.border, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 8 }, secondaryText: { color: colours.ink, fontWeight: '800', fontSize: 14 }, compactButton: { flex: 1, minHeight: 42, marginTop: 0 }, disabled: { opacity: 0.55 },
  inviteCard: { padding: spacing.xl, borderRadius: 22, backgroundColor: colours.greenSoft, alignItems: 'center', gap: 5 }, inviteCode: { color: colours.green, fontSize: 17, fontWeight: '900', letterSpacing: 1 }, memberCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, backgroundColor: colours.surface, borderWidth: 1, borderColor: colours.border }, memberAvatar: { width: 42, height: 42, borderRadius: 14, backgroundColor: colours.green, alignItems: 'center', justifyContent: 'center' }, memberStats: { color: colours.green, fontSize: 12, fontWeight: '700', marginTop: 4 }, cheer: { padding: 14, borderRadius: 17, backgroundColor: colours.blueSoft, gap: 4 },
  sheetHeader: { height: 64, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colours.border, backgroundColor: colours.surface }, close: { color: colours.green, fontSize: 14, fontWeight: '800' }, sheetTitle: { color: colours.ink, fontSize: 16, fontWeight: '800' }, sheetBody: { padding: spacing.xl, paddingBottom: 60, gap: spacing.md }, photoChoices: { flexDirection: 'row', gap: spacing.md }, photoChoice: { flex: 1, minHeight: 170, backgroundColor: colours.surface, borderWidth: 1, borderColor: colours.border, borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 10 }, photoChoiceIcon: { fontSize: 36 }, mealPhoto: { width: '100%', height: 280, borderRadius: 22, backgroundColor: colours.border },
  review: { backgroundColor: colours.surface, borderRadius: 20, padding: spacing.lg, borderWidth: 1, borderColor: colours.border, gap: spacing.sm }, reviewItem: { flexWrap: 'wrap', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colours.border }, reviewName: { color: colours.ink, fontWeight: '800', fontSize: 14 }, quantity: { flexDirection: 'row', alignItems: 'center', gap: 5 }, qtyButton: { width: 28, height: 28, lineHeight: 26, textAlign: 'center', borderRadius: 9, backgroundColor: colours.greenSoft, color: colours.green, fontSize: 17, fontWeight: '800' }, qtyValue: { minWidth: 36, textAlign: 'center', fontWeight: '800', color: colours.ink }, totalBox: { padding: 14, borderRadius: 14, backgroundColor: colours.saffronSoft, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, totalNumber: { fontSize: 18, fontWeight: '800', color: colours.ink }, totalMacros: { color: colours.muted, fontSize: 11 }, questionBox: { backgroundColor: '#FFF8DC', padding: 13, borderRadius: 14, gap: 4 }, questionTitle: { color: '#735B18', fontWeight: '800', marginBottom: 2 }, question: { color: '#735B18', lineHeight: 18, fontSize: 12 }, caution: { fontSize: 11, lineHeight: 16, color: colours.red }, confidence: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: colours.greenSoft }, confidenceText: { color: colours.green, fontWeight: '800', fontSize: 9, textTransform: 'uppercase' },
  search: { height: 52, borderRadius: 16, backgroundColor: colours.surface, borderWidth: 1, borderColor: colours.border, paddingHorizontal: 16, fontSize: 15, color: colours.ink }, basket: { flexDirection: 'row', padding: 12, borderRadius: 16, backgroundColor: colours.greenSoft, alignItems: 'center', justifyContent: 'space-between', gap: 10 }, basketTitle: { flex: 1, color: colours.green, fontWeight: '800' }, loggedFood: { backgroundColor: colours.surface, borderRadius: 16, borderWidth: 1, borderColor: colours.border, padding: 12, gap: 8 }, amountRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, foodRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colours.border }, foodName: { fontSize: 14, color: colours.ink, fontWeight: '700' }, foodEnergy: { alignItems: 'flex-end' }, foodKcal: { fontSize: 15, color: colours.ink, fontWeight: '800' },
});
