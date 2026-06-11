"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

import { AuthMobileCardHeader, AuthMobileShell } from "@/components/auth/auth-mobile-shell"
import { type LegalSection } from "@/lib/legal/content"

export function MobileLegalDocumentPage({
  title,
  sections,
}: {
  title: string
  sections: LegalSection[]
}) {
  const router = useRouter()

  return (
    <AuthMobileShell heroPage={1} compact showLegalFooter>
      <button
        type="button"
        onClick={() => router.back()}
        className="text-left text-[12.5px] font-medium text-[#ff4f12] active:opacity-70"
      >
        ← Back
      </button>
      <AuthMobileCardHeader title={title} subtitle="Arciin self-hosted software" />
      <article className="mt-4 max-h-[52dvh] space-y-6 overflow-y-auto pr-1">
        {sections.map((section) => (
          <section key={section.title} className="space-y-2">
            <h2 className="text-[14px] font-semibold text-[#111111]">{section.title}</h2>
            <div className="space-y-2 text-[12.5px] leading-relaxed text-[#717171]">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </article>
      <div className="mt-4 flex justify-center gap-5 border-t border-[#efefef] pt-4">
        <Link href="/legal/privacy" className="text-[11px] font-medium text-[#a0a0a0] underline-offset-4 hover:text-[#717171] hover:underline">
          Privacy
        </Link>
        <Link href="/legal/terms" className="text-[11px] font-medium text-[#a0a0a0] underline-offset-4 hover:text-[#717171] hover:underline">
          Terms
        </Link>
      </div>
    </AuthMobileShell>
  )
}
