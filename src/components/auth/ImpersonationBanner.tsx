import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { currentImpersonation, endImpersonation } from "@/services/impersonationService";
import { clearImpersonationBrowserState, getImpersonationBrowserUser, isImpersonationBrowserSession } from "@/lib/api";

export function ImpersonationBanner() {
  const [session, setSession] = useState<any>(() => getImpersonationBrowserUser());
  useEffect(() => { if (isImpersonationBrowserSession()) void currentImpersonation().then((value) => { if (!value?.active) clearImpersonationBrowserState(); else setSession((current: any) => ({ ...current, ...value.target })); }).catch(() => undefined); }, []);
  if (!isImpersonationBrowserSession() || !session) return null;
  const exit = async () => { await endImpersonation().catch(() => undefined); if (window.opener && !window.opener.closed) { window.close(); } else { window.location.assign("/"); } };
  return <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-amber-100 px-4 py-2 text-sm text-amber-950 shadow-sm" role="status"><span><strong>ADMIN ACCESS</strong> — You are logged in as {session.displayName || session.name || session.fullName || "User"} ({session.roleLabel || `Role ${session.roleID}`}).</span><Button size="sm" variant="outline" onClick={() => void exit()}>Exit Login As</Button></div>;
}
