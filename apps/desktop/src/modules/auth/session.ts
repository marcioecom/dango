import { z } from "zod";

import { authClient } from "../../lib/auth-client";
import {
  AuthenticationError,
  type AuthenticatedUser,
  type AuthenticationErrorKey,
} from "./types";

const authenticatedUserSchema = z.object({
  email: z.string(),
  emailVerified: z.boolean(),
  id: z.string(),
  name: z.string(),
});

type BetterAuthError = {
  code?: string;
  status?: number;
};

export function responseError(
  error: BetterAuthError,
  fallback: AuthenticationErrorKey,
): AuthenticationError {
  if (!error.status) return new AuthenticationError("errors.network");
  return new AuthenticationError(fallback);
}

export function signInResponseError(
  error: BetterAuthError,
): AuthenticationError {
  if (error.code === "EMAIL_NOT_VERIFIED" || error.status === 403) {
    return new AuthenticationError("errors.unverified");
  }
  if (error.status === 400 || error.status === 401) {
    return new AuthenticationError("errors.invalidCredentials");
  }
  return responseError(error, "errors.unexpected");
}

export async function authRequest<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch {
    throw new AuthenticationError("errors.network");
  }
}

export function errorKey(
  error: unknown,
  fallback: AuthenticationErrorKey = "errors.unexpected",
) {
  return error instanceof AuthenticationError ? error.translationKey : fallback;
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const { data, error } = await authRequest(() => authClient.getSession());
  if (error) {
    if (error.status === 401) return null;
    throw responseError(error, "errors.restore");
  }
  if (!data) return null;

  const parsedUser = authenticatedUserSchema.safeParse(data.user);
  if (!parsedUser.success) {
    throw new AuthenticationError("errors.invalidSession");
  }
  return parsedUser.data;
}
