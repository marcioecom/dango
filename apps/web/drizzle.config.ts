import "dotenv/config";
import { defineConfig } from "drizzle-kit";

import { env } from "./lib/env";

export default defineConfig({
  dialect: "postgresql",
  dbCredentials: { url: env.DATABASE_URL },
  out: "./drizzle",
  schema: "./db/schema/*.ts",
  strict: true,
});
