import { Button } from "@dango/ui/components/button";
import { useTranslation } from "react-i18next";

import { ReminderView } from "../../../reminder/ui/reminder-view";
import { useLogout } from "../../hooks/use-logout";
import { errorKey } from "../../session";
import type { AuthenticatedUser } from "../../types";

export function AccountView({ user }: { user: AuthenticatedUser }) {
  const { t } = useTranslation();
  const logoutMutation = useLogout();

  return (
    <div className="w-full max-w-md">
      <p className="mb-3 text-sm font-semibold text-primary">
        {t("account.status")}
      </p>
      <h2 className="text-2xl font-semibold tracking-[-0.03em] text-balance">
        {t("account.greeting", { name: user.name })}
      </h2>
      <p className="mt-3 max-w-[46ch] leading-7 text-pretty text-muted-foreground">
        {t("account.description")}
      </p>
      <dl className="mt-8 border-y border-border">
        <div className="flex justify-between gap-4 py-3.5">
          <dt>{t("account.email")}</dt>
          <dd className="m-0 font-semibold text-right">{user.email}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-border py-3.5">
          <dt>{t("account.verification")}</dt>
          <dd className="m-0 font-semibold text-right">
            {t("account.verified")}
          </dd>
        </div>
      </dl>
      <ReminderView />
      {logoutMutation.error ? (
        <p
          className="mt-5 rounded-md bg-destructive/10 p-3 text-sm leading-6 text-destructive"
          role="alert"
        >
          {t(errorKey(logoutMutation.error, "errors.logout"))}
        </p>
      ) : null}
      <Button
        className="mt-7"
        disabled={logoutMutation.isPending}
        onClick={() => logoutMutation.mutate()}
        type="button"
        variant="outline"
      >
        {logoutMutation.isPending
          ? t("account.loggingOut")
          : t("account.logout")}
      </Button>
    </div>
  );
}
