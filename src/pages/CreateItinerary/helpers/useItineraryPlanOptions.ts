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
agentOptions: agents.map((agent): AutoSuggestOption => {
  const details = [
    agent.agentPersonName,
    agent.companyName,
    agent.email,
    agent.mobile,
  ]
    .flatMap((value) => String(value ?? "").split("|"))
    .map((value) => value.trim())
    .filter(Boolean);

  const uniqueDetails = details.filter(
    (value, index) =>
      details.findIndex(
        (item) => item.toLowerCase() === value.toLowerCase()
      ) === index
  );

  return {
    value: String(agent.id),
    label: uniqueDetails.length
      ? uniqueDetails.join(" | ")
      : agent.name,
    searchText: [
      agent.name,
      ...uniqueDetails,
    ].join(" "),
  };
}),
    locationOptions: locations.map((location): AutoSuggestOption => ({
      value: location.name,
      label: location.name,
    })),
hotelCategoryAutoOptions: hotelCategoryOptions
  .filter((item) => item.label?.trim().toUpperCase() !== "STD")
  .map((item): AutoSuggestOption => ({
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
