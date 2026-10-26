import { useEffect, useState } from "react";
import type { ComponentProps } from "react";
import { AlertTriangle, UserRound, WalletCards, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { USER_ROLES } from "@/constants/systemRoles";
import { getAuthenticatedRoleId, getAuthenticatedUser } from "@/services/accessControl";
import { QuotationConfirmationDialogShell } from "../QuotationConfirmationDialogShell";
import { QuotationConfirmationOverview } from "./QuotationConfirmationOverview";
import { QuotationHotelReviewSections } from "./QuotationHotelReviewSections";
import { QuotationPassengerForm } from "../QuotationPassengerForm";
import { QuotationTravelDetailsForm } from "../QuotationTravelDetailsForm";
import { QuotationDialogFooter } from "../QuotationDialogFooter";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

type QuotationConfirmationDialogProps = {
  open: ComponentProps<typeof QuotationConfirmationDialogShell>["open"];
  onOpenChange: ComponentProps<typeof QuotationConfirmationDialogShell>["onOpenChange"];
  overview: ComponentProps<typeof QuotationConfirmationOverview>;
  hotelReview: ComponentProps<typeof QuotationHotelReviewSections>;
  passenger: ComponentProps<typeof QuotationPassengerForm>;
  travel: ComponentProps<typeof QuotationTravelDetailsForm>;
  footer: ComponentProps<typeof QuotationDialogFooter>;
  onHoldHotels: () => Promise<boolean>;
  onSaveGuestDetails: () => Promise<boolean>;
  isPrebooking: boolean;
};

/**
 * Renders the single-page Stitch package-booking layout.
 *
 * Guest details and confirmation stay mounted together; hotel review/hold
 * content is mounted only for itineraries that actually require hotel booking.
 */
export function QuotationConfirmationDialog({
  open,
  onOpenChange,
  overview,
  hotelReview,
  passenger,
  footer,
  onHoldHotels,
  onSaveGuestDetails,
  isPrebooking,
}: QuotationConfirmationDialogProps) {
  const [isHoldingHotels, setIsHoldingHotels] = useState(false);
  const [isSavingGuestDetails, setIsSavingGuestDetails] = useState(false);
  const [holdPolicyMessage, setHoldPolicyMessage] = useState<string | null>(null);
  const [allHotelsHeld, setAllHotelsHeld] = useState(false);
  const hasHotelBookingFlow = hotelReview.requiresHotelBookingFlow;
  const refreshHoldRequests = hotelReview.refreshHoldRequests;
  useEffect(() => {
    if (!open || !hasHotelBookingFlow || !refreshHoldRequests) return;
    void refreshHoldRequests().catch(() => undefined);
    const timer = window.setInterval(() => {
      void refreshHoldRequests?.().catch(() => undefined);
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [hasHotelBookingFlow, open, refreshHoldRequests]);
  const walletAmount = overview.walletBalanceAmount ?? overview.parseWalletAmount(overview.walletBalance);
  const packageAmount = Number(overview.confirmRequiredAmount || 0);
  const balanceAfterBooking = walletAmount - packageAmount;
  const authenticatedUser = getAuthenticatedUser();
  const authenticatedRole = getAuthenticatedRoleId(authenticatedUser);
  const quotationAgentName = String(overview.agentInfo?.agent_name || "").trim();
  const quotationAgentDisplayName = String(overview.agentInfo?.agent_display_name || "").trim();
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

  const handleHoldHotels = async () => {
    setIsHoldingHotels(true);
    try {
      await onHoldHotels();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error || "");
      if (/HOTEL_HOLD_NOT_ALLOWED/i.test(message)) {
        setHoldPolicyMessage(message.replace(/^HOTEL_HOLD_NOT_ALLOWED:\s*/i, ""));
      }
    } finally {
      setIsHoldingHotels(false);
    }
  };

  const handleSaveGuestDetails = async () => {
    setIsSavingGuestDetails(true);
    try {
      await onSaveGuestDetails();
    } finally {
      setIsSavingGuestDetails(false);
    }
  };

  return (
    <QuotationConfirmationDialogShell
      open={open}
      onOpenChange={onOpenChange}
      description={hasHotelBookingFlow ? "Review the selected hotels and confirm your booking." : "Review the guest details and confirm your booking."}
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-[#0f1b4d] sm:text-2xl">Book Total Package</h1>
            <p className="mt-1 text-xs text-slate-500">{hasHotelBookingFlow ? "Review the selected hotels and confirm your booking." : "Review the guest details and confirm your booking."}</p>
          </div>
          <div className="flex items-center gap-3 self-end text-left">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#7c3aed] text-xs font-bold text-white">{profileInitials}</span>
            <span className="leading-tight">
              <span className="block max-w-56 truncate text-xs font-bold text-slate-900" title={profileName}>{profileName}</span>
              <span className="block max-w-56 truncate text-[10px] text-slate-500" title={profileCompany}>{profileCompany}</span>
            </span>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Close booking modal"
              title="Close"
              className="ml-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5c24e5] focus:ring-offset-2"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <section className="space-y-4 rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm sm:p-5" aria-labelledby="booking-guest-details-title">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f3eeff] text-[#5c24e5]"><UserRound className="h-6 w-6" /></div>
              <div>
                <h2 id="booking-guest-details-title" className="text-sm font-bold text-[#1e1b4b]">Enter Guest Details</h2>
                <p className="mt-0.5 text-xs text-slate-400">Complete guest information before confirming your booking.</p>
              </div>
            </div>
          </div>
          <QuotationPassengerForm {...passenger} compact roomCount={overview.confirmRoomCount} compactAction={<Button type="button" onClick={() => void handleSaveGuestDetails()} disabled={isSavingGuestDetails} className="shrink-0 bg-[#5c24e5] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#4d1ecc]">{isSavingGuestDetails ? "Saving..." : <>Save Guest Details &amp; Continue <span aria-hidden="true" className="ml-2">→</span></>}</Button>} />
        </section>

        {hasHotelBookingFlow && <section className="space-y-4">
          <div id="hotel-review-details" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <QuotationHotelReviewSections
              {...hotelReview}
              onBulkHoldAvailabilityChange={setAllHotelsHeld}
              onChangeHotel={() => {
                onOpenChange(false);
                window.setTimeout(() => document.getElementById("hotel-list-section")?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
              }}
              compact
            />
          </div>
        </section>}

        <section className="space-y-4 pt-1" aria-labelledby="booking-confirm-pay-title">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" data-purpose="wallet-summary">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f3eeff] text-[#5c24e5]"><WalletCards className="h-6 w-6" /></div>
                <div><h3 className="text-xs font-bold text-[#1e1b4b]">Wallet Summary</h3><p className="text-[11px] text-slate-400">Your wallet will be debited for the package amount upon confirmation.</p></div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-4 rounded-lg bg-[#faf8ff] p-3 text-right md:bg-transparent md:p-0">
                <div><span className="block text-[10px] font-medium text-slate-400">Current Wallet Balance</span><strong className="text-sm font-extrabold text-[#5c24e5]">{overview.formatCurrency(walletAmount)}</strong></div>
                <span className="hidden h-7 w-px bg-slate-200 md:block" aria-hidden="true" />
                <div><span className="block text-[10px] font-medium text-slate-400">Package Amount</span><strong className="text-sm font-extrabold text-[#5c24e5]">{overview.formatCurrency(packageAmount)}</strong></div>
                <span className="hidden h-7 w-px bg-slate-200 md:block" aria-hidden="true" />
                <div><span className="block text-[10px] font-medium text-slate-400">Balance After Booking</span><strong className={`text-sm font-extrabold ${balanceAfterBooking < 0 ? "text-red-600" : "text-[#5c24e5]"}`}>{overview.formatCurrency(balanceAfterBooking)}</strong></div>
              </div>
            </div>
          </div>
          <details className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <summary className="cursor-pointer text-xs font-semibold text-[#4a4260]">View payment requirements and rooming preview</summary>
            <div className="mt-3 border-t border-slate-100 pt-4">
              <QuotationConfirmationOverview {...overview} />
            </div>
          </details>
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-end">
            {hasHotelBookingFlow && <Button
              type="button"
              className="bg-[#ff9900] font-bold text-white hover:bg-[#e68a00]"
              onClick={() => void handleHoldHotels()}
              disabled={isPrebooking || isHoldingHotels || allHotelsHeld}
              title={allHotelsHeld ? "All hotels already have an active hold request." : undefined}
            >
              {isPrebooking || isHoldingHotels ? "Holding Hotels..." : "Hold Hotels"}
            </Button>}
            <QuotationDialogFooter {...footer} showCancel={false} stitchStyle />
          </div>
        </section>
      </div>
      <Dialog open={Boolean(holdPolicyMessage)} onOpenChange={(nextOpen) => { if (!nextOpen) setHoldPolicyMessage(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 sm:mx-0">
              <AlertTriangle className="h-6 w-6" aria-hidden="true" />
            </div>
            <DialogTitle>Hotel hold is not available</DialogTitle>
            <DialogDescription>
              {holdPolicyMessage || "Hotel blocking is not allowed for this stay."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={() => setHoldPolicyMessage(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </QuotationConfirmationDialogShell>
  );
}

export default QuotationConfirmationDialog;
