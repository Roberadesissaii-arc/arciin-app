import { NotFoundActions } from "./not-found-actions";

const PARTICLES = [
  { id: 0, x: 8, y: 12, size: 2, delay: 0 },
  { id: 1, x: 22, y: 78, size: 1.5, delay: 1.2 },
  { id: 2, x: 38, y: 33, size: 2.5, delay: 0.6 },
  { id: 3, x: 55, y: 88, size: 1, delay: 2.1 },
  { id: 4, x: 67, y: 22, size: 2, delay: 0.3 },
  { id: 5, x: 80, y: 61, size: 1.5, delay: 1.7 },
  { id: 6, x: 92, y: 44, size: 2, delay: 0.9 },
  { id: 7, x: 14, y: 55, size: 1, delay: 2.5 },
  { id: 8, x: 47, y: 6, size: 2.5, delay: 1.4 },
  { id: 9, x: 73, y: 91, size: 1.5, delay: 0.7 },
  { id: 10, x: 30, y: 70, size: 1, delay: 3.1 },
  { id: 11, x: 85, y: 15, size: 2, delay: 1.9 },
  { id: 12, x: 5, y: 40, size: 1.5, delay: 2.8 },
  { id: 13, x: 60, y: 50, size: 1, delay: 0.4 },
  { id: 14, x: 42, y: 95, size: 2, delay: 1.1 },
  { id: 15, x: 95, y: 72, size: 1.5, delay: 3.5 },
];

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden select-none"
      style={{ background: "#08080d" }}
    >
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0px) scale(1);   opacity: 0.35; }
          100% { transform: translateY(-20px) scale(1.4); opacity: 0.08; }
        }
      `}</style>

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(93,95,239,0.11) 0%, transparent 70%)",
        }}
      />

      {PARTICLES.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: "rgba(129,140,248,0.5)",
            animation: `floatUp 5s ease-in-out ${p.delay}s infinite alternate`,
          }}
        />
      ))}

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg">
        <div className="relative mb-4" style={{ lineHeight: 1 }}>
          <p
            className="text-[120px] font-black tracking-tighter"
            style={{
              color: "transparent",
              WebkitTextStroke: "1px rgba(255,255,255,0.06)",
              userSelect: "none",
              lineHeight: 1,
            }}
          >
            404
          </p>
          <p
            className="absolute inset-0 text-[120px] font-black tracking-tighter"
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
            404
          </p>
        </div>

        <h1 className="text-[22px] font-bold text-white mb-2 tracking-tight">
          Page not found
        </h1>
        <p
          className="text-[14px] leading-relaxed mb-10"
          style={{ color: "rgba(255,255,255,0.38)" }}
        >
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          <br />
          Head back to the dashboard to keep going.
        </p>

        <NotFoundActions />

        <p
          className="mt-14 text-[11px] font-medium uppercase"
          style={{ color: "rgba(255,255,255,0.13)", letterSpacing: "0.25em" }}
        >
          Arcinema
        </p>
      </div>
    </div>
  );
}
