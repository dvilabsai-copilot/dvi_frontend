// Stable router/HMR entrypoint for the itinerary details page.
// The runtime implementation lives in a separate composition module so this
// route module remains small while the workflow extractions continue.
import { ItineraryDetails as ItineraryDetailsNamed } from "./ItineraryDetailsRuntime";

export type {
  ItineraryHotelRow,
  ItineraryHotelTab,
  ItineraryVehicleRow,
} from "./itinerary-details/itinerary-details.types";

export const ItineraryDetails = ItineraryDetailsNamed;

export default ItineraryDetailsNamed;
