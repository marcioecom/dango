export const miningQueryKeys = {
  captures: ["captures"] as const,
  minedCaptures: (filters: { search: string; status: string }) =>
    ["captures", "mined", filters] as const,
  session: (sessionId: string) => ["sessions", sessionId] as const,
};
