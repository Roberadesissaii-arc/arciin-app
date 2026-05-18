import { DatabaseTablePage } from "@/components/database/database-table-page"

export default async function TablePage({
  params,
}: {
  params: Promise<{ table: string }>
}) {
  const { table } = await params
  return <DatabaseTablePage tableName={table} />
}
