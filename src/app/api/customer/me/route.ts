import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle } from '@/lib/api-response'
import { CUSTOMER_SESSION_COOKIE, verifyCustomerSession } from '@/lib/customer-session'

// ============================================================
// GET /api/customer/me
//   PUBLIC: returns the current customer session (if any).
//   Reads `kh_customer_session` cookie, verifies HMAC signature,
//   then looks up the customer.
//
// SECURITY: Cookie value must be a signed HMAC token
// (`{customerId}.{hmac}`). Tampered or malformed tokens are
// rejected silently (return null customer).
// ============================================================
export const GET = handle(async (req: NextRequest) => {
  const cookieHeader = req.headers.get('cookie') ?? ''
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${CUSTOMER_SESSION_COOKIE}=([^;]+)`)
  )
  const token = match?.[1]?.trim()
  if (!token) return ok({ customer: null })

  // Verify the HMAC signature — rejects tampered cookies
  const customerId = verifyCustomerSession(token)
  if (!customerId) return ok({ customer: null })

  const c = await db.customer.findUnique({
    where: { id: customerId, deletedAt: null },
    select: {
      id: true, name: true, phone: true, email: true, tier: true, points: true,
    },
  })
  if (!c) return ok({ customer: null })
  return ok({ customer: c })
})
