// Typed API client. All calls go through the current origin.
// - In dev, Vite's proxy (vite.config.ts) forwards /api and /health to 127.0.0.1:8000.
// - In prod, vercel.json rewrites /api and /health to the Render backend.
// You can override with VITE_API_BASE_URL if you ever want to call the backend directly.

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export type LogType =
  | "food"
  | "water"
  | "weight"
  | "activity"
  | "workout"
  | "measurement"
  | "craving"
  | "treat"
  | "recovery"
  | "unknown";

export interface FoodItem {
  food_item: string;
  quantity: number;
  unit: string;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fibre_g: number;
  calories: number;
  confidence: number;
  notes?: string | null;
}

export interface FoodLog {
  meal: string;
  items: FoodItem[];
  hunger_before?: number | null;
  fullness_after?: number | null;
  craving_level?: string | null;
  notes?: string | null;
  date?: string | null;
}

export interface WorkoutSet {
  set_number: number;
  weight_kg?: number | null;
  reps: number;
  rir?: number | null;
  is_bodyweight: boolean;
}

export interface WorkoutExercise {
  exercise: string;
  sets: WorkoutSet[];
}

export interface WorkoutLog {
  split?: string | null;
  exercises: WorkoutExercise[];
  date?: string | null;
  notes?: string | null;
}

export interface MeasurementLog {
  weight_kg?: number | null;
  waist_cm?: number | null;
  abdomen_cm?: number | null;
  chest_cm?: number | null;
  arm_cm?: number | null;
  thigh_cm?: number | null;
  hip_cm?: number | null;
  body_fat_pct?: number | null;
  notes?: string | null;
  date?: string | null;
}

export interface Profile {
  height_cm?: number | null;
  gender?: string | null;
  dob?: string | null;
  goal_weight_kg?: number | null;
  daily_protein_target_g?: number | null;
  daily_water_target_ml?: number | null;
  daily_calorie_target?: number | null;
  maintenance_calories?: number | null;
  daily_steps_target: number;
  goal: string;
}

export interface Product {
  name: string;
  aliases: string[];
  serving_size: number;
  serving_unit: string;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fibre_g: number;
  calories: number;
  notes?: string | null;
}

export const MEALS = [
  "breakfast",
  "post-breakfast",
  "lunch",
  "pre-workout",
  "post-workout",
  "snack",
  "dinner",
] as const;

export type Meal = (typeof MEALS)[number];

export interface Adherence {
  score: number;
  protein_pct: number;
  calories_pct: number;
  workout_done: boolean;
  steps_pct: number;
  water_pct: number;
  sleep_ok: boolean;
}

export interface DailySummary {
  date: string;
  calories_in: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fibre_g: number;
  water_ml: number;
  steps: number;
  calories_burned: number;
  weight_kg: number | null;
  workout_done: boolean;
  workout_sets: number;
  food_items: Record<string, unknown>[];
  activities: Record<string, unknown>[];
  adherence: Adherence;
  targets: {
    protein_g: number | null;
    calorie_target: number | null;
    steps: number;
    water_ml: number;
  };
}

export interface WeightTrend {
  current_7day_avg: number | null;
  previous_7day_avg: number | null;
  change_kg: number | null;
  series: {
    date: string;
    value: number | null;
    rolling_7: number | null;
  }[];
  raw_history: {
    date: string;
    weight: number;
  }[];
}

export interface ExtractedLog {
  log_type: LogType;
  data: Record<string, unknown>;
  reasoning: string;
  clarification_needed: string | null;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;

    try {
      const body = await res.json();
      msg = body.detail ?? msg;
    } catch {
      /* ignore */
    }

    throw new Error(msg);
  }

  return res.json() as Promise<T>;
}

