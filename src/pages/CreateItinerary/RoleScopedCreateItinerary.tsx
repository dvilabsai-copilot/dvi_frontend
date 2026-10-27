import { CreateItinerary } from "./CreateItinerary";
import { CreateItinerary as TravelExpertCreateItinerary } from "./TravelExpertCreateItinerary";
import { isTravelExpertUIAccount } from "@/services/accessControl";

type Props = { pageMode?: "create-itinerary" | "smart-booking" };

/** Only verified Travel Expert sessions use the redesigned Create Itinerary UI. */
export function RoleScopedCreateItinerary(props: Props) {
  return isTravelExpertUIAccount()
    ? <TravelExpertCreateItinerary {...props} />
    : <CreateItinerary {...props} />;
}
