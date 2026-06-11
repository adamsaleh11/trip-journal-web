import { apiFetch } from "@/lib/api/client";
import type { CurrentUser, SharedTip } from "@/lib/api/types";

export function getMe() {
  return apiFetch<CurrentUser>("/me");
}

export function listSharedTips() {
  return apiFetch<SharedTip[]>("/me/shares");
}

export function deleteSharedTip(opaqueId: string) {
  return apiFetch<void>(`/me/shares/${opaqueId}`, {
    method: "DELETE",
  });
}
