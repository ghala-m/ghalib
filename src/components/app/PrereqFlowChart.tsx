import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { buildPrereqGraph, CATEGORY_META, type GraphNode } from "@/lib/plan";
import { useI18n } from "@/lib/i18n";
import type { Course } from "@/lib/queries";
import { cn } from "@/lib/utils";

const NODE_W = 190;
const NODE_H = 74;
const GAP_X = 90;
const GAP_Y = 22;

type Placed = GraphNode & { x: number; y: number };

export function PrereqFlowChart({ courses }: { courses: Course[] }) {
  const { t, dir } = useI18n();

  const { placed, edges, width, height } = useMemo(() => {
    const { nodes, byKey } = buildPrereqGraph(courses);
    const columns = new Map<number, GraphNode[]>();
    for (const n of nodes) {
      const list = columns.get(n.depth) ?? [];
      list.push(n);
      columns.set(n.depth, list);
    }
    const placedNodes: Placed[] = [];
    const positions = new Map<string, Placed>();
    const depths = [...columns.keys()].sort((a, b) => a - b);
    depths.forEach((depth, colIndex) => {
      const list = columns.get(depth)!;
      list.forEach((n, rowIndex) => {
        const p: Placed = { ...n, x: colIndex * (NODE_W + GAP_X), y: rowIndex * (NODE_H + GAP_Y) };
        placedNodes.push(p);
        positions.set(n.key, p);
      });
    });

    const edgeList: { from: Placed; to: Placed }[] = [];
    for (const n of placedNodes) {
      for (const target of n.unlocks) {
        const to = positions.get(target);
        if (to && byKey.has(target)) edgeList.push({ from: n, to });
      }
    }

    const maxRow = Math.max(1, ...[...columns.values()].map((l) => l.length));
    return {
      placed: placedNodes,
      edges: edgeList,
      width: Math.max(1, depths.length) * (NODE_W + GAP_X),
      height: maxRow * (NODE_H + GAP_Y),
    };
  }, [courses]);

  if (!placed.length) {
    return <p className="panel-glass p-8 text-center text-sm text-muted-foreground">{t("noPlanYet")}</p>;
  }

  return (
    <div className="panel-glass overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="font-semibold">{t("flowChart")}</h2>
          <p className="text-xs text-muted-foreground">{t("flowChartHint")}</p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {(["completed", "current", "available", "locked"] as const).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <i className={cn("size-2.5 rounded-full", stateDot[s])} />
              {t(s === "completed" ? "completed" : s === "current" ? "current" : s)}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-auto p-5" dir="ltr">
        <div className="relative" style={{ width, height, minWidth: "100%" }}>
          <svg className="pointer-events-none absolute inset-0" width={width} height={height}>
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 z" fill="currentColor" className="text-muted-foreground/60" />
              </marker>
            </defs>
            {edges.map(({ from, to }, i) => {
              const x1 = from.x + NODE_W;
              const y1 = from.y + NODE_H / 2;
              const x2 = to.x;
              const y2 = to.y + NODE_H / 2;
              const mid = (x1 + x2) / 2;
              return (
                <path
                  key={i}
                  d={`M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  markerEnd="url(#arrow)"
                  className="text-muted-foreground/45"
                />
              );
            })}
          </svg>

          {placed.map((n) => (
            <Link
              key={n.key}
              to="/courses/$courseId"
              params={{ courseId: n.course.id }}
              dir={dir}
              className={cn(
                "absolute flex flex-col justify-center rounded-xl border bg-card px-3 py-2 shadow-sm transition-shadow hover:shadow-[var(--shadow-lift)]",
                n.state === "locked" && "opacity-60",
              )}
              style={{
                width: NODE_W,
                height: NODE_H,
                left: n.x,
                top: n.y,
                borderInlineStartWidth: 4,
                borderInlineStartColor: CATEGORY_META[n.course.category].color,
              }}
            >
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <i className={cn("size-2 rounded-full", stateDot[n.state])} />
                {n.course.code || t(CATEGORY_META[n.course.category].key)}
                {n.course.credits ? <span className="ms-auto">{n.course.credits}</span> : null}
              </span>
              <span className="line-clamp-2 text-xs font-medium">{n.course.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

const stateDot: Record<GraphNode["state"], string> = {
  completed: "bg-cat-college",
  current: "bg-accent",
  available: "bg-cat-general",
  locked: "bg-muted-foreground/40",
};
