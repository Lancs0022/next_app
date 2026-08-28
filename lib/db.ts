import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// Évite les instances multiples de PrismaClient en développement (hot-reload)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  })
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn']
        : ['query', 'error', 'warn'],
    adapter,
  })
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
