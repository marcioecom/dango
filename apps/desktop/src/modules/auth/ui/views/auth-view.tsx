import { startTransition, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAuthSession } from "../../hooks/use-auth-session";
import { errorKey } from "../../session";
import { AccountView } from "../components/account-view";
import { LanguageSelector } from "../components/language-selector";
import { LoginForm } from "../components/login-form";
import { SignUpForm } from "../components/sign-up-form";

type AuthMode = "sign-in" | "sign-up";

export function AuthView() {
  const { t } = useTranslation();
  const session = useAuthSession();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [isAwaitingVerification, setIsAwaitingVerification] = useState(false);

  function selectMode(nextMode: AuthMode) {
    startTransition(() => {
      setMode(nextMode);
      setIsAwaitingVerification(false);
    });
  }

  return (
    <main className="app-shell">
      <aside className="context-panel">
        <div className="wordmark">
          <span aria-hidden="true">AM</span> Anki Miner
        </div>
        <LanguageSelector />
        <div className="context-copy">
          <p>{t("brand.topic")}</p>
          <h1>{t("brand.tagline")}</h1>
          <p className="supporting-copy">{t("brand.supporting")}</p>
        </div>
        <p className="privacy-note">{t("brand.privacy")}</p>
      </aside>

      <section className="task-panel">
        {session.isPending ? <Restoring /> : null}
        {session.isError ? <RestoreError error={session.error} onRetry={session.refetch} /> : null}
        {session.data ? <AccountView user={session.data} /> : null}
        {session.isSuccess && !session.data && isAwaitingVerification ? (
          <Verification onReturn={() => selectMode("sign-in")} />
        ) : null}
        {session.isSuccess && !session.data && !isAwaitingVerification ? (
          <div className="form-view">
            <div>
              <p className="section-label">{t("auth.privateAccount")}</p>
              <h2>{t(mode === "sign-up" ? "signUp.title" : "login.title")}</h2>
              <p className="description">
                {t(mode === "sign-up" ? "signUp.description" : "login.description")}
              </p>
            </div>
            <div className="mode-switch" aria-label={t("auth.modeLabel")}>
              <button
                aria-pressed={mode === "sign-in"}
                onClick={() => selectMode("sign-in")}
                type="button"
              >
                {t("login.submit")}
              </button>
              <button
                aria-pressed={mode === "sign-up"}
                onClick={() => selectMode("sign-up")}
                type="button"
              >
                {t("signUp.submit")}
              </button>
            </div>
            {mode === "sign-up" ? (
              <SignUpForm onSuccess={() => setIsAwaitingVerification(true)} />
            ) : (
              <LoginForm />
            )}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function Restoring() {
  const { t } = useTranslation();
  return (
    <div className="status-view" role="status">
      <div className="skeleton-line skeleton-title" />
      <div className="skeleton-line" />
      <span className="sr-only">{t("restoring")}</span>
    </div>
  );
}

function RestoreError({ error, onRetry }: { error: Error; onRetry: () => unknown }) {
  const { t } = useTranslation();
  return (
    <div className="status-view">
      <p className="section-label">{t("restore.status")}</p>
      <h2>{t("restore.title")}</h2>
      <p className="description">{t(errorKey(error, "errors.restore"))}</p>
      <button className="primary-button" onClick={onRetry} type="button">
        {t("restore.retry")}
      </button>
    </div>
  );
}

function Verification({ onReturn }: { onReturn: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="status-view">
      <div className="success-mark" aria-hidden="true">
        @
      </div>
      <h2>{t("verification.title")}</h2>
      <p className="description">{t("verification.description")}</p>
      <button className="primary-button" onClick={onReturn} type="button">
        {t("verification.return")}
      </button>
    </div>
  );
}
