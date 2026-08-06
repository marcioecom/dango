import { Button } from "@dango/ui/components/button";
import { useTranslation } from "react-i18next";

import { useReminder } from "../hooks/use-reminder";

export function ReminderView() {
  const { t } = useTranslation();
  const {
    hasPendingWork,
    permissionState,
    requestNotificationPermission,
    scheduledTime,
    setHasPendingWork,
    setScheduledTime,
    status,
  } = useReminder();

  return (
    <section
      className="mt-10 border-t border-border pt-8"
      aria-labelledby="reminder-title"
    >
      <p className="text-sm font-semibold text-primary">
        {t("reminder.eyebrow")}
      </p>
      <h3
        id="reminder-title"
        className="mt-1 text-lg font-semibold tracking-[-0.02em]"
      >
        {t("reminder.title")}
      </h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {t("reminder.description")}
      </p>

      <dl className="mt-5 border-y border-border text-sm">
        <div className="flex items-center justify-between gap-4 py-3">
          <dt>{t("reminder.permission")}</dt>
          <dd className="m-0 font-medium">
            {t(`reminder.permissionStates.${permissionState}`)}
          </dd>
        </div>
      </dl>
      <Button
        className="mt-4"
        onClick={requestNotificationPermission}
        type="button"
        variant="outline"
      >
        {t("reminder.requestPermission")}
      </Button>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label
          className="grid gap-2 text-sm font-medium"
          htmlFor="reminder-test-time"
        >
          {t("reminder.testTime")}
          <input
            className="h-10 rounded-md border border-input bg-background px-3 text-foreground"
            id="reminder-test-time"
            onChange={(event) => setScheduledTime(event.target.value)}
            type="time"
            value={scheduledTime}
          />
        </label>
        <label className="flex items-center gap-3 self-end rounded-md border border-border px-3 py-2.5 text-sm font-medium">
          <input
            checked={hasPendingWork}
            onChange={(event) => setHasPendingWork(event.target.checked)}
            type="checkbox"
          />
          {t("reminder.pendingWork")}
        </label>
      </div>

      <p
        className="mt-5 rounded-md bg-secondary p-3 text-sm leading-6"
        role="status"
      >
        {t(`reminder.status.${status}`)}
      </p>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        {t("reminder.focusNote")}
      </p>
    </section>
  );
}
