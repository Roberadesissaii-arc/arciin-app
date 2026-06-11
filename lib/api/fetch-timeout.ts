/** Fail fast when the Arciin API is down so the UI does not spin forever. */
export function withFetchTimeout<T>(
  promise: Promise<T>,
  ms = 8_000,
  message = "Request timed out. Is the Arciin API running on port 4000?",
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms)
    promise
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch((err) => {
        clearTimeout(timer)
        reject(err)
      })
  })
}

export function defaultApiSignal(ms = 8_000): AbortSignal {
  return AbortSignal.timeout(ms)
}
