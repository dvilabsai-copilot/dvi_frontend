import { useEffect, useState } from "react";
import { IMPERSONATION_ADMIN_ORIGIN } from "@/lib/api";
import { redeemImpersonationTicket } from "@/services/impersonationService";

export default function ImpersonationEntry() {
  const [message, setMessage] = useState("Waiting for the secure handoff…");

  useEffect(() => {
    // The entry page only needs the in-memory postMessage ticket. Drop the
    // opener relationship as soon as this isolated page loads.
    try { window.opener = null; } catch { /* browser may expose opener read-only */ }

    const handler = (event: MessageEvent) => {
      if (event.origin !== IMPERSONATION_ADMIN_ORIGIN || event.data?.type !== "DVI_IMPERSONATION_HANDOFF") return;
      const ticket = String(event.data.ticket || "").trim();
      if (!/^[a-f0-9]{64}$/i.test(ticket)) {
        setMessage("The secure handoff ticket is invalid.");
        return;
      }
      window.removeEventListener("message", handler);
      void redeemImpersonationTicket(ticket)
        .then(() => { window.location.replace("/"); })
        .catch((error: any) => setMessage(error?.message || "The secure handoff could not be completed."));
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return <main className="flex min-h-screen items-center justify-center p-6"><p className="rounded-md border bg-white p-6 text-sm shadow-sm">{message}</p></main>;
}
