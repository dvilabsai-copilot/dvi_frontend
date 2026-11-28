import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Share2,
  MessageCircle,
  Mail,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

import { ItineraryService } from "@/services/itinerary";
import { api } from "@/lib/api";
import type {
  DailyMomentApiRow,
  DayViewPlan,
} from "@/services/dailyMomentTracker";

import type {
  ItineraryDay,
  ItineraryDetailsResponse,
} from "@/pages/itinerary-details/itinerary-details.types";

import {
  assignVehicle,
  fetchAllocationVehicles,
  fetchAllocationDrivers,
  type AllocationVehicle,
  type AllocationDriver,
} from "@/services/vehicle-availability";

export type AllocationBooking = {
  itinerary_plan_ID: number;
  confirmed_itinerary_plan_ID?: number | null;
  booking_quote_id: string;
primary_customer_name: string;
primary_contact_no: string;

agent_name?: string;
agent_mobile?: string;

operations_name?: string;
operations_mobile?: string;
  arrival_location: string;
  departure_location: string;
  arrival_date: string;
  departure_date: string;
  nights: number;
  days: number;
  itinerary_preference?: number;
};

type Saved = {
  driverId: number;
  assignmentId: number;
  name: string;
  mobile: string;
};

type WhatsAppRecipient = {
  role: string;
  name: string;
  mobile: string;
  selected: boolean;
};

type VehicleState = {
  vehicle: AllocationVehicle;
  saved: Saved | null;
  verified: boolean;
};

type BookingRow = {
  booking: AllocationBooking;
  locations: string[];

  dayView?: DayViewPlan;
  itineraryDays?: ItineraryDay[];
  dailyDays?: DailyMomentApiRow[];

  vehicleNames: string[];
  vehicles: AllocationVehicle[];
  assigned: VehicleState[];
  recordedDrivers: string[];
  warnings: string[];
  vehicleLoaded: boolean;
  driverDataComplete: boolean;
};

const emptyFilters = {
  booking: "",
  location: "",
  arrival: "",
  departure: "",
  vehicle: "",
  driver: "",
};

type Filters = typeof emptyFilters;

const control =
  "h-10 w-full min-w-0 rounded-md border border-[#e4deeb] bg-white px-3 text-sm text-[#4a4260] disabled:opacity-50";

const primary =
  "rounded-md bg-[#6f3cc3] px-3 py-2 text-sm font-medium text-white hover:bg-[#5f2ead] disabled:cursor-not-allowed disabled:opacity-50";

const outline =
  "rounded-md border border-[#e4deeb] bg-white px-3 py-2 text-sm text-[#4a4260] hover:bg-[#faf7ff] disabled:opacity-50";

const unique = (values: string[]) =>
  [...new Set(
    values.map(v => String(v ?? "").trim()).filter(v =>
      Boolean(v) &&
      !/^[-–—]+$/.test(v) &&
      !/^(n\/a|null|undefined)$/i.test(v),
    ),
  )];

const keyOf = (v: AllocationVehicle) =>
  `${v.vendorId}:${v.vehicleTypeId}:${v.vehicleId}`;

const groupOf = (v: AllocationVehicle) =>
  `${v.vendorId}:${v.vehicleTypeId}`;

const validVehicle = (v: AllocationVehicle) =>
  v.vehicleId > 0 &&
  v.vendorId > 0 &&
  v.vehicleTypeId > 0;

const validDriver = (d: AllocationDriver) =>
  Number(d.id) > 0;

const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : String(error);

function notifyAssignmentChange(
  itineraryPlanId: number,
) {
  try {
    window.localStorage.setItem(
      "dvi:transport-assignment-changed",
      JSON.stringify({
        itineraryPlanId,
        timestamp: Date.now(),
      }),
    );
  } catch (error) {
    console.warn(
      "Unable to notify assignment change",
      error,
    );
  }
}

// ===========================================
// DATE HELPERS
// ===========================================

export function dateOnly(value?: string): string {
  if (!value) return "";

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

  const dmy = /^(\d{2})[-/](\d{2})[-/](\d{4})$/.exec(value);

  const parts = iso
    ? [iso[1], iso[2], iso[3]]
    : dmy
      ? [dmy[3], dmy[2], dmy[1]]
      : null;

  if (!parts) return "";

  const result = parts.join("-");
  const date = new Date(`${result}T00:00:00Z`);

  return Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === result
    ? result
    : "";
}
function displayDate(value: string) {
  const day = dateOnly(value);

  return day
    ? new Date(`${day}T00:00:00Z`).toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        },
      )
    : "—";
}

const dmy = (iso: string) =>
  iso.split("-").reverse().join("-");

const vehicleLabel = (v: AllocationVehicle) =>
  [
    v.vehicleTypeTitle || `Type #${v.vehicleTypeId}`,
    v.registrationNumber,
    v.vendorName,
  ]
    .filter(Boolean)
    .join(" · ");

// ===========================================
// LOAD ALL CONFIRMED VEHICLE BOOKINGS
// ===========================================

export async function loadAllAllocationBookings(
  onUnknown?: (count: number) => void,
): Promise<AllocationBooking[]> {
  const rows = new Map<number, AllocationBooking>();

  let start = 0;
  let draw = 1;

  while (true) {
const response =
  await ItineraryService.getConfirmedItineraries({
    draw,
    start,
    length: 10,
  });

    if (!Array.isArray(response?.data)) {
      throw new Error(
        "Invalid confirmed bookings response",
      );
    }

    const page = response.data as AllocationBooking[];

    const total = Number(
      response.recordsFiltered ??
        response.recordsTotal,
    );

    if (!page.length) {
      if (Number.isFinite(total) && start < total) {
        throw new Error(
          "Confirmed bookings pagination ended early",
        );
      }

      break;
    }

    const previous = rows.size;

    for (const booking of page) {
      const id = Number(booking.itinerary_plan_ID);

      if (id > 0) {
        rows.set(id, booking);
      }
    }

    if (rows.size === previous) {
      throw new Error(
        "Confirmed bookings pagination returned repeated rows",
      );
    }

    start += page.length;
    draw++;

    if (Number.isFinite(total) && start >= total) {
      break;
    }
  }

  const all = [...rows.values()];

  onUnknown?.(
    all.filter(
      b =>
        ![1, 2, 3].includes(
          Number(b.itinerary_preference),
        ),
    ).length,
  );

// 2 = Transportation Only
// 3 = Hotel + Vehicle

const eligible = all.filter(b =>
  [2, 3].includes(Number(b.itinerary_preference)),
);

console.info("[Transport Allocation] Booking counts", {
  confirmed: all.length,

  preference1: all.filter(
    b => Number(b.itinerary_preference) === 1
  ).length,

  preference2: all.filter(
    b => Number(b.itinerary_preference) === 2
  ).length,

  preference3: all.filter(
    b => Number(b.itinerary_preference) === 3
  ).length,

  unknown: all.filter(
    b => ![1, 2, 3].includes(Number(b.itinerary_preference))
  ).length,

  eligible: eligible.length,
});

return eligible;
}

// ===========================================
// LOAD VEHICLE AND DRIVER INFORMATION
// ===========================================

function displayTripTime(value?: string | null): string {
  const raw = String(value ?? "").trim();

  const match = raw.match(
    /^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i
  );

  if (!match) return "Time unavailable";

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3]?.toUpperCase();

  if (minutes > 59 || hours > 23) {
    return "Time unavailable";
  }

  if (period) {
    if (hours < 1 || hours > 12) {
      return "Time unavailable";
    }

    hours = hours % 12 + (period === "PM" ? 12 : 0);
  }

  const suffix = hours >= 12 ? "PM" : "AM";
  const hour = hours % 12 || 12;

  return `${String(hour).padStart(2, "0")}:${String(
    minutes
  ).padStart(2, "0")} ${suffix}`;
}

