/** Matches `formatApiError` / `networkErrorMessage` offline copy. */
export function isConnectionUnreachableMessage(error: string | null | undefined): boolean {
  if (!error) return false
  return /could not reach/i.test(error)
}

/**
 * Hide per-page fetch errors when the shell offline banner should own the UX.
 */
export function suppressFetchErrorWhenOffline(
  serverReachable: boolean | null,
  error: string | null,
): string | null {
  if (!error) return null
  if (serverReachable === false) return null
  if (serverReachable !== true && isConnectionUnreachableMessage(error)) return null
  if (isConnectionUnreachableMessage(error)) return null
  return error
}

/** Whether a page should render its own red inline alert (not shell offline). */
export function shouldShowPageFetchError(
  serverReachable: boolean | null,
  error: string | null,
): boolean {
  return suppressFetchErrorWhenOffline(serverReachable, error) !== null
}
