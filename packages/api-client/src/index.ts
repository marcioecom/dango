export type AuthenticatedUser = {
  email: string;
  emailVerified: boolean;
  id: string;
  name: string;
};

export type IdentityResponse = {
  user: AuthenticatedUser;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseIdentityResponse(value: unknown): IdentityResponse {
  if (!isRecord(value) || !isRecord(value.user)) {
    throw new Error("Resposta de identidade inválida.");
  }

  const { email, emailVerified, id, name } = value.user;
  if (
    typeof email !== "string" ||
    typeof emailVerified !== "boolean" ||
    typeof id !== "string" ||
    typeof name !== "string"
  ) {
    throw new Error("Resposta de identidade inválida.");
  }

  return { user: { email, emailVerified, id, name } };
}
