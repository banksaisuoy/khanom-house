import { ReportsClient } from '@/components/admin/reports/reports-client'

export const dynamic = 'force-dynamic'

export default function ReportsPage() {
  return <ReportsClient initialTab="sales" />
}
