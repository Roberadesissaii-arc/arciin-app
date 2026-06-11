"use client"

import { CompactStatusBanner } from "@/components/shell/compact-status-banner"

type UploadSuccessBannerProps = {
  title: string
  detail: string
}

export function UploadSuccessBanner(props: UploadSuccessBannerProps) {
  return <CompactStatusBanner {...props} />
}
