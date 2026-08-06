import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  notificationKey,
  shouldSendReminder,
  type ReminderDecision,
} from "../reminder-schedule";

export type PermissionState = "granted" | "denied" | "not-requested";

export interface ReminderSettings {
  hasPendingWork: boolean;
  lastNotificationKey: string | null;
  permissionState: PermissionState;
  scheduledTime: string;
}

const SETTINGS_KEY = "dango.reminder.tracer-bullet";

const defaultSettings: ReminderSettings = {
  hasPendingWork: false,
  lastNotificationKey: null,
  permissionState: "not-requested",
  scheduledTime: "09:00",
};

function loadSettings(): ReminderSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved
      ? { ...defaultSettings, ...JSON.parse(saved) }
      : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

export function useReminder() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(loadSettings);
  const [status, setStatus] = useState<
    ReminderDecision | "permission-required" | "sent"
  >("outside-schedule");

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    isPermissionGranted()
      .then((granted) => {
        if (!granted) return;

        setSettings((current) => ({
          ...current,
          permissionState: "granted",
        }));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    async function checkSchedule() {
      const now = new Date();
      const decision = shouldSendReminder({ ...settings, now });
      setStatus(decision);

      if (decision !== "send") return;
      if (settings.permissionState !== "granted") {
        setStatus("permission-required");
        return;
      }

      try {
        sendNotification({
          title: t("reminder.notificationTitle"),
          body: t("reminder.notificationBody"),
        });
        setSettings((current) => ({
          ...current,
          lastNotificationKey: notificationKey(now),
        }));
        setStatus("sent");
      } catch {
        setStatus("permission-required");
      }
    }

    checkSchedule();
    const interval = window.setInterval(() => checkSchedule(), 10_000);
    return () => window.clearInterval(interval);
  }, [settings, t]);

  async function requestNotificationPermission() {
    try {
      const permission = await requestPermission();
      const permissionState: PermissionState =
        permission === "granted" ? "granted" : "denied";
      setSettings((current) => ({ ...current, permissionState }));
    } catch {
      setSettings((current) => ({ ...current, permissionState: "denied" }));
    }
  }

  function setScheduledTime(scheduledTime: string) {
    setSettings((current) => ({ ...current, scheduledTime }));
  }

  function setHasPendingWork(hasPendingWork: boolean) {
    setSettings((current) => ({ ...current, hasPendingWork }));
  }

  return {
    hasPendingWork: settings.hasPendingWork,
    permissionState: settings.permissionState,
    requestNotificationPermission,
    scheduledTime: settings.scheduledTime,
    setHasPendingWork,
    setScheduledTime,
    status,
  };
}
