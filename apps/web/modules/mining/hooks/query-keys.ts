export const miningQueryKeys = {
  captures: ["captures"] as const,
  session: (sessionId: string) => ["sessions", sessionId] as const,
};
