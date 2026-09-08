import { computeCompatibility, type CompatibilityCandidate, type CompatibilityPreference } from "./compatibility";

function candidate(overrides: Partial<CompatibilityCandidate> = {}): CompatibilityCandidate {
  return {
    age: 35,
    city: "Pune",
    state: "Maharashtra",
    country: "India",
    education: "MBA",
    profession: "Product Manager",
    marriageStatus: "DIVORCED",
    childrenCount: "NONE",
    ...overrides,
  };
}

function preference(overrides: Partial<CompatibilityPreference> = {}): CompatibilityPreference {
  return {
    ageMin: null,
    ageMax: null,
    preferredCities: [],
    preferredStates: [],
    preferredCountries: [],
    preferredEducation: [],
    preferredProfessions: [],
    previousMarriagePreferences: [],
    openToAnyMarriageStatus: true,
    childrenPreference: "OPEN_TO_EITHER",
    ...overrides,
  };
}

describe("computeCompatibility", () => {
  it("never claims a prediction — basis is always the fixed disclaimer string", () => {
    const score = computeCompatibility(candidate(), preference());
    expect(score.basis).toBe("Based on the preferences you've provided.");
  });

  it("scores 100 when no preferences are set at all — nothing to mismatch against", () => {
    const score = computeCompatibility(candidate(), preference());
    expect(score.total).toBe(100);
  });

  it("gives full location credit for an exact city match", () => {
    const score = computeCompatibility(candidate({ city: "Pune" }), preference({ preferredCities: ["Pune"] }));
    expect(score.breakdown.location).toBe(25);
  });

  it("gives partial location credit for a state match when city doesn't match", () => {
    const score = computeCompatibility(
      candidate({ city: "Nagpur", state: "Maharashtra" }),
      preference({ preferredCities: ["Pune"], preferredStates: ["Maharashtra"] }),
    );
    expect(score.breakdown.location).toBeGreaterThan(0);
    expect(score.breakdown.location).toBeLessThan(25);
  });

  it("gives zero location credit when neither city, state, nor country match", () => {
    const score = computeCompatibility(
      candidate({ city: "Nagpur", state: "Maharashtra", country: "India" }),
      preference({ preferredCities: ["Pune"], preferredStates: ["Gujarat"], preferredCountries: ["USA"] }),
    );
    expect(score.breakdown.location).toBe(0);
  });

  it("gives full age credit when the candidate is within range, zero-ish falloff outside it", () => {
    const inRange = computeCompatibility(candidate({ age: 35 }), preference({ ageMin: 30, ageMax: 40 }));
    expect(inRange.breakdown.age).toBe(25);

    const wayOutside = computeCompatibility(candidate({ age: 60 }), preference({ ageMin: 30, ageMax: 40 }));
    expect(wayOutside.breakdown.age).toBe(0);

    const slightlyOutside = computeCompatibility(candidate({ age: 41 }), preference({ ageMin: 30, ageMax: 40 }));
    expect(slightlyOutside.breakdown.age).toBeGreaterThan(0);
    expect(slightlyOutside.breakdown.age).toBeLessThan(25);
  });

  it("treats OPEN_TO_EITHER children preference as always-compatible", () => {
    const score = computeCompatibility(candidate({ childrenCount: "TWO" }), preference({ childrenPreference: "OPEN_TO_EITHER" }));
    expect(score.breakdown.childrenFamily).toBe(20);
  });

  it("scores zero children/family compatibility on a genuine mismatch", () => {
    const score = computeCompatibility(
      candidate({ childrenCount: "TWO" }),
      preference({ childrenPreference: "NO_CHILDREN" }),
    );
    expect(score.breakdown.childrenFamily).toBe(0);
  });

  it("respects openToAnyMarriageStatus over an explicit (now-ignored) preference list", () => {
    const score = computeCompatibility(
      candidate({ marriageStatus: "WIDOWED" }),
      preference({ openToAnyMarriageStatus: true, previousMarriagePreferences: ["DIVORCED"] }),
    );
    expect(score.breakdown.marriagePreference).toBe(15);
  });

  it("scores zero marriage-preference compatibility when the candidate's status isn't in the preferred list", () => {
    const score = computeCompatibility(
      candidate({ marriageStatus: "WIDOWED" }),
      preference({ openToAnyMarriageStatus: false, previousMarriagePreferences: ["DIVORCED"] }),
    );
    expect(score.breakdown.marriagePreference).toBe(0);
  });

  it("gives full education/career credit only when both education and profession match", () => {
    const both = computeCompatibility(
      candidate({ education: "MBA", profession: "Product Manager" }),
      preference({ preferredEducation: ["MBA"], preferredProfessions: ["Product Manager"] }),
    );
    expect(both.breakdown.educationCareer).toBe(15);

    const educationOnly = computeCompatibility(
      candidate({ education: "MBA", profession: "Chef" }),
      preference({ preferredEducation: ["MBA"], preferredProfessions: ["Product Manager"] }),
    );
    expect(educationOnly.breakdown.educationCareer).toBeGreaterThan(0);
    expect(educationOnly.breakdown.educationCareer).toBeLessThan(15);
  });

  it("total always equals the sum of the breakdown — no hidden fudge factor", () => {
    const score = computeCompatibility(
      candidate({ age: 50, city: "Nagpur" }),
      preference({ ageMin: 30, ageMax: 40, preferredCities: ["Pune"] }),
    );
    const sum = Object.values(score.breakdown).reduce((a, b) => a + b, 0);
    expect(score.total).toBe(sum);
  });
});
