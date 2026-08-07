import "server-only";

import { env } from "@/lib/env";
import { createDatabase } from "./index";

export const database = createDatabase(env.DATABASE_URL).db;
