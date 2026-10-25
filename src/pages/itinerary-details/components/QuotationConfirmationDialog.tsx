import { useEffect, useState } from "react";
import type { ComponentProps } from "react";
import { Clock3, Hotel, UserRound, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuotationConfirmationDialogShell } from "../QuotationConfirmationDialogShell";
import { QuotationConfirmationOverview } from "./QuotationConfirmationOverview";
import { QuotationHotelReviewSections } from "./QuotationHotelReviewSections";
import { QuotationPassengerForm } from "../QuotationPassengerForm";
import { QuotationTravelDetailsForm } from "../QuotationTravelDetailsForm";
import { QuotationDialogFooter } from "../QuotationDialogFooter";

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
 * The progress row is a visual guide only. All three live sections stay mounted
 * together so editing guest details, reviewing hotels, holding hotels, and
 * confirming payment happen in one scrollable modal without losing state.
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
  const [holdCutoffOverrides, setHoldCutoffOverrides] = useState<Record<number, string>>({});
  const [now, setNow] = useState(() => Date.now());
  const selectedHotelCount = hotelReview.prebookHotelEntries.length + hotelReview.nonTboSelectedHotelEntries.length;
  const holdRequests = hotelReview.holdRequests || [];
  const heldHotelCount = holdRequests.filter((request) => ["BLOCKED", "CONFIRMED"].includes(String(request.status || "").toUpperCase())).length;
  const pendingContactCount = holdRequests.filter((request) => String(request.status || "").toUpperCase() === "CONTACT_REQUIRED").length;
  const nextHoldCutoff = holdRequests
    .filter((request) => ["BLOCKED", "CONFIRMED"].includes(String(request.status || "").toUpperCase()))
    .map((request) => holdCutoffOverrides[Number(request.id || 0)] || request.cutoffAt || request.holdUntil || "")
    .map((cutoffAt) => new Date(String(cutoffAt)).getTime())
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b)[0];
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!open || !hotelReview.refreshHoldRequests) return;
    void hotelReview.refreshHoldRequests().catch(() => undefined);
    const timer = window.setInterval(() => {
      void hotelReview.refreshHoldRequests?.().catch(() => undefined);
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [open, hotelReview.refreshHoldRequests]);
  const holdCountdown = nextHoldCutoff
    ? (() => {
        const remainingSeconds = Math.floor((nextHoldCutoff - now) / 1000);
        if (remainingSeconds <= 0) return "Expired";
        const days = Math.floor(remainingSeconds / 86400);
        const hours = Math.floor((remainingSeconds % 86400) / 3600);
        const minutes = Math.floor((remainingSeconds % 3600) / 60);
        return days > 0 ? `${days}d ${hours}h ${minutes}m remaining` : `${hours}h ${minutes}m remaining`;
      })()
    : "";
  const holdCutoffLabel = nextHoldCutoff
    ? new Date(nextHoldCutoff).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
    : "";
  const travelSummary = [passenger.guestDetails.arrivalDateTime, passenger.guestDetails.departureDateTime]
    .filter(Boolean)
    .join(" → ") || "Not entered";
  const holdStatus = isPrebooking || isHoldingHotels
    ? "Creating requests..."
    : pendingContactCount > 0
      ? "Contact required"
      : heldHotelCount > 0
        ? "Hotel responses recorded"
        : holdRequests.length > 0
          ? "Awaiting hotel response"
          : "Ready to hold";
  const walletAmount = overview.walletBalanceAmount ?? overview.parseWalletAmount(overview.walletBalance);
  const packageAmount = Number(overview.confirmRequiredAmount || 0);
  const balanceAfterBooking = walletAmount - packageAmount;

  const handleHoldHotels = async () => {
    setIsHoldingHotels(true);
    try {
      await onHoldHotels();
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

  const steps = [
    { label: "Guest Details", description: "Enter guest information", icon: UserRound, active: true },
    { label: "Hold Hotels", description: "Review and hold hotels", icon: Hotel, active: false },
    { label: "Confirm & Pay", description: "Make payment to confirm", icon: WalletCards, active: false },
  ];

  return (
    <QuotationConfirmationDialogShell open={open} onOpenChange={onOpenChange} quotationAgent={overview.agentInfo}>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-[#0f1b4d] sm:text-2xl">Book Total Package</h1>
            <p className="mt-1 text-xs text-slate-500">Complete the steps below to hold hotels and confirm your booking.</p>
          </div>
          <nav aria-label="Package booking steps" className="flex flex-wrap items-center gap-2 lg:min-w-[620px] lg:justify-end lg:gap-0">
          {steps.map(({ label, description, icon: Icon, active }, index) => (
            <div key={label} className="flex min-w-0 items-center lg:flex-1">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${active ? "bg-[#5c24e5] text-white" : "border border-slate-300 bg-white text-slate-500"}`}>
                  <span>{index + 1}</span>
                </span>
                <span className="min-w-0">
                  <span className={`block truncate text-xs font-bold leading-tight ${active ? "text-[#5c24e5]" : "text-slate-700"}`}>{label}</span>
                  <span className="block truncate text-[10px] text-slate-400">{description}</span>
                </span>
              </div>
              {index < steps.length - 1 && <span className="mx-3 hidden h-px flex-1 bg-slate-300 lg:block" aria-hidden="true" />}
            </div>
          ))}
          </nav>
        </div>

        <section className="space-y-4 rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm sm:p-5" aria-labelledby="booking-guest-details-title">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f3eeff] text-[#5c24e5]"><UserRound className="h-6 w-6" /></div>
            <div>
              <h2 id="booking-guest-details-title" className="text-sm font-bold text-[#1e1b4b]">Step 1: Enter Guest Details</h2>
              <p className="mt-0.5 text-xs text-slate-400">Complete guest information before holding hotels.</p>
            </div>
          </div>
          <QuotationPassengerForm {...passenger} compact roomCount={overview.confirmRoomCount} compactAction={<Button type="button" onClick={() => void handleSaveGuestDetails()} disabled={isSavingGuestDetails} className="shrink-0 bg-[#5c24e5] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#4d1ecc]">{isSavingGuestDetails ? "Saving..." : <>Save Guest Details &amp; Continue <span aria-hidden="true" className="ml-2">→</span></>}</Button>} />
        </section>

        <section className="space-y-4" aria-labelledby="booking-hold-hotels-title">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f3eeff] text-[#5c24e5]"><Hotel className="h-6 w-6" /></div>
            <div>
              <h2 id="booking-hold-hotels-title" className="text-sm font-bold text-[#1e1b4b]">Step 2: Hold Hotels</h2>
              <p className="mt-0.5 text-xs text-slate-400">Review the selected hotels and hold supplier rooms before confirming.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:col-span-8 lg:grid-cols-4">
              <div className="border-slate-100 sm:border-r sm:pr-3">
                <span className="block text-[10px] font-medium text-slate-400">Booking ID</span>
                <span className="mt-1 block truncate text-xs font-bold text-slate-800">{overview.agentInfo?.quotation_no || "—"}</span>
              </div>
              <div className="border-slate-100 lg:border-r lg:pr-3">
                <span className="block text-[10px] font-medium text-slate-400">Guest Name</span>
                <span className="mt-1 block truncate text-xs font-bold text-slate-800">{passenger.guestDetails.name || "Not entered"}</span>
              </div>
              <div className="border-slate-100 sm:border-r sm:pr-3 lg:border-r">
                <span className="block text-[10px] font-medium text-slate-400">Mobile Number</span>
                <span className="mt-1 block truncate text-xs font-bold text-slate-800">{passenger.guestDetails.contactNo || "Not entered"}</span>
              </div>
              <div>
                <span className="block text-[10px] font-medium text-slate-400">Travel Dates</span>
                <span className="mt-1 block truncate text-xs font-bold text-slate-800" title={travelSummary}>{travelSummary}</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[#fbd38d] bg-[#fffaf0] px-4 py-3 shadow-sm lg:col-span-4">
              <div>
                <span className="block text-[11px] font-bold leading-tight text-red-600">Package Hold Valid For</span>
                <span className="block text-xs text-slate-600">{selectedHotelCount} hotel{selectedHotelCount === 1 ? "" : "s"} · {heldHotelCount} held · {nextHoldCutoff ? "Active" : holdStatus}</span>
                {nextHoldCutoff && <span className="mt-0.5 block text-[10px] text-slate-500">Until {holdCutoffLabel} · {holdCountdown}</span>}
              </div>
              <Clock3 className="h-8 w-8 shrink-0 text-[#ff9900]" />
            </div>
          </div>

          <div id="hotel-review-details" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <QuotationHotelReviewSections
              {...hotelReview}
              onHoldCutoffUpdated={(requestId, cutoffAt) => setHoldCutoffOverrides((previous) => ({ ...previous, [requestId]: cutoffAt }))}
              onChangeHotel={() => {
                onOpenChange(false);
                window.setTimeout(() => document.getElementById("hotel-list-section")?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
              }}
              compact
            />
          </div>
        </section>

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
            <Button type="button" className="bg-[#ff9900] font-bold text-white hover:bg-[#e68a00]" onClick={() => void handleHoldHotels()} disabled={isPrebooking || isHoldingHotels}>
              {isPrebooking || isHoldingHotels ? "Holding Hotels..." : "Hold Hotels"}
            </Button>
            <QuotationDialogFooter {...footer} showCancel={false} stitchStyle />
          </div>
        </section>
      </div>
    </QuotationConfirmationDialogShell>
  );
}

export default QuotationConfirmationDialog;
