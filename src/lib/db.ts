import { PrismaClient } from '@prisma/client'

/**
 * Prisma client singleton.
 *
 * Production: Uses connection pool limit of 1 for Neon serverless
 * (Neon free tier supports limited connections — pool of 1 avoids
 * "too many connections" errors on Vercel serverless functions).
 *
 * Dev: Keeps client on globalThis to avoid exhausting the connection
 * pool during Next.js HMR.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const isProd = process.env.NODE_ENV === 'production'

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
    datasources: isProd
      ? {
          db: {
            url: process.env.DATABASE_URL?.includes('?')
              ? process.env.DATABASE_URL + '&connection_limit=1&pool_timeout=30'
              : process.env.DATABASE_URL + '?connection_limit=1&pool_timeout=30',
          },
        }
      : undefined,
  })

// Always cache on globalThis (both dev and prod serverless)
if (!globalForPrisma.prisma) globalForPrisma.prisma = db
