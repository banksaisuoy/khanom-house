import { getDashboardData } from '@/lib/dashboard'
import { DashboardClient } from '@/components/admin/dashboard-client'

// Force dynamic rendering — dashboard data changes constantly
export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const data = await getDashboardData('30d')
  return <DashboardClient initialData={data} />
}
