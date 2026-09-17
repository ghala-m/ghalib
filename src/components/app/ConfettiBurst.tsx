import { useEffect, useRef, useState } from "react";

/**
 * A short confetti burst rendered as plain absolutely-positioned divs animated by CSS
 * (`.confetti-piece` / `confetti-fall` in styles.css) — deliberately not a canvas library, so
 * this can never fail the way loading an external effects package from a CDN could (see
 * export-pdf.ts for the same reasoning applied to PDF export). It respects
 * `prefers-reduced-motion` automatically via the CSS media query.
 *
 * Usage: bump a counter prop every time you want a burst —
 *   const [burst, setBurst] = useState(0);
 *   ...
 *   <ConfettiBurst trigger={burst} />
 *   // later, on the celebratory event:
 *   setBurst((n) => n + 1);
 */
const COLORS = [
  "var(--accent)",
  "var(--cat-major)",
  "var(--cat-college)",
  "var(--success, var(--accent))",
  "var(--warning, var(--accent))",
];
const PIECE_COUNT = 26;

type Piece = {
  id: number;
  style: React.CSSProperties;
};

function makeBurst(seed: number): Piece[] {
  return Array.from({ length: PIECE_COUNT }, (_, i) => {
    const drift = Math.round((Math.random() - 0.5) * 160); // px, left/right scatter
    const fall = 90 + Math.round(Math.random() * 60); // % of container height
    const duration = 700 + Math.round(Math.random() * 500); // ms
    const delay = Math.round(Math.random() * 120); // ms, staggers the burst
    const spin = Math.round(180 + Math.random() * 540); // deg
    return {
      id: seed * 1000 + i,
      style: {
        "--confetti-x": `${Math.round(Math.random() * 100)}%`,
        "--confetti-color": COLORS[i % COLORS.length],
        "--confetti-drift": `${drift}px`,
        "--confetti-fall": `${fall}%`,
        "--confetti-duration": `${duration}ms`,
        "--confetti-delay": `${delay}ms`,
        "--confetti-spin": `${spin}deg`,
      } as React.CSSProperties,
    };
  });
}

/** `trigger`: increment this number to fire a new burst. `className`: sizes/positions the overlay. */
export function ConfettiBurst({ trigger, className }: { trigger: number; className?: string }) {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTrigger = useRef(trigger);

  useEffect(() => {
    if (trigger === lastTrigger.current || trigger <= 0) {
      lastTrigger.current = trigger;
      return;
    }
    lastTrigger.current = trigger;
    setPieces(makeBurst(trigger));
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setPieces([]), 1500);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [trigger]);

  if (!pieces.length) return null;

  return (
    <div
      className={className ?? "pointer-events-none absolute inset-0 overflow-hidden"}
      aria-hidden="true"
    >
      {pieces.map((p) => (
        <span key={p.id} className="confetti-piece" style={p.style} />
      ))}
    </div>
  );
}
