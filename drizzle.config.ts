import { defineConfig } from "drizzle-kit";

// `drizzle-kit generate` écrit le SQL dans `drizzle/`. On VERSIONNE ce SQL : c'est lui qui
// fait foi en production, pas le schéma TypeScript. `push` n'est pour la machine du dev.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  casing: "snake_case",
});
