import { db } from '@/lib/db'

// ============================================================
// Audit log helper — call from any module/server route
//   await logAudit({ userId, action: 'CREATE', entity: 'Product', entityId: p.id, oldValue: null, newValue: JSON.stringify(p) })
// ============================================================

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'APPROVE'
  | 'STATUS_CHANGE'
  | 'EXPORT'
  | 'ADJUST'

export type LogAuditInput = {
  userId?: string | null
  action: AuditAction | string
  entity: string
  entityId?: string | null
  oldValue?: unknown
  newValue?: unknown
  ip?: string | null
  userAgent?: string | null
}

export async function logAudit(input: LogAuditInput) {
  try {
    await db.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        oldValue:
          typeof input.oldValue === 'string'
            ? input.oldValue
            : input.oldValue === undefined || input.oldValue === null
              ? null
              : JSON.stringify(input.oldValue),
        newValue:
          typeof input.newValue === 'string'
            ? input.newValue
            : input.newValue === undefined || input.newValue === null
              ? null
              : JSON.stringify(input.newValue),
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    })
  } catch (e) {
    // never let audit logging crash the calling operation
    console.error('[logAudit] failed', e)
  }
}

// JSON-stringify helper that tolerates circular refs & Dates
export function safeJson(value: unknown): string | null {
  if (value === undefined || value === null) return null
  try {
    return JSON.stringify(value, (_k, v) => {
      if (v instanceof Date) return v.toISOString()
      return v
    })
  } catch {
    return null
  }
}
