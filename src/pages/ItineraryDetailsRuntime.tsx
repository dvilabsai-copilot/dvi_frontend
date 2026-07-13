// Composition boundary for the itinerary details controller.
// Keeping this module separate makes the remaining controller extraction
// explicit without changing the router/HMR export contract.
import ItineraryDetailsController, {
  ItineraryDetails as ItineraryDetailsNamed,
} from "./ItineraryDetailsController";

export const ItineraryDetails = ItineraryDetailsNamed;

export default ItineraryDetailsController;
