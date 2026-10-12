import {
  api,
  clearImpersonationBrowserState,
  IMPERSONATION_API_BASE_URL,
  IMPERSONATION_ORIGIN,
  isImpersonationConfigured,
  setImpersonationBrowserState,
} from "@/lib/api";

export type ImpersonationEntityType = "agent" | "staff" | "vendor" | "guide" | "hotel-user" | "user";
export type ImpersonationTarget = {
  userId: string;
  entityType: ImpersonationEntityType;
  entityId: string;
  displayName: string;
  email: string;
  roleID: number;
  roleLabel: string;
  status: "active";
  context: Record<string, unknown>;
};

export type ImpersonationResolve = {
  eligible: boolean;
  accounts: ImpersonationTarget[];
  target?: ImpersonationTarget;
};

export type ImpersonationStart = {
  sessionId: string;
  expiresAt: string;
  handoffExpiresAt: string;
  handoffTicket: string;
  target: ImpersonationTarget;
};

export function resolveImpersonation(entityType: ImpersonationEntityType, entityId: string | number, verifiedUserId?: string | number) {
  const normalizedUserId = String(verifiedUserId ?? "").trim();
  return api("/auth/impersonation/resolve", {
    method: "POST",
    body: {
      entityType,
      entityId: Number(entityId),
      ...(normalizedUserId ? { targetUserId: normalizedUserId } : {}),
    },
  }) as Promise<ImpersonationResolve>;
}

export function startImpersonation(targetUserId: string, reason: string): Promise<ImpersonationStart> {
  return api("/auth/impersonation/start", { method: "POST", body: { targetUserId, reason } }) as Promise<ImpersonationStart>;
}

export async function redeemImpersonationTicket(ticket: string) {
  const normalizedTicket = String(ticket || '').trim();
  if (!/^[a-f0-9]{64}$/i.test(normalizedTicket)) throw new Error("The secure handoff ticket is invalid.");
  if (!IMPERSONATION_API_BASE_URL) throw new Error("Impersonation API origin is not configured.");
  const response = await fetch(`${IMPERSONATION_API_BASE_URL}/auth/impersonation/redeem`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticket: normalizedTicket }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(payload?.message || "Unable to open the impersonated session."));
  setImpersonationBrowserState({
    sub: payload.target?.userId,
    userId: payload.target?.userId,
    email: payload.target?.email,
    role: payload.target?.roleID,
    roleID: payload.target?.roleID,
    name: payload.target?.displayName,
    fullName: payload.target?.displayName,
    isImpersonating: true,
    originalAdminUserId: payload.originalAdminUserId,
    impersonationSessionId: payload.sessionId,
    ...payload.target?.context,
  });
  return payload;
}

export function openImpersonationWindow() {
  if (!isImpersonationConfigured()) throw new Error("Secure impersonation isolation is not configured. Set the isolated origin and API origin first.");
  const targetWindow = window.open(`${IMPERSONATION_ORIGIN}/impersonation/entry`, "_blank");
  if (!targetWindow) throw new Error("The browser blocked the impersonation window. Allow pop-ups and try again.");
  return targetWindow;
}

export function launchImpersonation(start: ImpersonationStart, popup?: Window | null) {
  if (!isImpersonationConfigured()) throw new Error("Secure impersonation isolation is not configured. Set the isolated origin and API origin first.");
  const targetWindow = popup ?? openImpersonationWindow();
  const expiresAt = Date.now() + 5000;
  const timer = window.setInterval(() => {
    if (Date.now() > expiresAt || targetWindow.closed) {
      window.clearInterval(timer);
      return;
    }
    targetWindow.postMessage({ type: "DVI_IMPERSONATION_HANDOFF", ticket: start.handoffTicket }, IMPERSONATION_ORIGIN);
  }, 150);
}

export async function currentImpersonation() {
  return api("/auth/impersonation/current");
}

export async function endImpersonation() {
  try {
    return await api("/auth/impersonation/end", { method: "POST" });
  } finally {
    clearImpersonationBrowserState();
  }
}
