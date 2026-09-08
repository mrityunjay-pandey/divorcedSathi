/**
 * Compatibility scoring (brief §21). This is explicitly a preference-match
 * score, not a prediction: "Based on the preferences you've provided" is
 * the only claim ever made about it. There is no ML model, no psychological
 * or medical inference — just weighted overlap between one user's stated
 * PartnerPreference and a candidate's profile facts. The breakdown is
 * returned alongside the total specifically so the score is auditable by
 * the person seeing it, not a black box.
 *
 * Weights (must sum to 100): location 25, age 25, children/family 20,
 * marriage-status preference 15, education/career 15. Lifestyle
 * compatibility is deliberately NOT scored yet — PartnerPreference only
 * captures lifestyle as free text (lifestylePreferences), not structured
 * fields comparable to a candidate's Lifestyle row, so a numeric lifestyle
 * score today would be fabricated precision. See Module 8 commit notes.
 */

export interface CompatibilityCandidate {
  age: number;
  city: string;
  state: string | null;
  country: string;
  education: string | null;
  profession: string | null;
  marriageStatus: "DIVORCED" | "WIDOWED" | "SEPARATED" | "ANNULLED";
  childrenCount: "NONE" | "ONE" | "TWO" | "THREE_OR_MORE" | null;
}

export interface CompatibilityPreference {
  ageMin: number | null;
  ageMax: number | null;
  preferredCities: string[];
  preferredStates: string[];
  preferredCountries: string[];
  preferredEducation: string[];
  preferredProfessions: string[];
  previousMarriagePreferences: ("DIVORCED" | "WIDOWED" | "SEPARATED" | "ANNULLED")[];
  openToAnyMarriageStatus: boolean;
  childrenPreference: "NO_CHILDREN" | "HAS_CHILDREN" | "OPEN_TO_EITHER";
}

export interface CompatibilityBreakdown {
  location: number;
  age: number;
  childrenFamily: number;
  marriagePreference: number;
  educationCareer: number;
}

export interface CompatibilityScore {
  total: number;
  breakdown: CompatibilityBreakdown;
  basis: "Based on the preferences you've provided.";
}

const WEIGHTS = { location: 25, age: 25, childrenFamily: 20, marriagePreference: 15, educationCareer: 15 } as const;

function scoreLocation(candidate: CompatibilityCandidate, pref: CompatibilityPreference): number {
  const noPreferenceSet = !pref.preferredCities.length && !pref.preferredStates.length && !pref.preferredCountries.length;
  if (noPreferenceSet) return WEIGHTS.location; // no stated preference = no mismatch to penalize
  if (pref.preferredCities.some((c) => c.toLowerCase() === candidate.city.toLowerCase())) return WEIGHTS.location;
  if (candidate.state && pref.preferredStates.some((s) => s.toLowerCase() === candidate.state!.toLowerCase())) {
    return WEIGHTS.location * 0.7;
  }
  if (pref.preferredCountries.some((c) => c.toLowerCase() === candidate.country.toLowerCase())) {
    return WEIGHTS.location * 0.4;
  }
  return 0;
}

function scoreAge(candidate: CompatibilityCandidate, pref: CompatibilityPreference): number {
  if (pref.ageMin === null && pref.ageMax === null) return WEIGHTS.age;
  const min = pref.ageMin ?? 18;
  const max = pref.ageMax ?? 100;
  if (candidate.age >= min && candidate.age <= max) return WEIGHTS.age;
  // Graceful falloff rather than a hard cliff: 1 point off the weight per
  // year outside the range, floored at 0.
  const distance = candidate.age < min ? min - candidate.age : candidate.age - max;
  return Math.max(0, WEIGHTS.age - distance * (WEIGHTS.age / 10));
}

function scoreChildrenFamily(candidate: CompatibilityCandidate, pref: CompatibilityPreference): number {
  if (pref.childrenPreference === "OPEN_TO_EITHER") return WEIGHTS.childrenFamily;
  const candidateHasChildren = !!candidate.childrenCount && candidate.childrenCount !== "NONE";
  const wantsChildren = pref.childrenPreference === "HAS_CHILDREN";
  return candidateHasChildren === wantsChildren ? WEIGHTS.childrenFamily : 0;
}

function scoreMarriagePreference(candidate: CompatibilityCandidate, pref: CompatibilityPreference): number {
  if (pref.openToAnyMarriageStatus || pref.previousMarriagePreferences.length === 0) return WEIGHTS.marriagePreference;
  return pref.previousMarriagePreferences.includes(candidate.marriageStatus) ? WEIGHTS.marriagePreference : 0;
}

function scoreEducationCareer(candidate: CompatibilityCandidate, pref: CompatibilityPreference): number {
  const noPreferenceSet = !pref.preferredEducation.length && !pref.preferredProfessions.length;
  if (noPreferenceSet) return WEIGHTS.educationCareer;
  const educationMatch =
    !!candidate.education &&
    pref.preferredEducation.some((e) => candidate.education!.toLowerCase().includes(e.toLowerCase()));
  const professionMatch =
    !!candidate.profession &&
    pref.preferredProfessions.some((p) => candidate.profession!.toLowerCase().includes(p.toLowerCase()));
  if (educationMatch && professionMatch) return WEIGHTS.educationCareer;
  if (educationMatch || professionMatch) return WEIGHTS.educationCareer * 0.6;
  return 0;
}

export function computeCompatibility(
  candidate: CompatibilityCandidate,
  pref: CompatibilityPreference,
): CompatibilityScore {
  const breakdown: CompatibilityBreakdown = {
    location: Math.round(scoreLocation(candidate, pref)),
    age: Math.round(scoreAge(candidate, pref)),
    childrenFamily: Math.round(scoreChildrenFamily(candidate, pref)),
    marriagePreference: Math.round(scoreMarriagePreference(candidate, pref)),
    educationCareer: Math.round(scoreEducationCareer(candidate, pref)),
  };
  const total = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
  return { total, breakdown, basis: "Based on the preferences you've provided." };
}
