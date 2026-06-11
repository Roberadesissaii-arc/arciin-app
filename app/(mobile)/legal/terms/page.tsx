import { MobileLegalDocumentPage } from "@/components/legal/mobile-legal-document-page"
import { termsOfUseSections } from "@/lib/legal/content"

export default function TermsPage() {
  return <MobileLegalDocumentPage title="Terms of Use" sections={termsOfUseSections} />
}
