import { describe, expect, it } from "vitest";
import { canQuickOnboardAgent } from "./accessControl";

describe("canQuickOnboardAgent", () => {
  it("allows a legacy PHP Travel Expert", () => {
    expect(
      canQuickOnboardAgent({
        roleID: 3,
        permissionRoleId: 3,
        staffId: 123,
      }),
    ).toBe(true);
  });

  it("does not allow ordinary staff", () => {
    expect(
      canQuickOnboardAgent({
        roleID: 3,
        permissionRoleId: 8,
        staffId: 123,
      }),
    ).toBe(false);
  });

  it("preserves Admin and current Travel Expert access", () => {
    expect(canQuickOnboardAgent({ roleID: 1 })).toBe(true);
    expect(canQuickOnboardAgent({ roleID: 8, staffId: 123 })).toBe(true);
  });
});
