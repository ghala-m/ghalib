import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { playTickChime, playUnlockChime } from "@/lib/sound";
import { ConfettiBurst } from "@/components/app/ConfettiBurst";

export type Flashcard = { q: string; a: string };

export function FlashcardsViewer({ cards }: { cards: Flashcard[] }) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [burst, setBurst] = useState(0);
  const reachedEnd = useRef(false);
  const card = cards[index];

  const go = (dir: 1 | -1) => {
    setFlipped(false);
    setIndex((i) => Math.min(cards.length - 1, Math.max(0, i + dir)));
  };

  // Celebrate reaching the last card of the deck (once per mount) — a small nudge that the
  // review session is done, instead of the deck just... stopping.
  useEffect(() => {
    if (cards.length > 1 && index === cards.length - 1 && !reachedEnd.current) {
      reachedEnd.current = true;
      playUnlockChime();
      setBurst((n) => n + 1);
    }
  }, [index, cards.length]);

  return (
    <div className="relative mx-auto max-w-lg">
      <ConfettiBurst trigger={burst} className="pointer-events-none absolute inset-0 z-10" />
      <p className="mb-2 text-center text-xs text-muted-foreground">
        {index + 1} / {cards.length}
      </p>
      <button
        type="button"
        onClick={() => {
          setFlipped((f) => !f);
          playTickChime();
        }}
        className="flex min-h-48 w-full items-center justify-center rounded-2xl border border-border bg-muted/30 p-6 text-center transition-colors hover:border-accent/50"
      >
        <p className="text-base font-medium">{flipped ? card?.a : card?.q}</p>
      </button>
      <p className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
        <RotateCw className="size-3" />
        {t("flipCard")}
      </p>
      <div className="mt-4 flex items-center justify-center gap-3">
        <Button
          variant="outline"
          size="icon"
          aria-label={t("prev")}
          disabled={index === 0}
          onClick={() => go(-1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label={t("next")}
          disabled={index === cards.length - 1}
          onClick={() => go(1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
