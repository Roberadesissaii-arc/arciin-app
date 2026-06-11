import { FilesAssetViewPage } from "@/components/files/files-asset-view-page"

type PageProps = {
  params: Promise<{ assetId: string }>
}

export default async function FilesAssetViewRoute({ params }: PageProps) {
  const { assetId } = await params
  return <FilesAssetViewPage assetId={assetId} />
}
