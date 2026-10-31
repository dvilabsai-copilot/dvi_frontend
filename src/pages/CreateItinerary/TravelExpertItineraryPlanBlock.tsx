/* DVI_TE_TOURS_CABS_HOTELS_CENTERED_CALENDAR_V2: Tours Arrival/Departure and TE Cabs use the Hotels centered calendar. */
/* DVI_TE_TOURS_PARTNER_PINK_TIGHT_V1: Tours styling scope; other modes unchanged. */
// DVI_TE_TOURS_VEHICLE_AGENT_V6: agent modal uses Tours-scoped vehicle stylesheet.
import "./TravelExpertToursMarkedFix.css";
import { TravelExpertToursHotelCategoryPills } from "./TravelExpertToursHotelCategoryPills";
import "./TravelExpertToursAgentRow.css";
import { getTravelExpertToursFlagUrl } from "./TravelExpertToursCountryFlag";
import { USER_ROLES } from "@/constants/systemRoles";
import { getAuthenticatedRoleId } from "@/services/accessControl";
import { useEffect, useMemo, useRef, useState, Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TravellerCounterField } from "./TravellerCounterField"; // DVI_TE_TRAVELLER_COUNTERS_V1
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Clock3 } from "lucide-react";
import {
  TimePickerPopover,
  formatTime24As12,
  time12To24,
  time24To12,
} from "@/components/itinerary/TimePickerPopover";
import {
  AutoSuggestSelect,
} from "@/components/AutoSuggestSelect";
import { RoomsBlock } from "./TravelExpertRoomsBlock";
import { TravelExpertToursRoomsGuests } from "./TravelExpertToursRoomsGuests";
import { cloneRoomFromTemplate } from "./helpers/useRoomsAndTravellers";
import { AgentOption } from "@/services/accountsManagerApi";
import type { PendingNewAgentInput } from "@/services/auth";
import { LocationOption, MealPlanOption, SimpleOption } from "@/services/itineraryDropdownsMock";
import { useIsMobile } from "@/hooks/use-mobile";
import { canQuickOnboardAgent } from "@/services/accessControl";

import {
  addMonths,
  endOfMonth,
  format,
  parse,
  startOfMonth,
} from "date-fns";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { FestivalDayContent } from "@/components/itinerary/calendar/FestivalDayContent";
import { FestivalCalendarLegend } from "@/components/itinerary/calendar/FestivalCalendarLegend";
import { TripFestivalWarnings } from "@/components/itinerary/calendar/TripFestivalWarnings";
import {
  getEventsByActualStartDate,
  getEventsByTravelDate,
} from "./helpers/calendarEvents.utils";
import { getRoomOccupancyValidationError, type RoomRow, type RoomTemplate } from "./helpers/useRoomsAndTravellers";
import { toast } from "@/components/ui/use-toast";
import type { RouteData } from "@/components/DefaultRoutesSuggestions";
import {
  buildVehicleOnlyTravellerRooms,
  getMealPlanLabel,
  getSafeTravellerCount,
  mapMultiValuesToStringIds,
  parseDDMMYYYY,
} from "./helpers/itineraryPlanBlock.utils";
import { useItineraryPlanDates } from "./helpers/useItineraryPlanDates";
import { useItineraryPlanDefaults } from "./helpers/useItineraryPlanDefaults";
import { useItineraryPlanOptions } from "./helpers/useItineraryPlanOptions";
import { ItineraryPreferenceControl } from "./ItineraryPreferenceControl";
import { getAuthenticatedUser } from "@/services/accessControl";
import { TravelExpertHotelSearchRepeater } from "./TravelExpertHotelSearchRepeater";
import { TravelExpertToursModernTimePicker } from "./TravelExpertToursModernTimePicker";
import { TravelExpertHotelDateRangeInput } from "./TravelExpertHotelDateRangeInput";
import { TravelExpertHotelSearchBoundary } from "./TravelExpertHotelSearchBoundary";
import {
  TRANSPORT_EARLY_ARRIVAL_CUTOFF,
  TRANSPORT_DEFAULT_HOTEL_REST_MINUTES,
  TRANSPORT_EARLY_ARRIVAL_HOTEL_MESSAGE,
  type TransportEarlyArrivalOption,
} from "./helpers/transportEarlyArrival";
// DVI_TE_TOURS_REQUIRED_STARS_STEPS_V1
import { TravelExpertToursStepInstructions } from "./TravelExpertToursStepInstructions";
// type RoomRow = {
//   id: number;
//   adults: number;
//   children: number;
//   infants: number;
//   roomCount: number;
// };

type ItineraryPlanBlockProps = {
  travelExpertCabs?: boolean;
  pageMode?: "create-itinerary" | "smart-booking";
  itineraryPreference: "vehicle" | "hotel" | "both";
  setItineraryPreference: (value: "vehicle" | "hotel" | "both") => void;

 agents: AgentOption[];
agentId: number | null;
setAgentId: (id: number | null) => void;

pendingNewAgent: PendingNewAgentInput | null;
setPendingNewAgent: (
  agent: PendingNewAgentInput | null,
) => void;

isAgentLocked?: boolean;
isVehicleAgent?: boolean;

  locations: LocationOption[];
  arrivalLocation: string;
  setArrivalLocation: (val: string) => void;
  departureLocation: string;
  setDepartureLocation: (val: string) => void;
  calendarLocationNames?: string[];

  hotelCategoryOptions: SimpleOption[];
  hotelFacilityOptions: SimpleOption[];

tripStartDate: string;
tripEndDate: string;
setTripStartDate: (val: string) => void;
setTripEndDate: (val: string) => void;

// Minimum selectable date for Continue Planning.
// Empty during normal itinerary creation.
minimumTripDate?: string;
minimumTripStartTime?: string;

// ✅ lifted time fields so parent can build DateTime payload
startTime: string;
  setStartTime: (val: string) => void;
  endTime: string;
  setEndTime: (val: string) => void;

  itineraryTypes: SimpleOption[];
  itineraryTypeSelect: string;
  setItineraryTypeSelect: (val: string) => void;

  travelTypes: SimpleOption[];
  arrivalType: string;
  setArrivalType: (val: string) => void;
  departureType: string;
  setDepartureType: (val: string) => void;

  entryTicketOptions: SimpleOption[];
  entryTicketRequired: string;
  setEntryTicketRequired: (val: string) => void;

  budget: number | "";
  setBudget: (val: number | "") => void;

  rooms: RoomRow[];
  setRooms: Dispatch<SetStateAction<RoomRow[]>>;
  addRoom: () => void;
  removeRoom: (id: number) => void;
  defaultRoomTemplate: RoomTemplate;
  setDefaultRoomTemplate: Dispatch<SetStateAction<RoomTemplate>>;

  guideOptions: SimpleOption[];
  guideRequired: string;
  setGuideRequired: (val: string) => void;

  nationalities: SimpleOption[];
  nationality: string;
  setNationality: (val: string) => void;

  foodPreferences: SimpleOption[];
  foodPreference: string; // âœ… stores option id (e.g. "1","2","3")
  setFoodPreference: (val: string) => void;

  mealPlanOptions: MealPlanOption[];
  mealPlanCode: string;
  setMealPlanCode: (val: string) => void;

  selectedHotelCategoryIds: number[];
  setSelectedHotelCategoryIds: Dispatch<SetStateAction<number[]>>;

  selectedHotelFacilityIds: string[];
  setSelectedHotelFacilityIds: Dispatch<SetStateAction<string[]>>;
  // âœ… lifted special instructions so it goes in payload
  specialInstructions: string;
  setSpecialInstructions: (val: string) => void;

  transportOvernightLocationName: string;
  setTransportOvernightLocationName: (value: string) => void;

  requiresTransportEarlyArrivalPreference: boolean;
  transportEarlyArrivalOption: TransportEarlyArrivalOption | "";
  setTransportEarlyArrivalOption: (value: TransportEarlyArrivalOption) => void;
transportEarlyArrivalHotelName: string;
setTransportEarlyArrivalHotelName: (value: string) => void;
transportEarlyArrivalLocationName: string;
setTransportEarlyArrivalLocationName: (value: string) => void;
transportEarlyArrivalRestMinutes: number;
setTransportEarlyArrivalRestMinutes: (value: number) => void;

  validationErrors?: { [key: string]: string };

  // âœ… Calculated from arrival/departure dates
  noOfNights: number;
  noOfDays: number;

  defaultRouteOptions?: RouteData[];
  activeDefaultRouteIndex?: number;
  onDefaultRouteSelect?: (route: RouteData, index: number) => void;
};

const LOCATION_NOT_AVAILABLE_MESSAGE =
  "Place not available in the system. Please contact Admin to add this location.";

const EMPTY_NEW_AGENT: PendingNewAgentInput = {
  name: "",
  companyName: "",
  email: "",
  mobile: "",
};
export const ItineraryPlanBlock = ({
  travelExpertCabs = false,
  pageMode = "create-itinerary",  itineraryPreference,
  setItineraryPreference,
 agents,
agentId,
setAgentId,
pendingNewAgent,
setPendingNewAgent,
isAgentLocked = false,
isVehicleAgent = false,
locations,
  arrivalLocation,
  setArrivalLocation,
  departureLocation,
  setDepartureLocation,
  calendarLocationNames = [],
  hotelCategoryOptions,
  hotelFacilityOptions,
  tripStartDate,
tripEndDate,
setTripStartDate,
setTripEndDate,
minimumTripDate = "",
minimumTripStartTime = "",
startTime,
  setStartTime,
  endTime,
  setEndTime,
  itineraryTypes,
  itineraryTypeSelect,
  setItineraryTypeSelect,
  travelTypes,
  arrivalType,
  setArrivalType,
  departureType,
  setDepartureType,
  entryTicketOptions,
  entryTicketRequired,
  setEntryTicketRequired,
  budget,
  setBudget,
  rooms,
  setRooms,
  addRoom,
  removeRoom,
  defaultRoomTemplate,
  setDefaultRoomTemplate,
  guideOptions,
  guideRequired,
  setGuideRequired,
  nationalities,
  nationality,
  setNationality,
  foodPreferences,
  foodPreference,
  setFoodPreference,
  mealPlanOptions,
  mealPlanCode,
  setMealPlanCode,
  selectedHotelCategoryIds,
  setSelectedHotelCategoryIds,
  selectedHotelFacilityIds,
  setSelectedHotelFacilityIds,

  specialInstructions,
  setSpecialInstructions,

  transportOvernightLocationName,
  setTransportOvernightLocationName,

  requiresTransportEarlyArrivalPreference,
  transportEarlyArrivalOption,
  setTransportEarlyArrivalOption,
transportEarlyArrivalHotelName,
setTransportEarlyArrivalHotelName,
transportEarlyArrivalLocationName,
setTransportEarlyArrivalLocationName,
transportEarlyArrivalRestMinutes,
setTransportEarlyArrivalRestMinutes,
  validationErrors,
  noOfNights,
  noOfDays,
  defaultRouteOptions = [],
  activeDefaultRouteIndex = 0,
  onDefaultRouteSelect,
}: ItineraryPlanBlockProps) => {
// Show the hotel-search UI only for authenticated Travel Expert (role 8),
// and only when the Hotel-only preference is selected.
const authenticatedTravelExpertUser = getAuthenticatedUser();
const authenticatedTravelExpertRole = getAuthenticatedRoleId(authenticatedTravelExpertUser);
const isTravelExpertHotelMode =
  pageMode === "create-itinerary" &&
  itineraryPreference === "hotel" &&
  (
    authenticatedTravelExpertRole === USER_ROLES.TRAVEL_EXPERT ||
    (authenticatedTravelExpertRole === USER_ROLES.STAFF &&
      Number(authenticatedTravelExpertUser?.permissionRoleId ?? 0) === 3 &&
      Number(authenticatedTravelExpertUser?.staffId ?? authenticatedTravelExpertUser?.staff_id ?? 0) > 0)
  );
const isMobile = useIsMobile();
const today = new Date();

const authenticatedRole = getAuthenticatedRoleId();

// Travel Expert shared labels: Cabs, Hotels, Tours & Attractions. UI text only.
const isTravelExpertPartnerField =
  (pageMode === "create-itinerary" || pageMode === "smart-booking") &&
  (authenticatedRole === USER_ROLES.TRAVEL_EXPERT ||
    (authenticatedRole === USER_ROLES.STAFF &&
      Number(getAuthenticatedUser()?.permissionRoleId ?? 0) === 3 &&
      Number(getAuthenticatedUser()?.staffId ?? getAuthenticatedUser()?.staff_id ?? 0) > 0));

// DVI_CABS_FIELDS_VISIBILITY_V2
const hideTravelExpertCabsDetails =
  pageMode === "create-itinerary" &&
  itineraryPreference === "vehicle" &&
  isTravelExpertPartnerField;


// DVI_TE_TOURS_COUNTERS_V1
const showTravelExpertToursCounters =
  isTravelExpertPartnerField &&
  pageMode === "create-itinerary" &&
  itineraryPreference === "both";
// DVI_TE_TOURS_CHILD_POPUP_DISMISS_V1
const [isToursChildPopupOpen, setIsToursChildPopupOpen] = useState(false);
const toursChildPopupRef = useRef<HTMLDivElement | null>(null);
// DVI_TE_TOURS_CHILD_POPUP_INSIDE_CLICK_V2
const toursChildFieldRef = useRef<HTMLDivElement | null>(null);

useEffect(() => {
  if (!showTravelExpertToursCounters) {
    setIsToursChildPopupOpen(false);
  }
}, [showTravelExpertToursCounters]);

useEffect(() => {
  if (!isToursChildPopupOpen || !showTravelExpertToursCounters) return;

  const handleOutsideClick = (event: MouseEvent) => {
    const target = event.target;

    if (!(target instanceof Element)) return;
    if (toursChildFieldRef.current?.contains(target)) return;
    if (toursChildPopupRef.current?.contains(target)) return;

    // Radix Select options can render outside the popup.
    if (target.closest(
      '[role="combobox"], [role="listbox"], [role="option"], [data-radix-popper-content-wrapper], input[aria-label^="Age of child"]'
    )) return;

    setIsToursChildPopupOpen(false);
  };

  const handleEscape = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      setIsToursChildPopupOpen(false);
    }
  };

  document.addEventListener("click", handleOutsideClick);
  document.addEventListener("keydown", handleEscape);

  return () => {
    document.removeEventListener("click", handleOutsideClick);
    document.removeEventListener("keydown", handleEscape);
  };
}, [isToursChildPopupOpen, showTravelExpertToursCounters]);
const canUseAgentSelectionPopup = canQuickOnboardAgent();

