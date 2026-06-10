import { apiFetch } from "@/lib/api/client";
import type { CurrentUser } from "@/lib/api/types";

export function getMe() {
  return apiFetch<CurrentUser>("/me");
}
