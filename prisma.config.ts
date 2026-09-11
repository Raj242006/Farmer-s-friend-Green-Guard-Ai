// Prisma Config — GreenGuard AI (Prisma 7+)
import * as dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env.local first, then .env as fallback
dotenv.config({ path: ".env.local" });
dotenv.config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"]!,
  },
});
