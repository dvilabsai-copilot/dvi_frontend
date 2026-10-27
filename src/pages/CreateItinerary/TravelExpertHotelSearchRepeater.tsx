import { useRef, useState, type ComponentProps } from "react";
import { Plus, Trash2 } from "lucide-react";
import { TravelExpertHotelSearch } from "./TravelExpertHotelSearch";
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

  const addSection = () => {
    setAdditionalIds((previous) => {
      if (previous.length + 1 >= MAX_SEARCH_SECTIONS) return previous;
      const id = nextId.current;
      nextId.current += 1;
      return [...previous, id];
    });
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <TravelExpertHotelSearch {...props} />
        <div className="absolute right-2 top-2 z-10 xl:-right-11 xl:top-8">
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
          <AdditionalHotelSearch base={props} />
          <div className="absolute right-2 top-9 z-10 xl:-right-11 xl:top-8">
            <button
              type="button"
              title={`Remove hotel search ${index + 2}`}
              aria-label={`Remove hotel search ${index + 2}`}
              onClick={() => setAdditionalIds((previous) => previous.filter((candidate) => candidate !== id))}
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
    </div>
  );
}
