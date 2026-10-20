import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Shuffle,
  Trophy,
  X,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { playTickChime, playUnlockChime } from "@/lib/sound";
import { ConfettiBurst } from "@/components/app/ConfettiBurst";
import { CARD_GRADIENTS } from "@/lib/study-theme";
import { cn } from "@/lib/utils";

export type Flashcard = { q: string; a: string };

const COPY = {
  ar: {
    question: "السؤال",
    answer: "الجواب",
    tap: "اضغط على البطاقة لقلبها",
    known: "عرفتها",
    again: "أعيدها لاحقاً",
    shuffle: "خلط البطاقات",
    restart: "من البداية",
    reviewMissed: "راجع ما لم أعرفه",
    doneTitle: "أنهيت المجموعة!",
    doneGreat: "ممتاز! أنت متمكّن من هذه المادة.",
    doneGood: "جيد جداً — كرّر القليل المتبقي وتثبت.",
    doneKeep: "بداية جيدة. راجع البطاقات الصعبة مرة ثانية.",
    knownCount: "عرفتها",
    reviewCount: "للمراجعة",
    of: "من",
    cardWord: "بطاقة",
  },
  en: {
    question: "Question",
    answer: "Answer",
    tap: "Tap the card to flip it",
    known: "Got it",
    again: "Review again",
    shuffle: "Shuffle",
    restart: "Restart",
    reviewMissed: "Review the ones I missed",
    doneTitle: "Deck finished!",
    doneGreat: "Excellent! You've got this material down.",
    doneGood: "Very good — repeat the few left and it'll stick.",
    doneKeep: "A good start. Go through the tricky cards once more.",
    knownCount: "Got it",
    reviewCount: "To review",
    of: "of",
    cardWord: "Card",
  },
} as const;

