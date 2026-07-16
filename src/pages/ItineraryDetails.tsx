// Stable router/HMR entrypoint for the itinerary details page.
// Keep both named and default exports for the lazy router contract.
import ItineraryDetailsController, {
  ItineraryDetails as ItineraryDetailsNamed,
} from "./ItineraryDetailsController";

export type {
  ItineraryHotelRow,
  ItineraryHotelTab,
  ItineraryVehicleRow,
} from "./itinerary-details/itinerary-details.types";

export const ItineraryDetails = ItineraryDetailsNamed;

export default ItineraryDetailsController;
