import { CreateItinerary } from "./CreateItinerary";
import { CreateItinerary as TravelExpertCreateItinerary } from "./TravelExpertCreateItinerary";
import { isTravelExpertUIAccount } from "@/services/accessControl";

import { CreateItinerary as AgentExpertCreateItinerary } from "./AgentExpertCreateItinerary";
import { getAuthenticatedRoleId } from "@/services/accessControl";
import { USER_ROLES } from "@/constants/systemRoles";
type Props = { pageMode?: "create-itinerary" | "smart-booking" };

/** Only verified Travel Expert sessions use the redesigned Create Itinerary UI. */
export function RoleScopedCreateItinerary(props: Props) {
  // DVI_AGENT_CABS_HOTELS_TOURS_ISOLATED_20261110: Agent-only replica; existing Travel Expert and other role routes stay intact.
  if (isTravelExpertUIAccount()) return <TravelExpertCreateItinerary {...props} />;
  if (getAuthenticatedRoleId() === USER_ROLES.AGENT &&
      (props.pageMode === undefined || props.pageMode === "create-itinerary")) {
    return <AgentExpertCreateItinerary {...props} />;
  }
  return <CreateItinerary {...props} />;
}
