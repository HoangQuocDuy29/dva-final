import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    // Prisma CLI (prisma db push) uses Session Pooler IPv4 (DIRECT_URL :5432) when runtime DATABASE_URL uses Transaction Pooler (:6543)
    url: process.env.DIRECT_URL || process.env.DATABASE_URL!,
  },
});