const [isStartTimeOpen, setIsStartTimeOpen] = useState(false);
const [isEndTimeOpen, setIsEndTimeOpen] = useState(false);

const [isAgentDialogOpen, setIsAgentDialogOpen] =
  useState(false);

const [agentDialogMode, setAgentDialogMode] =
  useState<"select" | "new">("select");

const [newAgentDraft, setNewAgentDraft] =
  useState<PendingNewAgentInput>(
    EMPTY_NEW_AGENT,
  );

const [newAgentErrors, setNewAgentErrors] =
  useState<
    Partial<
      Record<
        keyof PendingNewAgentInput,
        string
      >
    >
  >({});

const selectedAgent = useMemo<{
  name: string;
  email?: string | null;
  mobile?: string | null;
  isPending: boolean;
} | null>(() => {
  if (pendingNewAgent) {
    return {
      name: pendingNewAgent.name,
      email: pendingNewAgent.email,
      mobile: pendingNewAgent.mobile,
      isPending: true,
    };
  }

  if (!agentId) {
    return null;
  }

  const existingAgent =
    agents.find(
      (agent) =>
        Number(agent.id) ===
        Number(agentId),
    ) ?? null;

  if (!existingAgent) {
    return null;
  }

  return {
    name: existingAgent.name,
    email: existingAgent.email,
    mobile: existingAgent.mobile,
    isPending: false,
  };
}, [
  pendingNewAgent,
  agentId,
  agents,
]);

const openExistingAgentDialog = () => {
  setNewAgentErrors({});
  setNewAgentDraft(EMPTY_NEW_AGENT);
  setAgentDialogMode("select");
  setIsAgentDialogOpen(true);
};

const openNewAgentDialog = () => {
  setNewAgentErrors({});

  setNewAgentDraft(
    pendingNewAgent ?? EMPTY_NEW_AGENT,
  );

  setAgentDialogMode("new");
  setIsAgentDialogOpen(true);
};

const handleDeletePendingAgent = () => {
  /*
   * A pending new Agent has not been
   * created in the backend yet.
   *
   * So deleting it only clears the
   * temporary frontend state.
   */
  setPendingNewAgent(null);
  setAgentId(null);

  setNewAgentDraft(EMPTY_NEW_AGENT);
  setNewAgentErrors({});
};

const updateNewAgentDraft = (
  field: keyof PendingNewAgentInput,
  value: string,
) => {
  setNewAgentDraft((current) => ({
    ...current,
    [field]: value,
  }));

  setNewAgentErrors((current) => ({
    ...current,
    [field]: "",
  }));
};

const handleAddPendingAgent = () => {
  const normalized: PendingNewAgentInput = {
    name:
      newAgentDraft.name.trim(),
    companyName:
      newAgentDraft.companyName.trim(),
    email:
      newAgentDraft.email
        .trim()
        .toLowerCase(),
    mobile:
      newAgentDraft.mobile.trim(),
  };

  const errors:
    Partial<
      Record<
        keyof PendingNewAgentInput,
        string
      >
    > = {};

  if (!normalized.name) {
    errors.name =
      "Name is required";
  }

  if (!normalized.companyName) {
    errors.companyName =
      "Company Name is required";
  }

  if (!normalized.email) {
    errors.email =
      "Email ID is required";
  } else if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      normalized.email,
    )
  ) {
    errors.email =
      "Enter a valid Email ID";
  }

  if (!normalized.mobile) {
    errors.mobile =
      "Mobile Number is required";
  } else if (
    !/^[+]?[0-9 ()-]{8,20}$/.test(
      normalized.mobile,
    )
  ) {
    errors.mobile =
      "Enter a valid Mobile Number";
  }

  if (
    Object.keys(errors).length > 0
  ) {
    setNewAgentErrors(errors);
    return;
  }

  /*
   * IMPORTANT:
   * This is intentionally frontend state only.
   * No API call occurs here.
   */
  setPendingNewAgent(
    normalized,
  );

  /*
   * A real agentId does not exist yet.
   * It will only be obtained during the
   * final itinerary-save action.
   */
  setAgentId(null);

  setNewAgentErrors({});
  setIsAgentDialogOpen(false);
};

const [isTransportEarlyArrivalDialogOpen, setIsTransportEarlyArrivalDialogOpen] =
  useState(false);
const [draftTransportEarlyArrivalOption, setDraftTransportEarlyArrivalOption] =
  useState<TransportEarlyArrivalOption | "">(transportEarlyArrivalOption);
const [draftTransportEarlyArrivalHotelName, setDraftTransportEarlyArrivalHotelName] =
  useState(transportEarlyArrivalHotelName);
const [draftTransportEarlyArrivalLocationName, setDraftTransportEarlyArrivalLocationName] =
  useState(transportEarlyArrivalLocationName);
const [draftTransportEarlyArrivalRestMinutes, setDraftTransportEarlyArrivalRestMinutes] =
  useState(transportEarlyArrivalRestMinutes);
const [transportEarlyArrivalDialogError, setTransportEarlyArrivalDialogError] =
  useState("");
const previousTransportEarlyArrivalTriggerKey = useRef<string | null>(null);
const hasTransportEarlyArrivalPrerequisites = Boolean(
  arrivalLocation.trim() &&
    departureLocation.trim() &&
    tripStartDate &&
    tripEndDate,
);
const transportEarlyArrivalTriggerKey = `${itineraryPreference}|${startTime}`;

useEffect(() => {
  if (!requiresTransportEarlyArrivalPreference || !hasTransportEarlyArrivalPrerequisites) {
    setIsTransportEarlyArrivalDialogOpen(false);
    previousTransportEarlyArrivalTriggerKey.current = null;
    return;
  }

  if (
    previousTransportEarlyArrivalTriggerKey.current !==
    transportEarlyArrivalTriggerKey
  ) {
    previousTransportEarlyArrivalTriggerKey.current = transportEarlyArrivalTriggerKey;
 setDraftTransportEarlyArrivalOption(transportEarlyArrivalOption);
setDraftTransportEarlyArrivalHotelName(transportEarlyArrivalHotelName);
setDraftTransportEarlyArrivalLocationName(transportEarlyArrivalLocationName);
setDraftTransportEarlyArrivalRestMinutes(transportEarlyArrivalRestMinutes);
setTransportEarlyArrivalDialogError("");
    setIsTransportEarlyArrivalDialogOpen(true);
  }
}, [
  requiresTransportEarlyArrivalPreference,
  hasTransportEarlyArrivalPrerequisites,
  transportEarlyArrivalTriggerKey,
  transportEarlyArrivalOption,
  transportEarlyArrivalHotelName,
  transportEarlyArrivalLocationName,
  transportEarlyArrivalRestMinutes,
]);

const openTransportEarlyArrivalDialog = () => {
  setDraftTransportEarlyArrivalOption(transportEarlyArrivalOption);
  setDraftTransportEarlyArrivalHotelName(transportEarlyArrivalHotelName);
  setDraftTransportEarlyArrivalLocationName(transportEarlyArrivalLocationName);
  setDraftTransportEarlyArrivalRestMinutes(transportEarlyArrivalRestMinutes);
  setTransportEarlyArrivalDialogError("");
  setIsTransportEarlyArrivalDialogOpen(true);
};

const handleConfirmTransportEarlyArrival = () => {
  if (!draftTransportEarlyArrivalOption) {
    setTransportEarlyArrivalDialogError("Select how Day 1 should begin.");
    return;
  }

  if (
    draftTransportEarlyArrivalOption === "OTHER_LOCATION" &&
    !draftTransportEarlyArrivalLocationName.trim()
  ) {
    setTransportEarlyArrivalDialogError("Enter the preferred location.");
    return;
  }

  if (
    !Number.isInteger(draftTransportEarlyArrivalRestMinutes) ||
    draftTransportEarlyArrivalRestMinutes < 30 ||
    draftTransportEarlyArrivalRestMinutes > 720
  ) {
    setTransportEarlyArrivalDialogError(
      "Rest duration must be between 30 and 720 minutes.",
    );
    return;
  }

  if (draftTransportEarlyArrivalHotelName.trim().length > 255 ||
      draftTransportEarlyArrivalLocationName.trim().length > 255) {
    setTransportEarlyArrivalDialogError(
      "Location names must be 255 characters or fewer.",
    );
    return;
  }

  setTransportEarlyArrivalOption(draftTransportEarlyArrivalOption);

  setTransportEarlyArrivalHotelName(
    draftTransportEarlyArrivalOption === "HOTEL_REST"
      ? draftTransportEarlyArrivalHotelName.trim()
      : "",
  );

  setTransportEarlyArrivalLocationName(
    draftTransportEarlyArrivalOption === "AIRPORT_LOUNGE" ||
    draftTransportEarlyArrivalOption === "RESTAURANT_REST" ||
    draftTransportEarlyArrivalOption === "OTHER_LOCATION"
      ? draftTransportEarlyArrivalLocationName.trim()
      : "",
  );

  setTransportEarlyArrivalRestMinutes(
    draftTransportEarlyArrivalOption === "REFRESHMENT_BEFORE_SIGHTSEEING"
      ? 60
      : draftTransportEarlyArrivalRestMinutes,
  );

  setTransportEarlyArrivalDialogError("");
  setIsTransportEarlyArrivalDialogOpen(false);
};

const isTravelExpertCabsDatePicker = Boolean(travelExpertCabs || pageMode === "smart-booking" || (isTravelExpertPartnerField && itineraryPreference === "both"));
const {
  isTripDatesOpen,
  setHoveredToDate,
  isSelectingDeparture,
  tripStartDateObj,
  tripEndDateObj,
  previewRange,
  previewNoOfDays,
  previewNoOfNights,
  previewArrivalDateLabel,
  previewDepartureDateLabel,
  handleTripDayClick,
  handleTripDatesOpenChange,
  disablePastAndToday,
} = useItineraryPlanDates({
  tripStartDate,
  tripEndDate,
  setTripStartDate,
  setTripEndDate,
});

// Continue Planning minimum selectable date.
//
// Example:
// previous itinerary ends 27/09/2026 at 12:00 PM
// minimumTripDate = 27/09/2026
//
// The same date remains selectable, but the new start
// time must be after the previous itinerary end time.
const continuationMinimumDate = useMemo(() => {
  if (!minimumTripDate) {
    return null;
  }

  const parsedDate = parse(
    minimumTripDate,
    "dd/MM/yyyy",
    new Date(),
  );

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  parsedDate.setHours(0, 0, 0, 0);

  return parsedDate;
}, [minimumTripDate]);

const isTripDateDisabled = (date: Date) => {
  // Preserve the existing normal itinerary rule.
  if (disablePastAndToday(date)) {
    return true;
  }

  // Normal Create Itinerary has no continuation minimum.
  if (!continuationMinimumDate) {
    return false;
  }

  const candidateDate = new Date(date);
  candidateDate.setHours(0, 0, 0, 0);

  return candidateDate < continuationMinimumDate;
};
// DVI_TE_TOURS_LAYOUT_HOTEL_CALENDAR_V1: Hotels-style date range, Tours state.
const updateToursCalendarCheckIn = (iso: string) => {
  if (!iso) {
    setTripStartDate("");
    setTripEndDate("");
    return;
  }
  const picked = parse(iso, "yyyy-MM-dd", new Date());
  if (Number.isNaN(picked.getTime()) || format(picked, "yyyy-MM-dd") !== iso || isTripDateDisabled(picked)) return;
  setTripStartDate(format(picked, "dd/MM/yyyy"));
  if (tripEndDateObj && picked > tripEndDateObj) setTripEndDate("");
};
const updateToursCalendarCheckOut = (iso: string) => {
  if (!iso) {
    setTripEndDate("");
    return;
  }
  const picked = parse(iso, "yyyy-MM-dd", new Date());
  if (!tripStartDateObj || Number.isNaN(picked.getTime()) || format(picked, "yyyy-MM-dd") !== iso ||
      isTripDateDisabled(picked) || picked < tripStartDateObj) return;
  setTripEndDate(format(picked, "dd/MM/yyyy"));
};
const timeToMinutes = (value: string) => {
  const [hours, minutes] = String(value || "")
    .split(":")
    .map(Number);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes)
  ) {
    return -1;
  }

  return hours * 60 + minutes;
};

