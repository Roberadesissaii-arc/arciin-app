"use client"

import Link from "next/link"
import { Check } from "lucide-react"

export function SetupLegalAcceptance({
  checked,
  onChange,
  error,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  error?: string | null
}) {
  return (
    <div className="rounded-2xl border border-[#efefef] bg-[#fafafa] p-3">
      <label className="flex cursor-pointer items-start gap-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border"
          style={{
            borderColor: checked ? "#ff4f12" : "#d4d4d4",
            backgroundColor: checked ? "#ff4f12" : "#fff",
          }}
        >
          {checked ? <Check className="size-3 stroke-[2.5] text-white" /> : null}
        </button>
        <span className="text-[12px] leading-relaxed text-[#717171]">
          I have read and agree to Arciin&apos;s{" "}
          <Link
            href="/legal/terms"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-[#444444] underline underline-offset-4"
          >
            Terms of Use
          </Link>{" "}
          and{" "}
          <Link
            href="/legal/privacy"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-[#444444] underline underline-offset-4"
          >
            Privacy Policy
          </Link>
          . I understand this software runs on infrastructure I control and that I am responsible for
          how it is operated and secured.
        </span>
      </label>
      {error ? <p className="mt-2 pl-[30px] text-[11.5px] text-[#d93025]">{error}</p> : null}
    </div>
  )
}
