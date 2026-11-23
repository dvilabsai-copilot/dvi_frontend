import { describe, expect, it } from "vitest";
import { canCurrentUserAccessRoute, canQuickOnboardAgent } from "./accessControl";
import { USER_ROLES } from "@/constants/systemRoles";

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

it("lets a vehicle agent reach their transport voucher without opening hotel voucher routes", () => {
  const viewer = { roleID: USER_ROLES.VEHICLE_AGENT, agentId: 42 };
  expect(canCurrentUserAccessRoute("/pdf-preview/travel-voucher/42", viewer)).toBe(true);
  expect(canCurrentUserAccessRoute("/pdf-preview/voucher/42", viewer)).toBe(false);
  expect(canCurrentUserAccessRoute("/pdf-preview/hotel-voucher/42", viewer)).toBe(false);
});
