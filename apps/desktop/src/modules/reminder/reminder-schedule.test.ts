import { describe, expect, it } from "vitest";

import { notificationKey, shouldSendReminder } from "./reminder-schedule";

const scheduled = new Date(2026, 7, 5, 9, 30);

describe("shouldSendReminder", () => {
  it("sends only when the configured minute has pending work", () => {
    expect(
      shouldSendReminder({
        hasPendingWork: true,
        lastNotificationKey: null,
        now: scheduled,
        scheduledTime: "09:30",
      }),
    ).toBe("send");
  });

  it("suppresses the configured minute when no work is pending", () => {
    expect(
      shouldSendReminder({
        hasPendingWork: false,
        lastNotificationKey: null,
        now: scheduled,
        scheduledTime: "09:30",
      }),
    ).toBe("no-pending-work");
  });

  it("does not send twice during the same scheduled minute", () => {
    expect(
      shouldSendReminder({
        hasPendingWork: true,
        lastNotificationKey: notificationKey(scheduled),
        now: scheduled,
        scheduledTime: "09:30",
      }),
    ).toBe("already-sent");
  });
});
