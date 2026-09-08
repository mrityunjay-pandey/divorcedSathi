export interface Profile {
  id: string;
  userId: string;
  heightCm: number | null;
  city: string;
  state: string | null;
  country: string;
  motherTongue: string | null;
  religion: string | null;
  community: string | null;
  education: string | null;
  profession: string | null;
  employmentType: EmploymentType | null;
  incomeRange: IncomeRange | null;
  aboutMe: string | null;
}

export type EmploymentType = "SALARIED" | "SELF_EMPLOYED" | "BUSINESS_OWNER" | "NOT_WORKING" | "PREFER_NOT_TO_SAY";
export type IncomeRange = "UNDER_5L" | "L5_TO_10L" | "L10_TO_20L" | "L20_TO_50L" | "ABOVE_50L" | "PREFER_NOT_TO_SAY";
export type Diet = "VEGETARIAN" | "NON_VEGETARIAN" | "VEGAN" | "EGGETARIAN" | "PREFER_NOT_TO_SAY";
export type HabitFrequency = "NEVER" | "OCCASIONALLY" | "REGULARLY" | "PREFER_NOT_TO_SAY";

export interface Lifestyle {
  id: string;
  profileId: string;
  diet: Diet | null;
  smoking: HabitFrequency | null;
  drinking: HabitFrequency | null;
  fitnessRoutine: string | null;
  hobbies: string | null;
  pets: string | null;
  travelFrequency: string | null;
  sleepSchedule: string | null;
  socialLifestyle: string | null;
}

export const EMPLOYMENT_TYPE_OPTIONS: { label: string; value: EmploymentType }[] = [
  { label: "Salaried", value: "SALARIED" },
  { label: "Self-employed", value: "SELF_EMPLOYED" },
  { label: "Business owner", value: "BUSINESS_OWNER" },
  { label: "Not currently working", value: "NOT_WORKING" },
  { label: "Prefer not to say", value: "PREFER_NOT_TO_SAY" },
];

export const INCOME_RANGE_OPTIONS: { label: string; value: IncomeRange }[] = [
  { label: "Under ₹5L / year", value: "UNDER_5L" },
  { label: "₹5L – ₹10L / year", value: "L5_TO_10L" },
  { label: "₹10L – ₹20L / year", value: "L10_TO_20L" },
  { label: "₹20L – ₹50L / year", value: "L20_TO_50L" },
  { label: "Above ₹50L / year", value: "ABOVE_50L" },
  { label: "Prefer not to say", value: "PREFER_NOT_TO_SAY" },
];

export const DIET_OPTIONS: { label: string; value: Diet }[] = [
  { label: "Vegetarian", value: "VEGETARIAN" },
  { label: "Non-vegetarian", value: "NON_VEGETARIAN" },
  { label: "Vegan", value: "VEGAN" },
  { label: "Eggetarian", value: "EGGETARIAN" },
  { label: "Prefer not to say", value: "PREFER_NOT_TO_SAY" },
];

export const HABIT_FREQUENCY_OPTIONS: { label: string; value: HabitFrequency }[] = [
  { label: "Never", value: "NEVER" },
  { label: "Occasionally", value: "OCCASIONALLY" },
  { label: "Regularly", value: "REGULARLY" },
  { label: "Prefer not to say", value: "PREFER_NOT_TO_SAY" },
];
