import { afterEach, describe, expect, it } from "vitest";
import { clearImpersonationBrowserState, clearToken, getImpersonationBrowserUser, setImpersonationBrowserState, setToken } from "@/lib/api";
import { getAuthenticatedRoleId, getAuthenticatedUser } from "@/services/accessControl";

function token(payload: Record<string, unknown>) {
  const encode = (value: unknown) => btoa(JSON.stringify(value)).replace(/=/g, "");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.signature`;
}

describe("impersonation browser session isolation", () => {
  afterEach(() => {
    clearToken();
    clearImpersonationBrowserState();
  });

  it("keeps the normal ADMIN token untouched while storing only safe target metadata", () => {
    const adminToken = token({ sub: "1", roleID: 1 });
    setToken(adminToken);
    setImpersonationBrowserState({ sub: "2", roleID: 4, name: "Agent", isImpersonating: true });

    expect(localStorage.getItem("accessToken")).toBe(adminToken);
    expect(getImpersonationBrowserUser()).toMatchObject({ sub: "2", roleID: 4 });
    expect(getAuthenticatedUser()).toMatchObject({ sub: "2", roleID: 4, isImpersonating: true });
  });

  it("does not expose Login As identity to a non-ADMIN role", () => {
    setToken(token({ sub: "3", roleID: 4 }));
    expect(getAuthenticatedRoleId()).toBe(4);
    expect(getImpersonationBrowserUser()).toBeNull();
  });
});
