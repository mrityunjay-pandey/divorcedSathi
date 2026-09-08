import { PrismaClient } from "@prisma/client";

/**
 * Singleton Prisma client. In serverless/edge contexts with hot-reload
 * (Next.js dev, Nest with watch mode) this prevents exhausting the
 * connection pool by reusing one client across module reloads.
 */
declare global {
  // eslint-disable-next-line no-var
  var __divorcedsathiPrisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.__divorcedsathiPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__divorcedsathiPrisma = prisma;
}

export * from "@prisma/client";
