/**
 * Tiny, dependency-free sound layer for in-app feedback (currently: achievement unlocks).
 * Synthesized with the Web Audio API instead of a shipped audio file — keeps the bundle
 * small and works offline. Respects a per-browser mute preference stored in localStorage.
 */

const STORAGE_KEY = "ghalib.soundEnabled";

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === null ? true : raw === "1";
}

export function setSoundEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
}

let ctx: AudioContext | null = null;
function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
}

/** A short, cheerful two-note rising chime — the "you unlocked something" sound. */
export function playUnlockChime() {
  if (!isSoundEnabled()) return;
  const audio = getContext();
  if (!audio) return;
  if (audio.state === "suspended") void audio.resume();

  const notes: [number, number][] = [
    [0, 587.33], // D5
    [0.09, 880.0], // A5
  ];

  for (const [delay, freq] of notes) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const start = audio.currentTime + delay;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.16, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(start);
    osc.stop(start + 0.4);
  }
}
