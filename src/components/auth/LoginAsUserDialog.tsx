import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ImpersonationTarget } from "@/services/impersonationService";

export function LoginAsUserDialog({ open, accounts, selectedUserId, onSelectUser, busy, onOpenChange, onSubmit }: { open: boolean; accounts: ImpersonationTarget[]; selectedUserId: string; onSelectUser: (userId: string) => void; busy?: boolean; onOpenChange: (open: boolean) => void; onSubmit: (userId: string, reason: string) => Promise<void> }) {
  const [reason, setReason] = useState("");
  const submit = async () => {
    if (!selectedUserId || reason.trim().length < 3) return;
    await onSubmit(selectedUserId, reason.trim());
    setReason("");
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Login As User</DialogTitle>
        <DialogDescription>Open the selected account in a secure isolated session.</DialogDescription>
      </DialogHeader>
      <div className="space-y-2 rounded-md border bg-slate-50 p-3 text-sm">
        <div className="font-semibold">Select login account</div>
        {accounts.map((account) => (
          <label key={account.userId} className="flex cursor-pointer items-start gap-3 rounded border bg-white p-3">
            <input type="radio" name="impersonation-account" value={account.userId} checked={selectedUserId === account.userId} onChange={() => onSelectUser(account.userId)} className="mt-1" />
            <span className="space-y-1">
              <span className="block"><strong>Name:</strong> {account.displayName}</span>
              <span className="block"><strong>Email:</strong> {account.email || "—"}</span>
              <span className="block"><strong>Role:</strong> {account.roleLabel}</span>
              <span className="block"><strong>Status:</strong> {account.status}</span>
            </span>
          </label>
        ))}
      </div>
      <label className="space-y-2 text-sm font-medium">Reason for Access
        <textarea className="min-h-24 w-full rounded-md border p-2 font-normal" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Example: Investigating booking or account configuration issue" required />
      </label>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
        <Button type="button" onClick={() => void submit()} disabled={busy || !selectedUserId || reason.trim().length < 3}>{busy ? "Opening…" : "Login As User"}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
