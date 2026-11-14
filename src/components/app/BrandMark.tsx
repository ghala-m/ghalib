/** The Ghalib logo (a rounded ghayn with its own dot). One place so every screen stays in sync. */
export function BrandMark({ className = "size-9" }: { className?: string }) {
  return <img src="/logo.png" alt="" aria-hidden="true" draggable={false} className={`${className} shrink-0 select-none`} />;
}
