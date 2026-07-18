import { useMemo, useState, Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
import { RoomsBlock } from "./RoomsBlock";
import { AgentOption } from "@/services/accountsManagerApi";
import { LocationOption, MealPlanOption, SimpleOption } from "@/services/itineraryDropdownsMock";
import { useIsMobile } from "@/hooks/use-mobile";
import type { RoomRow } from "./helpers/useRoomsAndTravellers";
import type { RouteData } from "@/components/DefaultRoutesSuggestions";
import {
  buildVehicleOnlyTravellerRooms,
  getMealPlanLabel,
  getSafeTravellerCount,
  mapMultiValuesToStringIds,
} from "./helpers/itineraryPlanBlock.utils";
import { useItineraryPlanDates } from "./helpers/useItineraryPlanDates";
import { useItineraryPlanDefaults } from "./helpers/useItineraryPlanDefaults";
import { useItineraryPlanOptions } from "./helpers/useItineraryPlanOptions";
// type RoomRow = {
//   id: number;
//   adults: number;
//   children: number;
//   infants: number;
//   roomCount: number;
// };

type ItineraryPlanBlockProps = {
  itineraryPreference: "vehicle" | "hotel" | "both";
  setItineraryPreference: (value: "vehicle" | "hotel" | "both") => void;

  agents: AgentOption[];
  agentId: number | null;
  setAgentId: (id: number | null) => void;
  isAgentLocked?: boolean;

  locations: LocationOption[];
  arrivalLocation: string;
  setArrivalLocation: (val: string) => void;
  departureLocation: string;
  setDepartureLocation: (val: string) => void;

  hotelCategoryOptions: SimpleOption[];
  hotelFacilityOptions: SimpleOption[];

  tripStartDate: string;
  tripEndDate: string;
  setTripStartDate: (val: string) => void;
  setTripEndDate: (val: string) => void;

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

  guideOptions: SimpleOption[];
  guideRequired: string;
  setGuideRequired: (val: string) => void;

  nationalities: SimpleOption[];
  nationality: string;
  setNationality: (val: string) => void;

  foodPreferences: SimpleOption[];
  foodPreference: string; // ✅ stores option id (e.g. "1","2","3")
  setFoodPreference: (val: string) => void;

  mealPlanOptions: MealPlanOption[];
  mealPlanCode: string;
  setMealPlanCode: (val: string) => void;

  selectedHotelCategoryIds: number[];
  setSelectedHotelCategoryIds: Dispatch<SetStateAction<number[]>>;

  selectedHotelFacilityIds: string[];
  setSelectedHotelFacilityIds: Dispatch<SetStateAction<string[]>>;
  // ✅ lifted special instructions so it goes in payload
  specialInstructions: string;
  setSpecialInstructions: (val: string) => void;

  validationErrors?: { [key: string]: string };
  
  // ✅ Calculated from arrival/departure dates
  noOfNights: number;
  noOfDays: number;

  defaultRouteOptions?: RouteData[];
  activeDefaultRouteIndex?: number;
  onDefaultRouteSelect?: (route: RouteData, index: number) => void;
};


export const ItineraryPlanBlock = ({
  itineraryPreference,
  setItineraryPreference,
  agents,
  agentId,
  setAgentId,
  isAgentLocked = false,
  locations,
  arrivalLocation,
  setArrivalLocation,
  departureLocation,
  setDepartureLocation,
  hotelCategoryOptions,
  hotelFacilityOptions,
  tripStartDate,
  tripEndDate,
  setTripStartDate,
  setTripEndDate,
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
  validationErrors,
  noOfNights,
  noOfDays,
  defaultRouteOptions = [],
  activeDefaultRouteIndex = 0,
  onDefaultRouteSelect,
}: ItineraryPlanBlockProps) => {
const isMobile = useIsMobile();
const [isStartTimeOpen, setIsStartTimeOpen] = useState(false);
const [isEndTimeOpen, setIsEndTimeOpen] = useState(false);

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



  return (
    <Card className="border border-[#efdef8] rounded-lg bg-white shadow-none">
      <CardHeader className="pb-0" />
<CardContent className="pt-4 pb-5 space-y-4">
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

  {/* ROW 1: Itinerary Preference | Agent */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 bg-[#fef8ff] border border-[#e9d4ff] rounded-md p-3">
            <Label className="mb-2 block text-sm text-[#4a4260]">
              Itinerary Preference *
            </Label>
            <RadioGroup
              value={itineraryPreference}
              onValueChange={(v) =>
                setItineraryPreference(v as "vehicle" | "hotel" | "both")
              }
              className="flex flex-wrap gap-4"
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="vehicle" id="vehicle" />
                Vehicle
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="hotel" id="hotel" />
                Hotel
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="both" id="both" />
                Both Hotel and Vehicle
              </label>
            </RadioGroup>
          </div>

                    {!isAgentLocked && (
            <div
              className={`flex-1 ${
                validationErrors?.agentId ? "border border-red-500 rounded-md p-2" : ""
              }`}
              data-field="agentId"
            >
              <Label className="text-sm block mb-1">Agent *</Label>
              <AutoSuggestSelect
                mode="single"
                value={agentId ? String(agentId) : ""}
                onChange={(val) => setAgentId(val ? Number(val as string) : null)}
                options={agentOptions}
                placeholder="Select Agent"
              />
              {validationErrors?.agentId && (
                <p className="mt-1 text-xs text-red-500">{validationErrors.agentId}</p>
              )}
            </div>
          )}
        
        </div>

        {/* ROW 2: Arrival | Departure */}
        <div className="flex flex-col md:flex-row gap-4">
          <div
            className={`flex-1 ${
              validationErrors?.arrivalLocation
                ? "border border-red-500 rounded-md p-2"
                : ""
            }`}
            data-field="arrivalLocation"
          >
            <Label className="text-sm block mb-1">Arrival *</Label>
            <AutoSuggestSelect
              mode="single"
              value={arrivalLocation}
              onChange={(val) => setArrivalLocation(val as string)}
              options={locationOptions}
              placeholder="Choose Location"
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
            <Label className="text-sm block mb-1">Departure *</Label>
            <AutoSuggestSelect
              mode="single"
              value={departureLocation}
              onChange={(val) => setDepartureLocation(val as string)}
              options={locationOptions}
              placeholder="Choose Location"
            />
            {validationErrors?.departureLocation && (
              <p className="mt-1 text-xs text-red-500">
                {validationErrors.departureLocation}
              </p>
            )}
          </div>
        </div>

        {/* ROW 3 */}
        {itineraryPreference !== "vehicle" && (
        <div className="flex flex-col md:flex-row gap-4">
          <div
            className={`flex-1 ${
              validationErrors?.hotelCategory ? "border border-red-500 rounded-md p-2" : ""
            }`}
            data-field="hotelCategory"
          >
            <Label className="text-[12px] block mb-1">
              Hotel Category (Maximum 4 Only)*
            </Label>
            <AutoSuggestSelect
              mode="multi"
              value={hotelCategory}
              onChange={(vals) => handleHotelCategoryChange(vals as string[])}
              options={hotelCategoryAutoOptions}
              placeholder="Choose Category"
              maxSelected={4}
            />
            {validationErrors?.hotelCategory && (
              <p className="mt-1 text-xs text-red-500">{validationErrors.hotelCategory}</p>
            )}
          </div>

          <div className="flex-1">
            <Label className="text-[12px] block mb-1">Hotel Facilities (Optional)</Label>
            <AutoSuggestSelect
              mode="multi"
              value={hotelFacility}
              onChange={(vals) => handleHotelFacilityChange(vals as string[])}
              options={hotelFacilityAutoOptions}
              placeholder="Choose Hotel Facilities"
            />
          </div>
        </div>
        )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
  <div className="md:col-span-5" data-field="tripStartDate">
    <div
      className={
        validationErrors?.tripStartDate || validationErrors?.tripEndDate
          ? "border border-red-500 rounded-md p-2"
          : ""
      }
      data-field="tripEndDate"
    >
      <Label className="text-sm block mb-1">Trip Dates *</Label>
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
  side="bottom"
  align="start"
  sideOffset={4}
  avoidCollisions={true}
  collisionPadding={8}
  className="z-[9999] w-auto max-w-[calc(100vw-1rem)] overflow-visible p-0 bg-white border border-[#e5d7f6] rounded-xl shadow-xl"
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

  selected={previewRange}
  onDayClick={(day, modifiers) => {
    handleTripDayClick(day, modifiers.disabled);
  }}
  onDayMouseEnter={(day, modifiers) => {
    if (
      modifiers.disabled ||
      !tripStartDateObj ||
      tripEndDateObj ||
      !isSelectingDeparture
    ) {
      return;
    }

    setHoveredToDate(day);
  }}
  disabled={disablePastAndToday}
  defaultMonth={tripStartDateObj || undefined}
  initialFocus
  className="p-2"
  classNames={{
    months:
      "flex flex-col sm:flex-row gap-3 space-y-0 sm:space-x-0",

    month:
      "min-h-[248px] space-y-2",

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
      "relative h-8 w-8 p-0 text-center text-xs [&:has([aria-selected].day-range-start)]:rounded-l-md [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",

    day:
      "h-8 w-8 p-0 text-xs font-normal aria-selected:opacity-100",

    day_today:
      "",

    day_range_middle:
      "bg-[#f3ecfb] text-[#2f2f2f]",

    day_hidden:
      "invisible",
  }}
/>
  </PopoverContent>
</Popover>

      {(validationErrors?.tripStartDate || validationErrors?.tripEndDate) && (
        <p className="mt-1 text-xs text-red-500">
          {validationErrors?.tripStartDate || validationErrors?.tripEndDate}
        </p>
      )}
    </div>
  </div>

 <div className="md:col-span-7 grid grid-cols-1 md:grid-cols-12 gap-3">
  <div className="md:col-span-3">
    <Label className="text-sm block mb-1">Start Time *</Label>
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
        <PopoverContent className="w-auto p-0 border-0 bg-transparent shadow-none" align="start">
          <TimePickerPopover
            value={formatTime24As12(startTime)}
            onSave={(newValue12) => {
              const { time, period } = time24To12(startTime);
              const [nextTime = time, nextPeriod = period] = newValue12.split(" ");
              setStartTime(time12To24(nextTime, (nextPeriod as "AM" | "PM") || period));
              setIsStartTimeOpen(false);
            }}
            label="Start Time"
          />
        </PopoverContent>
      </Popover>
  </div>

  <div className="md:col-span-3">
    <Label className="text-sm block mb-1">End Time *</Label>
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
        <PopoverContent className="w-auto p-0 border-0 bg-transparent shadow-none" align="start">
          <TimePickerPopover
            value={formatTime24As12(endTime)}
            onSave={(newValue12) => {
              const { time, period } = time24To12(endTime);
              const [nextTime = time, nextPeriod = period] = newValue12.split(" ");
              setEndTime(time12To24(nextTime, (nextPeriod as "AM" | "PM") || period));
              setIsEndTimeOpen(false);
            }}
            label="End Time"
          />
        </PopoverContent>
      </Popover>
  </div>

  <div
    className={`md:col-span-6 ${
      validationErrors?.itineraryTypeSelect
        ? "border border-red-500 rounded-md p-2"
        : ""
    }`}
    data-field="itineraryTypeSelect"
  >
    <Label className="text-sm block mb-1">Itinerary Type *</Label>
    <Select value={itineraryTypeSelect} onValueChange={setItineraryTypeSelect}>
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
</div>
</div>

        

        {/* ROW 5 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div
            className={validationErrors?.arrivalType ? "border border-red-500 rounded-md p-2" : ""}
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

          <div>
            <Label className="text-sm block mb-1">Number of Nights</Label>
            <Input type="number" value={tripStartDateObj ? previewNoOfNights : 0} readOnly className="h-9 border-[#e5d7f6]" />
          </div>

          <div>
            <Label className="text-sm block mb-1">Number of Days</Label>
            <Input type="number"value={tripStartDateObj ? previewNoOfDays : 1} readOnly className="h-9 border-[#e5d7f6]" />
          </div>

          <div
            className={validationErrors?.budget ? "border border-red-500 rounded-md p-2" : ""}
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
<RoomsBlock
  itineraryPreference={itineraryPreference}
  rooms={rooms}
  setRooms={setRooms}
  addRoom={addRoom}
  removeRoom={removeRoom}
/>

{/* ROW 6 */}
<div
  className={`grid grid-cols-1 gap-3 ${
    itineraryPreference === "vehicle" ? "md:grid-cols-2" : "md:grid-cols-4"
  }`}
>
          <div
            className={validationErrors?.guideRequired ? "border border-red-500 rounded-md p-2" : ""}
            data-field="guideRequired"
          >
            <Label className="text-sm block mb-1">Guide for Whole Itinerary *</Label>
            <Select value={guideRequired} onValueChange={setGuideRequired}>
              <SelectTrigger className="h-9 border-[#e5d7f6]">
                <SelectValue placeholder="No" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="max-h-56 overflow-y-auto"
              >
                {guideOptions.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {validationErrors?.guideRequired && (
              <p className="mt-1 text-xs text-red-500">{validationErrors.guideRequired}</p>
            )}
          </div>

          <div
            className={validationErrors?.nationality ? "border border-red-500 rounded-md p-2" : ""}
            data-field="nationality"
          >
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

  {itineraryPreference !== "vehicle" && (
  <div>
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
        <SelectItem value="__ALL__">All Meal Plans</SelectItem>
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
        <div className="flex flex-col md:flex-row gap-4">
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

        {itineraryPreference === "vehicle" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-sm block mb-1">
                No. of Adults <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min={1}
                className="h-9 border-[#e5d7f6]"
                value={vehicleOnlyTravellerTotals.adults}
                onChange={(e) =>
                  handleVehicleOnlyTravellerChange("adults", e.target.value)
                }
              />
            </div>

            <div>
              <Label className="text-sm block mb-1">
                No. of Children <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min={0}
                className="h-9 border-[#e5d7f6]"
                value={vehicleOnlyTravellerTotals.children}
                onChange={(e) =>
                  handleVehicleOnlyTravellerChange("children", e.target.value)
                }
              />
            </div>

            <div>
              <Label className="text-sm block mb-1">
                No. of Infants <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min={0}
                className="h-9 border-[#e5d7f6]"
                value={vehicleOnlyTravellerTotals.infants}
                onChange={(e) =>
                  handleVehicleOnlyTravellerChange("infants", e.target.value)
                }
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
