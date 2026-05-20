/** Hide per-page fetch errors when the shell already shows the offline banner. */
export function suppressFetchErrorWhenOffline(
  serverReachable: boolean | null,
  error: string | null,
): string | null {
  if (!error) return null
  if (serverReachable === false) return null
  return error
}
