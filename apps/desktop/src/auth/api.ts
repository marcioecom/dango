import { AuthenticationError, type AuthenticatedUser } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

async function apiRequest(path: string, init: RequestInit = {}) {
  try {
    return await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new AuthenticationError(
      "network",
      "Não foi possível acessar o serviço. Verifique sua conexão e tente novamente.",
    );
  }
}

async function authPost(path: string, body?: object, token?: string) {
  const headers = new Headers({ "content-type": "application/json" });
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }

  return apiRequest(`/api/auth${path}`, {
    body: JSON.stringify(body ?? {}),
    headers,
    method: "POST",
  });
}

export async function signUp(input: { email: string; name: string; password: string }) {
  const response = await authPost("/sign-up/email", {
    ...input,
    callbackURL: `${API_URL}/email-verificado`,
  });

  if (!response.ok) {
    throw new AuthenticationError("unexpected", "Não foi possível criar a conta. Tente novamente.");
  }
}

export async function signIn(input: { email: string; password: string }) {
  const response = await authPost("/sign-in/email", input);

  if (response.status === 403) {
    throw new AuthenticationError(
      "unverified",
      "Confirme seu email antes de entrar. Enviamos um novo link para você.",
    );
  }
  if (response.status === 400 || response.status === 401) {
    throw new AuthenticationError("invalid_credentials", "Email ou senha inválidos.");
  }
  if (!response.ok) {
    throw new AuthenticationError("unexpected", "Não foi possível entrar. Tente novamente.");
  }

  const token = response.headers.get("set-auth-token");
  if (!token) {
    throw new AuthenticationError("unexpected", "O serviço não retornou uma sessão segura.");
  }
  return token;
}

export async function getCurrentUser(token: string) {
  const response = await apiRequest("/api/me", {
    headers: { authorization: `Bearer ${token}` },
  });

  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw new AuthenticationError("unexpected", "Não foi possível restaurar sua sessão.");
  }

  const data = (await response.json()) as { user: AuthenticatedUser };
  return data.user;
}

export async function revokeSession(token: string) {
  const response = await authPost("/sign-out", undefined, token);
  if (!response.ok) {
    throw new AuthenticationError(
      "unexpected",
      "Não foi possível sair com segurança. Tente novamente.",
    );
  }
}
