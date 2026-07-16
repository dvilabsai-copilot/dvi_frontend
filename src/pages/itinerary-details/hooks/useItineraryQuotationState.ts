import { useQuotationConfirmationViewModel } from "./useQuotationConfirmationViewModel";
import { useQuotationState } from "./useQuotationState";
import type { ItineraryDetailsResponse } from "../itinerary-details.types";

type FinancialTotals = { netPayable?: number };

export function useItineraryQuotationState({
  itinerary,
  financialTotals,
}: {
  itinerary: ItineraryDetailsResponse | null;
  financialTotals: FinancialTotals;
}) {
  const quotationState = useQuotationState();
  const confirmationViewModel = useQuotationConfirmationViewModel({
    itinerary,
    financialTotals,
    walletBalanceAmount: quotationState.walletBalanceAmount,
    confirmOccupanciesTemplate: quotationState.confirmOccupanciesTemplate,
    formErrors: quotationState.formErrors,
    guestNationality: quotationState.guestDetails.nationality,
  });

  return { ...quotationState, ...confirmationViewModel };
}
