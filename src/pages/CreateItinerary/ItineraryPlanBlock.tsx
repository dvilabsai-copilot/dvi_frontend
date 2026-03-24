import { useEffect, useMemo, useState, Dispatch, SetStateAction } from "react";
import { differenceInCalendarDays } from "date-fns";

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
import { Calendar as CalendarIcon } from "lucide-react";
import {
  AutoSuggestSelect,
  AutoSuggestOption,
} from "@/components/AutoSuggestSelect";
import { RoomsBlock } from "./RoomsBlock";
import { AgentOption } from "@/services/accountsManagerApi";
import { LocationOption, SimpleOption } from "@/services/itineraryDropdownsMock";

type RoomRow = {
  id: number;
  adults: number;
  children: number;
  infants: number;
  roomCount: number;
};

type ItineraryPlanBlockProps = {
  itineraryPreference: "vehicle" | "hotel" | "both";
  setItineraryPreference: (value: "vehicle" | "hotel" | "both") => void;

  agents: AgentOption[];
  agentId: number | null;
  setAgentId: (id: number | null) => void;

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
};


function mapMultiValuesToStringIds(vals: unknown, options: SimpleOption[]): string[] {
  const arr = Array.isArray(vals) ? vals : [];

  const byId = new Map(options.map((o) => [String(o.id), String(o.id)]));
  const byLabel = new Map(
    options.map((o) => [o.label.trim().toLowerCase(), String(o.id)])
  );

  const out: string[] = [];

  for (const raw of arr) {
    const s = String(raw ?? "").trim();
    if (!s) continue;

    // if AutoSuggestSelect emits id values
    const direct = byId.get(s);
    if (direct) {
      out.push(direct);
      continue;
    }

    // if AutoSuggestSelect emits labels
    const fromLabel = byLabel.get(s.toLowerCase());
    if (fromLabel) out.push(fromLabel);
  }

  // unique
  return Array.from(new Set(out));
}

function parseDDMMYYYY(str: string): Date | undefined {
  if (!str) return undefined;
  const [d, m, y] = str.split("/").map(Number);
  if (!d || !m || !y) return undefined;
  return new Date(y, m - 1, d);
}

