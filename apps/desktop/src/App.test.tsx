import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";
import { getCurrentUser, revokeSession, signIn, signUp } from "./auth/api";
import { deleteSessionToken, loadSessionToken, saveSessionToken } from "./auth/keychain";

vi.mock("./auth/api", () => ({
  getCurrentUser: vi.fn(),
  revokeSession: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("./auth/keychain", () => ({
  deleteSessionToken: vi.fn(),
  loadSessionToken: vi.fn(),
  saveSessionToken: vi.fn(),
}));

const ana = {
  email: "ana@example.com",
  emailVerified: true,
  id: "user-ana",
  name: "Ana",
};

describe("desktop authentication", () => {
  beforeEach(() => {
    vi.mocked(loadSessionToken).mockResolvedValue(null);
    vi.mocked(deleteSessionToken).mockResolvedValue(undefined);
    vi.mocked(saveSessionToken).mockResolvedValue(undefined);
    vi.mocked(revokeSession).mockResolvedValue(undefined);
    vi.mocked(signUp).mockResolvedValue(undefined);
    vi.mocked(signIn).mockResolvedValue("token-ana");
    vi.mocked(getCurrentUser).mockResolvedValue(ana);
  });

  it("cria uma conta e orienta a verificação por email", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Criar conta" }));
    await user.type(screen.getByLabelText("Nome"), "Ana");
    await user.type(screen.getByLabelText("Email"), "ana@example.com");
    await user.type(screen.getByLabelText(/^Senha/), "uma-senha-segura");
    const createButtons = screen.getAllByRole("button", { name: "Criar conta" });
    await user.click(createButtons[createButtons.length - 1]);

    expect(await screen.findByRole("heading", { name: "Confira seu email" })).toBeVisible();
    expect(signUp).toHaveBeenCalledWith({
      email: "ana@example.com",
      name: "Ana",
      password: "uma-senha-segura",
    });
  });

  it("protege o token no Keychain após o login", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(await screen.findByLabelText("Email"), "ana@example.com");
    await user.type(screen.getByLabelText("Senha"), "uma-senha-segura");
    const signInButtons = screen.getAllByRole("button", { name: "Entrar" });
    await user.click(signInButtons[signInButtons.length - 1]);

    expect(await screen.findByRole("heading", { name: "Olá, Ana" })).toBeVisible();
    expect(saveSessionToken).toHaveBeenCalledWith("token-ana");
    expect(getCurrentUser).toHaveBeenCalledWith("token-ana");
  });

  it("restaura e revoga a sessão persistida", async () => {
    vi.mocked(loadSessionToken).mockResolvedValue("token-ana");
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Olá, Ana" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Sair desta conta" }));

    await waitFor(() => expect(revokeSession).toHaveBeenCalledWith("token-ana"));
    expect(deleteSessionToken).toHaveBeenCalled();
    expect(await screen.findByRole("heading", { name: "Entrar no Anki Miner" })).toBeVisible();
  });
});
