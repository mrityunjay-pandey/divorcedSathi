import { canView } from "./visibility";

describe("canView", () => {
  it("always allows SELF, regardless of visibility level — even NOBODY", () => {
    expect(canView("NOBODY", "SELF")).toBe(true);
    expect(canView("EVERYONE", "SELF")).toBe(true);
  });

  describe("EVERYONE", () => {
    it.each(["APPROVED", "MATCH", "REGISTERED", "STRANGER"] as const)("allows %s", (relation) => {
      expect(canView("EVERYONE", relation)).toBe(true);
    });
  });

  describe("REGISTERED", () => {
    it.each(["APPROVED", "MATCH", "REGISTERED"] as const)("allows %s", (relation) => {
      expect(canView("REGISTERED", relation)).toBe(true);
    });
    it("excludes STRANGER", () => {
      expect(canView("REGISTERED", "STRANGER")).toBe(false);
    });
  });

  describe("MATCHES", () => {
    it.each(["APPROVED", "MATCH"] as const)("allows %s", (relation) => {
      expect(canView("MATCHES", relation)).toBe(true);
    });
    it.each(["REGISTERED", "STRANGER"] as const)("excludes %s", (relation) => {
      expect(canView("MATCHES", relation)).toBe(false);
    });
  });

  describe("APPROVED", () => {
    it("allows APPROVED", () => {
      expect(canView("APPROVED", "APPROVED")).toBe(true);
    });
    it.each(["MATCH", "REGISTERED", "STRANGER"] as const)("excludes %s", (relation) => {
      expect(canView("APPROVED", relation)).toBe(false);
    });
  });

  describe("NOBODY", () => {
    it.each(["APPROVED", "MATCH", "REGISTERED", "STRANGER"] as const)("excludes everyone but SELF: %s", (relation) => {
      expect(canView("NOBODY", relation)).toBe(false);
    });
  });

  it("is monotonic: a viewer relation that can see a stricter level can also see any looser level", () => {
    const levels = ["NOBODY", "APPROVED", "MATCHES", "REGISTERED", "EVERYONE"] as const;
    const relations = ["APPROVED", "MATCH", "REGISTERED", "STRANGER"] as const;
    for (const relation of relations) {
      const results = levels.map((level) => canView(level, relation));
      // Once true, must stay true for every subsequent (looser) level.
      const firstTrueIndex = results.indexOf(true);
      if (firstTrueIndex !== -1) {
        expect(results.slice(firstTrueIndex).every(Boolean)).toBe(true);
      }
    }
  });
});
