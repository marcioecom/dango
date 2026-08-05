export type AuthenticationErrorKey =
  | "errors.invalidCredentials"
  | "errors.invalidSession"
  | "errors.keychain"
  | "errors.logout"
  | "errors.missingToken"
  | "errors.network"
  | "errors.restore"
  | "errors.signUp"
  | "errors.unexpected"
  | "errors.unverified";

export class AuthenticationError extends Error {
  constructor(public readonly translationKey: AuthenticationErrorKey) {
    super(translationKey);
    this.name = "AuthenticationError";
  }
}
