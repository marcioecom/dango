"use client";

import { Button } from "@dango/ui/components/button";
import { useTranslation } from "react-i18next";

import { useLogout } from "../../hooks/use-logout";
import { LanguageSwitcher } from "./language-switcher";

export function AccountActions() {
  const { t } = useTranslation();
  const { isSigningOut, signOut, signOutError } = useLogout();

  return (
    <div className="flex items-center gap-1">
      {signOutError ? (
        <span className="sr-only" role="alert">
          {t("logoutError")}
        </span>
      ) : null}
      <LanguageSwitcher />
      <Button type="button" variant="ghost" size="sm" disabled={isSigningOut} onClick={signOut}>
        {t("logout")}
      </Button>
    </div>
  );
}
