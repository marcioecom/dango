export type ReminderDecision =
  | "send"
  | "outside-schedule"
  | "no-pending-work"
  | "already-sent";

export interface ReminderCheck {
  hasPendingWork: boolean;
  lastNotificationKey: string | null;
  now: Date;
  scheduledTime: string;
}

export function notificationKey(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function shouldSendReminder({
  hasPendingWork,
  lastNotificationKey,
  now,
  scheduledTime,
}: ReminderCheck): ReminderDecision {
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  if (currentTime !== scheduledTime) return "outside-schedule";
  if (!hasPendingWork) return "no-pending-work";
  if (lastNotificationKey === notificationKey(now)) return "already-sent";

  return "send";
}
