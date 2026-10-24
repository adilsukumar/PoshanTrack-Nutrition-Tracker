export type Sex = 'male' | 'female' | 'other' | 'unknown';
export type GoalDirection = 'gain' | 'lose' | 'maintain' | 'unsure';
export type LivingSituation = 'hostel' | 'home' | 'other' | 'unknown';
export type KnowableYesNo = 'yes' | 'no' | 'unknown';

export type UserProfile = {
  name: string;
  sex: Sex;
  birthDate: string;
  goalDirection: GoalDirection;
  livingSituation: LivingSituation;
  blenderAvailable: KnowableYesNo;
  previousWeightKg: number;
  weightChangeMonths: number;
  serverUrl: string;
  heightCm: number;
  weightKg: number;
  goalWeightKg: number;
  calorieTarget: number;
  proteinTarget: number;
  stepTarget: number;
  weeklyGainKg: number;
  onboardingComplete: boolean;
};

export type CircleMember = {
  id: string;
  name: string;
  goalDirection: GoalDirection;
  currentWeightKg?: number;
  goalWeightKg?: number;
  todaySteps?: number;
  todayCalories?: number;
  calorieTarget?: number;
  lastUpdated: string;
};

export type Cheer = {
  id: string;
  fromName: string;
  message: string;
  createdAt: string;
};

export type CircleState = {
  circleId?: string;
  inviteCode?: string;
  members: CircleMember[];
  cheers: Cheer[];
};

export type Nutrients = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fibreG?: number;
};

export type FoodItem = Nutrients & {
  id: string;
  name: string;
  regionalName?: string;
  portion: string;
  quantity: number;
  loggedAmount?: number;
  loggedUnit?: 'pieces' | 'g' | 'ml' | 'servings';
  caloriesLow?: number;
  caloriesHigh?: number;
  confidence?: 'low' | 'medium' | 'high';
  notes?: string;
};

export type Meal = {
  id: string;
  createdAt: string;
  mealType: 'Breakfast' | 'Lunch' | 'Snack' | 'Dinner' | 'Late meal';
  photoUri?: string;
  items: FoodItem[];
  notes?: string;
  source: 'photo-ai' | 'manual' | 'quick-add';
};

export type WeightEntry = {
  id: string;
  date: string;
  weightKg: number;
};

export type StepEntry = { day: string; steps: number; syncedAt: string };

export type SupplementEntry = {
  id: string;
  name: string;
  dose: string;
  takenAt: string;
  ingredients?: string;
};

export type FoodAnalysis = {
  dishSummary: string;
  mealType: Meal['mealType'];
  items: FoodItem[];
  questions: string[];
  overallConfidence: 'low' | 'medium' | 'high';
  assumptions: string[];
  caution: string;
};

export type AppState = {
  profile: UserProfile;
  meals: Meal[];
  weights: WeightEntry[];
  supplements: SupplementEntry[];
  lastStepCount: number;
  lastStepSync?: string;
  stepHistory?: StepEntry[];
  circle: CircleState;
};