function buildRouteDetails(row: BookingRow) {
  const start = dateOnly(row.booking.arrival_date);
  const departure = dateOnly(row.booking.departure_date);

  if (!start || !departure || start > departure) {
    return [];
  }

  const sources = [
    (row.itineraryDays ?? []).map(day => ({
      date: dateOnly(day.date),
      from: unique([String(day.departure ?? "")])[0] || "",
      to: unique([String(day.arrival ?? "")])[0] || "",
    })),

    (row.dayView?.days ?? []).map(day => ({
      date: dateOnly(day.route_date),
      from: unique([String(day.from_location ?? "")])[0] || "",
      to: unique([String(day.to_location ?? "")])[0] || "",
    })),

    (row.dailyDays ?? []).map(day => ({
      date: dateOnly(day.route_date),
      from: unique([String(day.location_name ?? "")])[0] || "",
      to: unique([String(day.next_visiting_location ?? "")])[0] || "",
    })),
  ];

  const coveredDates = new Set<string>();

  const days = sources.flatMap(source => {
    const available = source.filter(day =>
      Boolean(
        day.date &&
        day.date >= start &&
        day.date <= departure &&
        day.to &&
        !coveredDates.has(day.date)
      )
    );

    available.forEach(day => coveredDates.add(day.date));

    return available;
  }).sort((a, b) => a.date.localeCompare(b.date));

  const grouped = new Map<
    string,
    { from: string; destinations: string[] }
  >();

  for (const day of days) {
    const existing = grouped.get(day.date) ?? {
      from: day.from,
      destinations: [],
    };

    if (!existing.from) {
      existing.from = day.from;
    }

    const destination = day.to || day.from;

    if (
      destination &&
      !existing.destinations.includes(destination)
    ) {
      existing.destinations.push(destination);
    }

    grouped.set(day.date, existing);
  }

  const calendarNights =
    (Date.parse(`${departure}T00:00:00Z`) -
      Date.parse(`${start}T00:00:00Z`)) /
    86400000;

  const rawNights = row.booking.nights;
  const bookedNights = Number(rawNights);

  const hasBookedNights =
    String(rawNights ?? "").trim() !== "" &&
    Number.isInteger(bookedNights) &&
    bookedNights >= 0;

  const totalNights = hasBookedNights
    ? bookedNights
    : calendarNights;

  const nightDates = [...grouped.keys()].filter(
    date => date < departure
  );

  const completeNightDetails =
    totalNights === calendarNights &&
    nightDates.length === calendarNights;

  const result: {
    day: number;
    date: string;
    route: string;
    label: string;
  }[] = [];

  // Display overnight route destinations.
  for (const [date, item] of grouped) {
    if (date === departure) continue;

    const destination = item.destinations.join(" → ");

    const from = item.from ||
      unique([row.booking.arrival_location])[0] || "";

    result.push({
      day: result.length + 1,
      date,
      route:
        date === start && from && from !== destination
          ? `${from} → ${destination}`
          : destination,

      label: completeNightDetails ? "1N" : "",
    });
  }

  // Display total nights when day-wise data is incomplete.
  if (!completeNightDetails) {
    const mismatch = totalNights !== calendarNights;

    result.push({
      day: result.length + 1,
      date: "",

      route: mismatch
        ? `Travel dates span ${calendarNights}N`
        : "Day-wise details incomplete",

      label: mismatch
        ? `${totalNights}N booked`
        : `${totalNights}N total`,
    });
  }

  // Always display the confirmed departure location.
  const finalDestinations =
    grouped.get(departure)?.destinations ?? [];

  const departureLocation = unique([
    row.booking.departure_location,
    finalDestinations[finalDestinations.length - 1] || "",
  ])[0] || "Departure location unavailable";

  const arrivalLocation =
    unique([row.booking.arrival_location])[0] || "";

  result.push({
    day: result.length + 1,
    date: departure,

    route:
      start === departure &&
      arrivalLocation &&
      arrivalLocation !== departureLocation
        ? `${arrivalLocation} → ${departureLocation}`
        : departureLocation,

    label: "Dept.",
  });

  return result;
}

export async function readBookingRow(
  booking: AllocationBooking,
): Promise<BookingRow> {
  const planId = Number(booking.itinerary_plan_ID);

  const start = dateOnly(booking.arrival_date);
  const end = dateOnly(booking.departure_date);

  const row: BookingRow = {
    booking,

    locations: unique([
      booking.arrival_location || "",
      booking.departure_location || "",
    ]),

    vehicleNames: [],
    vehicles: [],
    assigned: [],
    recordedDrivers: [],
    warnings: [],
    vehicleLoaded: false,
    driverDataComplete: false,
  };

const [daily, fleet, itineraryDetails] =
  await Promise.allSettled([
  start && end && start <= end
    ? (api(`/daily-moment-tracker?${new URLSearchParams({
        fromDate: dmy(start),
        toDate: dmy(end),
        itineraryPlanId: String(planId),
      }).toString()}`, {
        method: "GET",
        auth: true,
        redirectOnForbidden: false,
        cache: "no-store",
      }) as Promise<DailyMomentApiRow[]>)
    : Promise.reject(new Error("Invalid travel dates")),

  fetchAllocationVehicles(planId),

ItineraryService.getDetails(
  booking.booking_quote_id,
) as Promise<ItineraryDetailsResponse>,
]);

if (itineraryDetails.status === "fulfilled") {
  const details = itineraryDetails.value;

  const sameBooking =
    String(details?.quoteId ?? "").trim() ===
    String(booking.booking_quote_id).trim();

  const samePlan =
    details?.planId == null ||
    Number(details.planId) === planId;

  const sameConfirmedPlan =
    !booking.confirmed_itinerary_plan_ID ||
    details?.confirmed_itinerary_plan_ID == null ||
    Number(details.confirmed_itinerary_plan_ID) ===
      Number(booking.confirmed_itinerary_plan_ID);

  if (
    sameBooking &&
    samePlan &&
    sameConfirmedPlan &&
    Array.isArray(details.days)
  ) {
    row.itineraryDays = details.days
      .filter(day => {
        const date = dateOnly(day.date);

        return Boolean(
          start &&
          end &&
          date &&
          date >= start &&
          date <= end
        );
      })
      .sort((a, b) =>
        dateOnly(a.date).localeCompare(
          dateOnly(b.date)
        ) ||
        Number(a.dayNumber) - Number(b.dayNumber)
      );
  }
}

const firstDay = row.itineraryDays?.find(
  day => dateOnly(day.date) === start
);

const lastDay = row.itineraryDays?.find(
  day => dateOnly(day.date) === end
);

// Retain the previous API as a fallback.
const expectedRouteDays =
  start && end
    ? Math.round(
        (
          Date.parse(`${end}T00:00:00Z`) -
          Date.parse(`${start}T00:00:00Z`)
        ) / 86400000
      ) + 1
    : 0;

const availableRouteDates = new Set(
  (row.itineraryDays ?? [])
    .map(day => dateOnly(day.date))
    .filter(Boolean)
);

if (
  !row.itineraryDays?.length ||
  availableRouteDates.size < expectedRouteDays ||
  displayTripTime(firstDay?.startTime) === "Time unavailable" ||
  displayTripTime(lastDay?.departureTime) === "Time unavailable"
) {
  try {
    const fallback = (await api(
      `/daily-moment-tracker/day-view/${planId}`,
      {
        method: "GET",
        auth: true,
        redirectOnForbidden: false,
        cache: "no-store",
      }
    )) as DayViewPlan;

    if (
      Number(fallback?.itinerary_plan_ID) === planId &&
      dateOnly(fallback.trip_start_date) === start &&
      dateOnly(fallback.trip_end_date) === end
    ) {
      row.dayView = fallback;
    }
  } catch {
    // Existing booking and allocation data remain usable.
  }
}

  if (
    daily.status === "fulfilled" &&
    Array.isArray(daily.value)
  ) {
const days = daily.value.filter(
  day => Number(day.itinerary_plan_ID) === planId,
);

row.dailyDays = days;

row.locations = unique([
      booking.arrival_location || "",

      ...days.flatMap(day => [
        day.location_name || "",
        day.next_visiting_location || "",
      ]),

      booking.departure_location || "",
    ]);

    row.vehicleNames = unique(
      days.map(day => day.vehicle_type_title || ""),
    );

    row.recordedDrivers = unique(
      days.map(day => day.driver_name || ""),
    );

    if (!days.length) {
      row.warnings.push(
        "No matching day-wise trip details returned",
      );
    }
  } else {
    row.warnings.push(
      "Trip details could not be loaded",
    );
  }

  if (fleet.status !== "fulfilled") {
    row.warnings.push(
      "Vehicle availability could not be loaded",
    );

    return row;
  }

row.vehicleLoaded = true;

row.vehicles = [
  ...new Map(
    fleet.value
      .filter(validVehicle)
      .map(v => [keyOf(v), v]),
  ).values(),
];

console.info("[Transport Allocation] Vehicle check", {
  bookingId: booking.booking_quote_id,
  planId,
  returned: fleet.value.length,
  valid: row.vehicles.length,

  available: row.vehicles.filter(
    v => v.isAvailable,
  ).length,

  assigned: row.vehicles.filter(
    v => v.isAssignedToCurrent,
  ).length,

  invalid: fleet.value.filter(
    v => !validVehicle(v),
  ).length,
});


  const assigned = row.vehicles.filter(
    v => v.isAssignedToCurrent,
  );

row.vehicleNames = unique(row.vehicleNames);

if (!row.vehicleNames.length) {
  row.warnings.push(
    "Confirmed booked vehicle type could not be verified",
  );
}

  if (!assigned.length) {
    if (row.recordedDrivers.length) {
      row.warnings.push(
        "Recorded driver could not be matched to an allocated vehicle",
      );
    }

   row.driverDataComplete =
  row.vehicles.length > 0 &&
  row.recordedDrivers.length === 0;

    return row;
  }

  const byGroup =
    new Map<string, AllocationDriver[]>();

  for (const v of assigned) {
    if (byGroup.has(groupOf(v))) continue;

    try {
      byGroup.set(
        groupOf(v),
        await fetchAllocationDrivers(
          planId,
          v.vendorId,
          v.vehicleTypeId,
        ),
      );
    } catch {
      row.warnings.push(
        "Assigned driver details could not be loaded",
      );
    }
  }

  for (const v of assigned) {
    const state: VehicleState = {
      vehicle: v,
      saved: null,
      verified: false,
    };

    row.assigned.push(state);

    try {
      if (!start || !end || start > end) {
        throw new Error("Invalid travel dates");
      }

const direct = v as AllocationVehicle & {
  assignmentVerified?: boolean;
  driverId?: number | null;
  driverAssignmentId?: number | null;
  driverName?: string;
  driverMobile?: string;
};

if (direct.assignmentVerified !== true) {
  throw new Error(
    "Saved allocation is missing or ambiguous",
  );
}

if (
  !direct.driverId &&
  !direct.driverAssignmentId
) {
  state.verified = true;
  continue;
}

const driverId =
  Number(direct.driverId);

const assignmentId =
  Number(direct.driverAssignmentId);

      if (!(driverId > 0 && assignmentId > 0)) {
        throw new Error(
          "Missing saved driver assignment ID",
        );
      }

      const driver = byGroup
        .get(groupOf(v))
        ?.find(
          d =>
            Number(d.id) === driverId ||
            Number(d.driverId) === driverId,
        );

 state.saved = {
  driverId,
  assignmentId,

  name:
    direct.driverName ||
    driver?.name ||
    driver?.label ||
    `Driver #${driverId}`,

  mobile:
    direct.driverMobile ||
    driver?.mobile ||
    "",
};

if (!direct.driverName && !driver) {
  row.warnings.push(
    `Saved driver #${driverId} details not returned`,
  );
}

      state.verified = true;
    } catch {
      row.warnings.push(
        `Saved allocation could not be verified: ${
          v.registrationNumber || v.vehicleTypeTitle
        }`,
      );
    }
  }

  row.driverDataComplete =
    row.assigned.every(a => a.verified);

  if (
    row.recordedDrivers.length &&
    !row.assigned.some(a => a.saved)
  ) {
    row.driverDataComplete = false;

    row.warnings.push(
      "Recorded driver conflicts with saved allocation data",
    );
  }

  return row;
}

