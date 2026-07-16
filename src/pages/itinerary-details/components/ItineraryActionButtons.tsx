import React from "react";
import { Bell, CreditCard, FileText, Loader2, Plus, Receipt, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export type ClipboardMode = "recommended" | "highlights" | "para";

type ItineraryActionButtonsProps = {
  isConfirmedPresentation: boolean;
  onCopyClipboard: (mode: ClipboardMode) => void;
  onDownloadPluckCard: () => void | Promise<void>;
  onOpenVoucher: () => void;
  onOpenIncidentalExpenses: () => void;
  modifyItineraryHref: string;
  onDownloadInvoice: (kind: "tax" | "proforma") => void | Promise<void>;
  readOnly: boolean;
  isConfirmedItinerary: boolean;
  onExtendTrip: () => void;
  onConfirmQuotation: () => void;
  isOpeningConfirmQuotation: boolean;
  canConfirmQuotation: boolean;
  onCopyLink: () => void;
  onShareWhatsApp: () => void;
  onShareEmail: () => void;
  onBackToTop: () => void;
};

/** Keeps action menus and presentation-only controls out of the page controller. */
export const ItineraryActionButtons: React.FC<ItineraryActionButtonsProps> = ({
  isConfirmedPresentation,
  onCopyClipboard,
  onDownloadPluckCard,
  onOpenVoucher,
  onOpenIncidentalExpenses,
  modifyItineraryHref,
  onDownloadInvoice,
  readOnly,
  isConfirmedItinerary,
  onExtendTrip,
  onConfirmQuotation,
  isOpeningConfirmQuotation,
  canConfirmQuotation,
  onCopyLink,
  onShareWhatsApp,
  onShareEmail,
  onBackToTop,
}) => (
  <>
    {!isConfirmedPresentation && (
      <div className="flex flex-wrap justify-center gap-3">
        <div className="group relative">
          <Button className="bg-[#8b43d1] hover:bg-[#7c37c1] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#8b43d1]">
            Clipboard ▼
          </Button>
          <div className="invisible absolute left-0 z-50 mt-1 w-56 max-w-[80vw] rounded-lg border border-gray-200 bg-white opacity-0 shadow-lg transition-all duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
            {(["recommended", "highlights", "para"] as ClipboardMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`w-full px-4 py-2 text-left text-[#4a4260] hover:bg-[#f8f5fc] ${mode === "para" ? "rounded-b-lg" : ""}`}
                onClick={() => onCopyClipboard(mode)}
              >
                <span className="mr-2">{mode === "recommended" ? "📋" : mode === "highlights" ? "✨" : "📝"}</span>
                {mode === "recommended" ? "Copy Recommended" : mode === "highlights" ? "Copy to Highlights" : "Copy to Para"}
              </button>
            ))}
          </div>
        </div>

        {isConfirmedPresentation ? (
          <>
            <Button variant="outline" className="border-[#d546ab] text-[#d546ab] hover:bg-[#fdf6ff]" onClick={() => void onDownloadPluckCard()}>
              <CreditCard className="mr-2 h-4 w-4" /> Download Pluck Card
            </Button>
            <Button variant="outline" className="border-[#28a745] text-[#28a745] hover:bg-[#28a745] hover:text-white" onClick={onOpenVoucher}>
              <FileText className="mr-2 h-4 w-4" /> Voucher Details
            </Button>
            <Button variant="outline" className="border-[#fd7e14] text-[#fd7e14] hover:bg-[#fd7e14] hover:text-white" onClick={onOpenIncidentalExpenses}>
              <Plus className="mr-2 h-4 w-4" /> Add Incidental Expenses
            </Button>
            <Link to={modifyItineraryHref}>
              <Button variant="outline" className="border-[#dc3545] text-[#dc3545] hover:bg-[#dc3545] hover:text-white">
                <Trash2 className="mr-2 h-4 w-4" /> Extend Trip
              </Button>
            </Link>
            <Button variant="outline" className="border-[#17a2b8] text-[#17a2b8] hover:bg-[#17a2b8] hover:text-white" onClick={() => void onDownloadInvoice("tax")}>
              <Receipt className="mr-2 h-4 w-4" /> Invoice Tax
            </Button>
            <Button variant="outline" className="border-[#fd7e14] text-[#fd7e14] hover:bg-[#fd7e14] hover:text-white" onClick={() => void onDownloadInvoice("proforma")}>
              <FileText className="mr-2 h-4 w-4" /> Invoice Proforma
            </Button>
          </>
        ) : (
          <>
            <Link to="/create-itinerary"><Button className="bg-[#28a745] hover:bg-[#218838]">Continue Planning</Button></Link>
            {(readOnly || isConfirmedItinerary) && <Button variant="outline" className="border-[#dc3545] text-[#dc3545] hover:bg-[#dc3545] hover:text-white" onClick={onExtendTrip}><Trash2 className="mr-2 h-4 w-4" /> Extend Trip</Button>}
            <Button className="bg-[#d546ab] hover:bg-[#c03d9f]" onClick={onConfirmQuotation} disabled={isOpeningConfirmQuotation || !canConfirmQuotation} title={!canConfirmQuotation ? "Select a vehicle with valid rates before confirming." : undefined}>
              {isOpeningConfirmQuotation ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading Prebook...</> : <><Bell className="mr-2 h-4 w-4" />Confirm Quotation</>}
            </Button>
          </>
        )}

        <div className="group relative">
          <Button className="bg-[#17a2b8] hover:bg-[#138496] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#17a2b8]">Share ▼</Button>
          <div className="invisible absolute left-0 z-50 mt-1 w-56 max-w-[80vw] rounded-lg border border-gray-200 bg-white opacity-0 shadow-lg transition-all duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
            <button type="button" className="w-full px-4 py-2 text-left text-[#4a4260] hover:bg-[#f8f5fc]" onClick={onCopyLink}>🔗 Copy Link</button>
            <button type="button" className="w-full px-4 py-2 text-left text-[#4a4260] hover:bg-[#f8f5fc]" onClick={onShareWhatsApp}>💬 Share on WhatsApp</button>
            <button type="button" className="w-full rounded-b-lg px-4 py-2 text-left text-[#4a4260] hover:bg-[#f8f5fc]" onClick={onShareEmail}>✉️ Share via Email</button>
          </div>
        </div>
      </div>
    )}
    <div className="buy-now">
      <button id="scrollToTopButton" type="button" aria-label="Back to top" title="Back to top" onClick={onBackToTop} className="fixed bottom-12 right-3 z-[1080] inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#7367f0] text-white shadow-[0_1px_20px_1px_#ea5455] transition-shadow hover:shadow-none">
        ↑
      </button>
    </div>
  </>
);

export default ItineraryActionButtons;
