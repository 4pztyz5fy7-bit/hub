type Variant = "landing" | "dashboard";

/**
 * Restrained editorial backdrop.
 * - Very faint blueprint grid, masked into the top portion of the viewport.
 * - Thin single horizontal rule (like a printed page).
 * No blobs, no orbits, no particles, no glowing dots.
 */
export function AmbientBackdrop({ variant: _variant = "landing" }: { variant?: Variant }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          color: "hsl(var(--foreground))",
          maskImage: "linear-gradient(to bottom, black 0%, transparent 60%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 60%)",
        }}
      />
      <div className="absolute inset-x-0 top-[42%] h-px bg-border/60" />
    </div>
  );
}
