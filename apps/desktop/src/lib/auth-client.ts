import { createAuthClient } from "better-auth/react";

import { desktopFetch } from "./http";

export const authBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

let bearerToken: string | null = null;

export function setAuthToken(token: string | null) {
  bearerToken = token;
}

export function getAuthToken() {
  return bearerToken;
}

export const authClient = createAuthClient({
  baseURL: authBaseUrl,
  fetchOptions: {
    auth: {
      token: () => bearerToken ?? "",
      type: "Bearer",
    },
    customFetchImpl: desktopFetch,
    credentials: "omit",
  },
});
