import type { ReactNode } from "react";
import {
  Bell,
  Download,
  EllipsisVertical,
  Maximize2,
  PlusSquare,
  Share,
  Sparkles,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** The real app icon, so the artwork matches what ends up on the home screen. */
function AppIcon({ className }: { className?: string }) {
  return (
    <img
      src="/icon-192.png"
      alt=""
      aria-hidden="true"
      draggable={false}
      className={cn("rounded-[22%] shadow-sm", className)}
    />
  );
}

/**
 * A phone with the Ghalib icon landing on its home screen. All colours come from theme tokens,
 * so it follows the accent colour chosen in Settings. Purely decorative (aria-hidden).
 */
export function PhoneIllustration({ size = "lg" }: { size?: "sm" | "lg" }) {
  const big = size === "lg";
  return (
    <div
      aria-hidden="true"
      className={cn("relative shrink-0", big ? "h-44 w-32" : "h-24 w-[4.5rem]")}
      dir="ltr"
    >
      {/* soft glow behind the phone */}
      <div className="absolute inset-0 -z-10 scale-125 rounded-full bg-accent/25 blur-2xl" />

      <div
        className={cn(
          "relative h-full w-full overflow-hidden border-foreground/80 bg-background shadow-xl",
          big ? "rounded-[1.6rem] border-[5px]" : "rounded-2xl border-[3px]",
        )}
      >
        {/* notch */}
        <div
          className={cn(
            "absolute left-1/2 top-1 -translate-x-1/2 rounded-full bg-foreground/80",
            big ? "h-1.5 w-10" : "h-1 w-6",
          )}
        />
        {/* a faded grid of other apps, with Ghalib as the highlighted one */}
        <div
          className={cn(
            "grid grid-cols-3 px-2",
            big ? "mt-9 gap-x-2 gap-y-3.5" : "mt-5 gap-x-1.5 gap-y-2",
          )}
        >
          {Array.from({ length: 6 }).map((_, i) =>
            i === 4 ? (
              <div key={i} className="relative">
                <span className="absolute inset-0 rounded-[22%] bg-accent/60 motion-safe:animate-ping" />
                <AppIcon className="relative aspect-square w-full ring-2 ring-accent" />
              </div>
            ) : (
              <div key={i} className="aspect-square rounded-[22%] bg-muted" />
            ),
          )}
        </div>
        {/* dock */}
        <div
          className={cn(
            "absolute inset-x-1.5 flex justify-around rounded-xl bg-muted/80",
            big ? "bottom-1.5 p-1.5" : "bottom-1 p-1",
          )}
        >
          {[0, 1, 2].map((i) => (
            <div key={i} className="aspect-square w-[22%] rounded-[22%] bg-foreground/10" />
          ))}
        </div>
      </div>

      <Sparkles
        className={cn(
          "absolute text-accent motion-safe:animate-pulse",
          big ? "-right-3 -top-2 size-6" : "-right-2 -top-1.5 size-4",
        )}
      />
      {big ? <Sparkles className="absolute -left-3 bottom-10 size-4 text-accent/70" /> : null}
    </div>
  );
}

/** Three short benefits shown under the install blurb. */
export function InstallPerks({ items }: { items: [string, string, string] }) {
  const icons = [Zap, Maximize2, Bell];
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {items.map((label, i) => {
        const Icon = icons[i]!;
        return (
          <li
            key={label}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium"
          >
            <Icon className="size-3.5 text-accent" />
            {label}
          </li>
        );
      })}
    </ul>
  );
}

/* ---------- Mini screens for the how-to steps ---------- */

const Pulse = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span className={cn("relative inline-flex", className)}>
    <span className="absolute -inset-1.5 rounded-full bg-accent/40 motion-safe:animate-ping" />
    <span className="relative inline-flex rounded-full bg-accent p-1.5 text-accent-foreground">
      {children}
    </span>
  </span>
);

