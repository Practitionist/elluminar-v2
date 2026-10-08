import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "./generated/prisma/client";

export * from "./generated/prisma/client";
export * from "./env";
export * from "./repositories/commerce-repository";
export * from "./repositories/ai-wallet-repository";
export * from "./repositories/artifact-repository";
export * from "../prisma/seed";

export interface DbClientOptions {
  connectionString?: string;
  maxPoolSize?: number;
}

/**
 * Creates a clean-sheet PrismaClient backed by `@prisma/adapter-pg`
 * for Supabase PostgreSQL (`ap-south-1`).
 */
export function createDbClient(options: DbClientOptions = {}): PrismaClient {
  const connectionString =
    options.connectionString ??
    process.env["DATABASE_URL"] ??
    "postgresql://postgres:postgres@127.0.0.1:5432/elluminar_v2?schema=public";

  const pool = new Pool({
    connectionString,
    max: options.maxPoolSize ?? 10,
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const globalForDb = globalThis as unknown as {
  elluminarDb?: PrismaClient;
};

export const db: PrismaClient =
  globalForDb.elluminarDb ?? createDbClient();

if (process.env["NODE_ENV"] !== "production") {
  globalForDb.elluminarDb = db;
}
