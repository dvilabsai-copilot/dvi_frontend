import type { RoomForm } from "./HotelForm";
import { AmenityPicker, RoomTypeAutocomplete, type RoomOption } from "./RoomFieldPickers";

type RoomRowModel = Omit<RoomForm, "preferred_for" | "gst_type" | "amenities"> & {
  preferred_for: unknown;
  gst_type: unknown;
  amenities: unknown;
  room_ref_code?: unknown;
  room_ID?: unknown;
  room_id?: unknown;
};

type GstOption = { id: number | string; name: string };
type GstPercentOption = { id: number | string; label: string };

export type RoomFormRowProps = {
  row: RoomRowModel;
  index: number;
  totalRows: number;
  roomTypeOptions: RoomOption[];
  preferredForOptions: RoomOption[];
  gstTypes: GstOption[];
  gstPercentOptions: GstPercentOption[];
  amenityOptions: RoomOption[];
  onChange: (field: keyof RoomForm, value: unknown) => void;
  onDelete: () => void;
  deleteDisabled: boolean;
  to12h: (value: string) => string;
};

export function RoomFormRow({
  row,
  index,
  totalRows,
  roomTypeOptions,
  preferredForOptions,
  gstTypes,
  gstPercentOptions,
  amenityOptions,
  onChange,
  onDelete,
  deleteDisabled,
  to12h,
}: RoomFormRowProps) {
  const preferredFor = Array.isArray(row.preferred_for)
    ? row.preferred_for.filter(
        (value): value is string | number =>
          typeof value === "string" || typeof value === "number"
      )
    : [];
  const amenities = Array.isArray(row.amenities)
    ? row.amenities.filter(
        (value): value is string | number =>
          typeof value === "string" || typeof value === "number"
      )
    : [];

  return (
    <div className="col-span-12 border-b border-dashed pb-4 mb-4">
      <div className="flex justify-between items-center mb-2">
        <h6 className="font-semibold text-sm">
          Room {index + 1}/{totalRows}
        </h6>
        <button
          type="button"
          disabled={deleteDisabled}
          onClick={onDelete}
          className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 disabled:opacity-50"
        >
          Delete
        </button>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-3">
          <label className="block text-xs font-medium">Room Type *</label>
          <RoomTypeAutocomplete
            value={String(row.room_type ?? "")}
            onChange={(value) => onChange("room_type", value)}
            options={roomTypeOptions}
            dropdownId={`roomtype-dd-${index}`}
          />
        </div>

        <div className="col-span-12 md:col-span-3">
          <label className="block text-xs font-medium">Room Title *</label>
          <input
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            value={row.room_title}
            onChange={(event) => onChange("room_title", event.target.value)}
            placeholder="Enter the Room Title"
          />
        </div>

        <div className="col-span-12 md:col-span-3">
          <label className="block text-xs font-medium">
            No of Rooms Availability *
          </label>
          <input
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            value={row.no_of_rooms}
            onChange={(event) => onChange("no_of_rooms", event.target.value)}
            placeholder="Enter the No. of Rooms Available"
          />
        </div>

        <div className="col-span-12 md:col-span-3">
          <label className="block text-xs font-medium">Room Code *</label>
          <input
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-gray-100"
            value={String(row.room_ref_code ?? "")}
            placeholder="Enter the Ref Code"
            disabled
            readOnly
          />
        </div>

        <div className="col-span-12 md:col-span-3">
          <label className="block text-xs font-medium">Prefered For *</label>
          <AmenityPicker
            options={preferredForOptions}
            value={preferredFor}
            onChange={(ids) => onChange("preferred_for", ids)}
            placeholder="Select audience (multi)"
          />
        </div>

        <div className="col-span-12 md:col-span-3">
          <label className="block text-xs font-medium">AC Availability *</label>
          <select
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            value={row.ac_availability}
            onChange={(event) => onChange("ac_availability", Number(event.target.value))}
          >
            <option value={1}>Yes</option>
            <option value={0}>No</option>
          </select>
        </div>

        <div className="col-span-12 md:col-span-3">
          <label className="block text-xs font-medium">Status *</label>
          <select
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            value={row.status}
            onChange={(event) => onChange("status", Number(event.target.value))}
          >
            <option value={1}>Active</option>
            <option value={0}>In-Active</option>
          </select>
        </div>

        <div className="col-span-12 md:col-span-3">
          <label className="block text-xs font-medium">Max Adult *</label>
          <input
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            value={row.max_adult}
            onChange={(event) => onChange("max_adult", event.target.value)}
            placeholder="Enter the Max Adult"
          />
        </div>

        <div className="col-span-12 md:col-span-3">
          <label className="block text-xs font-medium">Max Children *</label>
          <input
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            value={row.max_children}
            onChange={(event) => onChange("max_children", event.target.value)}
            placeholder="Enter the total children"
          />
        </div>

        <div className="col-span-12 md:col-span-3">
          <label className="block text-xs font-medium">Check-In Time *</label>
          <input
            type="time"
            step={60}
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            value={row.check_in_time}
            onChange={(event) => onChange("check_in_time", event.target.value)}
          />
          <p className="text-[10px] text-gray-500 mt-1">
            Saved as {to12h(row.check_in_time)}
          </p>
        </div>

        <div className="col-span-12 md:col-span-3">
          <label className="block text-xs font-medium">Check-Out Time *</label>
          <input
            type="time"
            step={60}
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            value={row.check_out_time}
            onChange={(event) => onChange("check_out_time", event.target.value)}
          />
          <p className="text-[10px] text-gray-500 mt-1">
            Saved as {to12h(row.check_out_time)}
          </p>
        </div>

        <div className="col-span-12 md:col-span-3">
          <label className="block text-xs font-medium">GST Type *</label>
          <select
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            value={String(row.gst_type ?? "")}
            onChange={(event) => onChange("gst_type", Number(event.target.value))}
          >
            {gstTypes.map((gst) => (
              <option key={gst.id} value={gst.id}>
                {gst.name}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-12 md:col-span-3">
          <label className="block text-xs font-medium">GST Percentage *</label>
          <select
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            value={row.gst_percentage}
            onChange={(event) => onChange("gst_percentage", Number(event.target.value))}
          >
            {gstPercentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-12 md:col-span-3">
          <label className="block text-xs font-medium">Inbuilt Amenities *</label>
          <AmenityPicker
            options={amenityOptions}
            value={amenities}
            onChange={(ids) => onChange("amenities", ids)}
            placeholder="Choose amenities"
          />
        </div>

        <div className="col-span-12 md:col-span-3">
          <label className="block text-xs font-medium">Room Gallery *</label>
          <input
            type="file"
            multiple
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            onChange={(event) => onChange("gallery", event.target.files)}
          />
        </div>

        <div className="col-span-12">
          <div className="text-xs font-medium mb-2">Food Included? (Optional)</div>
          <div className="flex items-center gap-6">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={row.food_breakfast}
                onChange={(event) => onChange("food_breakfast", event.target.checked)}
              />
              Breakfast
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={row.food_lunch}
                onChange={(event) => onChange("food_lunch", event.target.checked)}
              />
              Lunch
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={row.food_dinner}
                onChange={(event) => onChange("food_dinner", event.target.checked)}
              />
              Dinner
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
