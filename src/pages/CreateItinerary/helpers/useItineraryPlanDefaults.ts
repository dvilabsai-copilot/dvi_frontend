import { useEffect } from "react";
import type { SimpleOption } from "@/services/itineraryDropdownsMock";
import { findIdByLabel } from "./itineraryPlanBlock.utils";

type UseItineraryPlanDefaultsArgs = {
  itineraryTypeSelect: string;
  setItineraryTypeSelect: (value: string) => void;
  itineraryTypes: SimpleOption[];
  arrivalType: string;
  departureType: string;
  setArrivalType: (value: string) => void;
  setDepartureType: (value: string) => void;
  travelTypes: SimpleOption[];
  entryTicketRequired: string;
  setEntryTicketRequired: (value: string) => void;
  entryTicketOptions: SimpleOption[];
  guideRequired: string;
  setGuideRequired: (value: string) => void;
  guideOptions: SimpleOption[];
  nationality: string;
  setNationality: (value: string) => void;
  nationalities: SimpleOption[];
  foodPreference: string;
  setFoodPreference: (value: string) => void;
  foodPreferences: SimpleOption[];
  budget: number | "";
  setBudget: (value: number | "") => void;
};

export function useItineraryPlanDefaults({
  itineraryTypeSelect,
  setItineraryTypeSelect,
  itineraryTypes,
  arrivalType,
  departureType,
  setArrivalType,
  setDepartureType,
  travelTypes,
  entryTicketRequired,
  setEntryTicketRequired,
  entryTicketOptions,
  guideRequired,
  setGuideRequired,
  guideOptions,
  nationality,
  setNationality,
  nationalities,
  foodPreference,
  setFoodPreference,
  foodPreferences,
  budget,
  setBudget,
}: UseItineraryPlanDefaultsArgs) {
  useEffect(() => {
    if (!itineraryTypeSelect && itineraryTypes.length) {
      const id = findIdByLabel(itineraryTypes, (label) => label.includes("custom"));
      if (id) setItineraryTypeSelect(id);
    }
  }, [itineraryTypeSelect, itineraryTypes, setItineraryTypeSelect]);

  useEffect(() => {
    if (!travelTypes.length) return;
    const flightId = findIdByLabel(travelTypes, (label) => label.includes("flight"));
    if (flightId) {
      if (!arrivalType) setArrivalType(flightId);
      if (!departureType) setDepartureType(flightId);
    }
  }, [arrivalType, departureType, travelTypes, setArrivalType, setDepartureType]);

  useEffect(() => {
    if (!entryTicketRequired && entryTicketOptions.length) {
      const id = findIdByLabel(entryTicketOptions, (label) => label === "no");
      if (id) setEntryTicketRequired(id);
    }
  }, [entryTicketRequired, entryTicketOptions, setEntryTicketRequired]);

  useEffect(() => {
    if (!guideRequired && guideOptions.length) {
      const id = findIdByLabel(guideOptions, (label) => label === "no");
      if (id) setGuideRequired(id);
    }
  }, [guideRequired, guideOptions, setGuideRequired]);

  useEffect(() => {
    if (!nationality && nationalities.length) {
      const id = findIdByLabel(nationalities, (label) => label.includes("india"));
      if (id) setNationality(id);
    }
  }, [nationality, nationalities, setNationality]);

  useEffect(() => {
    if (!foodPreference && foodPreferences.length) {
      const id = findIdByLabel(foodPreferences, (label) => label.includes("veg"));
      if (id) setFoodPreference(id);
    }
  }, [foodPreference, foodPreferences, setFoodPreference]);

  useEffect(() => {
    if (budget === "" || budget === 0) setBudget(15000);
  }, [budget, setBudget]);
}
