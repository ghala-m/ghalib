import type { Course, CourseCategory } from "@/lib/queries";

export const CATEGORY_ORDER: CourseCategory[] = ["general", "college", "major", "major_elective"];

export const CATEGORY_META: Record<CourseCategory, { key: "general" | "college" | "majorReq" | "major_elective"; color: string }> = {
  general: { key: "general", color: "var(--cat-general)" },
  college: { key: "college", color: "var(--cat-college)" },
  major: { key: "majorReq", color: "var(--cat-major)" },
  major_elective: { key: "major_elective", color: "var(--cat-major_elective)" },
};

export const GRADE_SCALE: { grade: string; points: number }[] = [
  { grade: "A+", points: 4 },
  { grade: "A", points: 4 },
  { grade: "A-", points: 3.7 },
  { grade: "B+", points: 3.3 },
  { grade: "B", points: 3 },
  { grade: "B-", points: 2.7 },
  { grade: "C+", points: 2.3 },
  { grade: "C", points: 2 },
  { grade: "C-", points: 1.7 },
  { grade: "D+", points: 1.3 },
  { grade: "D", points: 1 },
  { grade: "F", points: 0 },
];

export function pointsFor(grade: string | null) {
  return GRADE_SCALE.find((g) => g.grade === grade)?.points ?? null;
}

export type GraphNode = {
  course: Course;
  key: string;
  depth: number;
  unlocks: string[];
  state: "completed" | "current" | "available" | "locked";
};

const norm = (v: string) => v.replace(/\s+/g, "").toUpperCase();

/** Builds prerequisite layers: depth = longest prerequisite chain leading to the course. */
export function buildPrereqGraph(courses: Course[]): { nodes: GraphNode[]; byKey: Map<string, GraphNode>; maxDepth: number } {
  const byKey = new Map<string, GraphNode>();
  const keyOf = (c: Course) => norm(c.code || c.name);

  for (const course of courses) {
    byKey.set(keyOf(course), { course, key: keyOf(course), depth: 0, unlocks: [], state: "locked" });
  }

  const depthOf = (key: string, seen = new Set<string>()): number => {
    const node = byKey.get(key);
    if (!node || seen.has(key)) return 0;
    seen.add(key);
    const prereqs = node.course.prerequisites.map(norm).filter((p) => byKey.has(p));
    if (!prereqs.length) return 0;
    return 1 + Math.max(...prereqs.map((p) => depthOf(p, new Set(seen))));
  };

  for (const node of byKey.values()) {
    node.depth = node.course.plan_level ? node.course.plan_level - 1 : depthOf(node.key);
    for (const p of node.course.prerequisites.map(norm)) {
      byKey.get(p)?.unlocks.push(node.key);
    }
  }

  for (const node of byKey.values()) {
    if (node.course.status === "completed") node.state = "completed";
    else if (node.course.status === "current") node.state = "current";
    else {
      const prereqs = node.course.prerequisites.map(norm).filter((p) => byKey.has(p));
      node.state = prereqs.every((p) => byKey.get(p)?.course.status === "completed") ? "available" : "locked";
    }
  }

  const nodes = [...byKey.values()].sort((a, b) => a.depth - b.depth || a.key.localeCompare(b.key));
  return { nodes, byKey, maxDepth: nodes.reduce((m, n) => Math.max(m, n.depth), 0) };
}
