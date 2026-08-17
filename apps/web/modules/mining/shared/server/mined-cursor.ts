import { MiningError } from "./errors";

export type MinedCursor = { updatedAt: Date; id: string };

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

export function encodeMinedCursor(cursor: MinedCursor): string {
  return Buffer.from(
    JSON.stringify({ id: cursor.id, u: cursor.updatedAt.toISOString() }),
    "utf8",
  ).toString("base64url");
}

export function decodeMinedCursor(value: string): MinedCursor {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as {
      id?: unknown;
      u?: unknown;
    };
    if (typeof parsed.id !== "string" || parsed.id.length === 0) {
      throw new Error("missing id");
    }
    if (typeof parsed.u !== "string" || !ISO_DATE_PATTERN.test(parsed.u)) {
      throw new Error("invalid date");
    }
    const updatedAt = new Date(parsed.u);
    if (Number.isNaN(updatedAt.getTime())) {
      throw new Error("invalid date");
    }
    return { id: parsed.id, updatedAt };
  } catch {
    throw new MiningError("INVALID_CURSOR", "A paginação informada é inválida. Recarregue a lista.", 400);
  }
}

export function escapeIlikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}
