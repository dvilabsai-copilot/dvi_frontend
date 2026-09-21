import { api } from "@/lib/api";

export const LEGACY_B2B_URL =
  "https://www.b2b.dvi.co.in/legacy/";

export const LEGACY_SSO_ENABLED =
  String(import.meta.env.VITE_LEGACY_SSO_ENABLED || "")
    .trim()
    .toLowerCase() === "true";

export async function openLegacyB2B() {
  const popup = window.open("about:blank", "_blank");

  try {
    const response = (await api(
      "/auth/legacy-sso/ticket",
      { method: "POST" },
    )) as { ticket?: unknown };
    const ticket = String(response?.ticket || "");

    if (!/^[a-f0-9]{64}$/i.test(ticket)) {
      throw new Error("Unable to start legacy sign-in.");
    }

    const target = `${LEGACY_B2B_URL}sso-login.php?ticket=${encodeURIComponent(ticket)}`;

    if (popup && !popup.closed) {
      popup.opener = null;
      popup.location.replace(target);
      return;
    }

    window.location.assign(target);
  } catch (error) {
    popup?.close();
    throw error;
  }
}
