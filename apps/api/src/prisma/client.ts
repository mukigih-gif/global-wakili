// Use the generated client package from the monorepo (example: @wakili/database)
import { PrismaClient } from "@wakili/database";

declare global {
  // Prevent multiple instances during hot reload in dev
  // eslint-disable-next-line no-var
  var __prismaClient__: PrismaClient | undefined;
}

const prisma = global.__prismaClient__ ?? new PrismaClient({
  log: [
    { level: "warn", emit: "event" },
    { level: "error", emit: "event" },
  ],
});

if (process.env.NODE_ENV !== "production") global.__prismaClient__ = prisma;

prisma.$on("error", (e) => {
  console.error("Prisma error:", e.message);
});

export default prisma;