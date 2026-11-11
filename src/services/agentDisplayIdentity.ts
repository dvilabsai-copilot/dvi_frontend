/** Normalize Agent identity returned by the authenticated profile endpoint. */
import type { AuthTokenPayload } from "@/services/accessControl";

type ProfileRecord = Record<string, unknown>;
const asRecord = (value: unknown): ProfileRecord | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as ProfileRecord : null;

const profileKeys = ["agent_name", "agent_lastname", "agent_ID", "agent_primary_mobile_number", "agentName", "firstName", "name", "config"];

export function unpackAgentProfile(value: unknown): ProfileRecord {
  let obj = asRecord(value) || {};
  for (let depth = 0; depth < 4; depth += 1) {
    if (profileKeys.some(key => obj[key] !== undefined && obj[key] !== null)) return obj;
    const next = [obj.data, obj.profile, obj.agent, obj.result, obj.user, obj.payload]
      .map(asRecord).find(Boolean);
    if (!next) break;
    obj = next;
  }
  return obj;
}

const clean = (value: unknown) => String(value ?? "").trim();
const isUsableName = (value: string) =>
  Boolean(value) && !/^(agent|user|unknown|undefined|null|n\/?a|admin)$/i.test(value);

export function getAgentDisplayName(profile: unknown, token: AuthTokenPayload | null): string {
  const p = unpackAgentProfile(profile);
  const t = (token || {}) as AuthTokenPayload & {
    firstName?: string; lastName?: string; username?: string;
    first_name?: string; last_name?: string;
  };
  const possibilities = [
    [clean(p.agent_name), clean(p.agent_lastname)].filter(Boolean).join(" "),
    clean(p.agentName), clean(p.fullName),
    [clean(p.firstName || p.first_name), clean(p.lastName || p.last_name)].filter(Boolean).join(" "),
    clean(p.name),
    [clean(t.firstName || t.first_name), clean(t.lastName || t.last_name)].filter(Boolean).join(" "),
    clean(t.agentName), clean(t.fullName), clean(t.name), clean(t.username),
  ];
  return possibilities.find(isUsableName) || "Agent";
}

export function getAgentDisplayMobile(profile: unknown, token: AuthTokenPayload | null): string {
  const p = unpackAgentProfile(profile);
  return clean(p.agent_primary_mobile_number || p.agentMobile || p.mobile || p.phone || token?.agentMobile);
}
