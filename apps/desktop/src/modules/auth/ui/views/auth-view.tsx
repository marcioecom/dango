import { BrandMark } from "@dango/ui/components/brand-mark";
import { Button } from "@dango/ui/components/button";
import { Skeleton } from "@dango/ui/components/skeleton";
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
    <main className="min-h-svh lg:grid lg:grid-cols-[minmax(19rem,0.8fr)_minmax(30rem,1.2fr)]">
      <aside className="flex border-b border-border bg-secondary p-5 lg:min-h-svh lg:flex-col lg:border-r lg:border-b-0 lg:p-9">
        <div className="flex w-full items-center justify-between gap-4 lg:block">
          <div className="flex items-center gap-2.5 font-semibold tracking-[-0.02em]">
            <BrandMark className="size-8" />
            <span>Dango</span>
          </div>
          <LanguageSelector />
        </div>
        <div className="my-auto hidden max-w-lg lg:block">
          <p className="mb-3 text-sm font-semibold text-primary">{t("brand.topic")}</p>
          <h1 className="max-w-[15ch] text-[2.5rem] leading-[1.08] font-semibold tracking-[-0.04em] text-balance">
            {t("brand.tagline")}
          </h1>
          <p className="mt-6 max-w-[44ch] leading-7 text-pretty text-muted-foreground">
            {t("brand.supporting")}
          </p>
        </div>
        <p className="hidden text-xs text-muted-foreground lg:block">{t("brand.privacy")}</p>
      </aside>

      <section className="flex min-h-[calc(100svh-5rem)] items-center justify-center p-6 sm:p-10 lg:min-h-svh lg:p-16">
        {session.isPending ? <Restoring /> : null}
        {session.isError ? <RestoreError error={session.error} onRetry={session.refetch} /> : null}
        {session.data ? <AccountView user={session.data} /> : null}
        {session.isSuccess && !session.data && isAwaitingVerification ? (
          <Verification onReturn={() => selectMode("sign-in")} />
        ) : null}
        {session.isSuccess && !session.data && !isAwaitingVerification ? (
          <div className="w-full max-w-md">
            <div>
              <p className="mb-3 text-sm font-semibold text-primary">{t("auth.privateAccount")}</p>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-balance">
                {t(mode === "sign-up" ? "signUp.title" : "login.title")}
              </h2>
              <p className="mt-3 max-w-[46ch] leading-7 text-pretty text-muted-foreground">
                {t(mode === "sign-up" ? "signUp.description" : "login.description")}
              </p>
            </div>
            <div
              className="my-7 grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1"
              aria-label={t("auth.modeLabel")}
            >
              <Button
                aria-pressed={mode === "sign-in"}
                className="h-9 aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-[0_1px_4px_color-mix(in_oklch,var(--foreground)_12%,transparent)]"
                onClick={() => selectMode("sign-in")}
                type="button"
                variant="ghost"
              >
                {t("login.submit")}
              </Button>
              <Button
                aria-pressed={mode === "sign-up"}
                className="h-9 aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-[0_1px_4px_color-mix(in_oklch,var(--foreground)_12%,transparent)]"
                onClick={() => selectMode("sign-up")}
                type="button"
                variant="ghost"
              >
                {t("signUp.submit")}
              </Button>
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
    <div className="w-full max-w-md" role="status">
      <Skeleton className="mb-4 h-7 w-1/2" />
      <Skeleton className="h-3.5 w-3/4" />
      <span className="sr-only">{t("restoring")}</span>
    </div>
  );
}

function RestoreError({ error, onRetry }: { error: Error; onRetry: () => unknown }) {
  const { t } = useTranslation();
  return (
    <div className="w-full max-w-md">
      <p className="mb-3 text-sm font-semibold text-primary">{t("restore.status")}</p>
      <h2 className="text-2xl font-semibold tracking-[-0.03em] text-balance">
        {t("restore.title")}
      </h2>
      <p className="mt-3 max-w-[46ch] leading-7 text-pretty text-muted-foreground">
        {t(errorKey(error, "errors.restore"))}
      </p>
      <Button className="mt-7" onClick={onRetry} type="button">
        {t("restore.retry")}
      </Button>
    </div>
  );
}

function Verification({ onReturn }: { onReturn: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="w-full max-w-md">
      <div className="mb-7 grid size-11 place-items-center rounded-full bg-success text-success-foreground" aria-hidden="true">
        <svg viewBox="0 0 20 20" className="size-5" fill="none">
          <path d="m5 10 3 3 7-7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </div>
      <h2 className="text-2xl font-semibold tracking-[-0.03em] text-balance">
        {t("verification.title")}
      </h2>
      <p className="mt-3 max-w-[46ch] leading-7 text-pretty text-muted-foreground">
        {t("verification.description")}
      </p>
      <Button className="mt-7" onClick={onReturn} type="button">
        {t("verification.return")}
      </Button>
    </div>
  );
}
