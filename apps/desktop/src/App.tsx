import { startTransition, useEffect, useState, type FormEvent } from "react";

import { getCurrentUser, revokeSession, signIn, signUp } from "./auth/api";
import { deleteSessionToken, loadSessionToken, saveSessionToken } from "./auth/keychain";
import { AuthenticationError, type AuthenticatedUser } from "./auth/types";
import "./App.css";

type Screen = "account" | "auth" | "restoring" | "restore-error" | "verification";
type AuthMode = "sign-in" | "sign-up";

function messageFrom(error: unknown) {
  if (error instanceof AuthenticationError) {
    return error.message;
  }
  return "Algo deu errado. Tente novamente.";
}

function App() {
  const [screen, setScreen] = useState<Screen>("restoring");
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function restore() {
      try {
        const storedToken = await loadSessionToken();
        if (!storedToken) {
          if (active) setScreen("auth");
          return;
        }

        const restoredUser = await getCurrentUser(storedToken);
        if (!restoredUser) {
          await deleteSessionToken();
          if (active) setScreen("auth");
          return;
        }

        if (active) {
          setToken(storedToken);
          setUser(restoredUser);
          setScreen("account");
        }
      } catch (restoreError) {
        if (active) {
          setError(messageFrom(restoreError));
          setScreen("restore-error");
        }
      }
    }

    void restore();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    try {
      if (mode === "sign-up") {
        await signUp({
          email,
          name: String(form.get("name") ?? ""),
          password,
        });
        setScreen("verification");
        return;
      }

      const nextToken = await signIn({ email, password });
      try {
        await saveSessionToken(nextToken);
      } catch {
        await revokeSession(nextToken);
        throw new AuthenticationError(
          "unexpected",
          "Não foi possível proteger a sessão no Keychain do macOS.",
        );
      }

      const nextUser = await getCurrentUser(nextToken);
      if (!nextUser) {
        await deleteSessionToken();
        throw new AuthenticationError("unexpected", "A sessão criada não pôde ser validada.");
      }

      setToken(nextToken);
      setUser(nextUser);
      setScreen("account");
    } catch (submitError) {
      setError(messageFrom(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    if (!token) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await revokeSession(token);
      await deleteSessionToken();
      setToken(null);
      setUser(null);
      setScreen("auth");
    } catch (logoutError) {
      setError(messageFrom(logoutError));
    } finally {
      setIsSubmitting(false);
    }
  }

  function selectMode(nextMode: AuthMode) {
    setError(null);
    startTransition(() => setMode(nextMode));
  }

  return (
    <main className="app-shell">
      <aside className="context-panel">
        <div className="wordmark"><span aria-hidden="true">AM</span> Anki Miner</div>
        <div className="context-copy">
          <p>Mineração de sentenças</p>
          <h1>Do encontro com uma palavra ao card revisado.</h1>
          <p className="supporting-copy">
            Entre na sua conta privada para manter capturas, decisões e histórico separados.
          </p>
        </div>
        <p className="privacy-note">Sessão protegida pelo Keychain do macOS</p>
      </aside>

      <section className="task-panel">
        {screen === "restoring" ? <Restoring /> : null}
        {screen === "restore-error" ? (
          <RestoreError error={error} onRetry={() => window.location.reload()} />
        ) : null}
        {screen === "verification" ? (
          <Verification onReturn={() => {
            setMode("sign-in");
            setError(null);
            setScreen("auth");
          }} />
        ) : null}
        {screen === "auth" ? (
          <AuthForm
            error={error}
            isSubmitting={isSubmitting}
            mode={mode}
            onModeChange={selectMode}
            onSubmit={handleSubmit}
          />
        ) : null}
        {screen === "account" && user ? (
          <Account error={error} isSubmitting={isSubmitting} onLogout={handleLogout} user={user} />
        ) : null}
      </section>
    </main>
  );
}

function Restoring() {
  return (
    <div className="status-view" role="status">
      <div className="skeleton-line skeleton-title" />
      <div className="skeleton-line" />
      <span className="sr-only">Restaurando sessão</span>
    </div>
  );
}

function RestoreError({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  return (
    <div className="status-view">
      <p className="section-label">Sessão preservada</p>
      <h2>Não foi possível confirmar sua sessão</h2>
      <p className="description">{error}</p>
      <button className="primary-button" onClick={onRetry} type="button">Tentar novamente</button>
    </div>
  );
}

function Verification({ onReturn }: { onReturn: () => void }) {
  return (
    <div className="status-view">
      <div className="success-mark" aria-hidden="true">@</div>
      <h2>Confira seu email</h2>
      <p className="description">
        Enviamos um link de confirmação. Abra-o no navegador e depois volte para entrar.
      </p>
      <button className="primary-button" onClick={onReturn} type="button">Voltar para entrar</button>
    </div>
  );
}

type AuthFormProps = {
  error: string | null;
  isSubmitting: boolean;
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function AuthForm({ error, isSubmitting, mode, onModeChange, onSubmit }: AuthFormProps) {
  const isSignUp = mode === "sign-up";
  return (
    <div className="form-view">
      <div>
        <p className="section-label">Conta privada</p>
        <h2>{isSignUp ? "Criar sua conta" : "Entrar no Anki Miner"}</h2>
        <p className="description">
          {isSignUp
            ? "Use um dos endereços autorizados para este beta."
            : "Continue de onde você parou no seu Mac."}
        </p>
      </div>

      <div className="mode-switch" aria-label="Escolha entre entrar ou criar conta">
        <button aria-pressed={!isSignUp} onClick={() => onModeChange("sign-in")} type="button">Entrar</button>
        <button aria-pressed={isSignUp} onClick={() => onModeChange("sign-up")} type="button">Criar conta</button>
      </div>

      <form onSubmit={onSubmit}>
        {isSignUp ? (
          <label>
            Nome
            <input autoComplete="name" maxLength={80} name="name" required />
          </label>
        ) : null}
        <label>
          Email
          <input autoCapitalize="none" autoComplete="email" inputMode="email" name="email" required type="email" />
        </label>
        <label>
          Senha
          <input autoComplete={isSignUp ? "new-password" : "current-password"} maxLength={128} minLength={8} name="password" required type="password" />
          {isSignUp ? <span className="field-hint">Use pelo menos 8 caracteres.</span> : null}
        </label>
        {error ? <p className="error-message" role="alert">{error}</p> : null}
        <button className="primary-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Aguarde..." : isSignUp ? "Criar conta" : "Entrar"}
        </button>
      </form>
    </div>
  );
}

function Account({
  error,
  isSubmitting,
  onLogout,
  user,
}: {
  error: string | null;
  isSubmitting: boolean;
  onLogout: () => void;
  user: AuthenticatedUser;
}) {
  return (
    <div className="status-view account-view">
      <p className="section-label">Sessão ativa</p>
      <h2>Olá, {user.name}</h2>
      <p className="description">Sua conta está pronta para usar o Anki Miner.</p>
      <dl>
        <div><dt>Email</dt><dd>{user.email}</dd></div>
        <div><dt>Verificação</dt><dd>Confirmada</dd></div>
      </dl>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      <button className="secondary-button" disabled={isSubmitting} onClick={onLogout} type="button">
        {isSubmitting ? "Saindo..." : "Sair desta conta"}
      </button>
    </div>
  );
}

export default App;
