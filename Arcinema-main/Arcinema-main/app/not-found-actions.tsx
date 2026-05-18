"use client";

import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";

export function NotFoundActions() {
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/"
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-opacity hover:opacity-85"
        style={{ background: "#5D5FEF" }}
      >
        <Home className="w-4 h-4" />
        Go Home
      </Link>
      <button
        type="button"
        onClick={() => history.back()}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-opacity hover:opacity-85"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.09)",
          color: "rgba(255,255,255,0.6)",
        }}
      >
        <ArrowLeft className="w-4 h-4" />
        Go Back
      </button>
    </div>
  );
}
