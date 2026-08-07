import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { authSchema } from "@/db/schema/auth";
import { miningSchema } from "@/db/schema/mining";

export const schema = { ...authSchema, ...miningSchema };

export function createDatabase(databaseUrl: string) {
  const client = postgres(databaseUrl, { max: 10 });
  return {
    client,
    db: drizzle(client, { schema }),
  };
}

export type Database = ReturnType<typeof createDatabase>["db"];
