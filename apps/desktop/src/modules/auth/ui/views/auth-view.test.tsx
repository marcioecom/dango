import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { authClient, setAuthToken } from "../../../../lib/auth-client";
import { i18n } from "../../../../i18n/i18n";
import { renderWithProviders } from "../../../../test/render";
import { deleteSessionToken, loadSessionToken, saveSessionToken } from "../../keychain";
import { AuthView } from "./auth-view";

vi.mock("../../../../lib/auth-client", () => ({
  authBaseUrl: "http://localhost:3000",
  authClient: {
    getSession: vi.fn(),
    signIn: { email: vi.fn() },
    signOut: vi.fn(),
    signUp: { email: vi.fn() },
  },
  setAuthToken: vi.fn(),
}));

vi.mock("../../keychain", () => ({
  deleteSessionToken: vi.fn(),
  loadSessionToken: vi.fn(),
  saveSessionToken: vi.fn(),
}));

vi.mock("../../../anki/ui/anki-delivery-view", () => ({
  AnkiDeliveryView: () => null,
}));

const ana = {
  email: "ana@example.com",
  emailVerified: true,
  id: "user-ana",
  name: "Ana",
};

describe("desktop authentication", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    window.localStorage.clear();
    await i18n.changeLanguage("pt-BR");
    vi.mocked(loadSessionToken).mockResolvedValue(null);
    vi.mocked(deleteSessionToken).mockResolvedValue(undefined);
    vi.mocked(saveSessionToken).mockResolvedValue(undefined);
    vi.mocked(authClient.getSession).mockResolvedValue({ data: { session: {}, user: ana }, error: null });
    vi.mocked(authClient.signOut).mockResolvedValue({ data: { success: true }, error: null });
    vi.mocked(authClient.signUp.email).mockResolvedValue({ data: { token: null, user: ana }, error: null });
    vi.mocked(authClient.signIn.email).mockImplementation(async (_values, options) => {
      await options?.onSuccess?.({
        data: { token: null, user: ana },
        request: new Request("http://localhost:3000/api/auth/sign-in/email"),
        response: new Response(null, { headers: { "set-auth-token": "token-ana" } }),
      });
      return { data: { token: null, user: ana }, error: null };
    });
  });

  it("creates an account and guides email verification", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AuthView />);

    await user.click(await screen.findByRole("button", { name: "Criar conta" }));
    await user.type(screen.getByLabelText("Nome"), "Ana");
    await user.type(screen.getByLabelText("Email"), "ana@example.com");
    await user.type(screen.getByLabelText(/^Senha/), "uma-senha-segura");
    const createButtons = screen.getAllByRole("button", { name: "Criar conta" });
    await user.click(createButtons[createButtons.length - 1]);

    expect(await screen.findByRole("heading", { name: "Confira seu email" })).toBeVisible();
    expect(authClient.signUp.email).toHaveBeenCalledWith({
      callbackURL: "http://localhost:3000/email-verified",
      email: "ana@example.com",
      name: "Ana",
      password: "uma-senha-segura",
    });
  });

  it("validates identity before storing the token in Keychain", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AuthView />);

    await signIn(user);

    expect(await screen.findByRole("heading", { name: "Olá, Ana" })).toBeVisible();
    expect(authClient.getSession).toHaveBeenCalled();
    expect(saveSessionToken).toHaveBeenCalledWith("token-ana");
    expect(vi.mocked(authClient.getSession).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(saveSessionToken).mock.invocationCallOrder[0],
    );
  });

  it("compensates the session when identity validation fails", async () => {
    vi.mocked(authClient.getSession).mockResolvedValue({ data: null, error: null });
    const user = userEvent.setup();
    renderWithProviders(<AuthView />);

    await signIn(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A sessão criada não pôde ser validada.",
    );
    expect(saveSessionToken).not.toHaveBeenCalled();
    expect(deleteSessionToken).toHaveBeenCalled();
    expect(authClient.signOut).toHaveBeenCalled();
    expect(vi.mocked(authClient.signOut).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(deleteSessionToken).mock.invocationCallOrder[0],
    );
    expect(setAuthToken).toHaveBeenLastCalledWith(null);
  });

  it("compensates the session when Keychain storage fails", async () => {
    vi.mocked(saveSessionToken).mockRejectedValue(new Error("Keychain indisponível"));
    const user = userEvent.setup();
    renderWithProviders(<AuthView />);

    await signIn(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível proteger a sessão no Keychain do macOS.",
    );
    expect(deleteSessionToken).toHaveBeenCalled();
    expect(authClient.signOut).toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Entrar no Dango" })).toBeVisible();
  });

  it("preserves the original error when compensating revocation fails", async () => {
    vi.mocked(authClient.getSession).mockResolvedValue({ data: null, error: null });
    vi.mocked(authClient.signOut).mockResolvedValue({
      data: null,
      error: { code: "INTERNAL_SERVER_ERROR", message: "Falha remota", status: 500, statusText: "" },
    });
    const user = userEvent.setup();
    renderWithProviders(<AuthView />);

    await signIn(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A sessão criada não pôde ser validada.",
    );
    expect(authClient.signOut).toHaveBeenCalled();
    expect(deleteSessionToken).toHaveBeenCalled();
    expect(setAuthToken).toHaveBeenLastCalledWith(null);
  });

  it("restores and revokes the persisted session", async () => {
    vi.mocked(loadSessionToken).mockResolvedValue("token-ana");
    const user = userEvent.setup();
    renderWithProviders(<AuthView />);

    expect(await screen.findByRole("heading", { name: "Olá, Ana" })).toBeVisible();
    expect(setAuthToken).toHaveBeenCalledWith("token-ana");
    await user.click(screen.getByRole("button", { name: "Sair desta conta" }));

    await waitFor(() => expect(authClient.signOut).toHaveBeenCalled());
    expect(deleteSessionToken).toHaveBeenCalled();
    expect(await screen.findByRole("heading", { name: "Entrar no Dango" })).toBeVisible();
  });

  it("switches to English and persists the selection", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AuthView />);

    await screen.findByRole("heading", { name: "Entrar no Dango" });
    await user.selectOptions(screen.getByLabelText("Idioma"), "en");

    expect(await screen.findByRole("heading", { name: "Sign in to Dango" })).toBeVisible();
    expect(window.localStorage.getItem("dango.language")).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("translates Zod errors when switching languages", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AuthView />);

    await user.type(await screen.findByLabelText("Email"), "email-invalido");
    await user.type(screen.getByLabelText("Senha"), "senha");
    const signInButtons = screen.getAllByRole("button", { name: "Entrar" });
    await user.click(signInButtons[signInButtons.length - 1]);
    expect(await screen.findByText("Informe um email válido.")).toBeVisible();

    await user.selectOptions(screen.getByLabelText("Idioma"), "en");
    expect(await screen.findByText("Enter a valid email address.")).toBeVisible();
    expect(authClient.signIn.email).not.toHaveBeenCalled();
  });

  it("distinguishes network failures during sign-in", async () => {
    vi.mocked(authClient.signIn.email).mockRejectedValue(new TypeError("Failed to fetch"));
    const user = userEvent.setup();
    renderWithProviders(<AuthView />);

    await signIn(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível acessar o serviço. Verifique sua conexão e tente novamente.",
    );
  });
});

async function signIn(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText("Email"), "ana@example.com");
  await user.type(screen.getByLabelText("Senha"), "uma-senha-segura");
  const signInButtons = screen.getAllByRole("button", { name: "Entrar" });
  await user.click(signInButtons[signInButtons.length - 1]);
}