const Frame = ({ children }: { children: ReactNode }) => (
  <div
    aria-hidden="true"
    dir="ltr"
    className="relative h-28 w-full overflow-hidden rounded-xl border bg-muted/50"
  >
    {children}
  </div>
);

const Line = ({ w }: { w: string }) => (
  <span className={cn("h-2 rounded-full bg-foreground/10", w)} />
);

export type StepKind = "ios-share" | "ios-add" | "ios-confirm" | "menu" | "install";

/** Tiny stylised screenshots (no real UI text, so they stay correct in both languages). */
export function StepIllustration({ kind, label }: { kind: StepKind; label?: string }) {
  switch (kind) {
    case "ios-share":
      return (
        <Frame>
          <div className="mx-auto mt-3 flex h-6 w-3/4 items-center justify-center rounded-full bg-background shadow-sm">
            <Line w="w-1/2" />
          </div>
          <div className="absolute inset-x-0 bottom-0 flex h-11 items-center justify-around border-t bg-background/90 px-4">
            <span className="size-4 rounded bg-foreground/10" />
            <span className="size-4 rounded bg-foreground/10" />
            <Pulse>
              <Share className="size-4" />
            </Pulse>
            <span className="size-4 rounded bg-foreground/10" />
            <span className="size-4 rounded bg-foreground/10" />
          </div>
        </Frame>
      );
    case "ios-add":
      return (
        <Frame>
          <div className="absolute inset-x-3 bottom-0 top-3 space-y-1.5 rounded-t-2xl bg-background p-2.5 shadow">
            <div className="flex items-center justify-between rounded-lg bg-muted/70 px-2.5 py-1.5">
              <Line w="w-16" />
              <span className="size-3.5 rounded bg-foreground/10" />
            </div>
            <div className="flex items-center justify-between rounded-lg bg-accent/20 px-2.5 py-1.5 ring-2 ring-accent">
              <span className="text-[11px] font-semibold">{label}</span>
              <PlusSquare className="size-4 text-accent" />
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/70 px-2.5 py-1.5">
              <Line w="w-20" />
              <span className="size-3.5 rounded bg-foreground/10" />
            </div>
          </div>
        </Frame>
      );
    case "ios-confirm":
      return (
        <Frame>
          <div className="absolute inset-x-3 top-3 rounded-2xl bg-background p-2.5 shadow">
            <div className="mb-2 flex items-center justify-between">
              <Line w="w-10" />
              <span className="relative inline-flex">
                <span className="absolute -inset-1 rounded-full bg-accent/40 motion-safe:animate-ping" />
                <span className="relative rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-bold text-accent-foreground">
                  {label}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <AppIcon className="size-10" />
              <div className="flex-1 space-y-1.5">
                <span className="block h-2.5 w-20 rounded-full bg-foreground/30" />
                <Line w="w-28" />
              </div>
            </div>
          </div>
        </Frame>
      );
    case "menu":
      return (
        <Frame>
          <div className="flex h-9 items-center gap-2 border-b bg-background/90 px-3">
            <div className="flex h-5 flex-1 items-center justify-center rounded-full bg-muted">
              <Line w="w-1/2" />
            </div>
            <Pulse>
              <EllipsisVertical className="size-4" />
            </Pulse>
          </div>
          <div className="mx-auto mt-3 w-3/4 space-y-2">
            <Line w="w-full" />
            <Line w="w-2/3" />
          </div>
        </Frame>
      );
    case "install":
      return (
        <Frame>
          <div className="absolute end-3 top-2 w-3/4 space-y-1 rounded-xl bg-background p-2 shadow-lg">
            <div className="rounded-md px-2 py-1">
              <Line w="w-16" />
            </div>
            <div className="flex items-center justify-between rounded-md bg-accent/20 px-2 py-1.5 ring-2 ring-accent">
              <span className="text-[11px] font-semibold">{label}</span>
              <Download className="size-4 text-accent" />
            </div>
            <div className="rounded-md px-2 py-1">
              <Line w="w-20" />
            </div>
          </div>
        </Frame>
      );
  }
}
