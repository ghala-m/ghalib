import { useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { buildPrereqGraph, CATEGORY_META, type GraphNode } from "@/lib/plan";
import { useI18n } from "@/lib/i18n";
import type { Course } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const NODE_W = 190;
const NODE_H = 74;
const GAP_X = 90;
const GAP_Y = 22;
const MIN_SCALE = 0.4;
const MAX_SCALE = 1.5;
const clampScale = (v: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, v));

type Placed = GraphNode & { x: number; y: number };

export function PrereqFlowChart({ courses }: { courses: Course[] }) {
  const { t, dir } = useI18n();
  const scrollRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

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

  const [scale, setScaleState] = useState(() => {
    if (typeof window === "undefined") return 1;
    const saved = Number(localStorage.getItem("ghalib.prereqZoom"));
    return Number.isFinite(saved) && saved > 0 ? clampScale(saved) : 1;
  });
  const clamp = (v: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, v));
  const setScale = (updater: number | ((prev: number) => number)) => {
    setScaleState((prev) => {
      const next = clamp(typeof updater === "function" ? updater(prev) : updater);
      if (typeof window !== "undefined") localStorage.setItem("ghalib.prereqZoom", String(next));
      return next;
    });
  };
  // The Maximize2 button opens a real fullscreen view of the chart (its own icon promises
  // "expand", not "reset zoom") — zoom/pan state is shared with the inline chart via `scale`.
  const [expanded, setExpanded] = useState(false);

  const expandedScrollRef = useRef<HTMLDivElement>(null);
  const expandedDrag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const makeHandlers = (
    elRef: React.RefObject<HTMLDivElement | null>,
    dragRef: React.RefObject<{ x: number; y: number; left: number; top: number } | null>,
  ) => ({
    onPointerDown: (e: React.PointerEvent) => {
      const el = elRef.current;
      if (!el || e.pointerType !== "mouse") return;
      dragRef.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
      el.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent) => {
      const el = elRef.current;
      if (!el || !dragRef.current) return;
      el.scrollLeft = dragRef.current.left - (e.clientX - dragRef.current.x);
      el.scrollTop = dragRef.current.top - (e.clientY - dragRef.current.y);
    },
    onPointerUp: () => {
      dragRef.current = null;
    },
    onPointerLeave: () => {
      dragRef.current = null;
    },
  });

  if (!placed.length) {
    return (
      <p className="panel-glass p-8 text-center text-sm text-muted-foreground">{t("noPlanYet")}</p>
    );
  }

  const zoomControls = (
    <div className="flex items-center gap-1" dir="ltr">
      <Button
        variant="outline"
        size="icon"
        className="size-7"
        aria-label={t("zoomOut")}
        onClick={() => setScale((s) => clamp(s - 0.15))}
      >
        <Minus className="size-3.5" />
      </Button>
      <span className="w-10 text-center text-xs tabular-nums text-muted-foreground">
        {Math.round(scale * 100)}%
      </span>
      <Button
        variant="outline"
        size="icon"
        className="size-7"
        aria-label={t("zoomIn")}
        onClick={() => setScale((s) => clamp(s + 0.15))}
      >
        <Plus className="size-3.5" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="size-7"
        title={t("resetZoom")}
        aria-label={t("resetZoom")}
        onClick={() => {
          if (typeof window !== "undefined") localStorage.removeItem("ghalib.prereqZoom");
          setScale(1);
        }}
      >
        <RotateCcw className="size-3.5" />
      </Button>
    </div>
  );

  const legend = (
    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
      {(["completed", "current", "available", "locked"] as const).map((s) => (
        <span key={s} className="flex items-center gap-1.5">
          <i className={cn("size-2.5 rounded-full", stateDot[s])} />
          {t(s === "completed" ? "completed" : s === "current" ? "current" : s)}
        </span>
      ))}
    </div>
  );

  function Canvas({
    elRef,
    dragHandlers,
    maxHeight,
  }: {
    elRef: React.RefObject<HTMLDivElement | null>;
    dragHandlers: ReturnType<typeof makeHandlers>;
    maxHeight?: string;
  }) {
    return (
      <div
        ref={elRef}
        className="touch-pan-x touch-pan-y cursor-grab overflow-auto p-5 select-none overscroll-contain active:cursor-grabbing"
        dir="ltr"
        style={maxHeight ? { maxHeight } : undefined}
        {...dragHandlers}
      >
        <div
          className="relative"
          style={{ width: width * scale, height: height * scale, minWidth: "100%" }}
        >
          <div style={{ width, height, transform: `scale(${scale})`, transformOrigin: "0 0" }}>
            <svg className="pointer-events-none absolute inset-0" width={width} height={height}>
              <defs>
                <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                  <path
                    d="M0,0 L8,4 L0,8 z"
                    fill="currentColor"
                    className="text-muted-foreground/60"
                  />
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

  return (
    <div className="panel-glass overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="font-semibold">{t("flowChart")}</h2>
          <p className="text-xs text-muted-foreground">{t("flowChartHint")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {zoomControls}
          <Button
            variant="outline"
            size="icon"
            className="size-7"
            title={t("expandChart")}
            aria-label={t("expandChart")}
            onClick={() => setExpanded(true)}
          >
            <Maximize2 className="size-3.5" />
          </Button>
          {legend}
        </div>
      </div>

      <Canvas elRef={scrollRef} dragHandlers={makeHandlers(scrollRef, drag)} />

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="flex h-[92vh] w-[96vw] max-w-none flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl">
          <DialogTitle className="sr-only">{t("flowChart")}</DialogTitle>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
            <h2 className="font-semibold">{t("flowChart")}</h2>
            <div className="flex flex-wrap items-center gap-4">
              {zoomControls}
              {legend}
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <Canvas
              elRef={expandedScrollRef}
              dragHandlers={makeHandlers(expandedScrollRef, expandedDrag)}
              maxHeight="100%"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const stateDot: Record<GraphNode["state"], string> = {
  completed: "bg-cat-college",
  current: "bg-accent",
  available: "bg-cat-general",
  locked: "bg-muted-foreground/40",
};