const minutesToTime = (totalMinutes: number) => {
  const safeMinutes = Math.min(
    Math.max(totalMinutes, 0),
    23 * 60 + 59,
  );

  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(
    minutes,
  ).padStart(2, "0")}`;
};

const isContinuationStartDay =
  Boolean(minimumTripDate) &&
  tripStartDate === minimumTripDate;

const minimumAllowedContinuationStartTime =
  minimumTripStartTime
    ? minutesToTime(
        timeToMinutes(minimumTripStartTime) + 5,
      )
    : "";

// When Continue Planning starts on the same day as the
// previous itinerary ended, automatically keep the new
// start time after the previous departure time.
useEffect(() => {
  if (
    !isContinuationStartDay ||
    !minimumAllowedContinuationStartTime
  ) {
    return;
  }

  if (
    timeToMinutes(startTime) <
    timeToMinutes(
      minimumAllowedContinuationStartTime,
    )
  ) {
    setStartTime(
      minimumAllowedContinuationStartTime,
    );
  }
}, [
  isContinuationStartDay,
  minimumAllowedContinuationStartTime,
  startTime,
  setStartTime,
]);

// Travel Expert Cabs only: after selecting the trip start, dates before it
// are unavailable while choosing the end. Other roles retain their rules.
const isDviTeCabsDateBeforeStart = (day: Date): boolean =>
  Boolean(
    isTravelExpertCabsDatePicker &&
    isSelectingDeparture &&
    tripStartDateObj &&
    !tripEndDateObj &&
    format(day, "yyyy-MM-dd") < format(tripStartDateObj, "yyyy-MM-dd")
  );
const isDviTeCabsCalendarDayDisabled = (day: Date): boolean =>
  isTripDateDisabled(day) || isDviTeCabsDateBeforeStart(day);

const [visibleMonth, setVisibleMonth] = useState(() =>
  startOfMonth(today),
);
useEffect(() => {
  // DVI_TE_CABS_MANUAL_MONTH_NAV_V9
  // Once a start date is clicked, don't move the visible months out from
  // under the user. The Next/Previous arrows still call setVisibleMonth.
  if (isTravelExpertCabsDatePicker && isTripDatesOpen) return;
  if (tripStartDate) {
    const selectedStartDate = parseDDMMYYYY(tripStartDate);

    if (selectedStartDate) {
      setVisibleMonth(
        startOfMonth(selectedStartDate),
      );
      return;
    }
  }

  if (continuationMinimumDate) {
    setVisibleMonth(
      startOfMonth(continuationMinimumDate),
    );
  }
}, [
  tripStartDate,
  continuationMinimumDate,
  isTravelExpertCabsDatePicker,
  isTripDatesOpen,
]);

const visibleFrom = format(startOfMonth(visibleMonth), "yyyy-MM-dd");
const visibleTo = format(endOfMonth(addMonths(visibleMonth, isMobile ? 0 : 1)), "yyyy-MM-dd");
const selectedFrom = tripStartDateObj ? format(tripStartDateObj, "yyyy-MM-dd") : "";
const selectedTo = tripEndDateObj ? format(tripEndDateObj, "yyyy-MM-dd") : "";
const visibleEventsQuery = useCalendarEvents({
  from: visibleFrom,
  to: visibleTo,
  locations: calendarLocationNames,
});
const selectedEventsQuery = useCalendarEvents({
  from: selectedFrom,
  to: selectedTo,
  locations: calendarLocationNames,
  enabled: Boolean(selectedFrom && selectedTo),
});
const visibleEvents = visibleEventsQuery.data?.events || [];
const eventsByTravelDate = useMemo(() => getEventsByTravelDate(visibleEvents), [visibleEvents]);
const eventsByActualStartDate = useMemo(() => getEventsByActualStartDate(visibleEvents), [visibleEvents]);

const vehicleOnlyTravellerTotals = useMemo(() => {
  const totals = (rooms || []).reduce(
    (acc, room) => {
      acc.adults += getSafeTravellerCount(room.adults, 0);
      acc.children += getSafeTravellerCount(room.children, 0);
      acc.infants += getSafeTravellerCount(room.infants, 0);
      return acc;
    },
    {
      adults: 0,
      children: 0,
      infants: 0,
    }
  );

  return {
    adults: Math.max(totals.adults, 1),
    children: totals.children,
    infants: totals.infants,
  };
}, [rooms]);

// DVI_TE_TOURS_ROOMS_COUNTER_V1
const handleToursRoomCountChange = (value: string) => {
  const requested = Math.min(
    25,
    Math.max(1, getSafeTravellerCount(value, 1)),
  );

  setRooms((previousRooms) => {
    if (previousRooms.length === requested) {
      return previousRooms;
    }

    const nextRooms = previousRooms
      .slice(0, requested)
      .map((room, index) => ({
        ...room,
        id: index + 1,
        roomCount: requested,
        childrenDetails: (room.childrenDetails || []).map(
          (child) => ({ ...child }),
        ),
      }));

    while (nextRooms.length < requested) {
      nextRooms.push(
        cloneRoomFromTemplate(
          defaultRoomTemplate,
          nextRooms.length + 1,
          requested,
        ),
      );
    }

    return nextRooms;
  });
};
// DVI_TE_TOURS_CHILD_AGE_BED_V1: age/bed data is saved in the existing rooms array.
const updateToursChildDetail = (
  roomId: number,
  childIndex: number,
  patch: Partial<RoomRow["childrenDetails"][number]>,
) => {
  const currentRoom = rooms.find((room) => room.id === roomId);
  if (!currentRoom || childIndex < 0 || childIndex >= currentRoom.children) return;

  const childDetails = Array.from(
    { length: currentRoom.children },
    (_, index) => ({
      age: currentRoom.childrenDetails?.[index]?.age ?? ("" as const),
      bedType: currentRoom.childrenDetails?.[index]?.bedType ?? ("Without Bed" as const),
      hotelApprovalAccepted: currentRoom.childrenDetails?.[index]?.hotelApprovalAccepted ?? false,
    }),
  );

  childDetails[childIndex] = {
    ...childDetails[childIndex],
    ...patch,
    hotelApprovalAccepted: false,
  };

  // Changing a child's bed must still respect the shared room occupancy rules.
  if (patch.bedType !== undefined) {
    const issue = getRoomOccupancyValidationError({
      ...currentRoom,
      childrenDetails: childDetails,
    });
    if (issue) {
      toast({ title: "Room occupancy not allowed", description: issue, variant: "destructive" });
      return;
    }
  }

  setRooms((previous) => previous.map((room) =>
    room.id === roomId ? { ...room, childrenDetails: childDetails } : room
  ));
};
const handleVehicleOnlyTravellerChange = (
  field: "adults" | "children" | "infants",
  value: string
) => {
  const nextValue = getSafeTravellerCount(
    value,
    field === "adults" ? 1 : 0
  );

  const nextCounts = {
    ...vehicleOnlyTravellerTotals,
    [field]: nextValue,
  };

  setRooms(() => buildVehicleOnlyTravellerRooms(nextCounts));
};
const handleToursTravellerChange = (
  field: "adults" | "children" | "infants",
  value: string,
) => {
  const currentTotal = (rooms || []).reduce(
    (sum, room) => sum + getSafeTravellerCount(room[field], 0),
    0,
  );

  const minimum = field === "adults" ? rooms.length : 0;
  const requested = Math.min(
    125,
    Math.max(minimum, getSafeTravellerCount(value, minimum)),
  );

  const difference = requested - currentTotal;
  if (difference === 0) return;

  const updatedRooms: RoomRow[] = rooms.map((room) => ({
    ...room,
    childrenDetails: [...(room.childrenDetails || [])],
  }));

  const direction = difference > 0 ? 1 : -1;
  let remaining = Math.abs(difference);

  const indices = updatedRooms.map((_, index) => index);

  if (direction < 0) indices.reverse();

  for (const index of indices) {
    while (remaining > 0) {
      const room = updatedRooms[index];
      const oldValue = getSafeTravellerCount(room[field], 0);
      const fieldMinimum = field === "adults" ? 1 : 0;

      if (direction < 0 && oldValue <= fieldMinimum) break;

      const nextValue = oldValue + direction;

      const childrenDetails: RoomRow["childrenDetails"] =
        field === "children"
          ? direction > 0
            ? [
                ...room.childrenDetails,
                {
                  age: "",
                  bedType: "Without Bed",
                  hotelApprovalAccepted: false,
                },
              ]
            : room.childrenDetails.slice(0, nextValue)
          : room.childrenDetails;

      const candidate: RoomRow = {
        ...room,
        [field]: nextValue,
        childrenDetails,
        extraBeds:
          field === "adults"
            ? Math.max(nextValue - 2, 0)
            : room.extraBeds,
      };

      if (
        direction > 0 &&
        getRoomOccupancyValidationError(candidate)
      ) {
        break;
      }

      updatedRooms[index] = candidate;
      remaining -= 1;
    }

    if (remaining === 0) break;
  }

  if (remaining < Math.abs(difference)) {
    setRooms(updatedRooms);
  }

  if (remaining > 0) {
    toast({
      title: "Room occupancy limit",
      description:
        "Some travellers could not be added or removed. Review the Room Configuration for available capacity, child beds, or additional rooms.",
      variant: "destructive",
    });
  }
};

  const hotelCategory: string[] = selectedHotelCategoryIds.map((id) => String(id));
  const handleHotelCategoryChange = (vals: string[]) => {
    const ids = (vals || [])
      .map((v) => Number(v))
      .filter((n) => !Number.isNaN(n));
    setSelectedHotelCategoryIds(ids);
  };

  // hotel facilities still local (no backend field yet)
  const hotelFacility: string[] = selectedHotelFacilityIds;

const handleHotelFacilityChange = (vals: string[]) => {
  setSelectedHotelFacilityIds(mapMultiValuesToStringIds(vals, hotelFacilityOptions));
};


const {
  agentOptions,
  locationOptions,
  hotelCategoryAutoOptions,
  hotelFacilityAutoOptions,
  nationalityOptions,
} = useItineraryPlanOptions({
  agents,
  locations,
  hotelCategoryOptions,
  hotelFacilityOptions,
  nationalities,
});
  useItineraryPlanDefaults({
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
  });



  // DVI_TE_TOURS_SINGLELINE_CLICK_V1: label the three selected Partner
  // values and the existing Tours location selectors without replacing their
  // React state, dropdown handlers, or form data.
  useEffect(() => {
    if (!showTravelExpertToursCounters) return;
    const root = document.querySelector<HTMLElement>(
      '[data-dvi-te-tours-compact="true"]',
    );
    if (!root) return;

    const strip = root.querySelector<HTMLElement>(
      'section[aria-label="Arrival and departure details"]',
    );
    if (strip) {
      for (const name of ["Arrival Place", "Departure Place"]) {
        const label = Array.from(strip.querySelectorAll("label")).find(
          (element) => element.textContent?.trim() === name,
        );
        const container = label?.parentElement;
        if (container) {
          container.setAttribute("data-dvi-te-tours-place", name === "Arrival Place" ? "arrival" : "departure");
        }
      }
    }

    const partner = root.querySelector<HTMLElement>('[data-field="agentId"]');
    if (!partner) return;
    // DVI_TE_TOURS_REMAINING_UI_V3: style the smallest common row, never the whole form.
    const nationalityField = root.querySelector<HTMLElement>('[data-field="nationality"]');
    if (nationalityField) {
      let sharedRow: HTMLElement | null = partner.parentElement;
      while (sharedRow && sharedRow !== root && !sharedRow.contains(nationalityField)) {
        sharedRow = sharedRow.parentElement;
      }
      if (sharedRow && sharedRow !== root &&
          !sharedRow.querySelector('section[aria-label="Arrival and departure details"]')) {
        sharedRow.setAttribute('data-dvi-te-tours-partner-row', 'true');
      }
    }
    for (const name of ["Agent Name", "Email ID", "Mobile Number"]) {
      const label = Array.from(
        partner.querySelectorAll<HTMLElement>("p, span, label, div"),
      ).find((element) =>
        element.childElementCount === 0 && element.textContent?.trim() === name,
      );
      if (!label) continue;
      // DVI_TE_TOURS_REMAINING_UI_V3: hide only mini-headings; keep selected values and click-to-expand.
      label.setAttribute('data-dvi-te-tours-mini-label', 'true');
      let value = label.nextElementSibling as HTMLElement | null;
      if (!value && label.parentElement) {
        value = label.parentElement.nextElementSibling as HTMLElement | null;
      }
      if (!value || value.matches("button, input, select") || value.querySelector("button, input, select")) {
        continue;
      }
      const fullText = value.textContent?.trim() || "";
      if (!fullText) continue;
      value.setAttribute("data-dvi-te-partner-value", "true");
      value.setAttribute("title", `Click to see full ${name}: ${fullText}`);
      value.setAttribute("aria-label", `${name}: ${fullText}. Click or focus to expand.`);
      value.tabIndex = 0;
    }
  }, [showTravelExpertToursCounters, selectedAgent?.name, selectedAgent?.email, selectedAgent?.mobile]);
  return (
    <Card data-dvi-te-tours-strip-only={showTravelExpertToursCounters ? "true" : undefined} data-dvi-cabs-minimal={
   authenticatedRole === USER_ROLES.TRAVEL_EXPERT &&
   itineraryPreference === "vehicle" &&
   pageMode === "create-itinerary"
     ? "true"
     : undefined
 } data-dvi-te-tours-tight={showTravelExpertToursCounters ? "true" : undefined}
    className="border border-[#efdef8] rounded-lg bg-white shadow-none" data-dvi-te-tours-style={showTravelExpertToursCounters ? "true" : undefined}>

        {/* DVI_TE_TOURS_STRIP_ONLY_V3: Hide original duplicate inputs only on Tours. */}
        <style>{`
          [data-dvi-te-tours-strip-only="true"] [data-dvi-te-legacy-location-row],
          [data-dvi-te-tours-strip-only="true"] [data-dvi-te-legacy-date-hotel-row],
          [data-dvi-te-tours-strip-only="true"] [data-dvi-te-legacy-times],
          [data-dvi-te-tours-strip-only="true"] [data-field="foodPreference"],
          [data-dvi-te-tours-strip-only="true"] [data-dvi-te-legacy-meal-plan] {
            display: none !important;
          }
        `}</style>
<CardContent data-dvi-te-tours-compact={showTravelExpertToursCounters ? "true" : undefined} className="pt-4 pb-5 space-y-4">
  {showTravelExpertToursCounters && (
    <style>{`
      /* DVI_TE_TOURS_SINGLELINE_CLICK_V1: only the two Tours place controls */
      [data-dvi-te-tours-compact="true"] [data-dvi-te-tours-place] {
        min-width: 0 !important;
      }
      [data-dvi-te-tours-compact="true"] [data-dvi-te-tours-place] > div {
        min-width: 0 !important;
      }
      [data-dvi-te-tours-compact="true"] [data-dvi-te-tours-place] button > span:first-child {
        display: block !important;
        flex: 1 1 0% !important;
        min-width: 0 !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }
      /* When clicked, the existing autosuggest menu displays complete names. */
      [data-dvi-te-tours-compact="true"] [data-dvi-te-tours-place] .absolute.top-full {
        right: auto !important;
        width: max-content !important;
        min-width: 100% !important;
        max-width: min(420px, calc(100vw - 24px)) !important;
      }
      [data-dvi-te-tours-compact="true"] [data-dvi-te-tours-place] .absolute.top-full span {
        white-space: normal !important;
        overflow-wrap: anywhere !important;
      }
      /* Partner values: one line by default, fully expanded on click/focus. */
      [data-dvi-te-tours-compact="true"] [data-dvi-te-partner-value="true"] {
        display: block !important;
        min-width: 0 !important;
        max-width: 100% !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        cursor: pointer;
      }
      [data-dvi-te-tours-compact="true"] [data-dvi-te-partner-value="true"]:focus {
        position: relative;
        z-index: 30;
        width: max-content;
        max-width: min(460px, calc(100vw - 32px)) !important;
        padding: 6px 8px;
        border: 1px solid #c4b5fd;
        border-radius: 8px;
        background: white;
        box-shadow: 0 8px 24px rgba(57, 35, 94, 0.14);
        white-space: normal !important;
        overflow: visible !important;
        overflow-wrap: anywhere;
        outline: none;
      }
    `}</style>
  )}
  {showTravelExpertToursCounters && (
    <style hidden>{`
      [data-dvi-te-tours-compact="true"] section[aria-label="Arrival and departure details"] > div:first-child {
        display: none !important;
      }
      [data-dvi-te-tours-compact="true"] section[aria-label="Arrival and departure details"] label,
      [data-dvi-te-tours-compact="true"] [data-dvi-te-tours-extras] label {
        font-size: 14px !important;
        font-weight: 700 !important;
        color: #1e293b !important;
      }
      [data-dvi-te-tours-compact="true"] section[aria-label="Arrival and departure details"] input,
      [data-dvi-te-tours-compact="true"] section[aria-label="Arrival and departure details"] button,
      [data-dvi-te-tours-compact="true"] section[aria-label="Arrival and departure details"] select,
      [data-dvi-te-tours-compact="true"] [data-dvi-te-tours-extras] input,
      [data-dvi-te-tours-compact="true"] [data-dvi-te-tours-extras] button {
        font-size: 14px !important;
        font-weight: 600 !important;
      }
    `}</style>
  )}
  {defaultRouteOptions.length > 0 && (
    <div className="rounded-lg border border-[#f0d7ff] bg-[#fff7fd] p-3">
      <Label className="mb-2 block text-sm font-medium text-[#4a4260]">
        Suggested Route Options
      </Label>

      <div className="flex flex-wrap gap-2">
        {defaultRouteOptions.map((route, idx) => (
          <button
            key={`plan-route-${route.routeId || idx}`}
            type="button"
            onClick={() => onDefaultRouteSelect?.(route, idx)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeDefaultRouteIndex === idx
                ? "bg-pink-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Route {idx + 1}
          </button>
        ))}
      </div>
    </div>
  )}

  {/* ROW 1: Partner above counters for Travel Expert Cabs/Tours */}
<div
  className={
    showTravelExpertToursCounters
      ? "grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
      : hideTravelExpertCabsDetails
        ? "flex flex-col gap-3"
        : "flex flex-col md:flex-row md:items-start gap-4"
  }
>
  {!isVehicleAgent && !(pageMode === "create-itinerary" && (authenticatedTravelExpertRole === USER_ROLES.TRAVEL_EXPERT || (authenticatedTravelExpertRole === USER_ROLES.STAFF && Number(authenticatedTravelExpertUser?.permissionRoleId ?? 0) === 3 && Number(authenticatedTravelExpertUser?.staffId ?? authenticatedTravelExpertUser?.staff_id ?? 0) > 0))) && (
    <div
      className={
        isAgentLocked
          ? "w-full md:w-[calc(50%-0.5rem)] md:flex-none bg-[#fef8ff] border border-[#e9d4ff] rounded-md p-3"
          : "flex-1 bg-[#fef8ff] border border-[#e9d4ff] rounded-md p-3"
      }
    >
      <ItineraryPreferenceControl
        value={itineraryPreference}
        onChange={setItineraryPreference}
        isVehicleAgent={isVehicleAgent}
      />
    </div>
  )}

{canUseAgentSelectionPopup && !isAgentLocked ? (
  <div
    className={`w-full ${isTravelExpertPartnerField ? "md:flex-1" : "md:w-[32%] md:flex-none"} ${
      validationErrors?.agentId
        ? "rounded-md border border-red-500 p-2"
        : ""
    }`}
    data-field="agentId"
  >
    <Label className="mb-1 block text-sm">
      {isTravelExpertPartnerField ? "Partner" : "Agent"} <span className="dvi-required-star">*</span>
    </Label>

    {!selectedAgent ? (
      <div data-dvi-te-tours-agent-row={showTravelExpertToursCounters ? "true" : undefined} className="space-y-2">

        {/* Existing Agent selector directly on Create Itinerary */}
        <AutoSuggestSelect
          mode="single"
          value={
            !pendingNewAgent && agentId
              ? String(agentId)
              : ""
          }
          onChange={(val) => {
            const nextAgentId =
              val
                ? Number(val as string)
                : null;

            /*
             * Selecting an existing Agent
             * cancels any temporary new
             * Agent selection.
             */
            setPendingNewAgent(null);
            setAgentId(nextAgentId);
          }}
         options={agentOptions}
          placeholder="Select Existing Agent"
          openOnFocus={false}
        />

        {/* Add New Agent is now separate */}
        <Button
        data-dvi-tours-new-agent={showTravelExpertToursCounters /* DVI_TE_TOURS_NEW_AGENT_LIGHT_DARK_V1 */ ? "true" : undefined}
        data-dvi-tours-new-agent-selected={
          showTravelExpertToursCounters &&
          (Boolean(pendingNewAgent) || (isAgentDialogOpen && agentDialogMode === "new"))
            ? "true" : undefined
        }
  type="button"
  size="sm"
  onClick={openNewAgentDialog}
  className="
    w-full
    bg-pink-500
    text-white
    hover:bg-pink-600
    sm:w-auto
  "
 data-dvi-te-tours-add-partner={showTravelExpertToursCounters ? "true" : undefined}>
  + Add New {showTravelExpertToursCounters ? "Partner" : "Agent"}
</Button>
      </div>
    ) : isTravelExpertPartnerField ? (
      <div className="w-full rounded-md border border-[#e9d4ff] bg-white px-3 py-2">
        <div className="flex flex-wrap items-center gap-3">

          {/* Agent details and change-agent dropdown */}
          <button
            type="button"
            onClick={
              selectedAgent.isPending
                ? openNewAgentDialog
                : openExistingAgentDialog
            }
            aria-label={
              selectedAgent.isPending
                ? "Edit new agent"
                : "Change selected agent"
            }
            className="flex min-w-0 flex-1 items-start gap-3 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a78bfa]"
          >
            <span className="grid min-w-0 flex-1 grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-3">

              <span className="block min-w-0">
                <span className="block text-[11px] font-semibold text-slate-700">
                  Agent Name
                </span>
                <span className="block break-words text-sm font-semibold text-slate-950">
                  {selectedAgent.name || "-"}
                </span>
              </span>

              <span className="block min-w-0">
                <span className="block text-[11px] font-semibold text-slate-700">
                  Email ID
                </span>
                <span className="block break-all text-sm font-medium text-slate-950">
                  {selectedAgent.email || "-"}
                </span>
              </span>

              <span className="block min-w-0">
                <span className="block text-[11px] font-semibold text-slate-700">
                  Mobile Number
                </span>
                <span className="block text-sm font-medium text-slate-950">
                  {selectedAgent.mobile || "-"}
                </span>
              </span>

            </span>


          </button>

          {/* Add New Agent stays in the same row */}
          <Button
        data-dvi-tours-new-agent={showTravelExpertToursCounters /* DVI_TE_TOURS_NEW_AGENT_LIGHT_DARK_V1 */ ? "true" : undefined}
        data-dvi-tours-new-agent-selected={
          showTravelExpertToursCounters &&
          (Boolean(pendingNewAgent) || (isAgentDialogOpen && agentDialogMode === "new"))
            ? "true" : undefined
        }
            type="button"
            size="sm"
            onClick={openNewAgentDialog}
            className="h-9 shrink-0 bg-pink-500 px-3 text-white hover:bg-pink-600"
           data-dvi-te-tours-add-partner={showTravelExpertToursCounters ? "true" : undefined}>
            + Add New {showTravelExpertToursCounters ? "Partner" : "Agent"}
          </Button>

          {/* Preserve pending-agent deletion */}
          {selectedAgent.isPending && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleDeletePendingAgent}
              className="h-9 shrink-0 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              Delete Agent
            </Button>
          )}

        </div>
      </div>
    ) : (
      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-slate-500">
              Agent Name
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-800">
              {selectedAgent.name || "-"}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">
              Email ID
            </p>

            <p className="mt-1 break-all text-sm text-slate-700">
              {selectedAgent.email || "-"}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">
              Mobile Number
            </p>

            <p className="mt-1 text-sm text-slate-700">
              {selectedAgent.mobile || "-"}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={
              selectedAgent.isPending
                ? openNewAgentDialog
                : openExistingAgentDialog
            }
            className="bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
          >
            Edit Agent
          </Button>

          {selectedAgent.isPending ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleDeletePendingAgent}
              className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              Delete Agent
            </Button>
          ) : (
            <Button
        data-dvi-tours-new-agent={showTravelExpertToursCounters /* DVI_TE_TOURS_NEW_AGENT_LIGHT_DARK_V1 */ ? "true" : undefined}
        data-dvi-tours-new-agent-selected={
          showTravelExpertToursCounters &&
          (Boolean(pendingNewAgent) || (isAgentDialogOpen && agentDialogMode === "new"))
            ? "true" : undefined
        }
              type="button"
              size="sm"
              variant="outline"
              onClick={openNewAgentDialog}
             data-dvi-te-tours-add-partner={showTravelExpertToursCounters ? "true" : undefined}>
              + Add New {showTravelExpertToursCounters ? "Partner" : "Agent"}
            </Button>
          )}
        </div>
      </div>
    )}

    {validationErrors?.agentId && (
      <p className="mt-1 text-xs text-red-500">
        {validationErrors.agentId}
      </p>
    )}

   <Dialog
  open={isAgentDialogOpen}
  onOpenChange={(open) => {
    setIsAgentDialogOpen(open);

    if (!open) {
      setNewAgentErrors({});
    }
  }}
>
  <DialogContent
  data-dvi-te-tours-agent-dialog-zfix="true"
  overlayClassName={isTravelExpertPartnerField && itineraryPreference === "both" && pageMode === "create-itinerary" ? "!z-[9998]" : undefined}
  className={(isTravelExpertPartnerField && itineraryPreference === "both" && pageMode === "create-itinerary" ? (
  agentDialogMode === "select"
    ? "DVI_TE_AGENT_EDIT_DIALOG_VIEW_V5 !z-[9999] w-[calc(100vw-2rem)] sm:max-w-xl !min-h-[min(24rem,calc(100dvh-3rem))] !max-h-[calc(100dvh-3rem)] !overflow-visible rounded-2xl p-6 shadow-2xl"
    : "DVI_TE_AGENT_EDIT_DIALOG_VIEW_V5 !z-[9999] w-[calc(100vw-2rem)] sm:max-w-lg max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-2xl p-6 shadow-2xl"
 ) : (isTravelExpertPartnerField && itineraryPreference === "both" && pageMode === "create-itinerary"
    ? "!z-[9999] sm:max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto"
    : "sm:max-w-lg")) + (isTravelExpertPartnerField && itineraryPreference === "both" && pageMode === "create-itinerary" ? (agentDialogMode === "select" ? " dvi-te-v6-agent-select-dialog" : " dvi-te-v6-agent-new-dialog") : "")}
>
<DialogHeader>
  <DialogTitle>
    {agentDialogMode === "new"
      ? "Add New Agent"
      : "Edit Agent"}
  </DialogTitle>

  <DialogDescription>
    {agentDialogMode === "new"
      ? "Enter the Agent details. The account will only be created when the itinerary is finally saved."
      : "Select a different existing Agent for this itinerary."}
  </DialogDescription>
</DialogHeader>

   {agentDialogMode === "select" ? (
  <div className="space-y-4 py-2">
    <div>
      <Label className="mb-2 block text-sm">
        {isTravelExpertPartnerField ? "Partner" : "Agent"} <span className="dvi-required-star">*</span>
      </Label>

      <AutoSuggestSelect
        mode="single"
        value={
          !pendingNewAgent && agentId
            ? String(agentId)
            : ""
        }
        onChange={(val) => {
          const nextAgentId =
            val
              ? Number(val as string)
              : null;

          /*
           * Selecting another existing Agent
           * cancels any temporary new Agent.
           */
          setPendingNewAgent(null);
          setAgentId(nextAgentId);

          if (nextAgentId) {
            setIsAgentDialogOpen(false);
          }
        }}
        options={agentOptions}
        placeholder="Select Existing Agent"
        openOnFocus={false}
      />
    </div>
  </div>
) : (
      <div className="space-y-4 py-2">
        <div>
          <Label
            htmlFor="new-agent-name"
            className="mb-1.5 block text-sm"
          >
            Name *
          </Label>

          <Input
            id="new-agent-name"
            value={
              newAgentDraft.name
            }
            onChange={(event) =>
              updateNewAgentDraft(
                "name",
                event.target.value,
              )
            }
            placeholder="Enter Agent Name"
          />

          {newAgentErrors.name && (
            <p className="mt-1 text-xs text-red-500">
              {
                newAgentErrors.name
              }
            </p>
          )}
        </div>

        <div>
          <Label
            htmlFor="new-agent-company"
            className="mb-1.5 block text-sm"
          >
            Company Name *
          </Label>

          <Input
            id="new-agent-company"
            value={
              newAgentDraft.companyName
            }
            onChange={(event) =>
              updateNewAgentDraft(
                "companyName",
                event.target.value,
              )
            }
            placeholder="Enter Company Name"
          />

          {newAgentErrors.companyName && (
            <p className="mt-1 text-xs text-red-500">
              {
                newAgentErrors.companyName
              }
            </p>
          )}
        </div>

        <div>
          <Label
            htmlFor="new-agent-email"
            className="mb-1.5 block text-sm"
          >
            Email ID *
          </Label>

          <Input
            id="new-agent-email"
            type="email"
            value={
              newAgentDraft.email
            }
            onChange={(event) =>
              updateNewAgentDraft(
                "email",
                event.target.value,
              )
            }
            placeholder="Enter Email ID"
          />

          {newAgentErrors.email && (
            <p className="mt-1 text-xs text-red-500">
              {
                newAgentErrors.email
              }
            </p>
          )}
        </div>

        <div>
          <Label
            htmlFor="new-agent-mobile"
            className="mb-1.5 block text-sm"
          >
            Mobile Number *
          </Label>

          <Input
            id="new-agent-mobile"
            value={
              newAgentDraft.mobile
            }
            onChange={(event) =>
              updateNewAgentDraft(
                "mobile",
                event.target.value,
              )
            }
            placeholder="Enter Mobile Number"
          />

          {newAgentErrors.mobile && (
            <p className="mt-1 text-xs text-red-500">
              {
                newAgentErrors.mobile
              }
            </p>
          )}
        </div>

<DialogFooter className="gap-2 sm:gap-0">
  <Button
    type="button"
    variant="outline"
    onClick={() => {
      setNewAgentErrors({});
      setIsAgentDialogOpen(false);
    }}
  >
    Cancel
  </Button>

  <Button
    type="button"
    onClick={handleAddPendingAgent}
  >
    Add Agent
  </Button>
</DialogFooter>
      </div>
    )}
  </DialogContent>
</Dialog>
   </div>
) : !isAgentLocked ? (
  <div
    className={`w-full md:w-[32%] md:flex-none ${
      validationErrors?.agentId
        ? "rounded-md border border-red-500 p-2"
        : ""
    }`}
    data-field="agentId"
  >
    <Label className="mb-1 block text-sm">
      {isTravelExpertPartnerField ? "Partner" : "Agent"} <span className="dvi-required-star">*</span>
    </Label>

    <AutoSuggestSelect
      mode="single"
      value={agentId ? String(agentId) : ""}
      onChange={(val) =>
        setAgentId(
          val ? Number(val as string) : null,
        )
      }
      options={agentOptions}
      placeholder={isTravelExpertPartnerField ? "Select Partner" : "Select Agent"}
    />

    {validationErrors?.agentId && (
      <p className="mt-1 text-xs text-red-500">
        {validationErrors.agentId}
      </p>
    )}
  </div>
) : null}

      {/* DVI_TE_TOURS_NATIONALITY_TOP_ONLY_V3 */}
      {showTravelExpertToursCounters && (
        <div
          className={`w-full min-w-0 ${
            validationErrors?.nationality
              ? "rounded-md border border-red-500 p-2"
              : ""
          }`}
          data-field="nationality"
        >
            {/* DVI_TE_TOURS_MARKED_FIX_V2 */}
            {showTravelExpertToursCounters && (
              <span className="dvi-te-nationality-flag" aria-hidden="true">
                {(() => {
                  const selectedCountry = nationalityOptions.find(item => String(item.value) === String(nationality))?.label || '';
                  const flagUrl = getTravelExpertToursFlagUrl(selectedCountry);
                  return (
                    <span className="relative inline-flex h-[18px] w-[26px] items-center justify-center">
                      <span className="text-[17px]" aria-hidden="true">🌐</span>
                      {flagUrl && (
                        <img
                          src={flagUrl}
                          alt=""
                          aria-hidden="true"
                          className="absolute inset-0 h-full w-full rounded-[2px] object-cover shadow-sm"
                          onError={(event) => { event.currentTarget.style.display = 'none'; }}
                        />
                      )}
                    </span>
                  );
                })()}
              </span>
            )}

          <Label className="mb-1 block text-sm">
            Nationality <span className="dvi-required-star">*</span>
          </Label>

          <AutoSuggestSelect
            mode="single"
            value={nationality}
            onChange={(val) => setNationality(val as string)}
            options={nationalityOptions}
            placeholder="India"
          />

          {validationErrors?.nationality && (
            <p className="mt-1 text-xs text-red-500">
              {validationErrors.nationality}
            </p>
          )}
        </div>
      )}

{/* DVI_TE_TOURS_ARRIVAL_DETAILS_STRIP_V2: controlled from the existing itinerary state */}
{showTravelExpertToursCounters && (
  <section
    aria-label="Arrival and departure details"
    className="col-span-full min-w-0 rounded-xl border border-[#e5d7f6] bg-white p-3"
  >
    {/* DVI_TE_TOURS_LAYOUT_HOTEL_CALENDAR_V1 */}
    <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[#32258c]">
      <CalendarIcon className="h-4 w-4 shrink-0 text-[#7c3aed]" />
      <span>2. Arrival &amp; Departure Details</span>
    </div>

    {/* Full-width first row: four equally sized fields */}
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="min-w-0">
        <Label className="mb-1 block text-xs font-semibold">Arrival Place <span className="text-red-500" aria-hidden="true">*</span></Label>
        <AutoSuggestSelect
          mode="single"
          value={arrivalLocation}
          onChange={(value) => setArrivalLocation(value as string)}
          options={locationOptions}
          placeholder="Choose Location"
          noResultsMessage={LOCATION_NOT_AVAILABLE_MESSAGE}
        />
        {validationErrors?.arrivalLocation && (
          <p className="mt-1 text-xs text-red-600">{validationErrors.arrivalLocation}</p>
        )}
      </div>

      <div className="min-w-0">
        <Label className="mb-1 block text-xs font-semibold">Arrival Date &amp; Time <span className="text-red-500" aria-hidden="true">*</span></Label>
        <div className="flex min-w-0 items-center gap-1.5">
          <div className="min-w-0 flex-1">
            <TravelExpertHotelDateRangeInput
              side="checkin"
              allowSameDay
              calendarDialogStyle
              checkInValue={tripStartDate}
              checkOutValue={tripEndDate}
              onChangeCheckIn={(event) => updateToursCalendarCheckIn(event.target.value)}
              onChangeCheckOut={(event) => updateToursCalendarCheckOut(event.target.value)}
              min={format(new Date(Date.now() + 86400000), "yyyy-MM-dd")}
              className="h-9"
            />
          </div>
          <TravelExpertToursModernTimePicker
            label="Arrival time"
            value={startTime}
            align="start"
            minTime={isContinuationStartDay ? minimumAllowedContinuationStartTime : undefined}
            onChange={(time) => {
              setStartTime(
                isContinuationStartDay && minimumAllowedContinuationStartTime &&
                timeToMinutes(time) < timeToMinutes(minimumAllowedContinuationStartTime)
                  ? minimumAllowedContinuationStartTime
                  : time,
              );
            }}
          />
        </div>
        {(validationErrors?.tripStartDate || validationErrors?.startTime) && (
          <p className="mt-1 text-xs text-red-600">{validationErrors?.tripStartDate || validationErrors?.startTime}</p>
        )}
      </div>

      <div className="min-w-0">
        <Label className="mb-1 block text-xs font-semibold">Departure Place <span className="text-red-500" aria-hidden="true">*</span></Label>
        <AutoSuggestSelect
          mode="single"
          value={departureLocation}
          onChange={(value) => setDepartureLocation(value as string)}
          options={locationOptions}
          placeholder="Choose Location"
          noResultsMessage={LOCATION_NOT_AVAILABLE_MESSAGE}
        />
        {validationErrors?.departureLocation && (
          <p className="mt-1 text-xs text-red-600">{validationErrors.departureLocation}</p>
        )}
      </div>

      <div className="min-w-0">
        <Label className="mb-1 block text-xs font-semibold">Departure Date &amp; Time <span className="text-red-500" aria-hidden="true">*</span></Label>
        <div className="flex min-w-0 items-center gap-1.5">
          <div className="min-w-0 flex-1">
            <TravelExpertHotelDateRangeInput
              side="checkout"
              allowSameDay
              calendarDialogStyle
              checkInValue={tripStartDate}
              checkOutValue={tripEndDate}
              onChangeCheckIn={(event) => updateToursCalendarCheckIn(event.target.value)}
              onChangeCheckOut={(event) => updateToursCalendarCheckOut(event.target.value)}
              min={format(new Date(Date.now() + 86400000), "yyyy-MM-dd")}
              className="h-9"
            />
          </div>
          <TravelExpertToursModernTimePicker
            label="Departure time"
            value={endTime}
            align="end"
            onChange={setEndTime}
          />
        </div>
        {(validationErrors?.tripEndDate || validationErrors?.endTime) && (
          <p className="mt-1 text-xs text-red-600">{validationErrors?.tripEndDate || validationErrors?.endTime}</p>
        )}
      </div>
    </div>

    {/* Second row: Rooms & Guests + the three moved hotel/meal controls */}
    <div className="mt-3 grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-12">
      <div className="min-w-0 lg:col-span-6">
        <TravelExpertToursRoomsGuests
          rooms={rooms}
          setRooms={setRooms}
          defaultRoomTemplate={defaultRoomTemplate}
        />
      </div>

      <div className="min-w-0 lg:col-span-2">
        <Label className="mb-1 block text-xs font-semibold">Select Hotel Category <span className="text-red-500" aria-hidden="true">*</span></Label>
        {/* DVI_TE_TOURS_BUDGET_FIRST_AGENT_INLINE_V1: Tours-only category pills; keep original selector for all other modes. */}
{showTravelExpertToursCounters ? (
  <TravelExpertToursHotelCategoryPills
    value={hotelCategory}
    onChange={(values) => handleHotelCategoryChange(values as string[])}
    options={hotelCategoryAutoOptions}
    maxSelected={4}
  />
) : (
<AutoSuggestSelect
          mode="multi"
          value={hotelCategory}
          onChange={(values) => handleHotelCategoryChange(values as string[])}
          options={hotelCategoryAutoOptions}
          placeholder="Choose category"
          maxSelected={4}
        />
)}
        {validationErrors?.hotelCategory && (
          <p className="mt-1 text-xs text-red-600">{validationErrors.hotelCategory}</p>
        )}
      </div>

      <div className="min-w-0 lg:col-span-2">
        <Label className="mb-1 block text-xs font-semibold">Meal Plan <span className="text-red-500" aria-hidden="true">*</span></Label>
        <Select value={mealPlanCode} onValueChange={setMealPlanCode}>
          <SelectTrigger className="h-9 min-w-0 border-[#e5d7f6] text-xs">
            <SelectValue placeholder="Choose plan" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-56 overflow-y-auto">
            {mealPlanOptions.map((option) => (
              <SelectItem key={option.code} value={option.code}>{getMealPlanLabel(option)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-0 lg:col-span-2">
        <Label className="mb-1 block text-xs font-semibold">Meal Preference <span className="text-red-500" aria-hidden="true">*</span></Label>
        <Select value={foodPreference} onValueChange={setFoodPreference}>
          <SelectTrigger className="h-9 min-w-0 border-[#e5d7f6] text-xs">
            <SelectValue placeholder="Choose preference" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-56 overflow-y-auto">
            {foodPreferences.map((option) => (
              <SelectItem key={option.id} value={String(option.id)}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {validationErrors?.foodPreference && (
          <p className="mt-1 text-xs text-red-600">{validationErrors.foodPreference}</p>
        )}
      </div>
    </div>
  </section>
)}

      {/* DVI_TE_TOURS_COUNTERS_V1: Tours guests beside Partner */}

      {/* DVI_CABS_LAYOUT_MOVE_V1: guest counts beside Partner */}
      {hideTravelExpertCabsDetails && (
        <div className="w-full min-w-0 md:flex-1">
<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-sm block mb-1">
                {isTravelExpertCabsDatePicker ? "Adults" : "No. of Adults"} <span className="text-red-500">*</span>
              </Label>
              {isTravelExpertCabsDatePicker ? (
  <TravellerCounterField
    label="Adults"
    value={vehicleOnlyTravellerTotals.adults}
    min={1}
    onChange={(nextValue) => handleVehicleOnlyTravellerChange("adults", nextValue)}
  />
) : (
<Input
                type="number"
                min={1}
                className="h-9 border-[#e5d7f6]"
                value={vehicleOnlyTravellerTotals.adults}
                onChange={(e) =>
                  handleVehicleOnlyTravellerChange("adults", e.target.value)
                }
              />
)}
            </div>

            <div>
              <Label className="text-sm block mb-1">
                {isTravelExpertCabsDatePicker ? "Children (Age 0–5)" : "No. of Children"} <span className="text-red-500">*</span>
              </Label>
              {isTravelExpertCabsDatePicker ? (
  <TravellerCounterField
    label="Children (Age 0–5)"
    value={vehicleOnlyTravellerTotals.children}
    min={0}
    max={5}
    onChange={(nextValue) => handleVehicleOnlyTravellerChange("children", nextValue)}
  />
) : (
<Input
                type="number"
                min={0}
                className="h-9 border-[#e5d7f6]"
                value={vehicleOnlyTravellerTotals.children}
                onChange={(e) =>
                  handleVehicleOnlyTravellerChange("children", e.target.value)
                }
              />
)}
            </div>

            <div>
              <Label className="text-sm block mb-1">
                {isTravelExpertCabsDatePicker ? "Children (Age 5–11)" : "No. of Infants"} <span className="text-red-500">*</span>
              </Label>
              {isTravelExpertCabsDatePicker ? (
  <TravellerCounterField
    label="Children (Age 5–11)"
    value={vehicleOnlyTravellerTotals.infants}
    min={0}
    max={11}
    onChange={(nextValue) => handleVehicleOnlyTravellerChange("infants", nextValue)}
  />
) : (
<Input
                type="number"
                min={0}
                className="h-9 border-[#e5d7f6]"
                value={vehicleOnlyTravellerTotals.infants}
                onChange={(e) =>
                  handleVehicleOnlyTravellerChange("infants", e.target.value)
                }
              />
)}
            </div>
          </div>
        </div>
      )}
</div>

        {/* Travel Expert / Hotel search; DVI trip dates, Arrival and rooms remain authoritative. */}
        {isTravelExpertHotelMode && (
          <TravelExpertHotelSearchBoundary>
            <TravelExpertHotelSearchRepeater
              locationOptions={locationOptions}
              arrivalLocation={arrivalLocation}
              setArrivalLocation={setArrivalLocation}
              tripStartDate={tripStartDate}
              tripEndDate={tripEndDate}
              setTripStartDate={setTripStartDate}
              setTripEndDate={setTripEndDate}
              minimumTripDate={minimumTripDate}
              rooms={rooms}
              setRooms={setRooms}
              departureLocation={departureLocation}
              setDepartureLocation={setDepartureLocation}
              hotelCategoryOptions={hotelCategoryAutoOptions}
              selectedHotelCategoryIds={selectedHotelCategoryIds}
              setSelectedHotelCategoryIds={setSelectedHotelCategoryIds}
              mealPlanOptions={mealPlanOptions}
              mealPlanCode={mealPlanCode}
              setMealPlanCode={setMealPlanCode}
              validationErrors={validationErrors}
              defaultRoomTemplate={defaultRoomTemplate}
            />
          </TravelExpertHotelSearchBoundary>
        )}
        {/* ROW 2: Arrival | Departure */}
        <div data-dvi-te-legacy-location-row className={isTravelExpertHotelMode ? "hidden" : "flex flex-col md:flex-row gap-4"}>
          <div
            className={`flex-1 ${
              validationErrors?.arrivalLocation
                ? "border border-red-500 rounded-md p-2"
                : ""
            }`}
            data-field="arrivalLocation"
          >
            <Label className="text-sm block mb-1">Arrival <span className="dvi-required-star">*</span></Label>
        <AutoSuggestSelect
  mode="single"
  value={arrivalLocation}
  onChange={(val) => setArrivalLocation(val as string)}
  options={locationOptions}
  placeholder="Choose Location"
  noResultsMessage={LOCATION_NOT_AVAILABLE_MESSAGE}
/>
            {validationErrors?.arrivalLocation && (
              <p className="mt-1 text-xs text-red-500">
                {validationErrors.arrivalLocation}
              </p>
            )}
          </div>

          <div
            className={`flex-1 ${
              validationErrors?.departureLocation
                ? "border border-red-500 rounded-md p-2"
                : ""
            }`}
            data-field="departureLocation"
          >
            <Label className="text-sm block mb-1">Departure <span className="dvi-required-star">*</span></Label>
        <AutoSuggestSelect
  mode="single"
  value={departureLocation}
  onChange={(val) => setDepartureLocation(val as string)}
  options={locationOptions}
  placeholder="Choose Location"
  noResultsMessage={LOCATION_NOT_AVAILABLE_MESSAGE}
/>
            {validationErrors?.departureLocation && (
              <p className="mt-1 text-xs text-red-500">
                {validationErrors.departureLocation}
              </p>
            )}
          </div>
        </div>

{/* ROW 3: Hotel Category | Trip Dates */}
<div data-dvi-te-legacy-date-hotel-row className="flex flex-col md:flex-row gap-4">
  {itineraryPreference === "vehicle" && !hideTravelExpertCabsDetails && (
    <div className="hidden md:block flex-1 md:order-2" aria-hidden="true" />
  )}

  {itineraryPreference !== "vehicle" && !isTravelExpertHotelMode && (
    <div
      className={`flex-1 md:order-2 ${
        validationErrors?.hotelCategory
          ? "border border-red-500 rounded-md p-2"
          : ""
      }`}
      data-field="hotelCategory"
    >
      <Label className="text-[12px] block mb-1">
        Hotel Category (Maximum 4 Only)*
      </Label>

      {/* DVI_TE_TOURS_BUDGET_FIRST_AGENT_INLINE_V1: Tours-only category pills; keep original selector for all other modes. */}
{showTravelExpertToursCounters ? (
  <TravelExpertToursHotelCategoryPills
    value={hotelCategory}
    onChange={(vals) =>
          handleHotelCategoryChange(
            vals as string[],
          )
        }
    options={hotelCategoryAutoOptions}
    maxSelected={4}
  />
) : (
<AutoSuggestSelect
        mode="multi"
        value={hotelCategory}
        onChange={(vals) =>
          handleHotelCategoryChange(
            vals as string[],
          )
        }
        options={hotelCategoryAutoOptions}
        placeholder="Choose Category"
        maxSelected={4}
        showSelectedChipsInTrigger
      />
)}

      <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-[#746685]">
        <span>
          Select up to 4 hotel categories
        </span>

        <span
          className={
            hotelCategory.length >= 4
              ? "font-bold text-[#b42369]"
              : "font-semibold"
          }
        >
          {
            hotelCategory.length
          }
          /4 selected
        </span>
      </div>

      {validationErrors?.hotelCategory && (
        <p className="mt-1 text-xs text-red-500">
          {validationErrors.hotelCategory}
        </p>
      )}
    </div>
  )}

  <div className={isTravelExpertHotelMode ? "hidden" : "flex-1 md:order-1"} data-field="tripStartDate">
    <div
      className={
        validationErrors?.tripStartDate || validationErrors?.tripEndDate
          ? "border border-red-500 rounded-md p-2"
          : ""
      }
      data-field="tripEndDate"
    >
      <Label className="text-sm block mb-1">Trip Dates <span className="dvi-required-star">*</span></Label>
<Popover
   open={isTripDatesOpen}
   onOpenChange={handleTripDatesOpenChange}
>
  <PopoverTrigger asChild>
    <Button
      variant="outline"
      className={`w-full justify-start h-9 text-left font-normal ${
        !tripStartDate && !tripEndDate ? "text-muted-foreground" : ""
      }`}
    >
      <CalendarIcon className="mr-2 h-4 w-4" />
      {tripStartDate ? (
        tripEndDate ? (
          `${tripStartDate} - ${tripEndDate}`
        ) : (
          `${tripStartDate} - Select end date`
        )
      ) : (
        "DD/MM/YYYY"
      )}
    </Button>
  </PopoverTrigger>

<PopoverContent
  data-dvi-te-cabs-calendar={isTravelExpertCabsDatePicker ? "true" : undefined}
  side="bottom"
  align="end"
  sideOffset={4}
  avoidCollisions={true}
  collisionPadding={8}
  className="
    z-[9999]
    w-auto
    max-w-[calc(100vw-1rem)]
    overflow-visible
    p-0
    bg-white
    border
    border-[#e5d7f6]
    rounded-xl
    shadow-xl
  "
>
 <div className="border-b border-[#efe7fb] bg-white px-3 py-2">
  <div className="space-y-1.5">
    <div className="text-xs font-medium text-[#4a4260]">
      {tripStartDateObj && !tripEndDateObj
        ? "Select departure date"
        : "Select trip dates"}
    </div>

    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
      <div className="rounded-full border border-[#eadcff] bg-[#f8f3ff] px-2 py-0.5 font-medium text-[#5c2db1]">
        Arrival: {previewArrivalDateLabel}
      </div>

      <div className="rounded-full border border-[#eadcff] bg-[#f8f3ff] px-2 py-0.5 font-medium text-[#5c2db1]">
        Departure: {previewDepartureDateLabel}
      </div>

      <div className="rounded-full bg-[#f3ecfb] px-2 py-0.5 font-medium text-[#5c2db1]">
        {previewNoOfNights} Night{previewNoOfNights !== 1 ? "s" : ""}
      </div>

      <div className="rounded-full bg-[#f3ecfb] px-2 py-0.5 font-medium text-[#5c2db1]">
        {previewNoOfDays} Day{previewNoOfDays !== 1 ? "s" : ""}
      </div>
    </div>
  </div>
</div>

   <Calendar
  mode="range"
  numberOfMonths={isMobile ? 1 : 2}
  showOutsideDays={false}

  // Month and year can now be changed from dropdowns.
  captionLayout="dropdown-buttons"
  fromYear={today.getFullYear()}
  toYear={today.getFullYear() + 10}

   modifiers={{
  dviTeCabsStart: isTravelExpertCabsDatePicker && previewRange?.from ? previewRange.from : [],
  dviTeCabsEnd: isTravelExpertCabsDatePicker && previewRange?.to ? previewRange.to : [],
}}
modifiersClassNames={{
  dviTeCabsStart: "dvi-te-cabs-range-start",
  dviTeCabsEnd: "dvi-te-cabs-range-end",
}}
  selected={previewRange}
   month={visibleMonth}
   onMonthChange={setVisibleMonth}
  onDayClick={(day) => {
  handleTripDayClick(
    day,
    isDviTeCabsCalendarDayDisabled(day),
  );
}}
  onDayMouseEnter={(day) => {
  if (
    isDviTeCabsCalendarDayDisabled(day) ||
    !tripStartDateObj ||
    tripEndDateObj ||
    !isSelectingDeparture
  ) {
    return;
  }

  setHoveredToDate(day);
}}
disabled={isDviTeCabsCalendarDayDisabled}
initialFocus
   className="p-2"
   components={{
     DayContent: ({ date }) => {
  const festivalContent = (
<FestivalDayContent
         date={date}
         events={eventsByTravelDate.get(format(date, "yyyy-MM-dd"))}
         actualEvents={eventsByActualStartDate.get(format(date, "yyyy-MM-dd"))}
       />
  );

  // Keep Admin, Agent, hotel and Smart Booking rendering unchanged.
  if (!isTravelExpertCabsDatePicker) return festivalContent;

  const dayKey = format(date, "yyyy-MM-dd");
  const fromKey = previewRange?.from
    ? format(previewRange.from, "yyyy-MM-dd")
    : "";
  const toKey = previewRange?.to
    ? format(previewRange.to, "yyyy-MM-dd")
    : "";

  const dayState =
    fromKey && dayKey === fromKey
      ? "start"
      : toKey && dayKey === toKey
        ? "end"
        : fromKey && toKey && dayKey > fromKey && dayKey < toKey
          ? "middle"
          : isDviTeCabsDateBeforeStart(date)
          ? "unavailable"
          : "normal";

  return (
    <span
      data-dvi-te-day={dayState}
      className={`dvi-te-cabs-day-content dvi-te-cabs-day-${dayState}`}
    >
      {festivalContent}
    </span>
  );
},
   }}
   classNames={{
    months:
      "flex flex-col sm:flex-row gap-3 space-y-0 sm:space-x-0",
month:
  "min-h-[220px] space-y-1",

    caption:
      "relative flex h-7 items-center justify-center",

    caption_dropdowns:
  "flex items-center justify-center gap-1",

vhidden: "sr-only",

caption_label:
  "relative z-[1] flex h-7 items-center rounded-md border border-[#e5d7f6] bg-white px-2 pr-6 text-xs font-medium text-[#4a4260] pointer-events-none",

    dropdown:
      "absolute inset-0 z-[2] h-full w-full cursor-pointer opacity-0",

    dropdown_month:
      "relative",

    dropdown_year:
      "relative",

    dropdown_icon:
      "pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[#6b6680]",

    nav:
      "flex items-center space-x-1",

    nav_button:
      "h-6 w-6 border border-[#e5d7f6] bg-transparent p-0 opacity-70 hover:opacity-100",

    nav_button_previous:
      "absolute left-0",

    nav_button_next:
      "absolute right-0",

    table:
      "w-full border-collapse",

    head_row:
      "flex",

    head_cell:
      "w-8 rounded-md text-center text-[11px] font-normal text-muted-foreground",

    row:
      "mt-1 flex w-full",

    cell:
  `relative ${isMobile ? "h-9 w-9" : "h-9 w-11"} p-0 text-center text-xs [&:has([aria-selected].day-range-start)]:rounded-l-md [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20`,

day:
  `${isMobile ? "h-9 w-9" : "h-9 w-11"} p-0 text-xs font-semibold aria-selected:opacity-100`,
    day_today:
      "",

    day_range_middle:
      "bg-[#f3ecfb] text-[#2f2f2f]",

    day_hidden:
      "invisible",
   }}
 />
   <FestivalCalendarLegend
     events={visibleEvents}
     isLoading={visibleEventsQuery.isLoading}
     isError={visibleEventsQuery.isError}
   />
   </PopoverContent>
</Popover>

      {(validationErrors?.tripStartDate || validationErrors?.tripEndDate) && (
        <p className="mt-1 text-xs text-red-500">
          {validationErrors?.tripStartDate || validationErrors?.tripEndDate}
        </p>
      )}
      <TripFestivalWarnings events={selectedEventsQuery.data?.events || []} />
    </div>
  </div>

  {/* Cabs-only times next to Trip Dates */}
  {hideTravelExpertCabsDetails && (
    <div className="flex-1 min-w-0 md:order-2">
<div className="grid grid-cols-1 md:grid-cols-12 gap-3">
  <div className="md:col-span-6">
    <Label className="text-sm block mb-1">Start Time <span className="dvi-required-star">*</span></Label>
    <Popover open={isStartTimeOpen} onOpenChange={setIsStartTimeOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-9 w-full justify-start border-[#e5d7f6] bg-white font-normal text-left"
        >
          <Clock3 className="mr-2 h-4 w-4 text-[#6b6680]" />
          {formatTime24As12(startTime)}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 border-0 bg-transparent shadow-none"
        align="start"
      >
        <TimePickerPopover
          value={formatTime24As12(startTime)}
         onSave={(newValue12) => {
  const { time, period } =
    time24To12(startTime);

  const [
    nextTime = time,
    nextPeriod = period,
  ] = newValue12.split(" ");

  const selectedTime = time12To24(
    nextTime,
    (nextPeriod as "AM" | "PM") || period,
  );

  if (
    isContinuationStartDay &&
    minimumAllowedContinuationStartTime &&
    timeToMinutes(selectedTime) <
      timeToMinutes(
        minimumAllowedContinuationStartTime,
      )
  ) {
    setStartTime(
      minimumAllowedContinuationStartTime,
    );
  } else {
    setStartTime(selectedTime);
  }

  setIsStartTimeOpen(false);
}}
          label="Start Time"
        />
      </PopoverContent>
    </Popover>
  </div>

  <div className="md:col-span-6">
    <Label className="text-sm block mb-1">End Time <span className="dvi-required-star">*</span></Label>
    <Popover open={isEndTimeOpen} onOpenChange={setIsEndTimeOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-9 w-full justify-start border-[#e5d7f6] bg-white font-normal text-left"
        >
          <Clock3 className="mr-2 h-4 w-4 text-[#6b6680]" />
          {formatTime24As12(endTime)}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 border-0 bg-transparent shadow-none"
        align="start"
      >
        <TimePickerPopover
          value={formatTime24As12(endTime)}
          onSave={(newValue12) => {
            const { time, period } = time24To12(endTime);
            const [nextTime = time, nextPeriod = period] =
              newValue12.split(" ");
            setEndTime(
              time12To24(
                nextTime,
                (nextPeriod as "AM" | "PM") || period
              )
            );
            setIsEndTimeOpen(false);
          }}
          label="End Time"
        />
      </PopoverContent>
    </Popover>
  </div>
</div>
    </div>
  )}
</div>

      {pageMode !== "smart-booking" && !isTravelExpertHotelMode && (
        <>
      {!hideTravelExpertCabsDetails && (
<div className={showTravelExpertToursCounters ? "hidden" : "grid grid-cols-1 md:grid-cols-12 gap-3 items-start"}>
  <div style={{ display: hideTravelExpertCabsDetails ? "none" : undefined }}
    className={`md:col-span-5 ${
      validationErrors?.itineraryTypeSelect
        ? "border border-red-500 rounded-md p-2"
        : ""
    }`}
    data-field="itineraryTypeSelect"
  >
    <Label className="text-[12px] block mb-1">Itinerary Type *</Label>

    <Select
      value={itineraryTypeSelect}
      onValueChange={setItineraryTypeSelect}
    >
      <SelectTrigger className="h-9 border-[#e5d7f6]">
        <SelectValue placeholder="Customize" />
      </SelectTrigger>

      <SelectContent
        position="popper"
        side="bottom"
        align="start"
        className="max-h-56 overflow-y-auto"
      >
        {itineraryTypes.map((item) => (
          <SelectItem key={item.id} value={String(item.id)}>
            {item.label?.trim().toLowerCase() === "default"
              ? "Suggested Routes"
              : item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    {validationErrors?.itineraryTypeSelect && (
      <p className="mt-1 text-xs text-red-500">
        {validationErrors.itineraryTypeSelect}
      </p>
    )}
  </div>

 <div data-dvi-te-legacy-times className={`${hideTravelExpertCabsDetails ? "md:col-span-12" : "md:col-span-7"} grid grid-cols-1 md:grid-cols-12 gap-3`}>
  <div className="md:col-span-6">
    <Label className="text-sm block mb-1">Start Time <span className="dvi-required-star">*</span></Label>
    <Popover open={isStartTimeOpen} onOpenChange={setIsStartTimeOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-9 w-full justify-start border-[#e5d7f6] bg-white font-normal text-left"
        >
          <Clock3 className="mr-2 h-4 w-4 text-[#6b6680]" />
          {formatTime24As12(startTime)}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 border-0 bg-transparent shadow-none"
        align="start"
      >
        <TimePickerPopover
          value={formatTime24As12(startTime)}
         onSave={(newValue12) => {
  const { time, period } =
    time24To12(startTime);

  const [
    nextTime = time,
    nextPeriod = period,
  ] = newValue12.split(" ");

  const selectedTime = time12To24(
    nextTime,
    (nextPeriod as "AM" | "PM") || period,
  );

  if (
    isContinuationStartDay &&
    minimumAllowedContinuationStartTime &&
    timeToMinutes(selectedTime) <
      timeToMinutes(
        minimumAllowedContinuationStartTime,
      )
  ) {
    setStartTime(
      minimumAllowedContinuationStartTime,
    );
  } else {
    setStartTime(selectedTime);
  }

  setIsStartTimeOpen(false);
}}
          label="Start Time"
        />
      </PopoverContent>
    </Popover>
  </div>

  <div className="md:col-span-6">
    <Label className="text-sm block mb-1">End Time <span className="dvi-required-star">*</span></Label>
    <Popover open={isEndTimeOpen} onOpenChange={setIsEndTimeOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-9 w-full justify-start border-[#e5d7f6] bg-white font-normal text-left"
        >
          <Clock3 className="mr-2 h-4 w-4 text-[#6b6680]" />
          {formatTime24As12(endTime)}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 border-0 bg-transparent shadow-none"
        align="start"
      >
        <TimePickerPopover
          value={formatTime24As12(endTime)}
          onSave={(newValue12) => {
            const { time, period } = time24To12(endTime);
            const [nextTime = time, nextPeriod = period] =
              newValue12.split(" ");
            setEndTime(
              time12To24(
                nextTime,
                (nextPeriod as "AM" | "PM") || period
              )
            );
            setIsEndTimeOpen(false);
          }}
          label="End Time"
        />
      </PopoverContent>
    </Popover>
  </div>
</div>
</div>
)}

 {itineraryPreference === "vehicle" && !isTravelExpertPartnerField && (
  <div
    data-field="transportOvernightLocationName"
    className="space-y-2"
  >
    <Label htmlFor="transportOvernightLocationName">
      Guest Day 1 Overnight Location
    </Label>

    <Input
      id="transportOvernightLocationName"
      type="text"
      maxLength={255}
      value={transportOvernightLocationName}
      onChange={(event) =>
        setTransportOvernightLocationName(event.target.value)
      }
      placeholder="Enter actual hotel, accommodation or address"
    />

    <p className="text-xs text-muted-foreground">
      Location information only. No hotel booking or charges will be created.
    </p>
  </div>
)}

{requiresTransportEarlyArrivalPreference && hasTransportEarlyArrivalPrerequisites && (
    <div data-field="transportEarlyArrivalOption" className="-mt-2 mb-2">
      <Button
        type="button"
        variant="outline"
        className="h-auto w-full justify-between border-amber-300 bg-amber-50 px-3 py-2 text-left hover:bg-amber-100"
        onClick={openTransportEarlyArrivalDialog}
      >
        <span>
          <span className="block text-sm font-medium text-amber-950">
            Early-morning arrival preference
          </span>
          <span className="block text-xs text-amber-900">
          {transportEarlyArrivalOption === "HOTEL_REST"
  ? "Proceed to a hotel first"
  : transportEarlyArrivalOption === "AIRPORT_LOUNGE"
    ? "Rest at an airport lounge"
    : transportEarlyArrivalOption === "RESTAURANT_REST"
      ? "Take a break at a nearby restaurant"
      : transportEarlyArrivalOption === "OTHER_LOCATION"
        ? `Rest at ${transportEarlyArrivalLocationName || "another location"}`
        : transportEarlyArrivalOption === "REFRESHMENT_BEFORE_SIGHTSEEING"
          ? "Take a refreshment or waiting break"
          : `Choose how Day 1 should begin before ${TRANSPORT_EARLY_ARRIVAL_CUTOFF}`}
          </span>
          {transportEarlyArrivalOption === "HOTEL_REST" && (
            <span className="mt-1 block max-w-4xl text-xs text-amber-900">
              {TRANSPORT_EARLY_ARRIVAL_HOTEL_MESSAGE}
            </span>
          )}
        </span>
        <span className="text-xs font-medium text-purple-700">Change</span>
      </Button>
      {validationErrors?.transportEarlyArrivalOption && (
        <p className="mt-1 text-sm text-red-600">
          {validationErrors.transportEarlyArrivalOption}
        </p>
      )}
    </div>
  )}

  <Dialog
    open={isTransportEarlyArrivalDialogOpen}
    onOpenChange={setIsTransportEarlyArrivalDialogOpen}
  >
    <DialogContent data-field="transportEarlyArrivalOption" className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>Early-morning arrival preference</DialogTitle>
        <DialogDescription>
         Ask the guest: How would you like Day 1 to begin for an arrival before {TRANSPORT_EARLY_ARRIVAL_CUTOFF}?
        </DialogDescription>
      </DialogHeader>

<div className="grid gap-3 md:grid-cols-2">
  {([
    {
      value: "REFRESHMENT_BEFORE_SIGHTSEEING",
      label: "Refreshment Break",
      description: "Take a refreshment or waiting break before sightseeing.",
    },
    {
      value: "AIRPORT_LOUNGE",
      label: "Airport Lounge",
      description: "Rest at an airport lounge, subject to availability.",
    },
    {
      value: "HOTEL_REST",
      label: "Hotel Rest",
      description: "Early check-in must be confirmed; charges may apply.",
    },
    {
      value: "RESTAURANT_REST",
      label: "Nearby Restaurant",
      description: "Stop at a restaurant for refreshments and rest.",
    },
    {
      value: "OTHER_LOCATION",
      label: "Other Location",
      description: "Enter another preferred resting location.",
    },
  ] as const).map((choice) => (
    <button
      key={choice.value}
      type="button"
      aria-pressed={draftTransportEarlyArrivalOption === choice.value}
      onClick={() => {
        if (draftTransportEarlyArrivalOption !== choice.value) {
          setDraftTransportEarlyArrivalRestMinutes(
            choice.value === "HOTEL_REST" ? 180 : 60,
          );
        }

        setDraftTransportEarlyArrivalOption(choice.value);
        setTransportEarlyArrivalDialogError("");
      }}
      className={
        draftTransportEarlyArrivalOption === choice.value
          ? "rounded-lg border-2 border-purple-600 bg-white p-4 text-left"
          : "rounded-lg border bg-white p-4 text-left"
      }
    >
      <div className="font-medium">{choice.label}</div>
      <div className="mt-1 text-sm text-muted-foreground">
        {choice.description}
      </div>
    </button>
  ))}
</div>

{draftTransportEarlyArrivalOption ===
  "REFRESHMENT_BEFORE_SIGHTSEEING" && (
  <p className="text-xs text-muted-foreground">
    Existing refreshment preference retained for this itinerary.
  </p>
)}

      {draftTransportEarlyArrivalOption === "HOTEL_REST" && (
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label htmlFor="transport-early-arrival-hotel">Hotel name (optional)</Label>
            <Input
              id="transport-early-arrival-hotel"
              value={draftTransportEarlyArrivalHotelName}
              onChange={(event) => setDraftTransportEarlyArrivalHotelName(event.target.value)}
              placeholder="Enter hotel name"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              If provided, this helps identify the intended hotel. Leave blank
              if the guest will decide after reaching the arrival city.
            </p>
          </div>
          <div>
            <Label htmlFor="transport-early-arrival-rest">Rest duration (minutes)</Label>
            <Input
              id="transport-early-arrival-rest"
              type="number"
              min={30}
              max={720}
              value={draftTransportEarlyArrivalRestMinutes}
              onChange={(event) => setDraftTransportEarlyArrivalRestMinutes(Number(event.target.value || 0))}
            />
          </div>
        </div>
      )}

      {(
        draftTransportEarlyArrivalOption === "AIRPORT_LOUNGE" ||
        draftTransportEarlyArrivalOption === "RESTAURANT_REST" ||
        draftTransportEarlyArrivalOption === "OTHER_LOCATION"
      ) && (
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label htmlFor="transport-early-arrival-location">
              {draftTransportEarlyArrivalOption === "AIRPORT_LOUNGE"
                ? "Airport lounge name (optional)"
                : draftTransportEarlyArrivalOption === "RESTAURANT_REST"
                  ? "Restaurant name (optional)"
                  : "Preferred resting location (required)"}
            </Label>
            <Input
              id="transport-early-arrival-location"
              maxLength={255}
              value={draftTransportEarlyArrivalLocationName}
              onChange={(event) =>
                setDraftTransportEarlyArrivalLocationName(event.target.value)
              }
              placeholder="Enter location name"
            />
          </div>

          <div>
            <Label htmlFor="transport-early-arrival-new-rest">
              Rest duration (minutes)
            </Label>
            <Input
              id="transport-early-arrival-new-rest"
              type="number"
              min={30}
              max={720}
              value={draftTransportEarlyArrivalRestMinutes}
              onChange={(event) =>
                setDraftTransportEarlyArrivalRestMinutes(
                  Number(event.target.value || 0),
                )
              }
            />
          </div>
        </div>
      )}

      {draftTransportEarlyArrivalOption === "HOTEL_REST" && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {TRANSPORT_EARLY_ARRIVAL_HOTEL_MESSAGE}
        </p>
      )}
      {transportEarlyArrivalDialogError && (
        <p className="text-sm text-red-600">
          {transportEarlyArrivalDialogError}
        </p>
      )}

      <DialogFooter>
        <Button
          type="button"
          onClick={handleConfirmTransportEarlyArrival}
          disabled={!draftTransportEarlyArrivalOption}
        >
          Use this preference
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>



                {/* DVI_TE_TOURS_EXTRA_FIELDS_ROW_V1: no duplicate state */}
        {showTravelExpertToursCounters && (
          <div data-dvi-te-tours-extras className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="min-w-0" data-field="entryTicketRequired">
              <Label className="mb-1 block text-sm font-bold text-slate-800">
                Entry Ticket Required? <span className="dvi-required-star">*</span>
              </Label>
              <Select value={entryTicketRequired} onValueChange={setEntryTicketRequired}>
                <SelectTrigger className="h-11 w-full border-[#e5d7f6] text-sm font-semibold">
                  <SelectValue placeholder="No" />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" align="start" className="max-h-56 overflow-y-auto">
                  {entryTicketOptions.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors?.entryTicketRequired && (
                <p className="mt-1 text-xs text-red-500">{validationErrors.entryTicketRequired}</p>
              )}
            </div>
            <div className="min-w-0" data-field="guideRequired">
              <Label className="mb-1 block text-sm font-bold text-slate-800">
                Guide Requirement <span className="dvi-required-star">*</span>
              </Label>
              <Select value={guideRequired} onValueChange={setGuideRequired}>
                <SelectTrigger className="h-11 w-full border-[#e5d7f6] text-sm font-semibold">
                  <SelectValue placeholder="No Guide" />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" align="start" className="max-h-56 overflow-y-auto">
                  <SelectItem value="0">No Guide</SelectItem>
                  <SelectItem value="1">Whole Itinerary</SelectItem>
                  <SelectItem value="2">Day Wise</SelectItem>
                </SelectContent>
              </Select>
              {validationErrors?.guideRequired && (
                <p className="mt-1 text-xs text-red-500">{validationErrors.guideRequired}</p>
              )}
            </div>
            <div className="min-w-0">
              <Label className="mb-1 block text-sm font-bold text-slate-800">
                Special Instructions
               </Label>
              <TravelExpertToursStepInstructions value={specialInstructions} onChange={setSpecialInstructions} />
            </div>
          </div>
        )}
{/* ROW 5 */}
        <div style={{ display: (hideTravelExpertCabsDetails || showTravelExpertToursCounters) ? "none" : undefined }} className={showTravelExpertToursCounters ? "grid grid-cols-1 gap-3" : "grid grid-cols-1 md:grid-cols-5 gap-3"}>
          <div
            className={validationErrors?.arrivalType ? "border border-red-500 rounded-md p-2" : ""}
            style={{ display: showTravelExpertToursCounters ? "none" : undefined }}
            data-field="arrivalType"
          >
            <Label className="text-sm block mb-1">Arrival Type *</Label>
            <Select value={arrivalType} onValueChange={setArrivalType}>
              <SelectTrigger className="h-9 border-[#e5d7f6]">
                <SelectValue placeholder="By Flight" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="max-h-56 overflow-y-auto"
              >
                {travelTypes.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {validationErrors?.arrivalType && (
              <p className="mt-1 text-xs text-red-500">{validationErrors.arrivalType}</p>
            )}
          </div>

          <div style={{ display: showTravelExpertToursCounters ? "none" : undefined }}>
            <Label className="text-sm block mb-1">Number of Nights</Label>
            <Input type="number" value={tripStartDateObj ? previewNoOfNights : 0} readOnly className="h-9 border-[#e5d7f6]" />
          </div>

          <div style={{ display: showTravelExpertToursCounters ? "none" : undefined }}>
            <Label className="text-sm block mb-1">Number of Days</Label>
            <Input type="number"value={tripStartDateObj ? previewNoOfDays : 1} readOnly className="h-9 border-[#e5d7f6]" />
          </div>

          <div
            className={validationErrors?.budget ? "border border-red-500 rounded-md p-2" : ""}
            style={{ display: showTravelExpertToursCounters ? "none" : undefined }}
            data-field="budget"
          >
            <Label className="text-sm block mb-1">Budget *</Label>
            <Input
              type="number"
              className="h-9 border-[#e5d7f6]"
              value={budget === "" ? "" : budget}
              onChange={(e) =>
                setBudget(e.target.value === "" ? "" : Number(e.target.value) || 0)
              }
            />
            {validationErrors?.budget && (
              <p className="mt-1 text-xs text-red-500">{validationErrors.budget}</p>
            )}
          </div>

          <div
            className={
              validationErrors?.entryTicketRequired ? "border border-red-500 rounded-md p-2" : ""
            }
            data-field="entryTicketRequired"
          >
            <Label className="text-sm block mb-1">Entry Ticket Required? *</Label>
            <Select value={entryTicketRequired} onValueChange={setEntryTicketRequired}>
              <SelectTrigger className="h-9 border-[#e5d7f6]">
                <SelectValue placeholder="No" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="max-h-56 overflow-y-auto"
              >
                {entryTicketOptions.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {validationErrors?.entryTicketRequired && (
              <p className="mt-1 text-xs text-red-500">{validationErrors.entryTicketRequired}</p>
            )}
          </div>
        </div>

      {/* ROOMS */}
    {/* DVI_TE_TOURS_HIDE_ROOM_UI_V1 */}
  <div className={showTravelExpertToursCounters ? "hidden" : ""}>
<RoomsBlock
  itineraryPreference={itineraryPreference}
  rooms={rooms}
  setRooms={setRooms}
  addRoom={addRoom}
  removeRoom={removeRoom}
  summaryOnly={isTravelExpertHotelMode}
  defaultRoomTemplate={defaultRoomTemplate}
  setDefaultRoomTemplate={setDefaultRoomTemplate}
/>
  </div>

{/* ROW 6 */}
<div style={{ display: (hideTravelExpertCabsDetails || showTravelExpertToursCounters) ? "none" : undefined }}
  className={`grid grid-cols-1 gap-3 ${
    itineraryPreference === "vehicle" ? "md:grid-cols-2" : "md:grid-cols-4"
  }`}
>
     <div
  className={validationErrors?.guideRequired ? "border border-red-500 rounded-md p-2" : ""}
  data-field="guideRequired"
>
  <Label className="text-sm block mb-1">Guide Requirement *</Label>
  <Select value={guideRequired} onValueChange={setGuideRequired}>
    <SelectTrigger className="h-9 border-[#e5d7f6]">
      <SelectValue placeholder="No Guide" />
    </SelectTrigger>
    <SelectContent
      position="popper"
      side="bottom"
      align="start"
      className="max-h-56 overflow-y-auto"
    >
      <SelectItem value="0">No Guide</SelectItem>
      <SelectItem value="1">Whole Itinerary</SelectItem>
      <SelectItem value="2">Day Wise</SelectItem>
    </SelectContent>
  </Select>
  {validationErrors?.guideRequired && (
    <p className="mt-1 text-xs text-red-500">{validationErrors.guideRequired}</p>
  )}
</div>

{!showTravelExpertToursCounters && (
          <div
            className={validationErrors?.nationality ? "border border-red-500 rounded-md p-2" : ""}
            data-field="nationality"
          >
            {/* DVI_TE_TOURS_MARKED_FIX_V2 */}
            {showTravelExpertToursCounters && (
              <span className="dvi-te-nationality-flag" aria-hidden="true">
                {(() => {
                  const selectedCountry = nationalityOptions.find(item => String(item.value) === String(nationality))?.label || '';
                  const flagUrl = getTravelExpertToursFlagUrl(selectedCountry);
                  return (
                    <span className="relative inline-flex h-[18px] w-[26px] items-center justify-center">
                      <span className="text-[17px]" aria-hidden="true">🌐</span>
                      {flagUrl && (
                        <img
                          src={flagUrl}
                          alt=""
                          aria-hidden="true"
                          className="absolute inset-0 h-full w-full rounded-[2px] object-cover shadow-sm"
                          onError={(event) => { event.currentTarget.style.display = 'none'; }}
                        />
                      )}
                    </span>
                  );
                })()}
              </span>
            )}

            <Label className="text-sm block mb-1">Nationality *</Label>
            <AutoSuggestSelect
              mode="single"
              value={nationality}
              onChange={(val) => setNationality(val as string)}
              options={nationalityOptions}
              placeholder="India"
            />
            {validationErrors?.nationality && (
              <p className="mt-1 text-xs text-red-500">{validationErrors.nationality}</p>
            )}
          </div>
)}

         {itineraryPreference !== "vehicle" && (
  <div
    className={
      validationErrors?.foodPreference ? "border border-red-500 rounded-md p-2" : ""
    }
    data-field="foodPreference"
  >
    <Label className="text-sm block mb-1">Food Preferences *</Label>
    <Select value={foodPreference} onValueChange={setFoodPreference}>
      <SelectTrigger className="h-9 border-[#e5d7f6]">
        <SelectValue placeholder="Vegetarian" />
      </SelectTrigger>
      <SelectContent
        position="popper"
        side="bottom"
        align="start"
        className="max-h-56 overflow-y-auto"
      >
        {foodPreferences.map((item) => (
          <SelectItem key={item.id} value={String(item.id)}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    {validationErrors?.foodPreference && (
      <p className="mt-1 text-xs text-red-500">{validationErrors.foodPreference}</p>
    )}
  </div>
)}

  {itineraryPreference !== "vehicle" && !isTravelExpertHotelMode && (
  <div data-dvi-te-legacy-meal-plan>
    <Label className="text-sm block mb-1">Meal Plan</Label>
    <Select value={mealPlanCode} onValueChange={setMealPlanCode}>
      <SelectTrigger className="h-9 border-[#e5d7f6]">
        <SelectValue placeholder="Select Meal Plan" />
      </SelectTrigger>
      <SelectContent
        position="popper"
        side="bottom"
        align="start"
        className="max-h-56 overflow-y-auto"
      >
        {mealPlanOptions.map((item) => (
          <SelectItem key={item.code} value={item.code}>
            {getMealPlanLabel(item)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)}
        </div>

        {/* ROW 7 */}
        <div className={showTravelExpertToursCounters ? "hidden" : "flex flex-col md:flex-row gap-4"}>
          <div className="flex-1">
            <Label className="text-sm block mb-1">Special Instructions</Label>
            <Textarea
  rows={2}
  placeholder="Enter the Special Instruction"
  className="min-h-[52px] resize-y border-[#e5d7f6]"
  value={specialInstructions}
  onChange={(e) => setSpecialInstructions(e.target.value)}
/>
          </div>
        </div>

        {itineraryPreference === "vehicle" && !hideTravelExpertCabsDetails && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-sm block mb-1">
                {isTravelExpertCabsDatePicker ? "Adults" : "No. of Adults"} <span className="text-red-500">*</span>
              </Label>
              {isTravelExpertCabsDatePicker ? (
  <TravellerCounterField
    label="Adults"
    value={vehicleOnlyTravellerTotals.adults}
    min={1}
    onChange={(nextValue) => handleVehicleOnlyTravellerChange("adults", nextValue)}
  />
) : (
<Input
                type="number"
                min={1}
                className="h-9 border-[#e5d7f6]"
                value={vehicleOnlyTravellerTotals.adults}
                onChange={(e) =>
                  handleVehicleOnlyTravellerChange("adults", e.target.value)
                }
              />
)}
            </div>

            <div>
              <Label className="text-sm block mb-1">
                {isTravelExpertCabsDatePicker ? "Children (Age 0–5)" : "No. of Children"} <span className="text-red-500">*</span>
              </Label>
              {isTravelExpertCabsDatePicker ? (
  <TravellerCounterField
    label="Children (Age 0–5)"
    value={vehicleOnlyTravellerTotals.children}
    min={0}
    max={5}
    onChange={(nextValue) => handleVehicleOnlyTravellerChange("children", nextValue)}
  />
) : (
<Input
                type="number"
                min={0}
                className="h-9 border-[#e5d7f6]"
                value={vehicleOnlyTravellerTotals.children}
                onChange={(e) =>
                  handleVehicleOnlyTravellerChange("children", e.target.value)
                }
              />
)}
            </div>

            <div>
              <Label className="text-sm block mb-1">
                {isTravelExpertCabsDatePicker ? "Children (Age 5–11)" : "No. of Infants"} <span className="text-red-500">*</span>
              </Label>
              {isTravelExpertCabsDatePicker ? (
  <TravellerCounterField
    label="Children (Age 5–11)"
    value={vehicleOnlyTravellerTotals.infants}
    min={0}
    max={11}
    onChange={(nextValue) => handleVehicleOnlyTravellerChange("infants", nextValue)}
  />
) : (
<Input
                type="number"
                min={0}
                className="h-9 border-[#e5d7f6]"
                value={vehicleOnlyTravellerTotals.infants}
                onChange={(e) =>
                  handleVehicleOnlyTravellerChange("infants", e.target.value)
                }
              />
)}
            </div>
          </div>
        )}
        </>
      )}
      </CardContent>
    </Card>
  );
};
