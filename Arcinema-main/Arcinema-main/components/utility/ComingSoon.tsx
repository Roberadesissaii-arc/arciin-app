"use client";

const PARTICLES = [
  { id: 0, x: 12, y: 18, size: 2,   delay: 0   },
  { id: 1, x: 28, y: 72, size: 1.5, delay: 1.3 },
  { id: 2, x: 45, y: 38, size: 2.5, delay: 0.7 },
  { id: 3, x: 60, y: 85, size: 1,   delay: 2.2 },
  { id: 4, x: 75, y: 20, size: 2,   delay: 0.4 },
  { id: 5, x: 88, y: 58, size: 1.5, delay: 1.8 },
  { id: 6, x: 20, y: 50, size: 1,   delay: 2.6 },
  { id: 7, x: 52, y: 10, size: 2,   delay: 1.1 },
  { id: 8, x: 92, y: 30, size: 1.5, delay: 3.2 },
];

export default function ComingSoon() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden select-none"
      style={{ background: "#08080d" }}
    >
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0px) scale(1);     opacity: 0.35; }
          100% { transform: translateY(-18px) scale(1.3); opacity: 0.08; }
        }
      `}</style>

      {/* Purple radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(93,95,239,0.11) 0%, transparent 70%)",
        }}
      />

      {/* Floating particles */}
      {PARTICLES.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${p.x}%`,
            top:  `${p.y}%`,
            width:  p.size,
            height: p.size,
            background: "rgba(129,140,248,0.5)",
            animation: `floatUp 5s ease-in-out ${p.delay}s infinite alternate`,
          }}
        />
      ))}

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg">
        {/* Big gradient text */}
        <div className="relative mb-6" style={{ lineHeight: 1 }}>
          <p
            className="text-[96px] font-black tracking-tighter"
            style={{
              color: "transparent",
              WebkitTextStroke: "1px rgba(255,255,255,0.05)",
              userSelect: "none",
              lineHeight: 1,
            }}
          >
            Soon
          </p>
          <p
            className="absolute inset-0 text-[96px] font-black tracking-tighter"
            style={{
              color: "transparent",
              background:
                "linear-gradient(135deg, #a5b4fc 0%, #5D5FEF 55%, rgba(93,95,239,0.25) 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              userSelect: "none",
              lineHeight: 1,
            }}
          >
            Soon
          </p>
        </div>

        <h1 className="text-[22px] font-bold text-white mb-2 tracking-tight">
          Coming Soon
        </h1>
        <p
          className="text-[14px] leading-relaxed mb-10"
          style={{ color: "rgba(255,255,255,0.38)" }}
        >
          We&apos;re building something great here.
          <br />
          Check back soon for an amazing experience.
        </p>

        <p
          className="mt-6 text-[11px] font-medium uppercase"
          style={{ color: "rgba(255,255,255,0.13)", letterSpacing: "0.25em" }}
        >
          Arcinema
        </p>
      </div>
    </div>
  );
}
