import { useMemo } from "react";

type Variant = "landing" | "dashboard";

/**
 * Purely decorative animated backdrop.
 * - Soft floating gradient blobs
 * - Faint grid & radial ring
 * - Orbiting dashed rings
 * - Drifting particles (slow, GPU-only)
 *
 * `pointer-events-none` and `aria-hidden` — never blocks UI.
 */
export function AmbientBackdrop({ variant = "landing" }: { variant?: Variant }) {
  const particles = useMemo(
    () =>
      Array.from({ length: variant === "landing" ? 22 : 14 }, (_, i) => {
        const seed = (i + 1) * 137.5;
        const left = (seed * 3.1) % 100;
        const size = 2 + ((seed * 1.3) % 4);
        const dur = 22 + ((seed * 0.7) % 30);
        const delay = (seed * 0.11) % dur;
        const hue = i % 3 === 0 ? "bg-primary/60" : i % 3 === 1 ? "bg-primary/30" : "bg-foreground/20";
        return { left, size, dur, delay, hue, key: i };
      }),
    [variant]
  );

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          color: "hsl(var(--foreground))",
          maskImage: "radial-gradient(circle at 50% 30%, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(circle at 50% 30%, black 30%, transparent 75%)",
        }}
      />

      {/* Blobs */}
      <div className="ambient-blob-a absolute -left-40 top-10 size-[520px] rounded-full bg-primary/15 blur-3xl" />
      <div className="ambient-blob-b absolute right-[-160px] top-[30%] size-[460px] rounded-full bg-primary/10 blur-3xl" />
      <div className="ambient-blob-c absolute bottom-[-200px] left-[20%] size-[600px] rounded-full bg-primary/10 blur-3xl" />

      {/* Orbiting rings (SVG) */}
      <svg
        className="absolute left-1/2 top-[10%] size-[720px] -translate-x-1/2 opacity-25"
        viewBox="0 0 400 400"
        fill="none"
      >
        <g className="ambient-orbit-slow" style={{ transformOrigin: "200px 200px" }}>
          <circle cx="200" cy="200" r="180" stroke="currentColor" strokeWidth="1" className="text-primary ambient-dash" />
        </g>
        <g className="ambient-orbit-reverse" style={{ transformOrigin: "200px 200px" }}>
          <circle cx="200" cy="200" r="140" stroke="currentColor" strokeWidth="1" className="text-foreground ambient-dash" />
        </g>
        <g className="ambient-orbit" style={{ transformOrigin: "200px 200px" }}>
          <circle cx="200" cy="20" r="4" fill="currentColor" className="text-primary" />
          <circle cx="380" cy="200" r="3" fill="currentColor" className="text-primary/70" />
        </g>
      </svg>

      {/* Diagonal sweep line */}
      <div className="absolute inset-y-0 left-0 w-full overflow-hidden">
        <div className="ambient-sweep absolute top-1/3 h-px w-1/2 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      </div>

      {/* Drifting particles */}
      <div className="absolute inset-0">
        {particles.map((p) => (
          <span
            key={p.key}
            className={`absolute rounded-full ${p.hue} shadow-[0_0_14px_currentColor]`}
            style={{
              left: `${p.left}%`,
              bottom: `-10vh`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animation: `kvant-drift ${p.dur}s linear ${p.delay}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
