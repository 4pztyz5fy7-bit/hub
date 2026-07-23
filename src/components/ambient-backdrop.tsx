type Variant = "landing" | "dashboard";

/**
 * Colorful ambient backdrop with floating gradient orbs, drifting particles
 * and a soft grid. Purely decorative, pointer-events disabled.
 */
export function AmbientBackdrop({ variant = "landing" }: { variant?: Variant }) {
  const isLanding = variant === "landing";

  const particles = Array.from({ length: isLanding ? 18 : 10 });

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base wash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 700px at 12% -10%, hsl(221 90% 60% / 0.18), transparent 60%), radial-gradient(900px 600px at 100% 10%, hsl(280 85% 65% / 0.14), transparent 60%), radial-gradient(900px 700px at 50% 110%, hsl(190 90% 55% / 0.14), transparent 60%)",
        }}
      />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          color: "hsl(var(--foreground))",
          maskImage:
            "radial-gradient(ellipse at 50% 30%, black 0%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at 50% 30%, black 0%, transparent 75%)",
        }}
      />

      {/* Floating gradient blobs */}
      <div
        className="ambient-blob-a absolute -left-24 top-10 h-[420px] w-[420px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, hsl(221 90% 60% / 0.55), transparent 70%)",
        }}
      />
      <div
        className="ambient-blob-b absolute right-[-120px] top-[18%] h-[380px] w-[380px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, hsl(300 85% 65% / 0.45), transparent 70%)",
        }}
      />
      <div
        className="ambient-blob-c absolute left-[35%] top-[55%] h-[460px] w-[460px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, hsl(180 90% 55% / 0.40), transparent 70%)",
        }}
      />
      <div
        className="ambient-blob-a absolute -bottom-40 right-[10%] h-[400px] w-[400px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, hsl(30 95% 60% / 0.35), transparent 70%)",
        }}
      />

      {/* Orbiting rings (thin, decorative) */}
      {isLanding && (
        <>
          <div className="ambient-orbit-slow absolute left-1/2 top-[40%] size-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/10" />
          <div className="ambient-orbit-reverse absolute left-1/2 top-[40%] size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-fuchsia-400/10" />
        </>
      )}

      {/* Drifting particles */}
      {particles.map((_, i) => {
        const left = (i * 53) % 100;
        const size = 4 + ((i * 7) % 8);
        const duration = 18 + ((i * 5) % 22);
        const delay = (i * 1.7) % 20;
        const hue = [221, 280, 190, 320, 160, 40][i % 6];
        return (
          <span
            key={i}
            className="absolute bottom-[-20px] rounded-full blur-[1px]"
            style={{
              left: `${left}%`,
              width: size,
              height: size,
              background: `hsl(${hue} 90% 65% / 0.7)`,
              boxShadow: `0 0 12px hsl(${hue} 90% 65% / 0.6)`,
              animation: `kvant-drift ${duration}s linear ${delay}s infinite`,
            }}
          />
        );
      })}

      {/* Sweeping highlight line */}
      <div className="absolute inset-x-0 top-[42%] h-px overflow-hidden">
        <div
          className="ambient-sweep h-px w-1/3"
          style={{
            background:
              "linear-gradient(to right, transparent, hsl(221 90% 60% / 0.6), transparent)",
          }}
        />
      </div>
    </div>
  );
}
