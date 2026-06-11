/** Routes reached from Profile settings — highlight Profile in the bottom nav. */
const PROFILE_NAV_PREFIXES = ["/profile", "/database"] as const

export function isBottomNavActive(pathname: string, href: string): boolean {
  if (href === "/home") return pathname === "/home"
  if (href === "/profile") {
    return PROFILE_NAV_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}