// ===========================================
// FILTER LOGIC
// ===========================================

function savedNames(row: BookingRow) {
  const verified = row.assigned.flatMap(a =>
    a.saved ? [a.saved.name] : [],
  );

  return unique(
    row.driverDataComplete
      ? verified
      : [...row.recordedDrivers, ...verified],
  );
}

export function matchesAllocationFilters(
  row: BookingRow,
  f: Filters,
) {
  const names = savedNames(row);

  return (
    (!f.booking ||
      String(row.booking.booking_quote_id || "")
        .toLowerCase()
        .includes(f.booking.trim().toLowerCase())) &&

    (!f.location ||
      row.locations.includes(f.location)) &&

    (!f.arrival ||
      dateOnly(row.booking.arrival_date) === f.arrival) &&

    (!f.departure ||
      dateOnly(row.booking.departure_date) === f.departure) &&

    (!f.vehicle ||
      row.vehicleNames.includes(f.vehicle)) &&

    (!f.driver ||
      (f.driver === "__assigned"
        ? names.length > 0
        : f.driver === "__unassigned"
          ? row.driverDataComplete && !names.length
          : names.includes(f.driver)))
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: {
    value: string;
    label: string;
  }[];
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-sm font-medium text-[#62596d]">
        {label}
      </span>

      <select
        className={control}
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// ===========================================
// SHARE DRIVER ITINERARY
// ===========================================
function normalizeWhatsAppMobile(
  value: string,
): string {
  const raw = String(value ?? "").trim();

  if (!/^\+?[\d\s()-]+$/.test(raw)) {
    return "";
  }

  let digits = raw.replace(/\D/g, "");

  const explicitInternational =
    raw.startsWith("+") ||
    digits.startsWith("00");

  // Remove international dialling prefix.
  if (
    !raw.startsWith("+") &&
    digits.startsWith("00")
  ) {
    digits = digits.slice(2);
  }

  // Remove domestic leading zero.
  if (
    !explicitInternational &&
    /^0[6-9]\d{9}$/.test(digits)
  ) {
    digits = digits.slice(1);
  }

  // Add Indian country code.
  if (
    !explicitInternational &&
    /^[6-9]\d{9}$/.test(digits)
  ) {
    return `91${digits}`;
  }

  // Indian number already includes country code.
  if (digits.startsWith("91")) {
    return /^91[6-9]\d{9}$/.test(digits)
      ? digits
      : "";
  }

  // International mobile numbers.
  if (
    explicitInternational &&
    /^[1-9]\d{7,14}$/.test(digits)
  ) {
    return digits;
  }

  return "";
}

function formatWhatsAppMobile(
  value: string,
): string {
  const normalized =
    normalizeWhatsAppMobile(value);

  return normalized
    ? `+${normalized}`
    : String(value ?? "").trim();
}

function shareSaved(
  booking: AllocationBooking,
  saved: Saved,
  method: string,
) {
  const url =
    `${window.location.origin}/daily-moment/driver/${saved.assignmentId}`;

  const message =
    `Driver itinerary for ${booking.booking_quote_id}: ${url}`;

  const mobile = saved.mobile.replace(/\D/g, "");

  const international =
    mobile.length === 10
      ? `91${mobile}`
      : mobile.replace(/^00/, "");

  if (method === "email") {
    window.location.href =
      `mailto:?subject=${encodeURIComponent(
        `Driver Itinerary - ${booking.booking_quote_id}`,
      )}&body=${encodeURIComponent(message)}`;

    return;
  }

  if (!international) {
    toast.error("Driver mobile number is not available");
    return;
  }

  if (method === "sms") {
    window.location.href =
      `sms:${international}?body=${encodeURIComponent(
        message,
      )}`;

    return;
  }

  const target =
    /Android|iPhone|iPad|iPod|Mobile/i.test(
      navigator.userAgent,
    )
      ? `https://wa.me/${international}?text=${encodeURIComponent(
          message,
        )}`
      : `https://web.whatsapp.com/send?phone=${encodeURIComponent(
          international,
        )}&text=${encodeURIComponent(message)}`;

  window.open(
    target,
    "_blank",
    "noopener,noreferrer",
  );
}

// ===========================================
// INDIVIDUAL BOOKING ROW
// ===========================================

function AllocationRow({
  row,
  onReload,
  onSavingChange,
  locked,
}: {
  row: BookingRow;
  onReload: (id: number) => Promise<BookingRow>;
  onSavingChange: (
    id: number,
    busy: boolean,
  ) => boolean;
  locked: boolean;
}) {
  const b = row.booking;

  const planId = Number(b.itinerary_plan_ID);

const historical =
  !dateOnly(b.departure_date) ||
  !dateOnly(b.arrival_date) ||
  dateOnly(b.arrival_date) > dateOnly(b.departure_date);

const [vehicleKey, setVehicleKey] = useState(() => {
  return row.assigned[0]
    ? keyOf(row.assigned[0].vehicle)
    : "";
});

  const [driverId, setDriverId] = useState("");

  const [driverState, setDriverState] = useState<{
    key: string;
    rows: AllocationDriver[];
    loading: boolean;
    error: boolean;
  }>({
    key: "",
    rows: [],
    loading: false,
    error: false,
  });

  const [saving, setSaving] = useState(false);

  const savingRef = useRef(false);

  const [method, setMethod] = useState("whatsapp");

const whatsappDialogRef =
  useRef<HTMLDialogElement>(null);

const [recipients, setRecipients] =
  useState<WhatsAppRecipient[]>([]);

const [recipientIndex, setRecipientIndex] =
  useState(0);

  const [retry, setRetry] = useState(0);

  const [writeUncertain, setWriteUncertain] =
    useState(false);

const options = Array.from(
  new Map(
    [
      ...row.assigned.map(a => a.vehicle),

 ...row.vehicles.filter(v => {
  if (v.isAssignedToCurrent) return true;

  if (!v.isAvailable) return false;

  const sameGroup = row.assigned.filter(
    assignment =>
      groupOf(assignment.vehicle) === groupOf(v),
  );

  return sameGroup.length <= 1;
}),
    ].map(v => [keyOf(v), v]),
  ).values(),
).sort(
  (a, b) =>
    Number(b.isAssignedToCurrent) -
      Number(a.isAssignedToCurrent) ||
    Number(b.isAvailable) -
      Number(a.isAvailable),
);

  const vehicle = options.find(
    v => keyOf(v) === vehicleKey,
  );

  const state = row.assigned.find(
    a => keyOf(a.vehicle) === vehicleKey,
  );

  const saved = state?.saved;

const canEdit =
  !historical &&
  row.vehicleLoaded &&
  row.driverDataComplete &&
  !!vehicle &&
  vehicle.isAvailable &&
  (!state || state.verified) &&
  !writeUncertain &&
  !locked;

  const activeKey = vehicle ? keyOf(vehicle) : "";

  const vendorId = vehicle?.vendorId;
  const typeId = vehicle?.vehicleTypeId;
  const savedId = saved?.driverId || 0;

useEffect(() => {
  setVehicleKey(previous => {
    const currentAssignment = row.assigned.find(
      assignment =>
        keyOf(assignment.vehicle) === previous,
    );

    if (currentAssignment) {
      return previous;
    }

    return row.assigned[0]
      ? keyOf(row.assigned[0].vehicle)
      : "";
  });
}, [row]);

  // Load available drivers for the selected vehicle.

  useEffect(() => {
    setDriverId(savedId ? String(savedId) : "");

    setDriverState({
      key: activeKey,
      rows: [],
      loading: Boolean(activeKey),
      error: false,
    });

    if (
      !activeKey ||
      !vendorId ||
      !typeId ||
      historical
    ) {
      return;
    }

    let alive = true;

    fetchAllocationDrivers(
      planId,
      vendorId,
      typeId,
    )
      .then(rows => {
        if (alive) {
          setDriverState({
            key: activeKey,
            rows: rows.filter(validDriver),
            loading: false,
            error: false,
          });
        }
      })
      .catch(() => {
        if (alive) {
          setDriverState({
            key: activeKey,
            rows: [],
            loading: false,
            error: true,
          });
        }
      });

    return () => {
      alive = false;
    };
}, [
  planId,
  activeKey,
  vendorId,
  typeId,
  savedId,
  historical,
  retry,
  row,
]);

  const driverOptions =
    driverState.key === activeKey
      ? driverState.rows.filter(
          d =>
            d.isAvailable ||
            Number(d.id) === savedId ||
            Number(d.driverId) === savedId,
        )
      : [];

const canAutoAssign =
  canEdit &&
  !!vehicle &&
  !saving &&
  !driverState.loading &&
  !driverState.error &&
  driverState.key === activeKey;

  // =========================================
  // SAVE VEHICLE AND DRIVER
  // =========================================
async function unassignSelectedDriver() {
  if (
    !canEdit ||
    !vehicle ||
    !saved ||
    !state?.verified ||
    savingRef.current
  ) {
    return;
  }

  if (!onSavingChange(planId, true)) return;

  savingRef.current = true;
  setSaving(true);

  try {
    const result = await api(
      "/vehicle-availability/unassign-driver",
      {
        method: "POST",
        auth: true,
        body: {
          itineraryPlanId: planId,
          vendor_id: vehicle.vendorId,
          vehicle_type_id: vehicle.vehicleTypeId,
          vehicle_id: vehicle.vehicleId,
          driver_id: saved.driverId,
          driverAssignmentId: saved.assignmentId,
        },
      },
    ) as {
      success: boolean;
      message?: string;
    };

  if (result?.success !== true) {
  throw new Error(
    result?.message ||
    "Unable to unassign driver",
  );
}

notifyAssignmentChange(planId);

const refreshed = await onReload(planId);

    const current = refreshed.assigned.find(
      a => keyOf(a.vehicle) === keyOf(vehicle),
    );

    if (
      !current ||
      !current.verified ||
      current.saved ||
      !refreshed.driverDataComplete
    ) {
      throw new Error(
        "Driver removal could not be verified. Please refresh.",
      );
    }

setDriverId("");

toast.success(
  "Driver unassigned successfully",
);

  } catch (error) {
    toast.error(errorMessage(error));

    try {
      const refreshed = await onReload(planId);

      const current = refreshed.assigned.find(
        a => keyOf(a.vehicle) === keyOf(vehicle),
      );

      if (
        !current?.verified ||
        !refreshed.driverDataComplete
      ) {
        setWriteUncertain(true);
      }

      setDriverId(
        current?.saved
          ? String(current.saved.driverId)
          : "",
      );
    } catch {
      setWriteUncertain(true);

      setDriverId(
        String(saved.driverId),
      );
    }
  } finally {
    setSaving(false);
    savingRef.current = false;

    onSavingChange(planId, false);

    setRetry(v => v + 1);
  }
}
async function updateSelectedVehicle(
  nextVehicleKey: string,
) {
  if (
    savingRef.current ||
    locked ||
    historical ||
    writeUncertain ||
    !row.vehicleLoaded ||
    !row.driverDataComplete
  ) {
    return;
  }

  const candidate = options.find(
    (vehicle) =>
      keyOf(vehicle) === nextVehicleKey &&
      vehicle.isAvailable,
  );

  if (!candidate) {
    toast.error("Selected vehicle is unavailable.");
    return;
  }

if (nextVehicleKey === vehicleKey) {
  return;
}

if (candidate.isAssignedToCurrent) {
  setVehicleKey(nextVehicleKey);
  setRetry(value => value + 1);
  return;
}

if (!onSavingChange(planId, true)) {
  return;
}

  savingRef.current = true;
  setSaving(true);

  let writeStarted = false;

  try {
    const latest = await readBookingRow(b);

    if (
      !latest.vehicleLoaded ||
      !latest.driverDataComplete
    ) {
      throw new Error(
        "Current assignment could not be verified.",
      );
    }

    const freshVehicle = latest.vehicles.find(
      (vehicle) =>
        keyOf(vehicle) === nextVehicleKey &&
        vehicle.isAvailable,
    );

    if (!freshVehicle) {
      throw new Error(
        "Vehicle is no longer available.",
      );
    }

    const previousGroup = row.assigned.filter(
      (assignment) =>
        groupOf(assignment.vehicle) ===
        groupOf(freshVehicle),
    );

    const currentGroup = latest.assigned.filter(
      (assignment) =>
        groupOf(assignment.vehicle) ===
        groupOf(freshVehicle),
    );

    if (
      previousGroup.length > 1 ||
      currentGroup.length > 1
    ) {
      throw new Error(
        "Multiple assignments require individual allocation.",
      );
    }

    const previous = previousGroup[0];
    const current = currentGroup[0];

    if (
      Boolean(previous) !== Boolean(current) ||
      (
        previous &&
        (
          !current?.verified ||
          keyOf(previous.vehicle) !==
            keyOf(current.vehicle) ||
          (previous.saved?.driverId ?? 0) !==
            (current.saved?.driverId ?? 0) ||
          (previous.saved?.assignmentId ?? 0) !==
            (current.saved?.assignmentId ?? 0)
        )
      )
    ) {
      throw new Error(
        "Assignment changed. Refresh before continuing.",
      );
    }

    const retainedDriverId =
      current?.saved?.driverId ?? null;

    if (retainedDriverId) {
      const drivers =
        await fetchAllocationDrivers(
          planId,
          freshVehicle.vendorId,
          freshVehicle.vehicleTypeId,
        );

      const driverAvailable = drivers.some(
        (driver) =>
          Number(driver.driverId) ===
            retainedDriverId &&
          driver.isAvailable,
      );

      if (!driverAvailable) {
        throw new Error(
          "Existing driver is unavailable. Unassign the driver before changing the vehicle.",
        );
      }
    }

    writeStarted = true;

const result = await assignVehicle({
  itineraryPlanId: planId,
  vendor_id: freshVehicle.vendorId,
  vehicle_type_id: freshVehicle.vehicleTypeId,
  vehicle_id: freshVehicle.vehicleId,
  driver_id: retainedDriverId,
});

if (result?.success !== true) {
  throw new Error(
    result?.message ||
    "Vehicle update failed.",
  );
}

notifyAssignmentChange(planId);

const refreshed = await onReload(planId);

    const verified = refreshed.assigned.find(
      (assignment) =>
        assignment.verified &&
        keyOf(assignment.vehicle) ===
          nextVehicleKey &&
        (assignment.saved?.driverId ?? null) ===
          retainedDriverId,
    );

    if (!verified) {
      throw new Error(
        "Saved vehicle could not be verified. Refresh the booking.",
      );
    }

    setVehicleKey(nextVehicleKey);

    setDriverId(
      retainedDriverId
        ? String(retainedDriverId)
        : "",
    );

    toast.success(
      "Vehicle updated successfully",
    );

  } catch (error) {
    if (writeStarted) {
      setWriteUncertain(true);
    }

    toast.error(errorMessage(error));

    try {
      await onReload(planId);
    } catch {
      setWriteUncertain(true);
    }
  } finally {
    setSaving(false);
    savingRef.current = false;
    onSavingChange(planId, false);
    setRetry(value => value + 1);
  }
}

async function save(nextDriverId: string) {
  const selected = driverOptions.find(
    d =>
      Number(d.driverId || d.id) ===
      Number(nextDriverId),
  );

  if (
    !canAutoAssign ||
    !vehicle ||
    !selected ||
    !selected.isAvailable ||
    !nextDriverId ||
    Number(nextDriverId) === savedId ||
    savingRef.current
  ) {
    return;
  }

  if (!onSavingChange(planId, true)) return;

  savingRef.current = true;
  setSaving(true);
  setDriverId(nextDriverId);

  let writeStarted = false;

    let expected: {
      vehicleKey: string;
      driverId: number;
      assignmentId: number;
    } | null = null;

    try {
      const latest = await readBookingRow(b);

      if (
        !latest.vehicleLoaded ||
        !latest.driverDataComplete
      ) {
        throw new Error(
          "Current allocation could not be verified. Refresh the booking.",
        );
      }

      const fresh = latest.vehicles.find(
        v => keyOf(v) === keyOf(vehicle),
      );

     const previousGroup = row.assigned.filter(
  a => groupOf(a.vehicle) === groupOf(vehicle),
);

const freshGroup = latest.assigned.filter(
  a => groupOf(a.vehicle) === groupOf(vehicle),
);

if (
  previousGroup.length > 1 ||
  freshGroup.length > 1
) {
  throw new Error(
    "Multiple vehicle assignments require individual allocation",
  );
}

const previousState = previousGroup[0];
const freshState = freshGroup[0];

   if (!fresh || !fresh.isAvailable) {
  throw new Error("Vehicle is no longer available");
}

  if (
  Boolean(previousState) !== Boolean(freshState) ||
  (
    previousState &&
    (
      !freshState?.verified ||
      keyOf(freshState.vehicle) !==
        keyOf(previousState.vehicle) ||
      (freshState.saved?.assignmentId || 0) !==
        (previousState.saved?.assignmentId || 0) ||
      (freshState.saved?.driverId || 0) !==
        (previousState.saved?.driverId || 0)
    )
  )
) {
  throw new Error(
    "Allocation has changed. Refresh before saving.",
  );
}

      const freshDrivers =
        await fetchAllocationDrivers(
          planId,
          fresh.vendorId,
          fresh.vehicleTypeId,
        );

      const driver = freshDrivers.find(
        d =>
          Number(d.id) === Number(selected.id) &&
          d.isAvailable,
      );

      if (!driver) {
        throw new Error("Driver is no longer available");
      }

     const arrivalDate = dateOnly(b.arrival_date);
const departureDate = dateOnly(b.departure_date);

if (
  !arrivalDate ||
  !departureDate ||
  arrivalDate > departureDate
) {
  throw new Error("Invalid itinerary travel dates");
}

      writeStarted = true;

      const result = await assignVehicle({
        itineraryPlanId: planId,
        vendor_id: fresh.vendorId,
        vehicle_type_id: fresh.vehicleTypeId,
        vehicle_id: fresh.vehicleId,
        driver_id: driver.id,
      });

if (result?.success !== true) {
  throw new Error(
    String(result?.message || "Assignment rejected"),
  );
}

notifyAssignmentChange(planId);

const assignmentId = Number(
        result?.driverAssignmentId ??
          result?.driver_assignment_id ??
          0,
      );

      if (!assignmentId) {
        throw new Error(
          "Server did not return a driver assignment ID",
        );
      }

expected = {
  vehicleKey: keyOf(fresh),
  driverId: Number(driver.driverId || driver.id),
  assignmentId,
};
    } catch (error) {
      if (writeStarted) {
        setWriteUncertain(true);
      }

      toast.error(errorMessage(error));
    } finally {
      try {
        const refreshed = await onReload(planId);

   if (expected) {
  const verified = refreshed.assigned.some(
    a =>
      a.verified &&
      keyOf(a.vehicle) === expected!.vehicleKey &&
      a.saved?.driverId === expected!.driverId &&
      a.saved?.assignmentId === expected!.assignmentId,
  );

  if (!verified) {
    throw new Error(
      "Saved assignment could not be verified. Refresh before retrying.",
    );
  }

  toast.success(
    "Vehicle and driver assigned successfully",
  );
}
      } catch {
        setWriteUncertain(true);

        toast.error(
          "Could not reload the saved allocation. Refresh before retrying.",
        );
      }

      setSaving(false);
      savingRef.current = false;
      onSavingChange(planId, false);
      setRetry(v => v + 1);
    }
  }

const shareReady =
  !!saved &&
  Number(saved.assignmentId) > 0 &&
  state?.verified &&
  !saving &&
  !writeUncertain &&
  Number(driverId) === savedId &&
  !locked;

const canSend =
  shareReady &&
  (
    method === "email" ||
    Boolean(saved?.mobile?.replace(/\D/g, ""))
  );

function openWhatsAppRecipients() {
  if (!saved || !shareReady) return;

  const expertNumbers = unique([
    row.dayView?.travel_expert_mobile || "",

    ...(row.dailyDays ?? []).map(
      day => day.travel_expert_mobile || "",
    ),
  ].map(normalizeWhatsAppMobile));

  const expertMobile =
    expertNumbers.length === 1
      ? `+${expertNumbers[0]}`
      : "";

  const expertName = unique([
    row.dayView?.travel_expert_name || "",

    ...(row.dailyDays ?? []).map(
      day => day.travel_expert_name || "",
    ),
  ])[0] || "";

  const contacts = [
    {
      role: "Driver",
      name: saved.name,
      mobile: saved.mobile || "",
    },
    {
      role: "Guest",
      name: b.primary_customer_name || "",
      mobile: b.primary_contact_no || "",
    },
    {
      role: "Agent",
      name: b.agent_name || "",
      mobile: b.agent_mobile || "",
    },
    {
      role: "Travel Expert",
      name: expertName,
      mobile: expertMobile,
    },
    {
      role: "Operations",
      name: b.operations_name || "DVI Holidays",
      mobile: b.operations_mobile || "",
    },
  ];

  setRecipients(
    contacts.map(contact => ({
      ...contact,

      mobile: formatWhatsAppMobile(
        contact.mobile,
      ),

      selected: Boolean(
        normalizeWhatsAppMobile(contact.mobile),
      ),
    })),
  );

  setRecipientIndex(0);

  whatsappDialogRef.current?.showModal();
}

function updateRecipient(
  index: number,
  patch: Partial<WhatsAppRecipient>,
) {
  setRecipients(previous =>
    previous.map((recipient, i) =>
      i === index
        ? { ...recipient, ...patch }
        : recipient,
    ),
  );

  setRecipientIndex(0);
}

const selectedRecipients = recipients.filter(
  recipient => recipient.selected,
);

const invalidRecipients = selectedRecipients.filter(
  recipient =>
    !normalizeWhatsAppMobile(recipient.mobile),
);

const nextRecipient =
  selectedRecipients[recipientIndex];
const cell = "px-4 py-4 align-top text-sm text-[#4a4260]";

const routeDetails = buildRouteDetails(row);
function createWhatsAppMessage(
  _recipient: WhatsAppRecipient,
) {
  if (!saved || !vehicle || !shareReady) {
    return "";
  }

  // =========================================
  // GUEST & TRAVEL DETAILS
  // =========================================

  const guestName =
    b.primary_customer_name?.trim() ||
    "Guest";

  const travelPartnerCompany =
    b.agent_name?.trim() &&
    b.agent_name.trim() !== "N/A"
      ? b.agent_name.trim()
      : b.operations_name?.trim() ||
        "DVI Holidays";

  const bookingReference =
    b.booking_quote_id || "Not available";

  const travelStartDate =
    displayDate(b.arrival_date);

  const travelEndDate =
    displayDate(b.departure_date);

  const travelDate =
    travelStartDate === travelEndDate
      ? travelStartDate
      : `${travelStartDate} - ${travelEndDate}`;

  const reportingTime =
    arrivalTime || "Time unavailable";

  const pickupLocation =
    b.arrival_location || "Not available";

  const dropLocation =
    b.departure_location || "Not available";

  // =========================================
  // DRIVER & VEHICLE DETAILS
  // =========================================

  const driverName =
    saved.name || "Not available";

  const driverNumber =
    normalizeWhatsAppMobile(saved.mobile || "");

  const driverMobile =
    driverNumber
      ? `+${driverNumber}`
      : "Not available";

  const vehicleType =
    vehicle.vehicleTypeTitle ||
    "Not available";

  const vehicleRegistration =
    vehicle.registrationNumber ||
    "Not available";

  // =========================================
  // ON-GROUND ASSISTANCE
  // =========================================

  const operationsNumber =
    normalizeWhatsAppMobile(
      b.operations_mobile || "",
    );

  const operationsContact =
    operationsNumber
      ? `+${operationsNumber}`
      : "Not available";

  const emergencyContact =
    "Not configured";

  const escalationContact =
    "Not configured";

  // =========================================
  // WHATSAPP MESSAGE TEMPLATE
  // =========================================

  const message = [
    `Dear ${guestName},`,
    "",
    `Greetings from ${travelPartnerCompany}!`,
    "",
    "We are pleased to share the assigned driver and vehicle details for your upcoming journey.",
    "",
    "*GUEST & TRAVEL DETAILS*",
    "",
    `▪️ Guest Name: ${guestName}`,
    `▪️ Booking Reference: ${bookingReference}`,
    `▪️ Travel Date: ${travelDate}`,
    `▪️ Reporting Time: ${reportingTime}`,
    `▪️ Pickup Location: ${pickupLocation}`,
    `▪️ Drop Location: ${dropLocation}`,
    "",
    "*DRIVER & VEHICLE DETAILS*",
    "",
    `▪️ Driver Name: ${driverName}`,
    `▪️ Driver Contact: ${driverMobile}`,
    `▪️ Vehicle Type: ${vehicleType}`,
    `▪️ Vehicle Registration No.: ${vehicleRegistration}`,
    "",
    "*ON-GROUND ASSISTANCE*",
    "",
    `▪️ Operations Support: ${operationsContact}`,
    `▪️ Emergency Assistance: ${emergencyContact}`,
    `▪️ Escalation Contact: ${escalationContact}`,
    "",
    "*IMPORTANT GUIDELINES*",
    "",
    "Please inform our operations team of any flight delays or changes to your arrival or pickup schedule.",
    "",
    "For any service-related concerns or additional assistance during your journey, kindly contact our operations team.",
    "",
    "In the event of any operational changes to the assigned driver or vehicle, revised details will be communicated to you.",
    "",
    "We wish you a safe, comfortable and memorable journey!",
  ];

  return message.join("\n");
}

function getRecipientWhatsAppUrl(
  recipient: WhatsAppRecipient,
) {
  const mobile = normalizeWhatsAppMobile(
    recipient.mobile,
  );

  const message = createWhatsAppMessage(recipient);

  if (!mobile || !message) return "";

  return `https://wa.me/${mobile}?text=${encodeURIComponent(
    message,
  )}`;
}
const arrivalDay = row.itineraryDays?.find(
  day =>
    dateOnly(day.date) === dateOnly(b.arrival_date)
);

const departureDay = row.itineraryDays?.find(
  day =>
    dateOnly(day.date) === dateOnly(b.departure_date)
);

const actualArrivalTime = displayTripTime(
  arrivalDay?.startTime
);

const actualDepartureTime = displayTripTime(
  departureDay?.departureTime
);

const arrivalTime =
  actualArrivalTime !== "Time unavailable"
    ? actualArrivalTime
    : displayTripTime(row.dayView?.trip_start_time);

const departureTime =
  actualDepartureTime !== "Time unavailable"
    ? actualDepartureTime
    : displayTripTime(row.dayView?.trip_end_time);

return (
    <tr className="border-b border-[#eeeaf2] hover:bg-[#fdfbff]">

      {/* 1. BOOKING ID */}

      <td className={cell}>
   <Link
  className="whitespace-nowrap font-semibold text-[#d546ab] hover:underline"
  to={`/itinerary-details/${encodeURIComponent(b.booking_quote_id)}`}
>
  {b.booking_quote_id}
</Link>

        <div className="mt-1 text-xs text-[#817889]">
          {b.primary_customer_name}
        </div>

        {!historical && (
          <Link
            className="mt-1 inline-block text-xs text-[#6f3cc3] hover:underline"
            to={`/transport-allocation?planId=${planId}&view=review`}
          >
            Review itinerary
          </Link>
        )}
      </td>

{/* 2. ARRIVAL */}

<td className={`${cell} min-w-[150px]`}>
  <div className="space-y-1">
    <div className="font-semibold leading-snug text-[#4a4260]">
      {b.arrival_location || "Arrival location unavailable"}
    </div>

    <div className="whitespace-nowrap text-sm text-[#62596d]">
      {displayDate(b.arrival_date)}
    </div>

   <div className="text-xs font-medium text-[#6f3cc3]">
  {arrivalTime}
</div>
  </div>
</td>

{/* 3. DEPARTURE */}

<td className={`${cell} min-w-[150px]`}>
  <div className="space-y-1">
    <div className="font-semibold leading-snug text-[#4a4260]">
      {b.departure_location || "Departure location unavailable"}
    </div>

    <div className="whitespace-nowrap text-sm text-[#62596d]">
      {displayDate(b.departure_date)}
    </div>

    <div className="text-xs font-medium text-[#6f3cc3]">
  {departureTime}
</div>
  </div>
</td>

{/* 4. ROUTE DETAILS */}

<td className={`${cell} min-w-[230px]`}>
  {routeDetails.length > 0 ? (
    <div className="space-y-1.5">

      {routeDetails.map(item => (
      <div
  key={item.date || "trip-duration"}
  title={
    item.date
      ? displayDate(item.date)
      : "Total itinerary duration"
  }
  className="flex items-start gap-1.5 text-sm leading-snug"
>
          <span className="font-medium text-[#4a4260]">
            {item.route}

            {item.label && (
              <span
                className={`ml-1 whitespace-nowrap font-semibold ${
                  item.label === "Dept."
                    ? "text-emerald-600"
                    : "text-[#6f3cc3]"
                }`}
              >
                - {item.label}
              </span>
            )}
          </span>
        </div>
      ))}

    </div>
  ) : (
    <div className="space-y-1">
      <div className="text-sm leading-snug">
        {row.locations.join(" → ") ||
          "Route unavailable"}
      </div>

      <div className="text-xs text-[#817889]">
        Day-wise details unavailable
      </div>
    </div>
  )}
</td>

      {/* 5. VEHICLE NAME */}

      <td className={`${cell} min-w-[200px]`}>
     <div
  className="h-5 truncate text-sm font-medium leading-5"
  title={row.vehicleNames.join(", ")}
>
  {row.vehicleNames.length
    ? row.vehicleNames.join(", ")
    : "Booked vehicle type unavailable"}
</div>

{!row.vehicleNames.length &&
  row.vehicles.length > 0 && (
    <div className="mt-1 text-xs text-[#817889]">
      Available fleet types:{" "}
      {unique(
        row.vehicles.map(v => v.vehicleTypeTitle),
      ).join(", ")}
    </div>
  )}

<select
  className={`${control} mt-2 !pl-2 !pr-6 !text-xs`}
  title={vehicle ? vehicleLabel(vehicle) : "Select vehicle"}
  aria-label={`Vehicle for ${b.booking_quote_id}`}
  value={vehicleKey}
onChange={e => {
  const nextVehicleKey = e.target.value;

  if (nextVehicleKey) {
    void updateSelectedVehicle(nextVehicleKey);
  }
}}
disabled={
  saving ||
  locked ||
  !row.vehicleLoaded ||
  !row.driverDataComplete ||
  writeUncertain ||
  historical ||
  options.length === 0
}
>
<option value="">
  {!row.vehicleLoaded
    ? "Unable to load vehicles"
    : !options.some(v => v.isAvailable)
      ? "No available vehicles"
      : "Select vehicle"}
</option>
  {options.map(v => (
    <option
      key={keyOf(v)}
      value={keyOf(v)}
   disabled={!v.isAvailable}
    >
   {v.registrationNumber || "Registration unavailable"}
{v.vendorName ? ` · ${v.vendorName}` : ""}
{v.isAssignedToCurrent
  ? v.isAvailable
    ? " (Assigned)"
    : " (Assigned — needs attention)"
  : v.isAvailable
    ? " (Available)"
    : " (Unavailable)"}
    </option>
  ))}
</select>

{row.vehicleLoaded &&
  row.vehicles.length > 0 &&
  !options.some(
    v =>
      v.isAvailable &&
      !v.isAssignedToCurrent,
  ) && (
    <div className="mt-1 space-y-0.5 text-[11px] text-slate-500">
      {row.assigned.length > 0
        ? "No eligible replacement vehicle"
        : "No available vehicle for this trip"}

      {row.vehicles.some(
        v =>
          !v.isAvailable &&
          v.availability === "on_trip",
      ) && (
        <div>
          Matching vehicle has an overlapping trip
        </div>
      )}

      {row.vehicles.some(
        v =>
          !v.isAvailable &&
          (
            v.availability === "maintenance" ||
            v.availability === "reserved" ||
            v.availability === "blocked"
          ),
      ) && (
        <div>
          Matching vehicle has an availability restriction
        </div>
      )}
    </div>
  )}

{row.warnings.map((w, i) => (
          <p
            key={i}
            className="mt-1 text-xs text-amber-700"
          >
            {w}
          </p>
        ))}
      </td>

      {/* 6. CHOOSE DRIVER */}

    <td className={`${cell} min-w-[230px]`}>
  <div className="mt-7 flex items-center gap-2">
    <select
      className={`${control} !pl-2 !text-xs`}
      aria-label={`Driver for ${b.booking_quote_id}`}
            value={driverId}
            disabled={
              !canEdit ||
              !vehicle ||
              saving ||
              driverState.loading ||
              driverState.error ||
              driverState.key !== activeKey
            }
onChange={e => {
  const nextDriverId = e.target.value;

  if (!nextDriverId) {
    void unassignSelectedDriver();
    return;
  }

  void save(nextDriverId);
}}
          >
            <option value="">
  {!vehicle
    ? "Select vehicle first"
    : driverState.loading
      ? "Loading drivers…"
      : driverState.error
        ? "Unable to load drivers"
        : !driverOptions.length
          ? "No available drivers"
          : "Select driver"}
</option>

            {saved &&
              !driverOptions.some(
                d =>
                  Number(d.id) === savedId ||
                  Number(d.driverId) === savedId,
              ) && (
            <option value={String(savedId)}>
  {saved.name}
  {saved.mobile
    ? ` - ${saved.mobile}`
    : " - No mobile number"}
</option>
              )}

{driverOptions.map(d => (
  <option
    key={d.id}
    value={String(d.driverId || d.id)}
    disabled={!d.isAvailable}
  >
{d.name ||
  d.label ||
  `Driver #${d.id}`}

{d.mobile
  ? ` - ${d.mobile}`
  : " - No mobile number"}
  </option>
))}
          </select>

        </div>

        <p
          className={`mt-1 text-xs ${
            saved
              ? "text-emerald-700"
              : "text-[#817889]"
          }`}
        >
{saving
  ? "Assigning driver…"
  : saved
    ? `Assigned: ${saved.name}`
    : row.recordedDrivers.length
      ? `Recorded: ${row.recordedDrivers.join(", ")} (unverified)`
      : !row.driverDataComplete
        ? "Assignment unverified"
        : "Not assigned"}
      </p>

{saved && !saving && (
  <div className="mt-1 flex items-center gap-1 text-xs font-medium text-[#62596d]">
    <span>
      Mobile: {saved.mobile || "Not available"}
    </span>
  </div>
)}

{driverState.error && (
          <button
            type="button"
            className="mt-1 text-xs text-[#6f3cc3] underline"
            onClick={() => setRetry(v => v + 1)}
          >
            Retry driver lookup
          </button>
        )}

        {writeUncertain && (
          <p className="text-xs text-amber-700">
            Refresh the table before retrying an uncertain save.
          </p>
        )}
      </td>

 {/* 7. SHARE */}

<td className={`${cell} min-w-[150px]`}>
  <div className="flex flex-col items-center gap-2">

    {/* SHARE METHOD DROPDOWN */}

    <div
      className={`relative w-full min-w-[135px] ${
        !shareReady
          ? "text-gray-400"
          : method === "whatsapp"
            ? "text-emerald-700"
            : "text-[#6f3cc3]"
      }`}
    >
      <div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2">

        {method === "whatsapp" ? (
          <MessageCircle className="h-4 w-4" />
        ) : method === "email" ? (
          <Mail className="h-4 w-4" />
        ) : (
          <MessageSquare className="h-4 w-4" />
        )}

      </div>

      <select
        className={`h-9 w-full cursor-pointer appearance-none rounded-lg border pl-8 pr-7 text-xs font-medium outline-none transition-colors focus:ring-2 ${
          !shareReady
            ? "border-gray-200 bg-gray-50 text-gray-400"
            : method === "whatsapp"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400 focus:ring-emerald-100"
              : "border-[#ddd0f3] bg-[#faf7ff] text-[#6f3cc3] hover:border-[#a78bda] focus:ring-[#ede5fa]"
        } disabled:cursor-not-allowed`}
        aria-label={`Share method for ${b.booking_quote_id}`}
        value={method}
        onChange={e => setMethod(e.target.value)}
        disabled={!shareReady}
      >
        <option value="whatsapp">WhatsApp</option>
        <option value="email">Email</option>
        <option value="sms">SMS</option>
      </select>

      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />

    </div>

    {/* COMPACT SHARE BUTTON */}

    <button
      type="button"
      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-[#9b75d7] bg-[#faf7ff] px-3 text-xs font-semibold text-[#6f3cc3] transition-colors hover:border-[#6f3cc3] hover:bg-[#6f3cc3] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9b75d7] disabled:cursor-not-allowed disabled:border-[#e0d6ee] disabled:bg-[#faf8fc] disabled:text-[#b4a0cf]"
     disabled={
  method === "whatsapp"
    ? !shareReady
    : !canSend
}
onClick={() => {
  if (method === "whatsapp") {
    openWhatsAppRecipients();
    return;
  }

  if (saved && canSend) {
    shareSaved(b, saved, method);
  }
}}
    >
       <Share2 className="h-3.5 w-3.5" />
      Share
    </button>

  </div>

  <dialog
    ref={whatsappDialogRef}
    className="fixed inset-0 m-auto w-[calc(100%-24px)] max-w-[560px] rounded-2xl border border-[#e4deeb] bg-white p-0 text-left shadow-xl backdrop:bg-black/40"
  >
    <div className="max-h-[85vh] overflow-y-auto p-5">

      {/* POPUP HEADER */}

      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <MessageCircle className="h-6 w-6" />
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold text-[#4a4260]">
            Share via WhatsApp
          </h3>

          <p className="text-xs text-[#817889]">
            Booking ID: {b.booking_quote_id}
          </p>
        </div>

        <button
          type="button"
          aria-label="Close WhatsApp sharing"
          className="rounded-md px-3 py-1 text-xl text-gray-500 hover:bg-gray-100"
          onClick={() =>
            whatsappDialogRef.current?.close()
          }
        >
          ×
        </button>
      </div>

      {/* SELECT ALL */}

      <div className="mt-5 flex items-center justify-between border-y border-[#eeeaf2] py-3">
        <span className="text-sm font-semibold text-[#4a4260]">
          Choose recipients
        </span>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-[#6f3cc3]">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[#6f3cc3]"
            checked={
              recipients.length > 0 &&
              recipients.every(r => r.selected)
            }
            onChange={e => {
              const checked = e.target.checked;

              setRecipients(previous =>
                previous.map(r => ({
                  ...r,
                  selected: checked,
                })),
              );

              setRecipientIndex(0);
            }}
          />
          Select all
        </label>
      </div>

      {/* FIVE RECIPIENTS */}

      <div className="space-y-2 py-3">
        {recipients.map((recipient, index) => (
          <div
            key={recipient.role}
            className={`rounded-xl border p-3 transition-colors ${
              recipient.selected
                ? "border-emerald-200 bg-emerald-50/40"
                : "border-[#e9e4ef] bg-white"
            }`}
          >
            <div className="flex items-center gap-3">

              <input
                type="checkbox"
                aria-label={`Select ${recipient.role}`}
                className="h-4 w-4 shrink-0 accent-emerald-600"
                checked={recipient.selected}
                onChange={e =>
                  updateRecipient(index, {
                    selected: e.target.checked,
                  })
                }
              />

              <div className="w-[110px] shrink-0">
                <p className="text-sm font-semibold text-[#4a4260]">
                  {recipient.role}
                </p>

                {recipient.name && (
                  <p className="truncate text-xs text-[#817889]">
                    {recipient.name}
                  </p>
                )}
              </div>

              <input
                type="tel"
                aria-label={`${recipient.role} mobile number`}
                placeholder="Enter mobile number"
              value={recipient.mobile}

onChange={e =>
  updateRecipient(index, {
    mobile: e.target.value,
  })
}

onBlur={e => {
  const formatted = formatWhatsAppMobile(
    e.target.value,
  );

  if (formatted !== recipient.mobile) {
    updateRecipient(index, {
      mobile: formatted,
    });
  }
}}
                className="h-9 min-w-0 flex-1 rounded-lg border border-[#e4deeb] bg-white px-3 text-sm text-[#4a4260] outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />

            </div>

            {recipient.selected &&
              !normalizeWhatsAppMobile(
                recipient.mobile,
              ) && (
                <p className="ml-7 mt-1 text-xs text-amber-700">
                  Enter a valid mobile number
                </p>
              )}
          </div>
        ))}
      </div>

      {/* RECIPIENT COUNT */}

      <div className="mt-2 text-sm text-[#62596d]">
        {selectedRecipients.length} of{" "}
        {recipients.length} recipients selected
      </div>

      {invalidRecipients.length > 0 && (
        <p className="mt-2 text-xs text-amber-700">
          Enter valid numbers for all selected
          recipients before continuing.
        </p>
      )}

      {/* WHATSAPP SHARE ACTION */}

      {nextRecipient &&
      !invalidRecipients.length &&
      shareReady ? (
        <a
          href={
            getRecipientWhatsAppUrl(nextRecipient)
          }
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            setRecipientIndex(
              previous => previous + 1,
            );
          }}
          className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <MessageCircle className="h-4 w-4" />

          Open WhatsApp — {nextRecipient.role}

          ({recipientIndex + 1}/
          {selectedRecipients.length})
        </a>
      ) : (
        <button
          type="button"
          disabled
          className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gray-200 text-sm font-medium text-gray-500"
        >
          <MessageCircle className="h-4 w-4" />

          {selectedRecipients.length > 0 &&
          recipientIndex >= selectedRecipients.length
            ? "All selected chat links opened"
            : "Select recipients and enter numbers"}
        </button>
      )}

      <p className="mt-3 text-center text-xs leading-relaxed text-[#817889]">
        Review the message and press Send inside
        WhatsApp. Return here to open the next chat.
      </p>

      {recipientIndex > 0 && (
        <button
          type="button"
          className="mt-2 w-full text-center text-xs font-medium text-[#6f3cc3] hover:underline"
          onClick={() =>
            setRecipientIndex(0)
          }
        >
          Restart selected recipients
        </button>
      )}

    </div>
  </dialog>

</td>
    </tr>
  );
}

// ===========================================
// MAIN TRANSPORT ALLOCATION TABLE
// ===========================================

export default function TransportAllocationTable() {
  const [params] = useSearchParams();

  const requestedPlan = Number(
    params.get("planId") || 0,
  );

  const [rows, setRows] = useState<BookingRow[]>([]);

  const [draft, setDraft] =
    useState<Filters>(emptyFilters);

  const [filters, setFilters] =
    useState<Filters>(emptyFilters);

  const [page, setPage] = useState(1);
const [size, setSize] = useState(25);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

const [version, setVersion] = useState(0);

const pendingAssignmentRefresh =
  useRef(new Set<number | null>());

const [
  assignmentRefreshVersion,
  setAssignmentRefreshVersion,
] = useState(0);

  const [progress, setProgress] = useState({
    done: 0,
    total: 0,
  });

  const [busyRows, setBusyRows] =
    useState<number[]>([]);

  const busyRef = useRef<number | null>(null);

  const lastRequested = useRef<number | null>(null);

  const [unknownCount, setUnknownCount] = useState(0);

  const busy = busyRows.length > 0;
const queueAssignmentRefresh = useCallback(
  (
    planId: number | null,
    includeChanged: boolean,
  ) => {
    const changed = rows.find(
      row =>
        Number(row.booking.itinerary_plan_ID) === planId,
    );

    if (!changed) {
      pendingAssignmentRefresh.current.add(null);
    } else {
      const start = dateOnly(
        changed.booking.arrival_date,
      );

      const end = dateOnly(
        changed.booking.departure_date,
      );

      for (const row of rows) {
        const id = Number(
          row.booking.itinerary_plan_ID,
        );

        if (id === planId) {
          if (includeChanged) {
            pendingAssignmentRefresh.current.add(id);
          }

          continue;
        }

        const rowStart = dateOnly(
          row.booking.arrival_date,
        );

        const rowEnd = dateOnly(
          row.booking.departure_date,
        );

        const overlaps =
          !start ||
          !end ||
          start > end ||
          !rowStart ||
          !rowEnd ||
          rowStart > rowEnd ||
          (
            rowStart <= end &&
            rowEnd >= start
          );

        if (overlaps) {
          pendingAssignmentRefresh.current.add(id);
        }
      }
    }

    if (pendingAssignmentRefresh.current.size) {
      setAssignmentRefreshVersion(
        value => value + 1,
      );
    }
  },
  [rows],
);

useEffect(() => {
  const handleStorage = (event: StorageEvent) => {
    if (
      event.key !==
        "dvi:transport-assignment-changed" ||
      !event.newValue
    ) {
      return;
    }

    let planId: number | null = null;

    try {
      const payload = JSON.parse(event.newValue);

      const id = Number(
        payload?.itineraryPlanId,
      );

      if (Number.isSafeInteger(id) && id > 0) {
        planId = id;
      }
    } catch {
      // Older notifications may not include a booking ID.
    }

    queueAssignmentRefresh(planId, true);
  };

  window.addEventListener(
    "storage",
    handleStorage,
  );

  return () => {
    window.removeEventListener(
      "storage",
      handleStorage,
    );
  };
}, [queueAssignmentRefresh]);

useEffect(() => {
  if (
    loading ||
    busy ||
    !pendingAssignmentRefresh.current.size
  ) {
    return;
  }

  const pending = new Set(
    pendingAssignmentRefresh.current,
  );

  pendingAssignmentRefresh.current.clear();

  const affected = rows.filter(
    row =>
      pending.has(null) ||
      pending.has(
        Number(row.booking.itinerary_plan_ID),
      ),
  );

  if (!affected.length) return;

  let active = true;
  let committed = false;

  async function refreshAffectedRows() {
    let cursor = 0;

    const updates =
      new Map<number, BookingRow>();

    await Promise.all(
      Array.from(
        {
          length: Math.min(
            4,
            affected.length,
          ),
        },
        async () => {
          while (
            active &&
            cursor < affected.length
          ) {
            const row = affected[cursor++];

            const id = Number(
              row.booking.itinerary_plan_ID,
            );

            try {
              const fresh =
                await readBookingRow(row.booking);

              updates.set(id, fresh);
            } catch {
              updates.set(id, {
                ...row,

                vehicleLoaded: false,
                driverDataComplete: false,

                warnings: unique([
                  ...row.warnings,
                  "Availability refresh failed. Use Refresh to retry.",
                ]),
              });
            }
          }
        },
      ),
    );

    if (
      !active ||
      busyRef.current !== null
    ) {
      return;
    }

    committed = true;

    setRows(previous =>
      previous.map(
        row =>
          updates.get(
            Number(
              row.booking.itinerary_plan_ID,
            ),
          ) ?? row,
      ),
    );
  }

  void refreshAffectedRows();

  return () => {
    active = false;

    if (!committed) {
      for (const id of pending) {
        pendingAssignmentRefresh.current.add(id);
      }
    }
  };
}, [
  assignmentRefreshVersion,
  busy,
  loading,
  rows,
]);
  // Fetch all eligible confirmed bookings.

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");
    setProgress({ done: 0, total: 0 });
    setRows([]);
    setPage(1);

    (async () => {
      try {
        const bookings =
          await loadAllAllocationBookings(count => {
            if (active) {
              setUnknownCount(count);
            }
          });

        if (!active) return;

        const target = bookings.find(
          b => Number(b.itinerary_plan_ID) === requestedPlan,
        );

        if (
          lastRequested.current !== requestedPlan
        ) {
          lastRequested.current = requestedPlan;

          const f = target
            ? {
                ...emptyFilters,
                booking: target.booking_quote_id,
              }
            : emptyFilters;

          setDraft(f);
          setFilters(f);
        }

        setProgress({
          done: 0,
          total: bookings.length,
        });

        const result: BookingRow[] =
          new Array(bookings.length);

        let cursor = 0;
        let done = 0;

        await Promise.all(
          Array.from(
            {
              length: Math.min(4, bookings.length),
            },
            async () => {
              while (
                active &&
                cursor < bookings.length
              ) {
                const i = cursor++;

                result[i] = await readBookingRow(
                  bookings[i],
                );

                if (active) {
                  setProgress({
                    done: ++done,
                    total: bookings.length,
                  });
                }
              }
            },
          ),
        );

        if (active) {
          setRows(result);
        }
      } catch (e) {
        if (active) {
          setError(errorMessage(e));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [version, requestedPlan]);

  // Filter before pagination.

  const filtered = useMemo(
    () =>
      rows.filter(r =>
        matchesAllocationFilters(r, filters),
      ),
    [rows, filters],
  );

  const maxPage = Math.max(
    1,
    Math.ceil(filtered.length / size),
  );

  const current = Math.min(page, maxPage);

  const offset = (current - 1) * size;

  const partial = rows.filter(
    r => r.warnings.length > 0,
  ).length;

  const locations = useMemo(
    () => unique(rows.flatMap(r => r.locations)).sort(),
    [rows],
  );

  const vehicles = useMemo(
    () => unique(rows.flatMap(r => r.vehicleNames)).sort(),
    [rows],
  );

  const drivers = useMemo(
    () => unique(rows.flatMap(savedNames)).sort(),
    [rows],
  );

  const choices = (
    all: string,
    values: string[],
  ) => [
    { value: "", label: all },

    ...values.map(v => ({
      value: v,
      label: v,
    })),
  ];

  const change = (
    name: keyof Filters,
    value: string,
  ) =>
    setDraft(f => ({
      ...f,
      [name]: value,
    }));

  const changeBusy = (
    id: number,
    value: boolean,
  ) => {
    if (value) {
      if (busyRef.current !== null) {
        return false;
      }

      busyRef.current = id;
      setBusyRows([id]);
    } else if (busyRef.current === id) {
      busyRef.current = null;
      setBusyRows([]);
    }

    return true;
  };

 async function reloadRow(id: number) {
  const booking = rows.find(
    row =>
      Number(row.booking.itinerary_plan_ID) === id,
  )?.booking;

  if (!booking) {
    throw new Error(
      "Booking no longer exists in the table",
    );
  }

  const fresh = await readBookingRow(booking);

  setRows(previous =>
    previous.map(row =>
      Number(row.booking.itinerary_plan_ID) === id
        ? fresh
        : row,
    ),
  );

  if (
    !fresh.vehicleLoaded ||
    !fresh.driverDataComplete
  ) {
    throw new Error(
      "Saved allocation could not be verified",
    );
  }

  // The current booking has already been updated.
  // Refresh only other affected bookings in the background.
  queueAssignmentRefresh(id, false);

  return fresh;
}

  return (
    <div className="w-full max-w-full space-y-5 pb-8">

      {/* PAGE TITLE */}

      <div>
        <h2 className="text-xl font-semibold text-[#6535bd]">
          Transport Allocation &amp; Driver Itinerary
        </h2>

        <p className="mt-1 text-sm text-[#777080]">
          Find confirmed bookings, assign drivers and share their itineraries.
        </p>
      </div>

      {/* SIX BOOKING FILTERS */}

      <form
        className="rounded-xl border border-[#e9e4ef] bg-white p-5 shadow-sm"
        onSubmit={e => {
          e.preventDefault();
          setFilters({ ...draft });
          setPage(1);
        }}
      >
        <h3 className="mb-4 text-base font-semibold text-[#4a4260]">
          Booking Filters
        </h3>

        <fieldset
          disabled={loading || busy || !!error}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >

{/* FILTER 1 — LOCATION */}

<SelectField
  label="Location"
  value={draft.location}
  onChange={v => change("location", v)}
  options={choices(
    "All locations",
    locations,
  )}
/>

{/* FILTER 2 — BOOKING ID */}

<label className="block">
  <span className="mb-1.5 block text-sm font-medium text-[#62596d]">
    Booking ID
  </span>

  <input
    className={control}
    placeholder="Enter booking ID"
    value={draft.booking}
    onChange={e =>
      change("booking", e.target.value)
    }
  />
</label>

          {/* FILTER 3 */}

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#62596d]">
              Arrival Date
            </span>

            <input
              className={control}
              type="date"
              value={draft.arrival}
              onChange={e =>
                change("arrival", e.target.value)
              }
            />
          </label>

          {/* FILTER 4 */}

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#62596d]">
              Departure Date
            </span>

            <input
              className={control}
              type="date"
              value={draft.departure}
              onChange={e =>
                change("departure", e.target.value)
              }
            />
          </label>

          {/* FILTER 5 */}

          <SelectField
            label="Vehicle Name"
            value={draft.vehicle}
            onChange={v => change("vehicle", v)}
            options={choices(
              "All vehicles",
              vehicles,
            )}
          />

          {/* FILTER 6 */}

          <SelectField
            label="Driver / Assignment"
            value={draft.driver}
            onChange={v => change("driver", v)}
            options={[
              {
                value: "",
                label: "All drivers",
              },
              {
                value: "__assigned",
                label: "Assigned",
              },
              {
                value: "__unassigned",
                label: "Not assigned",
              },

              ...drivers.map(v => ({
                value: v,
                label: v,
              })),
            ]}
          />
        </fieldset>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            disabled={loading || busy}
            className={outline}
            onClick={() => {
              setDraft(emptyFilters);
              setFilters(emptyFilters);
              setPage(1);
            }}
          >
            Reset
          </button>

          <button
            type="submit"
            disabled={loading || busy || !!error}
            className={primary}
          >
            Apply Filters
          </button>
        </div>
      </form>

      {/* CONFIRMED BOOKING TABLE */}

      <section className="rounded-xl border border-[#e9e4ef] bg-white p-5 shadow-sm">

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">

          <h3 className="text-base font-semibold text-[#4a4260]">
            Confirmed Vehicle Bookings

            <span className="ml-2 text-sm font-normal text-[#817889]">
              {filtered.length} bookings
            </span>
          </h3>

          <div className="flex items-center gap-2">

            <label className="flex items-center gap-2 text-sm text-[#62596d]">
              Show

              <select
                className={`${control} w-20`}
                value={size}
                disabled={loading || busy}
                onChange={e => {
                  setSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                {[10, 25, 50, 100].map(n => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>

            <button
              type="button"
              disabled={loading || busy}
              className={outline}
              onClick={() => setVersion(v => v + 1)}
            >
              Refresh
            </button>
          </div>
        </div>

        {unknownCount > 0 && (
          <p
            role="status"
            className="mb-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800"
          >
            {unknownCount} booking(s) have no recognised
            itinerary preference and could not be classified safely.
          </p>
        )}

        {partial > 0 && (
          <p
            role="status"
            className="mb-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800"
          >
            {partial} booking(s) have incomplete API details.
            Some location, vehicle or driver filter results
            may be incomplete. Refresh to retry.
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">

            <thead className="border-b bg-[#faf8fc]">
              <tr>
         {[
  "Booking ID",
  "Arrival",
  "Departure",
  "Route Details",
  "Vehicle Name",
  "Choose Driver",
  "Share",
].map(h => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#746b7f]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-10 text-center text-sm text-[#817889]"
                  >
                    Loading confirmed bookings…

                    {progress.total
                      ? ` ${progress.done} / ${progress.total}`
                      : ""}
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-10 text-center text-sm text-red-700"
                  >
                    {error} — use Refresh to retry.
                  </td>
                </tr>
              ) : !filtered.length ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-10 text-center text-sm text-[#817889]"
                  >
                    No confirmed vehicle bookings match these filters.
                  </td>
                </tr>
              ) : (
                filtered
                  .slice(offset, offset + size)
                  .map(row => (
                    <AllocationRow
                      key={`${version}:${row.booking.itinerary_plan_ID}`}
                      row={row}
                      onReload={reloadRow}
                      onSavingChange={changeBusy}
                      locked={
                        busy &&
                        !busyRows.includes(
                          Number(row.booking.itinerary_plan_ID),
                        )
                      }
                    />
                  ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[#817889]">

          <span>
            {filtered.length
              ? `Showing ${offset + 1} to ${Math.min(
                  offset + size,
                  filtered.length,
                )} of ${filtered.length} entries`
              : "Showing 0 entries"}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className={outline}
              aria-label="Previous page"
              disabled={
                current <= 1 ||
                busy ||
                loading
              }
              onClick={() => setPage(current - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {Array.from(
              {
                length: Math.min(5, maxPage),
              },
              (_, i) =>
                Math.max(
                  1,
                  Math.min(current - 2, maxPage - 4),
                ) + i,
            ).map(n => (
              <button
                key={n}
                type="button"
                className={
                  n === current
                    ? "rounded-md bg-[#d546ab] px-3 py-2 text-white"
                    : outline
                }
                aria-current={
                  n === current ? "page" : undefined
                }
                disabled={busy || loading}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ))}

            <button
              type="button"
              className={outline}
              aria-label="Next page"
              disabled={
                current >= maxPage ||
                busy ||
                loading
              }
              onClick={() => setPage(current + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </button>

          </div>
        </div>
      </section>
    </div>
  );
}