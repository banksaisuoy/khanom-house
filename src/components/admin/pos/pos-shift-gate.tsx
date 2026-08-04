'use client'

import { useRouter } from 'next/navigation'
import { ShiftOpenCard, type ShiftScreenProps } from './shift-screen'

/**
 * Client wrapper that handles post-open reload via Next router refresh.
 */
export function PosShiftGate({
  cashier,
  branch,
}: {
  cashier: ShiftScreenProps['cashier']
  branch: ShiftScreenProps['branch']
}) {
  const router = useRouter()
  return (
    <ShiftOpenCard
      cashier={cashier}
      branch={branch}
      onOpened={() => router.refresh()}
    />
  )
}
