import { MobileLegalDocumentPage } from "@/components/legal/mobile-legal-document-page"
import { privacyPolicySections } from "@/lib/legal/content"

export default function PrivacyPage() {
  return <MobileLegalDocumentPage title="Privacy Policy" sections={privacyPolicySections} />
}
