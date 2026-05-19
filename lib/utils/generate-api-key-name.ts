const ADJ = [
  "fast",
  "secure",
  "silent",
  "remote",
  "global",
  "local",
  "private",
  "direct",
  "smart",
  "live",
  "sharp",
  "clean",
] as const

const NOUN = [
  "token",
  "agent",
  "runner",
  "hook",
  "client",
  "bridge",
  "relay",
  "probe",
  "sync",
  "worker",
  "pipe",
  "key",
] as const

/** Same adjective–noun pattern as desktop Arciin. */
export function generateApiKeyName(): string {
  const adj = ADJ[Math.floor(Math.random() * ADJ.length)]
  const noun = NOUN[Math.floor(Math.random() * NOUN.length)]
  return `${adj}-${noun}`
}
