import React from "react";
import { Bell, ChevronDown, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { USER_ROLES } from "@/constants/systemRoles";
import { getAuthenticatedRoleId, getAuthenticatedUser } from "@/services/accessControl";

const getProfileRoleLabel = (role: number): string => {
  if (role === USER_ROLES.ADMIN) return "Super Admin";
  if (role === USER_ROLES.AGENT) return "Agent";
  if (role === USER_ROLES.STAFF) return "Staff";
  if (role === USER_ROLES.VENDOR) return "Vendor";
  if (role === USER_ROLES.TRAVEL_EXPERT) return "Travel Expert";
  if (role === USER_ROLES.VEHICLE_AGENT) return "Itinerary Agent";
  if (role === USER_ROLES.HOTEL_ADMIN) return "Hotel Admin";
  return "User";
};

const getProfileInitials = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  return (words[0]?.slice(0, 2) || "U").toUpperCase();
};

export interface QuotationConfirmationDialogShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  quotationAgent?: {
    agent_name?: string | null;
    agent_display_name?: string | null;
  } | null;
  title?: string;
  description?: string;
}

export function QuotationConfirmationDialogShell({
  open,
  onOpenChange,
  children,
  quotationAgent = null,
  title = "Book Total Package",
  description = "Complete the steps below to hold hotels and confirm your booking.",
}: QuotationConfirmationDialogShellProps) {
  const authenticatedUser = getAuthenticatedUser();
  const authenticatedRole = getAuthenticatedRoleId(authenticatedUser);
  const quotationAgentName = String(quotationAgent?.agent_name || "").trim();
  const quotationAgentDisplayName = String(quotationAgent?.agent_display_name || "").trim();
  const profileName = String(
    quotationAgentName ||
      quotationAgentDisplayName ||
      authenticatedUser?.agentName ||
      authenticatedUser?.name ||
      authenticatedUser?.fullName ||
      authenticatedUser?.email ||
      "User",
  ).trim();
  const profileCompany = String(
    (quotationAgentDisplayName && quotationAgentDisplayName !== profileName
      ? quotationAgentDisplayName
      : authenticatedUser?.companyName || getProfileRoleLabel(authenticatedRole)),
  ).trim();
  const profileInitials = getProfileInitials(profileName);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="h-[calc(100dvh-40px)] w-[calc(100vw-40px)] max-w-none max-h-none overflow-hidden rounded-md border border-slate-200 bg-[#f4f7fc] p-0 text-[#1e293b] shadow-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="h-full overflow-y-auto">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-2.5 sm:px-6">
            <div className="mx-auto flex min-h-11 max-w-[1440px] items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center" aria-hidden="true">
                  <span className="h-7 w-7 bg-[#e11d48]" style={{ clipPath: "polygon(8% 25%, 96% 8%, 57% 94%, 45% 50%)" }} />
                </span>
                <span className="leading-none"><span className="block text-xl font-black tracking-tight text-[#1e1b4b]">DVI<span className="text-[#2563eb]">.travel</span></span><span className="mt-0.5 block text-[8px] font-semibold uppercase tracking-wider text-slate-500">Holidays for everyone</span></span>
              </div>
              <div className="flex items-center gap-4 text-slate-500">
                <span className="relative" aria-label="3 notifications"><Bell className="h-5 w-5" /><span className="absolute -right-1 -top-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-600 text-[8px] font-bold text-white">3</span></span>
                <span className="hidden h-8 w-px bg-slate-200 sm:block" aria-hidden="true" />
                <span className="flex items-center gap-3 text-left" aria-label={`${profileName}, ${profileCompany}`}><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#7c3aed] text-xs font-bold text-white">{profileInitials}</span><span className="hidden leading-tight sm:block"><span className="block max-w-44 truncate text-xs font-bold text-slate-900" title={profileName}>{profileName}</span><span className="block max-w-44 truncate text-[10px] text-slate-500" title={profileCompany}>{profileCompany}</span></span><ChevronDown className="h-4 w-4 text-slate-400" /></span>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  aria-label="Close booking modal"
                  title="Close"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5c24e5] focus:ring-offset-2"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </header>
          <div className="min-h-full bg-[#f4f7fc] px-4 pb-12 pt-4 sm:px-6 sm:pt-5">
            <div className="mx-auto max-w-[1440px]">
              {children}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default QuotationConfirmationDialogShell;
