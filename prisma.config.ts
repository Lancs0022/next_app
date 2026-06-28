import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    // process.env direct (sans env()) pour que `prisma generate` fonctionne
    // même sans DATABASE_URL défini (ex: CI, génération des types uniquement)
    url: process.env.DATABASE_URL ?? "",
  },
});
