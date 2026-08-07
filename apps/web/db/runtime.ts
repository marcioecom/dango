import "server-only";

import { env } from "@/lib/environment";
import { createDatabase } from "./index";

export const database = createDatabase(env.DATABASE_URL).db;
