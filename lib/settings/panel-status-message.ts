export type PanelStatusMessage = {
  title: string
  detail?: string
}

/** Map a short settings toast string to compact banner title + detail. */
export function panelStatusFromText(text: string): PanelStatusMessage {
  const clean = text.replace(/\.$/, "").trim()
  const colon = clean.indexOf(": ")
  if (colon >= 0) {
    return { title: clean.slice(0, colon), detail: clean.slice(colon + 2) }
  }
  const dash = clean.indexOf(" — ")
  if (dash >= 0) {
    return { title: clean.slice(0, dash), detail: clean.slice(dash + 3) }
  }
  return { title: clean }
}
