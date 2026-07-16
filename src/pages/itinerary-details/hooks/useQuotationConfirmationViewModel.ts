import type { AdditionalPassenger } from "./useQuotationState";
import type { ItineraryDetailsResponse } from "../itinerary-details.types";
import { buildOccupancyPreview } from "../utils/quotationConfirmationDetails.utils";

type Occupancy = { adults: number; children: number; childrenAges: number[] };
type FinancialTotals = { netPayable?: number };
type PassengerField = "title" | "name" | "age" | "nationality";
type PassengerLabel = "adult" | "child" | "infant";

type QuotationConfirmationViewModelOptions = {
  itinerary: ItineraryDetailsResponse | null;
  financialTotals: FinancialTotals;
  walletBalanceAmount: number | null;
  confirmOccupanciesTemplate: Occupancy[] | null;
  formErrors: Record<string, string>;
  guestNationality: string;
};

export function useQuotationConfirmationViewModel({
  itinerary,
  financialTotals,
  walletBalanceAmount,
  confirmOccupanciesTemplate,
  formErrors,
  guestNationality,
}: QuotationConfirmationViewModelOptions) {
  const confirmRequiredAmount = Number(financialTotals.netPayable || itinerary?.overallCost || 0);
  const isWalletInsufficientForConfirm = walletBalanceAmount !== null
    && confirmRequiredAmount > 0
    && walletBalanceAmount < confirmRequiredAmount;
  const confirmRoomCount = Math.max(Number(itinerary?.roomCount || 1), 1);
  const confirmPassengerMix = [
    Number(itinerary?.adults || 0) > 0 ? `${Number(itinerary?.adults || 0)} Adult${Number(itinerary?.adults || 0) === 1 ? "" : "s"}` : null,
    Number(itinerary?.children || 0) > 0 ? `${Number(itinerary?.children || 0)} Child${Number(itinerary?.children || 0) === 1 ? "" : "ren"}` : null,
    Number(itinerary?.infants || 0) > 0 ? `${Number(itinerary?.infants || 0)} Infant${Number(itinerary?.infants || 0) === 1 ? "" : "s"}` : null,
  ].filter(Boolean).join(", ");
  const confirmOccupancyPreview = (confirmOccupanciesTemplate?.length
    ? confirmOccupanciesTemplate
    : buildOccupancyPreview(
      confirmRoomCount,
      Number(itinerary?.adults || 0),
      Number(itinerary?.children || 0),
    )
  ).map((room) => ({ adults: room.adults, children: room.children }));

  const defaultPassenger = (title: string): AdditionalPassenger => ({
    title,
    name: "",
    age: "",
    nationality: guestNationality,
    panNo: "",
    passportNo: "",
  });

  const getPassengerFieldError = (
    label: PassengerLabel,
    index: number,
    field: PassengerField,
  ) => formErrors[`${label}-${index}-${field}`];

  return {
    confirmRequiredAmount,
    isWalletInsufficientForConfirm,
    confirmRoomCount,
    confirmPassengerMix,
    confirmOccupancyPreview,
    defaultPassenger,
    getPassengerFieldError,
  };
}
