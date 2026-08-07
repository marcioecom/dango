"use client";

import { useTranslation } from "react-i18next";

import { LanguageSwitcher } from "../components/language-switcher";
import { LoginForm } from "../components/login-form";

export function LoginView() {
  const { t } = useTranslation();

  return (
    <div className="w-full max-w-sm">
      <div className="mb-12 flex justify-end">
        <LanguageSwitcher />
      </div>
      <h1 className="text-3xl font-semibold tracking-[-0.035em] text-balance">{t("loginTitle")}</h1>
      <p className="mt-3 leading-7 text-muted-foreground">{t("loginHint")}</p>
      <div className="mt-10">
        <LoginForm />
      </div>
    </div>
  );
}
