/**
 * Sequential number generation for human-readable order/bill/batch/event IDs.
 *
 * WHY: Audit finding C-4 (CRITICAL) — every create endpoint uses
 * `db.X.count() + offset` to generate the next number. Two concurrent
 * creates observe the same count, produce the same number, and the
 * second insert fails on the `@unique` constraint (500 error + lost sale).
 *
 * This module uses an atomic `update({ value: { increment: 1 } })` inside
 * a transaction, returning the new value. The `Sequence` model is added
 * to the Prisma schema.
 *
 * Usage:
 *   const orderNo = await nextSeq('order', 'KH', 5) // → "KH00042"
 */
import { db } from './db'

/** Pad a number to a fixed width with leading zeros. */
export function pad(num: number, width: number): string {
  return num.toString().padStart(width, '0')
}

/**
 * Atomically get the next sequence value and format it.
 *
 * @param name  sequence key (e.g. 'order', 'pos_bill', 'shift', 'batch', 'event')
 * @param prefix  display prefix (e.g. 'KH', 'POS', 'SH-', 'BATCH-', 'EVT-')
 * @param width  zero-pad width for the numeric portion
 */
export async function nextSeq(
  name: string,
  prefix: string,
  width = 5
): Promise<string> {
  const seq = await db.$transaction(async (tx) => {
    // upsert the sequence row, then atomically increment
    await tx.sequence.upsert({
      where: { name },
      create: { name, value: 0 },
      update: {},
    })
    const updated = await tx.sequence.update({
      where: { name },
      data: { value: { increment: 1 } },
      select: { value: true },
    })
    return updated.value
  })
  return `${prefix}${pad(seq, width)}`
}