function shuffled(n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function textSize(text: string | undefined) {
  const len = text?.length ?? 0;
  if (len > 260) return "text-sm sm:text-base";
  if (len > 140) return "text-base sm:text-lg";
  if (len > 60) return "text-lg sm:text-xl";
  return "text-xl sm:text-2xl";
}

export function FlashcardsViewer({ cards }: { cards: Flashcard[] }) {
  const { lang } = useI18n();
  const c = COPY[lang];
  const [order, setOrder] = useState<number[]>(() => cards.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());
  const [missed, setMissed] = useState<Set<number>>(new Set());
  const [finished, setFinished] = useState(false);
  const [burst, setBurst] = useState(0);
  const celebrated = useRef(false);

  // A different deck (e.g. opening another saved set) starts fresh.
  useEffect(() => {
    setOrder(cards.map((_, i) => i));
    setPos(0);
    setFlipped(false);
    setKnown(new Set());
    setMissed(new Set());
    setFinished(false);
    celebrated.current = false;
  }, [cards]);

  const total = order.length;
  const cardIndex = order[pos] ?? 0;
  const card = cards[cardIndex];
  const gradient = CARD_GRADIENTS[cardIndex % CARD_GRADIENTS.length];
  const decided = known.size + missed.size;
  const progress = total ? Math.round(((finished ? total : pos) / total) * 100) : 0;
  const pct = total ? Math.round((known.size / Math.max(1, cards.length)) * 100) : 0;

  const go = (dir: 1 | -1) => {
    setFlipped(false);
    setPos((p) => Math.min(total - 1, Math.max(0, p + dir)));
  };

  const rate = (didKnow: boolean) => {
    setKnown((s) => {
      const n = new Set(s);
      if (didKnow) n.add(cardIndex);
      else n.delete(cardIndex);
      return n;
    });
    setMissed((s) => {
      const n = new Set(s);
      if (didKnow) n.delete(cardIndex);
      else n.add(cardIndex);
      return n;
    });
    setFlipped(false);
    if (pos >= total - 1) setFinished(true);
    else setPos((p) => p + 1);
  };

  const restart = (indices?: number[]) => {
    setOrder(indices ?? cards.map((_, i) => i));
    setPos(0);
    setFlipped(false);
    setFinished(false);
    if (!indices) {
      setKnown(new Set());
      setMissed(new Set());
      celebrated.current = false;
    }
  };

  useEffect(() => {
    if (finished && !celebrated.current) {
      celebrated.current = true;
      if (pct >= 70) playUnlockChime();
      else playTickChime();
      setBurst((n) => n + 1);
    }
  }, [finished, pct]);

  const ring = useMemo(() => {
    const r = 52;
    const circ = 2 * Math.PI * r;
    return { r, circ, offset: circ - (pct / 100) * circ };
  }, [pct]);

  if (!cards.length) return null;

  if (finished) {
    const message = pct >= 80 ? c.doneGreat : pct >= 50 ? c.doneGood : c.doneKeep;
    return (
      <div className="relative mx-auto max-w-lg">
        <ConfettiBurst trigger={burst} className="pointer-events-none absolute inset-0 z-10" />
        <div className="study-pop overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-card to-rose-500/10 p-6 text-center shadow-lg">
          <Trophy className="mx-auto size-8 text-amber-500" />
          <h3 className="mt-2 font-display text-xl font-bold">{c.doneTitle}</h3>
          <div className="relative mx-auto mt-4 size-36">
            <svg viewBox="0 0 120 120" className="size-full -rotate-90">
              <circle
                cx="60"
                cy="60"
                r={ring.r}
                fill="none"
                strokeWidth="10"
                className="stroke-muted"
              />
              <circle
                cx="60"
                cy="60"
                r={ring.r}
                fill="none"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={ring.circ}
                strokeDashoffset={ring.offset}
                className="stroke-emerald-500 transition-[stroke-dashoffset] duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold tabular-nums">{pct}%</span>
              <span className="text-[11px] text-muted-foreground">
                {known.size} {c.of} {cards.length}
              </span>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{message}</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {missed.size > 0 && (
              <Button
                className="bg-gradient-to-br from-rose-500 to-pink-600 text-white hover:opacity-90"
                onClick={() => restart([...missed])}
              >
                <RefreshCw className="size-4" />
                {c.reviewMissed} ({missed.size})
              </Button>
            )}
            <Button variant="outline" onClick={() => restart()}>
              <RotateCcw className="size-4" />
              {c.restart}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-lg">
      <ConfettiBurst trigger={burst} className="pointer-events-none absolute inset-0 z-10" />

      {/* progress + counters */}
      <div className="mb-3">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-semibold tabular-nums">
            {c.cardWord} {pos + 1} / {total}
          </span>
          <span className="flex items-center gap-3 tabular-nums">
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Check className="size-3.5" />
              {known.size}
            </span>
            <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
              <X className="size-3.5" />
              {missed.size}
            </span>
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 transition-all duration-500"
            style={{ width: `${Math.max(progress, 4)}%` }}
          />
        </div>
      </div>

      {/* the card */}
      <div className="flashcard-scene">
        <button
          type="button"
          aria-label={flipped ? c.question : c.answer}
          onClick={() => {
            setFlipped((f) => !f);
            playTickChime();
          }}
          className="relative block h-72 w-full cursor-pointer text-start outline-none focus-visible:ring-2 focus-visible:ring-accent sm:h-80"
        >
          <div className="flashcard-3d absolute inset-0" data-flipped={flipped}>
            {/* front: question */}
            <div
              className={cn(
                "flashcard-face-3d absolute inset-0 flex flex-col overflow-hidden rounded-3xl bg-gradient-to-br p-6 text-white shadow-xl",
                gradient,
              )}
            >
              <span className="absolute -end-10 -top-10 size-40 rounded-full bg-white/10" />
              <span className="absolute -bottom-12 -start-8 size-36 rounded-full bg-white/10" />
              <span className="relative z-10 inline-flex w-fit items-center rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur">
                ? {c.question}
              </span>
              <div className="relative z-10 flex flex-1 items-center justify-center overflow-y-auto py-3 text-center">
                <p className={cn("font-bold leading-relaxed text-balance", textSize(card?.q))}>
                  {card?.q}
                </p>
              </div>
              <span className="relative z-10 flex items-center justify-center gap-1 text-xs text-white/80">
                <RotateCw className="size-3" />
                {c.tap}
              </span>
            </div>
            {/* back: answer */}
            <div className="flashcard-face-3d flashcard-back-3d absolute inset-0 flex flex-col overflow-hidden rounded-3xl border-2 border-emerald-500/50 bg-card p-6 shadow-xl">
              <span className="absolute -end-10 -top-10 size-40 rounded-full bg-emerald-500/10" />
              <span className="relative z-10 inline-flex w-fit items-center rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-300">
                ✓ {c.answer}
              </span>
              <div className="relative z-10 flex flex-1 items-center justify-center overflow-y-auto py-3 text-center">
                <p className={cn("font-semibold leading-relaxed text-balance", textSize(card?.a))}>
                  {card?.a}
                </p>
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* actions */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button
          size="lg"
          variant="outline"
          disabled={!flipped}
          onClick={() => rate(false)}
          className="h-12 rounded-2xl border-rose-500/40 text-rose-600 hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-40 dark:text-rose-300"
        >
          <X className="size-4" />
          {c.again}
        </Button>
        <Button
          size="lg"
          disabled={!flipped}
          onClick={() => rate(true)}
          className="h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md hover:opacity-90 disabled:opacity-40"
        >
          <Check className="size-4" />
          {c.known}
        </Button>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          disabled={pos === 0}
          onClick={() => go(-1)}
          aria-label="prev"
        >
          <ChevronRight className="size-4 ltr:hidden" />
          <ChevronLeft className="size-4 rtl:hidden" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setOrder(shuffled(cards.length));
            setPos(0);
            setFlipped(false);
          }}
        >
          <Shuffle className="size-4" />
          {c.shuffle}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => restart()}>
          <RotateCcw className="size-4" />
          {c.restart}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={pos >= total - 1}
          onClick={() => go(1)}
          aria-label="next"
        >
          <ChevronLeft className="size-4 ltr:hidden" />
          <ChevronRight className="size-4 rtl:hidden" />
        </Button>
      </div>
      {decided > 0 && <span className="sr-only">{decided}</span>}
    </div>
  );
}
