import { env } from "@/lib/environment";

export const runtimeOrigins = new Set(
  [env.BETTER_AUTH_URL, ...env.AUTH_TRUSTED_ORIGINS.split(",")]
    .map((origin) => origin?.trim())
    .filter((origin): origin is string => Boolean(origin)),
);
