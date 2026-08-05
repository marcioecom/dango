import { invoke } from "@tauri-apps/api/core";

export function loadSessionToken() {
  return invoke<string | null>("load_session_token");
}

export function saveSessionToken(token: string) {
  return invoke<void>("save_session_token", { token });
}

export function deleteSessionToken() {
  return invoke<void>("delete_session_token");
}
