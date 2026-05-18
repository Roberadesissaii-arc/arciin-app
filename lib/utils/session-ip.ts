const IPV4 =
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/

export function formatSessionIp(ip: string | null | undefined): string {
  if (!ip?.trim()) return "IP unavailable"
  const trimmed = ip.trim()
  if (IPV4.test(trimmed) || trimmed.includes(":")) return trimmed
  return "IP unavailable"
}
