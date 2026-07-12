/** Known source keys with SVG logos under /assets/icons/sources/ (ported from desktop). */
const SOURCE_ICON_FILES: Record<string, string> = {
  youtube: "youtube.svg",
  tiktok: "tiktok.svg",
  linkedin: "linkedin.svg",
  pinterest: "pinterest.svg",
  amazon: "amazon.svg",
  walmart: "walmart.svg",
  pexels: "pexels.svg",
  facebook: "facebook.svg",
  instagram: "instagram.svg",
  spotify: "spotify.svg",
  github: "github.svg",
}

/** Logos with white/monochrome fills need a dark tile so they stay visible. */
const DARK_ICON_TILE_SOURCES = new Set(["tiktok", "x", "github", "spotify"])

/** Full-color logos that should sit on a white tile (not a dark badge). */
const LIGHT_TILE_SOURCES = new Set(["instagram", "youtube", "pinterest", "facebook", "linkedin"])

/** Public URL for a source brand icon, or null when only a mark is available. */
export function sourceBrandIconSrc(sourceKey: string): string | null {
  const file = SOURCE_ICON_FILES[sourceKey]
  return file ? `/assets/icons/sources/${file}` : null
}

export function sourceBrandHasIcon(sourceKey: string): boolean {
  return sourceKey in SOURCE_ICON_FILES
}

/** Background for the icon tile when an SVG logo is shown. */
export function sourceBrandIconTileBg(sourceKey: string): string {
  if (DARK_ICON_TILE_SOURCES.has(sourceKey)) return "#000000"
  if (LIGHT_TILE_SOURCES.has(sourceKey)) return "#ffffff"
  return "#ffffff"
}

/** Short brand mark fallback when no SVG logo exists. */
export function brandMarkForSource(key: string): string {
  const marks: Record<string, string> = {
    youtube: "YT",
    vimeo: "VM",
    tiktok: "TT",
    instagram: "IG",
    pinterest: "PI",
    linkedin: "IN",
    facebook: "FB",
    x: "X",
    amazon: "A",
    walmart: "W",
    target: "T",
    etsy: "E",
    ebay: "EB",
    spotify: "SP",
    soundcloud: "SC",
    github: "GH",
    reddit: "R",
    twitch: "TW",
    unsplash: "U",
    pexels: "PX",
    imgur: "IM",
    flickr: "FL",
    giphy: "GF",
    dailymotion: "DM",
    aliexpress: "AE",
    dribbble: "DR",
    behance: "BE",
    tumblr: "TB",
  }
  return marks[key] ?? key.slice(0, 2).toUpperCase()
}
