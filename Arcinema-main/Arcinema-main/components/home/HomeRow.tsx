"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MediaItem {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  vote_average: number;
  media_type?: string;
  release_date?: string;
  first_air_date?: string;
}

interface HomeRowProps {
  title: string;
  endpoint: string;
  mediaType: "movie" | "tv" | "anime";
}

export default function HomeRow({ title, endpoint, mediaType }: HomeRowProps) {
  const router = useRouter();
  const rowRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN}`,
          },
        });
        const data = await res.json();
        // Support both TMDB (results) and Jikan (data) response shapes
        const raw: MediaItem[] = data.results ?? data.data ?? [];
        setItems(raw.slice(0, 20));
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [endpoint]);

  const checkScroll = () => {
    const el = rowRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  const scroll = (dir: "left" | "right") => {
    const el = rowRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.75;
    el.scrollBy({ left: dir === "right" ? amount : -amount, behavior: "smooth" });
  };

  const handleClick = (item: MediaItem) => {
    const routeType =
      mediaType === "tv" ? "tv-shows" : mediaType === "anime" ? "anime" : "movies";
    router.push(`/${routeType}/${item.id}`);
  };

  const getLabel = (item: MediaItem) => item.title ?? item.name ?? "";

  if (loading) {
    return (
      <div className="px-4 mb-8">
        <div className="h-5 w-40 rounded bg-white/10 mb-3 animate-pulse" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="shrink-0 w-32 aspect-[2/3] rounded-xl bg-white/5 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="mb-8 group/row">
      {/* Row header */}
      <div className="px-4 mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.75)" }}>
          {title}
        </h2>
        <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
          <button
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            className="p-1 rounded-lg transition-colors disabled:opacity-20"
            style={{ background: "rgba(255,255,255,0.07)" }}
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            className="p-1 rounded-lg transition-colors disabled:opacity-20"
            style={{ background: "rgba(255,255,255,0.07)" }}
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Scrollable row */}
      <div className="relative">
        {/* Left fade */}
        {canScrollLeft && (
          <div
            className="absolute left-0 top-0 bottom-0 w-10 z-10 pointer-events-none"
            style={{
              background: "linear-gradient(to right, #08080d, transparent)",
            }}
          />
        )}
        {/* Right fade */}
        {canScrollRight && (
          <div
            className="absolute right-0 top-0 bottom-0 w-10 z-10 pointer-events-none"
            style={{
              background: "linear-gradient(to left, #08080d, transparent)",
            }}
          />
        )}

        <div
          ref={rowRef}
          onScroll={checkScroll}
          className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-1"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleClick(item)}
              className="relative shrink-0 w-32 aspect-[2/3] rounded-xl overflow-hidden cursor-pointer group/card"
              style={{ scrollSnapAlign: "start" }}
            >
              {item.poster_path ? (
                <Image
                  src={`https://image.tmdb.org/t/p/w300${item.poster_path}`}
                  alt={getLabel(item)}
                  fill
                  className="object-cover transition-transform duration-300 group-hover/card:scale-105"
                  sizes="128px"
                />
              ) : (
                <div
                  className="absolute inset-0 flex items-end p-2"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <span className="text-[10px] text-white/60 line-clamp-3 text-left">
                    {getLabel(item)}
                  </span>
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-200">
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p className="text-[10px] font-medium text-white line-clamp-2 text-left leading-snug">
                    {getLabel(item)}
                  </p>
                  {item.vote_average > 0 && (
                    <p className="text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                      ★ {item.vote_average.toFixed(1)}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
