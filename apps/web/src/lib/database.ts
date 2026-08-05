import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { authSchema } from "@/db/schema/auth";

export function createDatabase(databaseUrl: string) {
  const client = postgres(databaseUrl, { max: 10 });
  return {
    client,
    db: drizzle(client, { schema: authSchema }),
  };
}
