// components/layout/Footer.tsx
"use client";

const Footer = () => (
  <footer
    className="border-t py-3 px-6 flex items-center justify-between"
    style={{
      borderColor: "rgba(255,255,255,0.06)",
      background: "#08080d",
    }}
  >
    <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>
      © 2025 Arcinema
    </span>
    <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>
      Powered by TMDB
    </span>
  </footer>
);

export default Footer;