export const api = {
  health: () => req<{ status: string }>("/health"),

  parse: (text: string, meal_hint?: Meal | null) =>
    req<ExtractedLog>("/api/log/parse", {
      method: "POST",
      body: JSON.stringify({
        text,
        meal_hint: meal_hint ?? null,
      }),
    }),

  logFood: (body: FoodLog) =>
    req<{ logged: number }>("/api/log/food", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  logWater: (water_ml: number, date?: string) =>
    req<{ ok: boolean }>("/api/log/water", {
      method: "POST",
      body: JSON.stringify({ water_ml, date }),
    }),

  logWeight: (
    weight_kg: number,
    notes?: string | null,
    date?: string,
  ) =>
    req<{ ok: boolean }>("/api/log/weight", {
      method: "POST",
      body: JSON.stringify({ weight_kg, notes, date }),
    }),

  logMeasurement: (body: MeasurementLog) =>
    req<{ ok: boolean }>("/api/log/measurement", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  logActivity: (body: {
    activity_type: string;
    duration_min?: number | null;
    calories_burned?: number | null;
    steps?: number | null;
    notes?: string | null;
    date?: string | null;
  }) =>
    req<{ ok: boolean }>("/api/log/activity", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  logWorkout: (body: WorkoutLog) =>
    req<{ sets_logged: number }>("/api/log/workout", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  logCraving: (body: {
    meal?: string | null;
    craving_level: string;
    what_craved: string;
    ate_it: boolean;
    trigger_context?: string | null;
    notes?: string | null;
    date?: string | null;
  }) =>
    req<{ ok: boolean }>("/api/log/craving", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  logTreat: (body: {
    meal: string;
    items: string;
    est_calories?: number | null;
    satisfaction_1_10: number;
    worth_it: boolean;
    notes?: string | null;
    date?: string | null;
  }) =>
    req<{ ok: boolean }>("/api/log/treat", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  logRecovery: (body: {
    sleep_score?: number | null;
    energy?: number | null;
    stress?: number | null;
    soreness?: number | null;
    mood?: number | null;
    notes?: string | null;
    date?: string | null;
  }) =>
    req<{ ok: boolean }>("/api/log/recovery", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  daily: (on?: string) =>
    req<DailySummary>(`/api/read/daily${on ? `?on=${on}` : ""}`),

  weightTrend: (days = 60) =>
    req<WeightTrend>(`/api/read/weight/trend?days=${days}`),

  measurements: (days = 180) =>
    req<
      {
        date: string;
        weight_kg: number | null;
        waist_cm: number | null;
        abdomen_cm: number | null;
        chest_cm: number | null;
        arm_cm: number | null;
        thigh_cm: number | null;
        hip_cm: number | null;
        body_fat_pct: number | null;
        notes: string | null;
      }[]
    >(`/api/read/measurements/history?days=${days}`),

  foodRecent: (days = 7) =>
    req<Record<string, unknown>[]>(
      `/api/read/food/recent?days=${days}`,
    ),

  cravingsRecent: (days = 14) =>
    req<Record<string, unknown>[]>(
      `/api/read/cravings/recent?days=${days}`,
    ),

  treatsRecent: (days = 30) =>
    req<Record<string, unknown>[]>(
      `/api/read/treats/recent?days=${days}`,
    ),

  exercises: () =>
    req<{ exercise: string; sets_logged: number; last_done: string }[]>(
      "/api/workout/exercises",
    ),

  workoutHistory: (exercise: string) =>
    req<{ date: string; sets: WorkoutSet[]; best_score: number }[]>(
      `/api/workout/history?exercise=${encodeURIComponent(exercise)}`,
    ),

  prs: (days = 90) =>
    req<Record<string, unknown>[]>(
      `/api/workout/prs?days=${days}`,
    ),

  recentSessions: (days = 14) =>
    req<{
      date: string;
      split: string | null;
      notes: string | null;
      exercises: WorkoutExercise[];
    }[]>(`/api/workout/recent-sessions?days=${days}`),

  weeklyReport: (week_start?: string) =>
    req<Record<string, unknown>>(
      `/api/report/weekly${
        week_start ? `?week_start=${week_start}` : ""
      }`,
    ),

  getProfile: () => req<Profile>("/api/profile"),

  putProfile: (p: Profile) =>
    req<Profile>("/api/profile", {
      method: "PUT",
      body: JSON.stringify(p),
    }),

  listProducts: () => req<Product[]>("/api/products"),

  createProduct: (p: Product) =>
    req<Product>("/api/products", {
      method: "POST",
      body: JSON.stringify(p),
    }),

  updateProduct: (name: string, p: Product) =>
    req<Product>(`/api/products/${encodeURIComponent(name)}`, {
      method: "PUT",
      body: JSON.stringify(p),
    }),

  deleteProduct: (name: string) =>
    req<{ ok: boolean }>(
      `/api/products/${encodeURIComponent(name)}`,
      {
        method: "DELETE",
      },
    ),
};