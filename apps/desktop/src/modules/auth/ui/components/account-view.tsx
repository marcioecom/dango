import type { AuthenticatedUser } from "@anki-miner/api-client";
import { useTranslation } from "react-i18next";

import { useLogout } from "../../hooks/use-logout";
import { errorKey } from "../../session";

export function AccountView({ user }: { user: AuthenticatedUser }) {
  const { t } = useTranslation();
  const logoutMutation = useLogout();

  return (
    <div className="status-view account-view">
      <p className="section-label">{t("account.status")}</p>
      <h2>{t("account.greeting", { name: user.name })}</h2>
      <p className="description">{t("account.description")}</p>
      <dl>
        <div>
          <dt>{t("account.email")}</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt>{t("account.verification")}</dt>
          <dd>{t("account.verified")}</dd>
        </div>
      </dl>
      {logoutMutation.error ? (
        <p className="error-message" role="alert">
          {t(errorKey(logoutMutation.error, "errors.logout"))}
        </p>
      ) : null}
      <button
        className="secondary-button"
        disabled={logoutMutation.isPending}
        onClick={() => logoutMutation.mutate()}
        type="button"
      >
        {logoutMutation.isPending ? t("account.loggingOut") : t("account.logout")}
      </button>
    </div>
  );
}
