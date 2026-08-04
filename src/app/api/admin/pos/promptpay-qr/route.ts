import { NextRequest } from 'next/server'
import { ok, handle, badRequest } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'
import { z } from 'zod'

// ============================================================
// POST /api/admin/pos/promptpay-qr
//   Generate a PromptPay QR payload + image URL for a given amount.
//   Permission: pos.read
//
//   Returns:
//     qrPayload — EMVCo-style Tag 29 payload (demo)
//     qrImageUrl — https://promptpay.io/{id}/{amount}.png placeholder
//     promptPayId — the merchant ID used
//     amount
// ============================================================
const qrSchema = z.object({
  amount: z.number().finite().positive().max(1_000_000),
  promptPayId: z.string().trim().min(8).max(20).optional(),
})

// Default demo merchant (the phone number used across the codebase already).
const DEFAULT_PROMPTPAY_ID = '0812345678'

// CRC16-CCITT (0x1021) — required by the EMVCo QR spec for the closing tag.
function crc16(str: string): string {
  let crc = 0xffff
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? (crc << 1) ^ 0x1021 : crc << 1
      crc &= 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

function fmt(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0')
  return `${id}${len}${value}`
}

function buildPromptPayPayload(promptPayId: string, amount: number): string {
  // A simplified-but-spec-compliant PromptPay payload.
  // Tag 00 = Payload format "01"
  // Tag 01 = Point of initiation "12" (dynamic) or "11" (static)
  // Tag 29 = Merchant account info (sub-tags 00=A000000677010111, 02=phone/taxId)
  // Tag 53 = Currency "764" (THB)
  // Tag 54 = Amount (with 2 decimals)
  // Tag 58 = Country "TH"
  // Tag 63 = CRC
  const merchantInfo =
    fmt('00', 'A000000677010111') +
    fmt('02', promptPayId.padStart(13, '0')) // PromptPay phone/tax id — pad to 13 digits
  const amountStr = amount.toFixed(2)
  const payloadWithoutCrc =
    fmt('00', '01') +
    fmt('01', '12') +
    fmt('29', merchantInfo) +
    fmt('53', '764') +
    fmt('54', amountStr) +
    fmt('58', 'TH') +
    '6304' // tag 63, length 4, placeholder for CRC
  const crc = crc16(payloadWithoutCrc)
  return payloadWithoutCrc + crc
}

export const POST = handle(async (req: NextRequest) => {
  await requirePermission(req, 'pos.read')
  const body = qrSchema.parse(await req.json())

  const promptPayId = body.promptPayId || DEFAULT_PROMPTPAY_ID
  const amount = body.amount

  // Validate the ID looks like a Thai phone (10 digits starting 0) or tax ID (10/13 digits)
  const idDigits = promptPayId.replace(/[^\d]/g, '')
  if (!/^\d{10,13}$/.test(idDigits)) {
    return badRequest('PromptPay ID ต้องเป็นเบอร์โทร 10 หลัก หรือเลขประจำตัว 10/13 หลัก')
  }

  const qrPayload = buildPromptPayPayload(idDigits, amount)
  const qrImageUrl = `https://promptpay.io/${idDigits}/${amount.toFixed(2)}.png`

  return ok({
    ok: true,
    qrPayload,
    qrImageUrl,
    promptPayId: idDigits,
    amount,
  })
})
