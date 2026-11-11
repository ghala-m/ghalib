import { describe, expect, it } from "vitest";
import { contribution, neededAverage, scoreToPercent, summarizeGrades } from "./grades";

type Item = Parameters<typeof summarizeGrades>[0][number];
const item = (o: Partial<Item> & { id: string }): Item =>
  ({ weight: null, score_percent: null, type: "quiz", drop_lowest: false, ...o }) as Item;

describe("scoreToPercent", () => {
  it("computes earned/max as percent", () => {
    expect(scoreToPercent(15, 20)).toBe(75);
    expect(scoreToPercent("7.5", "10")).toBe(75);
    expect(scoreToPercent(1, 3)).toBe(33.33);
  });
  it("caps at 100 (bonus marks)", () => {
    expect(scoreToPercent(12, 10)).toBe(100);
  });
  it("returns null for missing/invalid input", () => {
    expect(scoreToPercent(null, 10)).toBeNull();
    expect(scoreToPercent(5, undefined)).toBeNull();
    expect(scoreToPercent("", 10)).toBeNull();
    expect(scoreToPercent(5, 0)).toBeNull();
    expect(scoreToPercent(-1, 10)).toBeNull();
    expect(scoreToPercent("abc", 10)).toBeNull();
  });
  it("accepts zero earned", () => {
    expect(scoreToPercent(0, 10)).toBe(0);
  });
});

describe("contribution", () => {
  it("is weight × percent", () => {
    expect(contribution(5, 75)).toBe(3.75);
  });
  it("is null without weight or score", () => {
    expect(contribution(null, 80)).toBeNull();
    expect(contribution(0, 80)).toBeNull();
    expect(contribution(10, null)).toBeNull();
  });
});

describe("summarizeGrades", () => {
  it("ignores unweighted items", () => {
    const s = summarizeGrades([item({ id: "a", weight: null, score_percent: 50 })]);
    expect(s.totalWeight).toBe(0);
    expect(s.currentAverage).toBeNull();
    expect(s.coverage).toBe(0);
  });

  it("weighted average over graded items only", () => {
    const s = summarizeGrades([
      item({ id: "a", type: "exam", weight: 30, score_percent: 80 }),
      item({ id: "b", type: "exam", weight: 10, score_percent: 40 }),
      item({ id: "c", type: "final", weight: 60 }),
    ]);
    expect(s.totalWeight).toBe(100);
    expect(s.gradedWeight).toBe(40);
    expect(s.coverage).toBe(40);
    expect(s.currentAverage).toBe(70); // (30*80 + 10*40) / 40
    expect(s.earnedPoints).toBe(28); // 24 + 4
  });

  describe("drop lowest", () => {
    it("drops the lowest once all items in the group are graded", () => {
      const s = summarizeGrades([
        item({ id: "q1", weight: 10, score_percent: 50, drop_lowest: true }),
        item({ id: "q2", weight: 10, score_percent: 90, drop_lowest: true }),
        item({ id: "q3", weight: 10, score_percent: 70, drop_lowest: true }),
      ]);
      expect([...s.droppedIds]).toEqual(["q1"]);
      expect(s.totalWeight).toBe(20);
      expect(s.currentAverage).toBe(80);
      expect(s.earnedPoints).toBe(16);
    });

    it("holds the dropped slot with an ungraded item until then", () => {
      const s = summarizeGrades([
        item({ id: "q1", weight: 10, score_percent: 50, drop_lowest: true }),
        item({ id: "q2", weight: 10, score_percent: 90, drop_lowest: true }),
        item({ id: "q3", weight: 10, drop_lowest: true }),
      ]);
      expect([...s.droppedIds]).toEqual(["q3"]);
      expect(s.totalWeight).toBe(20);
      expect(s.gradedWeight).toBe(20);
      expect(s.currentAverage).toBe(70);
    });

    it("does nothing for a single item or when the flag is off", () => {
      const single = summarizeGrades([item({ id: "q1", weight: 10, score_percent: 50, drop_lowest: true })]);
      expect(single.droppedIds.size).toBe(0);
      const off = summarizeGrades([
        item({ id: "q1", weight: 10, score_percent: 50 }),
        item({ id: "q2", weight: 10, score_percent: 90 }),
      ]);
      expect(off.droppedIds.size).toBe(0);
      expect(off.totalWeight).toBe(20);
    });

    it("groups by type independently", () => {
      const s = summarizeGrades([
        item({ id: "q1", type: "quiz", weight: 5, score_percent: 40, drop_lowest: true }),
        item({ id: "q2", type: "quiz", weight: 5, score_percent: 80, drop_lowest: true }),
        item({ id: "h1", type: "homework", weight: 5, score_percent: 10 }),
        item({ id: "h2", type: "homework", weight: 5, score_percent: 20 }),
      ]);
      expect([...s.droppedIds]).toEqual(["q1"]);
      expect(s.totalWeight).toBe(15);
    });

    it("drops exactly one on a tie", () => {
      const s = summarizeGrades([
        item({ id: "q1", weight: 10, score_percent: 60, drop_lowest: true }),
        item({ id: "q2", weight: 10, score_percent: 60, drop_lowest: true }),
      ]);
      expect(s.droppedIds.size).toBe(1);
      expect(s.totalWeight).toBe(10);
    });
  });
});

describe("neededAverage", () => {
  it("computes the average required on the remainder", () => {
    const s = summarizeGrades([
      item({ id: "a", type: "exam", weight: 50, score_percent: 80 }),
      item({ id: "b", type: "final", weight: 50 }),
    ]);
    expect(neededAverage(s, 90)).toBe(100); // (9000 - 4000) / 50
    expect(neededAverage(s, 70)).toBe(60);
  });
  it("is null when fully graded or weights don't sum to 100", () => {
    const done = summarizeGrades([item({ id: "a", weight: 100, score_percent: 80 })]);
    expect(neededAverage(done, 90)).toBeNull();
    const partial = summarizeGrades([
      item({ id: "a", type: "exam", weight: 30, score_percent: 80 }),
      item({ id: "b", type: "final", weight: 30 }),
    ]);
    expect(neededAverage(partial, 90)).toBeNull();
  });
});
