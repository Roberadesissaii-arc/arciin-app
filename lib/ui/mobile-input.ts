/**
 * Shared mobile form control classes.
 * Keep at 16px — iOS Safari zooms on focus when font-size is smaller (see globals.css).
 */
export const mobileInputClass =
  "w-full rounded-xl border border-[#e5e5e5] bg-[#f7f7f7] px-3 py-2.5 text-[16px] text-[#222222] outline-none placeholder:text-[#a0a0a0] focus:border-[var(--arciin-accent,#ff4f12)]"

export const mobileInputClassMuted =
  "min-w-0 flex-1 rounded-xl bg-[#f7f7f7] px-4 py-3 text-[16px] text-[#222222] outline-none placeholder:text-[#a0a0a0] focus:border-[var(--arciin-accent,#ff4f12)]"

export const mobileTextareaClass =
  "w-full resize-none rounded-2xl border border-[#e5e5e5] bg-[#f7f7f7] px-3 py-3 text-[16px] text-[#222222] outline-none placeholder:text-[#a0a0a0] focus:border-[var(--arciin-accent,#ff4f12)]"

/** Settings/profile text fields with neutral border until focus. */
export const mobileFieldClass =
  "w-full rounded-xl border border-[#e5e5e5] bg-[#f7f7f7] px-4 py-3 text-[14px] text-[#222222] outline-none placeholder:text-[#c0c0c0] focus:border-[var(--arciin-accent,#ff4f12)] focus:bg-white"
