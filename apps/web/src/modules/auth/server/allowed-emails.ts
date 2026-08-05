export function normalizeEmail(email: string) {
  return email.trim().toLocaleLowerCase("en-US");
}

export function parseAllowedEmails(value: string | undefined) {
  const emails = new Set(
    (value ?? "")
      .split(",")
      .map(normalizeEmail)
      .filter(Boolean),
  );

  if (emails.size === 0) {
    throw new Error("AUTH_ALLOWED_EMAILS deve conter pelo menos um email.");
  }

  return emails;
}
