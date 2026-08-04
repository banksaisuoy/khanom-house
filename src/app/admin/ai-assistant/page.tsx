import { db } from '@/lib/db'
import { AiAssistantClient } from '@/components/admin/ai-assistant/ai-assistant-client'

export const dynamic = 'force-dynamic'

export default async function AiAssistantPage() {
  // Pass quick snapshot as initial context (the API route will refresh
  // these numbers on every chat turn so answers stay live).
  const [todayOrders, pendingOrders, lowStock, activeBatches] = await Promise.all([
    db.order.count({
      where: {
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    db.order.count({
      where: {
        status: { in: ['PENDING', 'PAID', 'PREPARING', 'COOKING', 'PACKING', 'OUT_FOR_DELIVERY'] },
      },
    }),
    db.inventory.count({ where: { quantity: { lt: 20 } } }),
    db.productionBatch.count({
      where: { status: { in: ['QUEUED', 'COOKING', 'QC'] } },
    }),
  ])

  return (
    <AiAssistantClient
      initialContext={{
        todayOrders,
        pendingOrders,
        lowStock,
        activeBatches,
      }}
    />
  )
}
