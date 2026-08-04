import { db } from '@/lib/db'
import { PosTerminal, type PosProduct, type PosTerminalProps } from '@/components/admin/pos/pos-terminal'
import { PosShiftGate } from '@/components/admin/pos/pos-shift-gate'

export const dynamic = 'force-dynamic'

async function getPosData() {
  const branch = await db.branch.findFirst({ where: { isMain: true } })
  if (!branch) {
    return { shift: null, cashier: null, branch: undefined, products: [], categories: [] }
  }

  const shift = await db.shift.findFirst({
    where: { branchId: branch.id, status: 'OPEN' },
    orderBy: { openedAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      _count: { select: { bills: true, drawerMoves: true } },
    },
  })

  const cashier = await db.user.findFirst({ where: { role: 'CASHIER' } })

  const productsRaw = await db.product.findMany({
    where: { isActive: true },
    include: {
      category: { select: { id: true, name: true, slug: true, icon: true } },
      inventory: { where: { branchId: branch.id }, select: { quantity: true } },
    },
    orderBy: { name: 'asc' },
  })
  const products: PosProduct[] = productsRaw.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    type: p.type,
    price: p.price,
    unit: p.unit,
    category: p.category,
    stock: p.inventory.reduce((s, i) => s + i.quantity, 0),
  }))

  const categories = await db.category.findMany({
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true, slug: true, icon: true },
  })

  return {
    shift: shift
      ? {
          id: shift.id,
          shiftNo: shift.shiftNo,
          openedAt: shift.openedAt.toISOString(),
          openingCash: shift.openingCash,
          cashIn: shift.cashIn,
          cashOut: shift.cashOut,
          totalSales: shift.totalSales,
          cashSales: shift.cashSales,
          cardSales: shift.cardSales,
          qrSales: shift.qrSales,
          user: shift.user,
          billsCount: shift._count.bills,
        }
      : null,
    cashier: cashier ? { id: cashier.id, name: cashier.name, email: cashier.email } : null,
    branch: { id: branch.id, name: branch.name, code: branch.code },
    products,
    categories,
  }
}

export default async function PosPage() {
  const data = await getPosData()

  if (!data.shift) {
    return (
      <PosShiftGate
        cashier={data.cashier}
        branch={data.branch}
      />
    )
  }

  const props: PosTerminalProps = {
    shift: data.shift,
    cashier: data.cashier ?? { id: '', name: 'Cashier', email: '' },
    branch: data.branch!,
    products: data.products,
    categories: data.categories,
  }

  return <PosTerminal {...props} />
}
