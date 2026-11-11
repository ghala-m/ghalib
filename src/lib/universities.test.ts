import { describe, expect, it } from "vitest";
import { COLLEGES } from "./colleges";
import { UNIVERSITIES, collegesForUniversity, findUniversity, majorsForCollege } from "./universities";

describe("university catalog integrity", () => {
  it("has unique official names", () => {
    const names = UNIVERSITIES.map((u) => u.official);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every catalog college exists in COLLEGES (so chips/colours resolve)", () => {
    const known = new Set(COLLEGES.map((c) => c.ar));
    const missing = UNIVERSITIES.flatMap((u) =>
      u.colleges.filter((c) => !known.has(c.ar)).map((c) => `${u.official}: ${c.ar}`),
    );
    expect(missing).toEqual([]);
  });

  it("has no duplicate colleges or majors within a university/college", () => {
    for (const u of UNIVERSITIES) {
      const cols = u.colleges.map((c) => c.ar);
      expect(new Set(cols).size, `${u.official} colleges`).toBe(cols.length);
      for (const c of u.colleges) {
        const ms = c.majors.map((m) => m.en);
        expect(new Set(ms).size, `${u.official} / ${c.ar} majors`).toBe(ms.length);
        for (const m of c.majors) {
          expect(m.en.trim()).not.toBe("");
          expect(m.ar.trim()).not.toBe("");
        }
      }
    }
  });

  it("looks universities up by official name and falls back for unknown ones", () => {
    expect(findUniversity("Kuwait University")).toBeDefined();
    expect(findUniversity("Nowhere U")).toBeUndefined();
    expect(collegesForUniversity("Nowhere U").length).toBeGreaterThan(0);
    expect(collegesForUniversity(null).length).toBeGreaterThan(0);
  });

  it("returns majors for a known college", () => {
    const u = UNIVERSITIES.find((x) => x.colleges.some((c) => c.majors.length))!;
    const c = u.colleges.find((x) => x.majors.length)!;
    expect(majorsForCollege(u.official, c.ar).length).toBe(c.majors.length);
  });
});
