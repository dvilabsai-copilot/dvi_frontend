import { useMemo } from "react";
import type { AutoSuggestOption } from "@/components/AutoSuggestSelect";
import type { AgentOption } from "@/services/accountsManagerApi";
import type { LocationOption, SimpleOption } from "@/services/itineraryDropdownsMock";

type UseItineraryPlanOptionsArgs = {
  agents: AgentOption[];
  locations: LocationOption[];
  hotelCategoryOptions: SimpleOption[];
  hotelFacilityOptions: SimpleOption[];
  nationalities: SimpleOption[];
};

export function useItineraryPlanOptions({
  agents,
  locations,
  hotelCategoryOptions,
  hotelFacilityOptions,
  nationalities,
}: UseItineraryPlanOptionsArgs) {
  return useMemo(() => ({
    agentOptions: agents.map((agent): AutoSuggestOption => ({
      value: String(agent.id),
      label: agent.name,
    })),
    locationOptions: locations.map((location): AutoSuggestOption => ({
      value: location.name,
      label: location.name,
    })),
    hotelCategoryAutoOptions: hotelCategoryOptions.map((item): AutoSuggestOption => ({
      value: String(item.id),
      label: item.label,
    })),
    hotelFacilityAutoOptions: hotelFacilityOptions.map((item): AutoSuggestOption => ({
      value: String(item.id),
      label: item.label,
    })),
    nationalityOptions: nationalities.map((item): AutoSuggestOption => ({
      value: String(item.id),
      label: item.label,
    })),
  }), [agents, locations, hotelCategoryOptions, hotelFacilityOptions, nationalities]);
}
