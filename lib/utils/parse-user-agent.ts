import { Laptop, Smartphone, Tablet, type LucideIcon } from "lucide-react"

export function parseUserAgent(ua: string | null): { label: string; DeviceIcon: LucideIcon } {
  if (!ua) return { label: "Unknown device", DeviceIcon: Laptop }
  const l = ua.toLowerCase()
  const isTablet = /ipad|tablet/.test(l)
  const isMobile = /mobile|android|iphone/.test(l) && !isTablet
  const DeviceIcon = isTablet ? Tablet : isMobile ? Smartphone : Laptop

  let browser = "Unknown"
  if (/edg\/|edghtml/.test(l)) browser = "Edge"
  else if (/opr\/|opera/.test(l)) browser = "Opera"
  else if (/firefox|fxios/.test(l)) browser = "Firefox"
  else if (/chrome|crios/.test(l)) browser = "Chrome"
  else if (/safari/.test(l)) browser = "Safari"

  let os = "Unknown"
  if (/iphone/.test(l)) os = "iOS"
  else if (/ipad/.test(l)) os = "iPadOS"
  else if (/android/.test(l)) os = "Android"
  else if (/mac os x|macos/.test(l)) os = "macOS"
  else if (/windows/.test(l)) os = "Windows"
  else if (/linux/.test(l)) os = "Linux"

  return { label: `${browser} on ${os}`, DeviceIcon }
}