function formatDDMMYYYY(date: Date): string {
  const dd = date.getDate().toString().padStart(2, "0");
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  const yy = date.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

function findIdByLabel(
  options: SimpleOption[],
  matcher: (labelLower: string) => boolean
): string | undefined {
  const opt = options.find((o) => matcher(o.label.toLowerCase()));
  return opt ? String(opt.id) : undefined;
}

export const ItineraryPlanBlock = ({
  itineraryPreference,
  setItineraryPreference,
  agents,
  agentId,
  setAgentId,
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
  selectedHotelCategoryIds,
  setSelectedHotelCategoryIds,
  selectedHotelFacilityIds,
  setSelectedHotelFacilityIds,

  specialInstructions,
  setSpecialInstructions,
  validationErrors,
  noOfNights,
  noOfDays,
}: ItineraryPlanBlockProps) => {
const [isTripDatesOpen, setIsTripDatesOpen] = useState(false);
const [hoveredToDate, setHoveredToDate] = useState<Date | undefined>(undefined);
const [isSelectingDeparture, setIsSelectingDeparture] = useState(false);

const tripStartDateObj = parseDDMMYYYY(tripStartDate);
const tripEndDateObj = parseDDMMYYYY(tripEndDate);

const previewRange = useMemo(() => {
  if (!tripStartDateObj) {
    return undefined;
  }

  // Final selected range
  if (tripEndDateObj) {
    return { from: tripStartDateObj, to: tripEndDateObj };
  }

  // Live hover preview before departure click
  if (hoveredToDate) {
    return hoveredToDate >= tripStartDateObj
      ? { from: tripStartDateObj, to: hoveredToDate }
      : { from: hoveredToDate, to: tripStartDateObj };
  }

  // Only arrival selected
  return { from: tripStartDateObj, to: tripStartDateObj };
}, [tripStartDateObj, tripEndDateObj, hoveredToDate]);

const previewToDate = tripEndDateObj
  ? tripEndDateObj
  : hoveredToDate
  ? hoveredToDate
  : tripStartDateObj;

const previewNoOfDays = useMemo(() => {
  if (!tripStartDateObj || !previewToDate) return 1;

  const from =
    previewToDate >= tripStartDateObj ? tripStartDateObj : previewToDate;
  const to =
    previewToDate >= tripStartDateObj ? previewToDate : tripStartDateObj;

  return Math.max(1, differenceInCalendarDays(to, from) + 1);
}, [tripStartDateObj, previewToDate]);

const previewNoOfNights = useMemo(
  () => Math.max(0, previewNoOfDays - 1),
  [previewNoOfDays]
);

const handleTripDayClick = (day: Date, disabled?: boolean) => {
  if (disabled) return;

  const clickedDate = formatDDMMYYYY(day);

  // First click, or when full range already exists -> start fresh from clicked date
  if (!tripStartDateObj || tripEndDateObj || !isSelectingDeparture) {
    setTripStartDate(clickedDate);
    setTripEndDate("");
    setHoveredToDate(undefined);
    setIsSelectingDeparture(true);
    return;
  }

  // While selecting departure:
  // If clicked date is before arrival, treat it as a new arrival date
  if (day < tripStartDateObj) {
    setTripStartDate(clickedDate);
    setTripEndDate("");
    setHoveredToDate(undefined);
    setIsSelectingDeparture(true);
    return;
  }

  // Valid departure selection
  setTripEndDate(clickedDate);
  setHoveredToDate(undefined);
  setIsSelectingDeparture(false);
  setIsTripDatesOpen(false);
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


  // Disable all dates before tomorrow (including today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const disablePastAndToday = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d <= today;
  };

  const agentOptions: AutoSuggestOption[] = agents.map((a) => ({
    value: String(a.id),
    label: a.name,
  }));

  const locationOptions: AutoSuggestOption[] = locations.map((loc) => ({
    value: loc.name,
    label: loc.name,
  }));

  const hotelCategoryAutoOptions: AutoSuggestOption[] = hotelCategoryOptions.map(
    (item) => ({
      value: String(item.id),
      label: item.label,
    })
  );

  const hotelFacilityAutoOptions: AutoSuggestOption[] = hotelFacilityOptions.map(
    (item) => ({
      value: String(item.id),
      label: item.label,
    })
  );

  const nationalityOptions: AutoSuggestOption[] = nationalities.map((item) => ({
    value: String(item.id),
    label: item.label,
  }));


  // Itinerary Type default → "Customize"
  useEffect(() => {
    if (!itineraryTypeSelect && itineraryTypes.length) {
      const defId = findIdByLabel(itineraryTypes, (l) => l.includes("custom"));
      if (defId) setItineraryTypeSelect(defId);
    }
  }, [itineraryTypeSelect, itineraryTypes, setItineraryTypeSelect]);

  // Arrival / Departure Type default → "By Flight"
  useEffect(() => {
    if (!travelTypes.length) return;
    const flightId = findIdByLabel(travelTypes, (l) => l.includes("flight"));
    if (flightId) {
      if (!arrivalType) setArrivalType(flightId);
      if (!departureType) setDepartureType(flightId);
    }
  }, [arrivalType, departureType, travelTypes, setArrivalType, setDepartureType]);

  // Entry Ticket default → "No"
  useEffect(() => {
    if (!entryTicketRequired && entryTicketOptions.length) {
      const defId = findIdByLabel(entryTicketOptions, (l) => l === "no");
      if (defId) setEntryTicketRequired(defId);
    }
  }, [entryTicketRequired, entryTicketOptions, setEntryTicketRequired]);

  // Guide default → "No"
  useEffect(() => {
    if (!guideRequired && guideOptions.length) {
      const defId = findIdByLabel(guideOptions, (l) => l === "no");
      if (defId) setGuideRequired(defId);
    }
  }, [guideRequired, guideOptions, setGuideRequired]);

  // Nationality default → "India"
  useEffect(() => {
    if (!nationality && nationalities.length) {
      const defId = findIdByLabel(nationalities, (l) => l.includes("india"));
      if (defId) setNationality(defId);
    }
  }, [nationality, nationalities, setNationality]);

  // Food Preference default → "Vegetarian"
  useEffect(() => {
    if (!foodPreference && foodPreferences.length) {
      const defId = findIdByLabel(foodPreferences, (l) => l.includes("veg"));
      if (defId) setFoodPreference(defId);
    }
  }, [foodPreference, foodPreferences, setFoodPreference]);

  // Budget default → 15000
  useEffect(() => {
    if (budget === "" || budget === 0) setBudget(15000);
  }, [budget, setBudget]);



  return (
    <Card className="border border-[#efdef8] rounded-lg bg-white shadow-none">
      <CardHeader className="pb-0" />
      <CardContent className="pt-4 pb-5 space-y-4">
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
  onOpenChange={(open) => {
    setIsTripDatesOpen(open);

    if (!open) {
      setHoveredToDate(undefined);
      setIsSelectingDeparture(false);
      return;
    }

    // When reopening:
    // if a full range already exists, next click should start a fresh arrival selection
    if (tripStartDateObj && tripEndDateObj) {
      setIsSelectingDeparture(false);
    } else if (tripStartDateObj && !tripEndDateObj) {
      setIsSelectingDeparture(true);
    } else {
      setIsSelectingDeparture(false);
    }
  }}
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
    align="start"
    className="z-50 w-fit p-0 bg-white border border-[#e5d7f6] rounded-xl shadow-xl overflow-hidden"
  >
    <div className="border-b border-[#efe7fb] px-4 py-3 bg-white">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-[#4a4260]">
          {tripStartDateObj && !tripEndDateObj
            ? "Select departure date"
            : "Select trip dates"}
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-full bg-[#f3ecfb] px-3 py-1 text-xs font-medium text-[#5c2db1]">
            {previewNoOfNights} Night{previewNoOfNights !== 1 ? "s" : ""}
          </div>
          <div className="rounded-full bg-[#f3ecfb] px-3 py-1 text-xs font-medium text-[#5c2db1]">
            {previewNoOfDays} Day{previewNoOfDays !== 1 ? "s" : ""}
          </div>
        </div>
      </div>
    </div>

    <Calendar
      mode="range"
      numberOfMonths={2}
      showOutsideDays={false}
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
      onDayMouseLeave={() => {
        if (!tripEndDateObj) {
          setHoveredToDate(undefined);
        }
      }}
      disabled={disablePastAndToday}
      defaultMonth={tripStartDateObj || undefined}
      initialFocus
      classNames={{
        day_today: "",
        day_range_middle: "bg-[#f3ecfb] text-[#2f2f2f]",
        day_hidden: "invisible",
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

 <div className="md:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-3">
  <div>
    <Label className="text-sm block mb-1">Start Time *</Label>
    <Input
      type="time"
      className="h-9 border-[#e5d7f6]"
      value={startTime}
      onChange={(e) => {
        const newTime = e.target.value;
        setStartTime(newTime);
      }}
    />
  </div>

  <div>
    <Label className="text-sm block mb-1">End Time *</Label>
    <Input
      type="time"
      className="h-9 border-[#e5d7f6]"
      value={endTime}
      onChange={(e) => setEndTime(e.target.value)}
    />
  </div>
</div>

<div
  className={`md:col-span-12 ${
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
          {item.label}
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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

          <div>
            <Label className="text-sm block mb-1">Meal Plan</Label>
            <div className="flex items-center gap-3 mt-1">
              <label className="flex items-center gap-1 text-sm">
                <input type="checkbox" defaultChecked className="accent-[#5c2db1]" />
                Breakfast
              </label>
              <label className="flex items-center gap-1 text-sm">
                <input type="checkbox" className="accent-[#5c2db1]" />
                Lunch
              </label>
              <label className="flex items-center gap-1 text-sm">
                <input type="checkbox" className="accent-[#5c2db1]" />
                Dinner
              </label>
            </div>
          </div>
        </div>

        {/* ROW 7 */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Label className="text-sm block mb-1">Special Instructions</Label>
            <Textarea
              rows={2}
              placeholder="Enter the Special Instruction"
              className="border-[#e5d7f6]"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
