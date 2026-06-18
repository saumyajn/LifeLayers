import { describe, expect, it } from "vitest";
import { getAuthErrorMessage } from "./firebaseErrors";

describe("firebase error mapping", () => {
  it("maps common Google auth errors to friendly messages", () => {
    expect(getAuthErrorMessage("auth/unauthorized-domain")).toContain("not authorized");
    expect(getAuthErrorMessage("auth/operation-not-allowed")).toContain("not enabled");
    expect(getAuthErrorMessage("auth/popup-blocked")).toContain("Redirecting");
    expect(getAuthErrorMessage("auth/popup-closed-by-user")).toContain("closed");
    expect(getAuthErrorMessage("auth/network-request-failed")).toContain("Network");
    expect(getAuthErrorMessage("auth/invalid-api-key")).toContain("invalid or missing");
    expect(getAuthErrorMessage("auth/configuration-not-found")).toContain("not configured");
  });

  it("uses a generic friendly fallback for unknown auth errors", () => {
    expect(getAuthErrorMessage("auth/something-new")).toBe(
      "Google login failed. Please try again.",
    );
  });
});
