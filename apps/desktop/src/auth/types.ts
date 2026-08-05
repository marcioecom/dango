export type AuthenticatedUser = {
  email: string;
  emailVerified: boolean;
  id: string;
  name: string;
};

export type AuthenticationFailure = "invalid_credentials" | "network" | "unverified" | "unexpected";

export class AuthenticationError extends Error {
  constructor(
    public readonly failure: AuthenticationFailure,
    message: string,
  ) {
    super(message);
    this.name = "AuthenticationError";
  }
}
