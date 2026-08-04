/**
 * Authentication + authorization helpers.
 *
 * WHY: Audit finding C-1 (CRITICAL) — all `/api/admin/*` endpoints have
 * zero auth/authz checks. Anyone can create superusers, void bills,
 * adjust stock, etc.
 *
 * This module provides a session abstraction that:
 *   1. Reads a demo session from a signed cookie (for the demo deploy).
 *   2. Enforces role-based access on every admin route.
 *   3. Is structured so a real auth provider (NextAuth/Auth.js/better-auth)
 *      can be dropped in by replacing `getSessionUser` only.
 *
 * Demo session model:
 *   - The storefront "login as admin" affordance sets a cookie
 *     `kh_session` with a userId. In production this would be a JWT
 *     or an httpOnly session token validated against a store.
 *   - For now we trust the cookie but ALWAYS verify the user exists and
 *     is active in the DB before authorizing.
 */

import { db } from './db'
import { signSessionToken, verifySessionToken } from './session-signing'

export type Role =
  | 'SUPER_ADMIN'
  | 'BRANCH_MANAGER'
  | 'KITCHEN'
  | 'CASHIER'
  | 'RIDER'
  | 'ACCOUNTANT'
  | 'STAFF'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: Role
  branchId: string | null
}

/**
 * Role → set of permissions. This is the single source of truth for RBAC.
 *
 * Permission format: "<entity>.<action>" e.g. "users.create", "pos.checkout".
 * SUPER_ADMIN implicitly has all permissions.
 */
const ROLE_PERMISSIONS: Record<Role, ReadonlySet<string>> = {
  SUPER_ADMIN: new Set(['*']),
  BRANCH_MANAGER: new Set([
    'dashboard.read', 'orders.read', 'orders.update', 'orders.create',
    'products.read', 'products.create', 'products.update', 'products.delete',
    'inventory.read', 'inventory.adjust', 'inventory.update',
    'recipes.read', 'recipes.create', 'recipes.update', 'recipes.delete',
    'kitchen.read', 'kitchen.create', 'kitchen.update', 'kitchen.complete', 'kitchen.qc',
    'pos.read', 'pos.checkout', 'pos.shift', 'pos.void',
    'waste.read', 'waste.create', 'waste.delete',
    'catering.read', 'catering.create', 'catering.update', 'catering.delete',
    'customers.read', 'customers.create', 'customers.update', 'customers.points',
    'promotions.read', 'promotions.create', 'promotions.update', 'promotions.delete',
    'deliveries.read', 'deliveries.update',
    'reports.read', 'accounting.read', 'accounting.create', 'accounting.update', 'accounting.delete',
    'audit.read', 'notifications.read', 'notifications.update',
    'users.read', 'users.create', 'users.update',
    'gift_cards.create',
  ]),
  KITCHEN: new Set([
    'dashboard.read', 'recipes.read', 'kitchen.read', 'kitchen.create',
    'kitchen.update', 'kitchen.complete', 'kitchen.qc',
    'products.read', 'inventory.read', 'waste.read', 'waste.create',
  ]),
  CASHIER: new Set([
    'dashboard.read', 'pos.read', 'pos.checkout', 'pos.shift', 'pos.void',
    'orders.read', 'orders.create',
    'products.read', 'inventory.read', 'customers.read', 'customers.create',
    'promotions.read',
    // PHASE 4 FIX (AUDIT-011): `orders.update` was removed — it granted
    // refund approval, slip verification, and order status changes to
    // cashiers, violating segregation of duties. Managers must approve.
  ]),
  RIDER: new Set([
    'dashboard.read', 'deliveries.read', 'deliveries.update',
    'orders.read',
  ]),
  ACCOUNTANT: new Set([
    'dashboard.read', 'orders.read', 'reports.read',
    'accounting.read', 'accounting.create', 'accounting.update', 'accounting.delete',
    'audit.read', 'customers.read', 'products.read', 'inventory.read',
    'waste.read', 'catering.read',
  ]),
  STAFF: new Set(['dashboard.read']),
}

const ADMIN_ROLES: ReadonlySet<Role> = new Set([
  'SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT',
])

/**
 * Read the session from the request cookies. Returns null if no session
 * or if the session token has been tampered with.
 *
 * SECURITY: Cookie value is a signed HMAC token (`{userId}.{hmac}`),
 * not a raw userId. Tampered tokens are rejected silently.
 */
export async function getSessionUser(req: Request): Promise<SessionUser | null> {
  const cookieHeader = req.headers.get('cookie') ?? ''
  const sessionToken = parseCookie(cookieHeader, SESSION_COOKIE)
  if (!sessionToken) return null

  // Verify the HMAC signature — rejects tampered cookies
  const userId = verifySessionToken(sessionToken)
  if (!userId) return null

  const user = await db.user.findUnique({
    where: { id: userId, isActive: true },
    select: { id: true, email: true, name: true, role: true, branchId: true },
  })
  if (!user) return null
  return user as SessionUser
}

function parseCookie(header: string, name: string): string | undefined {
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
  return match?.[1]?.trim()
}

/** Check if the user has a specific permission. */
export function hasPermission(user: SessionUser, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[user.role]
  if (!perms) return false
  if (perms.has('*')) return true
  // Wildcard entity: "users.*" matches any "users.X"
  if (perms.has(`${permission.split('.')[0]}.*`)) return true
  return perms.has(permission)
}

/** True if the user is a Super Admin / Branch Manager / Accountant. */
export function isAdminRole(user: SessionUser): boolean {
  return ADMIN_ROLES.has(user.role)
}

/**
 * Require an authenticated session. Returns the user or throws an
 * `AuthError` that the API handler should catch and convert to 401.
 */
export async function requireAuth(req: Request): Promise<SessionUser> {
  const user = await getSessionUser(req)
  if (!user) throw new AuthError('กรุณาเข้าสู่ระบบ', 'UNAUTHORIZED')
  return user
}

/**
 * Require a specific permission. Throws AuthError (403) if missing.
 */
export async function requirePermission(
  req: Request,
  permission: string
): Promise<SessionUser> {
  const user = await requireAuth(req)
  if (!hasPermission(user, permission)) {
    throw new AuthError('ไม่มีสิทธิ์เข้าถึงส่วนนี้', 'FORBIDDEN')
  }
  return user
}

/**
 * Require the user to be operating on their own branch (or be Super Admin).
 * Throws AuthError (403) if the branchId doesn't match.
 */
export function requireBranchAccess(
  user: SessionUser,
  branchId: string | null | undefined
): void {
  if (user.role === 'SUPER_ADMIN') return
  if (branchId && user.branchId && branchId !== user.branchId) {
    throw new AuthError('ไม่มีสิทธิ์จัดการสาขาอื่น', 'FORBIDDEN')
  }
}

export class AuthError extends Error {
  code: 'UNAUTHORIZED' | 'FORBIDDEN'
  constructor(message: string, code: 'UNAUTHORIZED' | 'FORBIDDEN') {
    super(message)
    this.code = code
    this.name = 'AuthError'
  }
}

/**
 * Set the demo session cookie on a response. Used by the (future) login
 * endpoint. Max-age 7 days, httpOnly, sameSite strict.
 */
export const SESSION_COOKIE = 'kh_session'
export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days
