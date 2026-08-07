"use client";

import { useTranslation } from "react-i18next";

type EmailVerificationViewProps = {
  error?: string;
};

export function EmailVerificationView({ error }: EmailVerificationViewProps) {
  const { t } = useTranslation();

  return (
    <section className="w-full" aria-labelledby="verification-title">
      <div
        className={
          error ? "size-2 rounded-full bg-destructive" : "size-2 rounded-full bg-success"
        }
        aria-hidden="true"
      />
      <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-4xl" id="verification-title">
        {error ? t("emailVerificationErrorTitle") : t("emailVerificationSuccessTitle")}
      </h1>
      <p className="mt-4 max-w-[52ch] leading-7 text-pretty text-muted-foreground">
        {error
          ? t("emailVerificationErrorDescription")
          : t("emailVerificationSuccessDescription")}
      </p>
    </section>
  );
}
