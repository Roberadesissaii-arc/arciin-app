import { AppDataDetailPage } from "@/components/database/app-data-detail-page"

export default async function AppDataDetailRoute({
  params,
}: {
  params: Promise<{ databaseId: string }>
}) {
  const { databaseId } = await params
  return <AppDataDetailPage databaseId={databaseId} />
}
