import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api/client";
import { deleteSharedTip, getMe, listSharedTips } from "@/lib/api/me";

vi.mock("@/lib/api/client", () => ({
  apiFetch: vi.fn(),
}));

const mockedApiFetch = vi.mocked(apiFetch);

describe("me API contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads the current user profile", async () => {
    mockedApiFetch.mockResolvedValueOnce({ uid: "user-1" });

    await getMe();

    expect(mockedApiFetch).toHaveBeenCalledWith("/me");
  });

  it("manages shared tips by opaque id", async () => {
    mockedApiFetch.mockResolvedValueOnce([]);
    mockedApiFetch.mockResolvedValueOnce(undefined);

    await listSharedTips();
    await deleteSharedTip("opaque-1");

    expect(mockedApiFetch).toHaveBeenNthCalledWith(1, "/me/shares");
    expect(mockedApiFetch).toHaveBeenNthCalledWith(2, "/me/shares/opaque-1", {
      method: "DELETE",
    });
  });
});
