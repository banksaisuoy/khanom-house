/**
 * INTEGRATION TEST: Health and readiness endpoints.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { GET as healthCheck } from '@/app/api/health/route'
import { GET as readyCheck } from '@/app/api/ready/route'
import { ensureSeeded, disconnectTestDb } from './test-db'
import { getJson } from './mock-request'

describe('INTEGRATION: Health & Readiness', () => {
  beforeAll(async () => { await ensureSeeded() })
  afterAll(async () => { await disconnectTestDb() })

  it('health endpoint returns 200 with status ok', async () => {
    const res = await healthCheck()
    const data = await getJson(res)

    expect(res.status).toBe(200)
    expect(data.status).toBe('ok')
    expect(data.timestamp).toBeDefined()
    expect(data.env).toBeDefined()
  })

  it('readiness endpoint returns 200 when DB is available', async () => {
    const res = await readyCheck()
    const data = await getJson(res)

    expect(res.status).toBe(200)
    expect(data.status).toBe('ready')
    expect(data.checks.database).toBe('ok')
    expect(data.checks.sessionSecret).toBe('ok')
  })

  it('health endpoint does not expose secrets', async () => {
    const res = await healthCheck()
    const data = await getJson(res)

    const jsonStr = JSON.stringify(data)
    expect(jsonStr).not.toMatch(/password|secret|token|key/i)
  })
})
