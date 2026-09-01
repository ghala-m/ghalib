import { useState } from "react";
import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export type Flashcard = { q: string; a: string };

export function FlashcardsViewer({ cards }: { cards: Flashcard[] }) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[index];

  const go = (dir: 1 | -1) => {
    setFlipped(false);
    setIndex((i) => Math.min(cards.length - 1, Math.max(0, i + dir)));
  };

  return (
    <div className="mx-auto max-w-lg">
      <p className="mb-2 text-center text-xs text-muted-foreground">
        {index + 1} / {cards.length}
      </p>
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="flex min-h-48 w-full items-center justify-center rounded-2xl border border-border bg-muted/30 p-6 text-center transition-colors hover:border-accent/50"
      >
        <p className="text-base font-medium">{flipped ? card.a : card.q}</p>
      </button>
      <p className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
        <RotateCw className="size-3" />
        {t("flipCard")}
      </p>
      <div className="mt-4 flex items-center justify-center gap-3">
        <Button variant="outline" size="icon" disabled={index === 0} onClick={() => go(-1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <Button variant="outline" size="icon" disabled={index === cards.length - 1} onClick={() => go(1)}>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
