/**
 * Must stay aligned with dvi_users.roleID in the Nest API.
 * 1 = Admin, 3/8 = Travel Expert, 6 = Accounts.
 */
export const ITINERARY_COST_BREAKDOWN_VISIBLE_ROLES = new Set([1, 3, 6, 8]);

export function getAuthenticatedRole(): number | null {
  if (typeof window === "undefined") return null;

  const token = window.localStorage.getItem("accessToken");
  if (!token) return null;

  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(window.atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")));
    const role = Number(decoded?.role);
    return Number.isInteger(role) ? role : null;
  } catch {
    return null;
  }
}

export function canViewItineraryCostBreakdown(role = getAuthenticatedRole()): boolean {
  return role !== null && ITINERARY_COST_BREAKDOWN_VISIBLE_ROLES.has(role);
}

export function isAgentRole(role = getAuthenticatedRole()): boolean {
  return role === 4;
}
