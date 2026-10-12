import { useState } from "react";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getAuthenticatedRoleId } from "@/services/accessControl";
import { isImpersonationConfigured } from "@/lib/api";
import { launchImpersonation, openImpersonationWindow, resolveImpersonation, startImpersonation, type ImpersonationEntityType, type ImpersonationTarget } from "@/services/impersonationService";
import { LoginAsUserDialog } from "./LoginAsUserDialog";

export function LoginAsUserButton({ entityType, entityId, displayName, roleLabel, verifiedUserId }: { entityType: ImpersonationEntityType; entityId: string | number; displayName: string; roleLabel?: string; verifiedUserId?: string | number }) {
  const [accounts, setAccounts] = useState<ImpersonationTarget[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  if (getAuthenticatedRoleId() !== 1) return null;
  const configured = isImpersonationConfigured();
  const onClick = async () => {
    if (!configured) { toast.error("Secure impersonation is not configured on this deployment."); return; }
    setBusy(true);
    try {
      const resolved = await resolveImpersonation(entityType, entityId, verifiedUserId);
      const resolvedAccounts = (resolved.accounts || (resolved.target ? [resolved.target] : [])).map((account) => ({
        ...account,
        displayName: account.displayName || displayName,
        roleLabel: account.roleLabel || roleLabel || "User",
      }));
      if (!resolvedAccounts.length) throw new Error("No active login account is linked to this record.");
      setAccounts(resolvedAccounts);
      setSelectedUserId(resolvedAccounts.length === 1 ? resolvedAccounts[0].userId : "");
      setOpen(true);
    } catch (error: any) { toast.error(error?.message || "This account cannot be impersonated."); }
    finally { setBusy(false); }
  };
  const submit = async (userId: string, reason: string) => {
    setBusy(true);
    let popup: Window | null = null;
    try {
      // Open the isolated entry page during the user gesture, before the API
      // call, so popup blocking cannot leave an unused server session behind.
      popup = openImpersonationWindow();
      const started = await startImpersonation(userId, reason);
      launchImpersonation(started, popup);
      setOpen(false);
    } catch (error: any) { popup?.close(); toast.error(error?.message || "Unable to start impersonation."); }
    finally { setBusy(false); }
  };
  return <>
    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => void onClick()} disabled={busy} title={`Login as ${roleLabel || "User"}`} aria-label={`Login as ${roleLabel || "User"}`}><LogIn className="h-4 w-4 text-violet-600" /></Button>
    <LoginAsUserDialog open={open} accounts={accounts} selectedUserId={selectedUserId} onSelectUser={setSelectedUserId} busy={busy} onOpenChange={setOpen} onSubmit={submit} />
  </>;
}
