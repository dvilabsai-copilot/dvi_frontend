// DVI_TE_HOTEL_RESULTS_BELOW_SEARCH_V1: one Hotel List-style table below the central Search Hotels button.
// DVI_TE_HOTEL_SEARCH_ON_CLICK_V1: one Search Hotels button for all independent hotel search boxes.
// DVI_TE_HOTELS_THREE_SCREENSHOT_MARKS_20261031: align Add Search (+) beside the joined search bar.
import { useCallback, useLayoutEffect, useRef, useState, type ComponentProps } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { TravelExpertHotelSearch, type HotelSearchSectionSnapshot } from "./TravelExpertHotelSearch";
import { TravelExpertHotelResultsTable } from "./TravelExpertHotelResultsTable";
import { cloneRoomFromTemplate } from "./helpers/useRoomsAndTravellers";

type HotelSearchProps = ComponentProps<typeof TravelExpertHotelSearch>;

// A second hotel search is a separately configured supplier-availability preview.
// It intentionally does not overwrite the first search's DVI itinerary/booking state.
function AdditionalHotelSearch({ base }: { base: HotelSearchProps }) {
  const [arrivalLocation, setArrivalLocation] = useState("");
  const [departureLocation, setDepartureLocation] = useState("");
  const [tripStartDate, setTripStartDate] = useState("");
  const [tripEndDate, setTripEndDate] = useState("");
  const [rooms, setRooms] = useState(() => [cloneRoomFromTemplate(base.defaultRoomTemplate, 1, 1)]);
  const [selectedHotelCategoryIds, setSelectedHotelCategoryIds] = useState<number[]>([]);
  const [mealPlanCode, setMealPlanCode] = useState(base.mealPlanCode);

  return (
    <TravelExpertHotelSearch
      {...base}
      arrivalLocation={arrivalLocation}
      setArrivalLocation={setArrivalLocation}
      departureLocation={departureLocation}
      setDepartureLocation={setDepartureLocation}
      tripStartDate={tripStartDate}
      setTripStartDate={setTripStartDate}
      tripEndDate={tripEndDate}
      setTripEndDate={setTripEndDate}
      rooms={rooms}
      setRooms={setRooms}
      selectedHotelCategoryIds={selectedHotelCategoryIds}
      setSelectedHotelCategoryIds={setSelectedHotelCategoryIds}
      mealPlanCode={mealPlanCode}
      setMealPlanCode={setMealPlanCode}
      validationErrors={{}}
    />
  );
}

const MAX_SEARCH_SECTIONS = 10;

// Used only within the existing Travel Expert Hotel mode gate.
export function TravelExpertHotelSearchRepeater(props: HotelSearchProps) {
  const [additionalIds, setAdditionalIds] = useState<number[]>([]);
  const nextId = useRef(1);
  const [searchRequestId, setSearchRequestId] = useState(0);
  // DVI_TE_HOTEL_RESULTS_BELOW_SEARCH_V1: one results table for all independently configured search boxes.
  const [searchSnapshots, setSearchSnapshots] = useState<Record<string, HotelSearchSectionSnapshot>>({});
  const onHotelResultsChange = useCallback((sectionId: string, snapshot: HotelSearchSectionSnapshot) => {
    setSearchSnapshots(previous => ({ ...previous, [sectionId]: snapshot }));
  }, []);
  const firstSectionRef = useRef<HTMLDivElement>(null);
  const [addButtonTop, setAddButtonTop] = useState<number | null>(null);

  // Always position the add button at the actual center of the joined search row.
  // Works when category buttons wrap, the window resizes, or fonts change.
  useLayoutEffect(() => {
    const root = firstSectionRef.current;
    if (!root) return;
    const row = root.querySelector('[data-dvi-te-hotel-hover="true"]') ||
      root.querySelector('[data-field="hotel-locations"]')?.parentElement;
    if (!row) return;
    const recalculate = () => {
      const rootRect = root.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      const next = Math.round(rowRect.top - rootRect.top + rowRect.height / 2);
      setAddButtonTop(previous => previous === next ? previous : next);
    };
    recalculate();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(recalculate) : null;
    observer?.observe(root);
    observer?.observe(row);
    window.addEventListener('resize', recalculate);
    return () => { observer?.disconnect(); window.removeEventListener('resize', recalculate); };
  }, []);

  const addSection = () => {
    // The newly added blank section must not run the previous search.
    setSearchRequestId(0);
    setAdditionalIds((previous) => {
      if (previous.length + 1 >= MAX_SEARCH_SECTIONS) return previous;
      const id = nextId.current;
      nextId.current += 1;
      return [...previous, id];
    });
  };

  return (
    <div className="space-y-4">
      <div className="relative" ref={firstSectionRef}>
        <TravelExpertHotelSearch {...props} searchRequestId={searchRequestId} searchSectionId="primary" onHotelResultsChange={onHotelResultsChange} hideInlineHotelResults />
        <div className="absolute right-2 z-10 xl:-right-4" style={{ top: addButtonTop ?? '50%', transform: 'translateY(-50%)' }}>
          <button
            type="button"
            aria-label="Add another hotel search section"
            title="Add another hotel search section"
            onClick={addSection}
            disabled={additionalIds.length + 1 >= MAX_SEARCH_SECTIONS}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#dac6f3] bg-white text-[#7138b9] shadow-md hover:bg-[#f6edff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7138b9] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      {additionalIds.map((id, index) => (
        <div key={id} className="relative">
          <div className="mb-2 text-sm font-semibold text-[#514168]">Hotel search {index + 2}</div>
          <AdditionalHotelSearch base={{ ...props, searchRequestId, searchSectionId: String(id), onHotelResultsChange, hideInlineHotelResults: true }} />
          <div className="absolute right-2 top-9 z-10 xl:-right-11 xl:top-8">
            <button
              type="button"
              title={`Remove hotel search ${index + 2}`}
              aria-label={`Remove hotel search ${index + 2}`}
              onClick={() => { setSearchRequestId(0); setAdditionalIds((previous) => previous.filter((candidate) => candidate !== id)); }}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-red-200 bg-white text-red-600 shadow-md hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-xs text-[#756888]">
            Extra search sections preview available hotels independently. They do not create itinerary route stops or confirmed hotel bookings.
          </p>
        </div>
      ))}

      <div className="flex justify-center pb-4 pt-2" data-dvi-te-hotel-shared-search>
        <button
          type="button"
          onClick={() => setSearchRequestId(previous => previous + 1)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#df278e] to-[#f044a3] px-9 py-3 text-sm font-bold text-white shadow-md transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#df278e]"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          Search Hotels
        </button>
      </div>
      <TravelExpertHotelResultsTable
        searchRequestId={searchRequestId}
        sectionIds={["primary", ...additionalIds.map(String)]}
        snapshots={searchSnapshots}
      />
    </div>
  );
}
