import { isTauri } from "@tauri-apps/api/core";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

export const desktopFetch: typeof globalThis.fetch = isTauri() ? tauriFetch : globalThis.fetch;
