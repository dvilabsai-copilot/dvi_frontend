import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Loader2,
  Search,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  hasHotelAdminPermission,
  HotelAdminAPI,
  type HotelAdminContext,
} from "@/services/hotelAdminService";

type RawRecord =
  Record<string, unknown>;

type BookingRow = {
  key: string;
  itineraryPlanId: number | null;
  itineraryCode: string;
  itineraryRouteId: number | null;
  dayStay: number | null;
  city: string;
  hotel: string;
  checkIn: string;
  checkOut: string;
  rooms: string;
  sourceType: string;
  provider: string;
  amount: string;
  currency: string;
  status: string;
};

type BookingGroup = {
  key: string;
  itineraryPlanId: number | null;
  itineraryCode: string;
  rows: BookingRow[];
};

function recordValue(
  value: unknown,
): RawRecord | null {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? (value as RawRecord)
    : null;
}

function stringValue(
  ...values: unknown[]
): string {
  for (const value of values) {
    if (
      value !== null &&
      value !== undefined &&
      String(value).trim()
    ) {
      return String(value).trim();
    }
  }

  return "";
}

function rowsFromResponse(
  value: unknown,
): RawRecord[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is RawRecord =>
        Boolean(recordValue(item)),
    );
  }

  const object =
    recordValue(value);

  if (!object) {
    return [];
  }

  for (const key of [
    "items",
    "rows",
    "data",
    "bookings",
  ]) {
    const candidate =
      object[key];

    if (Array.isArray(candidate)) {
      return candidate.filter(
        (item): item is RawRecord =>
          Boolean(recordValue(item)),
      );
    }
  }

  return [];
}

function formatAmount(
  value: unknown,
): string {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "-";
  }

  const numeric =
    Number(value);

  if (Number.isFinite(numeric)) {
    return numeric.toLocaleString(
      "en-IN",
      {
        maximumFractionDigits: 2,
      },
    );
  }

  return String(value);
}

function formatDate(
  value: unknown,
): string {
  const raw =
    stringValue(value);

  if (!raw) {
    return "-";
  }

  const match =
    raw.match(
      /^(\d{4})-(\d{2})-(\d{2})/,
    );

  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }

  return raw;
}

function normalizeBooking(
  raw: RawRecord,
  index: number,
): BookingRow {
  const planIdValue =
    Number(
      raw.itineraryPlanId ??
      raw.itinerary_plan_id,
    );

  const itineraryPlanId =
    Number.isInteger(planIdValue) &&
    planIdValue > 0
      ? planIdValue
      : null;

  const routeIdValue =
    Number(
      raw.itineraryRouteId ??
      raw.itinerary_route_id ??
      raw.routeId,
    );

  const itineraryRouteId =
    Number.isInteger(routeIdValue) &&
    routeIdValue > 0
      ? routeIdValue
      : null;

  const dayValue =
    Number(
      raw.dayStay ??
      raw.itineraryDayNo ??
      raw.itinerary_day_no,
    );

  const dayStay =
    Number.isInteger(dayValue) &&
    dayValue > 0
      ? dayValue
      : null;

  const itineraryCode =
    stringValue(
      raw.itineraryCode,
      raw.reference,
      raw.itinerary_quote_ID,
      raw.itinerary_quote_id,
      raw.itinerary_code,
      itineraryPlanId,
    ) || `Itinerary ${index + 1}`;

  const provider =
    stringValue(
      raw.provider,
      raw.hotel_provider,
    ) || "-";

  const bookingMode =
    stringValue(
      raw.bookingMode,
      raw.hotel_booking_mode,
    );

  const sourceType =
    stringValue(
      raw.sourceType,
      raw.source_type,
    ) ||
    (
      provider.toLowerCase() ===
        "offline" ||
      bookingMode.toUpperCase() ===
        "MANUAL_APPROVAL"
        ? "Offline"
        : "Online"
    );

  const statusRaw =
    stringValue(
      raw.status,
      raw.status_label,
      raw.booking_status,
    );

  const status =
    statusRaw === "1"
      ? "Active"
      : statusRaw === "0"
        ? "Inactive"
        : statusRaw || "-";

  return {
    key:
      stringValue(
        raw.bookingId,
        raw.selectionId,
        raw.confirmed_itinerary_plan_hotel_details_ID,
        `${itineraryCode}-${itineraryRouteId ?? index}`,
      ),

    itineraryPlanId,
    itineraryCode,
    itineraryRouteId,
    dayStay,

    city:
      stringValue(
        raw.routeLocation,
        raw.itinerary_route_location,
        raw.city,
        raw.location_name,
      ) || "-",

    hotel:
      stringValue(
        raw.hotel_name,
        raw.hotelName,
        raw.hotelCode,
        raw.hotel_code,
      ) || "-",

    checkIn:
      formatDate(
        raw.checkIn ??
        raw.hotel_check_in_date,
      ),

    checkOut:
      formatDate(
        raw.checkOut ??
        raw.hotel_check_out_date,
      ),

    rooms:
      stringValue(
        raw.rooms,
        raw.roomQuantity,
        raw.total_no_of_rooms,
      ) || "-",

    sourceType,
    provider,

    amount:
      formatAmount(
        raw.total ??
        raw.selected_total_price ??
        raw.total_hotel_cost ??
        raw.amount,
      ),

    currency:
      stringValue(
        raw.currency,
        raw.selected_currency,
      ) || "-",

    status,
  };
}

export default function HotelAdminBookings() {
  const [context, setContext] =
    useState<HotelAdminContext | null>(
      null,
    );

  const [rows, setRows] =
    useState<BookingRow[]>([]);

  const [view, setView] =
    useState<"queue" | "all">(
      "queue",
    );

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [accessDenied, setAccessDenied] =
    useState(false);

  const [
    confirmingPlanId,
    setConfirmingPlanId,
  ] =
    useState<number | null>(
      null,
    );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        setMessage("");

        const me =
          await HotelAdminAPI.me();

        if (cancelled) {
          return;
        }

        setContext(me);

        if (
          !hasHotelAdminPermission(
            me,
            "bookings",
            "view",
          )
        ) {
          setAccessDenied(true);
          return;
        }

        setAccessDenied(false);

        const response =
          view === "queue"
            ? await HotelAdminAPI
                .bookingQueue()
            : await HotelAdminAPI
                .bookings();

        if (cancelled) {
          return;
        }

        setRows(
          rowsFromResponse(response).map(
            normalizeBooking,
          ),
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load bookings.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [view]);

  const canConfirm =
    context
      ? hasHotelAdminPermission(
          context,
          "bookings",
          "edit",
        )
      : false;

  const groups =
    useMemo<BookingGroup[]>(() => {
      const grouped =
        new Map<
          string,
          BookingGroup
        >();

      rows.forEach((row) => {
        const key =
          row.itineraryPlanId !== null
            ? `plan-${row.itineraryPlanId}`
            : `code-${row.itineraryCode}`;

        const existing =
          grouped.get(key);

        if (existing) {
          existing.rows.push(row);
          return;
        }

        grouped.set(key, {
          key,
          itineraryPlanId:
            row.itineraryPlanId,
          itineraryCode:
            row.itineraryCode,
          rows: [row],
        });
      });

      return Array.from(
        grouped.values(),
      ).map((group) => ({
        ...group,
        rows: [...group.rows].sort(
          (a, b) => {
            const dayA =
              a.dayStay ??
              Number.MAX_SAFE_INTEGER;

            const dayB =
              b.dayStay ??
              Number.MAX_SAFE_INTEGER;

            if (dayA !== dayB) {
              return dayA - dayB;
            }

            return a.checkIn.localeCompare(
              b.checkIn,
            );
          },
        ),
      }));
    }, [rows]);

  const filteredGroups =
    useMemo(() => {
      const term =
        search
          .trim()
          .toLowerCase();

      if (!term) {
        return groups;
      }

      return groups.filter(
        (group) =>
          group.itineraryCode
            .toLowerCase()
            .includes(term) ||
          group.rows.some((row) =>
            [
              row.city,
              row.hotel,
              row.checkIn,
              row.checkOut,
              row.sourceType,
              row.provider,
              row.status,
              row.dayStay !== null
                ? `day ${row.dayStay}`
                : "",
            ].some((value) =>
              value
                .toLowerCase()
                .includes(term),
            ),
          ),
      );
    }, [groups, search]);

  const confirmBooking =
    async (
      group: BookingGroup,
    ) => {
      if (
        group.itineraryPlanId === null ||
        !canConfirm ||
        confirmingPlanId !== null
      ) {
        return;
      }

      try {
        setConfirmingPlanId(
          group.itineraryPlanId,
        );

        setError("");
        setMessage("");

        await HotelAdminAPI
          .confirmItineraryBooking({
            itineraryPlanId:
              group.itineraryPlanId,
          });

        const response =
          await HotelAdminAPI
            .bookingQueue();

        setRows(
          rowsFromResponse(response).map(
            normalizeBooking,
          ),
        );

        setMessage(
          `${group.itineraryCode} confirmed successfully and moved to All Bookings.`,
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Booking confirmation failed.",
        );
      } finally {
        setConfirmingPlanId(null);
      }
    };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />

        <span className="ml-2 text-sm text-muted-foreground">
          Loading bookings...
        </span>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
        You do not have permission to view bookings.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Bookings
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          {view === "queue"
            ? "Confirmed itinerary hotel bookings waiting for Hotel Admin confirmation."
            : "Hotel bookings already confirmed by this Hotel Admin."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setView("queue");
            setError("");
            setMessage("");
          }}
          className={
            view === "queue"
              ? "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              : "rounded-md border bg-white px-4 py-2 text-sm font-medium"
          }
        >
          Bookings
        </button>

        <button
          type="button"
          onClick={() => {
            setView("all");
            setError("");
            setMessage("");
          }}
          className={
            view === "all"
              ? "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              : "rounded-md border bg-white px-4 py-2 text-sm font-medium"
          }
        >
          All Bookings
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {message}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Search itinerary, city, hotel..."
            className="pl-9"
          />
        </div>

        <div className="text-sm text-muted-foreground">
          {filteredGroups.length} itinerar
          {filteredGroups.length === 1
            ? "y"
            : "ies"}
        </div>
      </div>

      {filteredGroups.length === 0 ? (
        <div className="rounded-xl border bg-white px-5 py-14 text-center text-sm text-muted-foreground shadow-sm">
          {view === "queue"
            ? "No bookings are waiting for Hotel Admin confirmation."
            : "No confirmed bookings found."}
        </div>
      ) : null}

      {filteredGroups.map(
        (group) => (
          <div
            key={group.key}
            className="overflow-hidden rounded-xl border bg-white shadow-sm"
          >
            <div className="flex flex-col gap-3 border-b bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-base font-semibold text-primary">
                  {group.itineraryCode}
                </div>

                <div className="mt-1 text-sm text-muted-foreground">
                  {group.rows.length} hotel stay
                  {group.rows.length === 1
                    ? ""
                    : "s"}
                </div>
              </div>

              {view === "queue" ? (
                <button
                  type="button"
                  disabled={
                    !canConfirm ||
                    group.itineraryPlanId === null ||
                    confirmingPlanId !== null
                  }
                  onClick={() =>
                    void confirmBooking(
                      group,
                    )
                  }
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {confirmingPlanId ===
                  group.itineraryPlanId
                    ? "Confirming..."
                    : "Confirm Booking"}
                </button>
              ) : null}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-5 py-3">
                      Day/Stay
                    </th>

                    <th className="px-5 py-3">
                      City
                    </th>

                    <th className="px-5 py-3">
                      Hotel
                    </th>

                    <th className="px-5 py-3">
                      Check In
                    </th>

                    <th className="px-5 py-3">
                      Check Out
                    </th>

                    <th className="px-5 py-3">
                      Rooms
                    </th>

                    <th className="px-5 py-3">
                      Type
                    </th>

                    <th className="px-5 py-3">
                      Provider
                    </th>

                    <th className="px-5 py-3">
                      Amount
                    </th>

                    <th className="px-5 py-3">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {group.rows.map(
                    (booking) => (
                      <tr key={booking.key}>
                        <td className="px-5 py-4 font-medium">
                          {booking.dayStay !==
                          null
                            ? `Day/Stay ${booking.dayStay}`
                            : booking.itineraryRouteId !==
                                null
                              ? `Route ${booking.itineraryRouteId}`
                              : "-"}
                        </td>

                        <td className="px-5 py-4">
                          {booking.city}
                        </td>

                        <td className="px-5 py-4 font-medium">
                          {booking.hotel}
                        </td>

                        <td className="px-5 py-4">
                          {booking.checkIn}
                        </td>

                        <td className="px-5 py-4">
                          {booking.checkOut}
                        </td>

                        <td className="px-5 py-4">
                          {booking.rooms}
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                            {booking.sourceType}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          {booking.provider}
                        </td>

                        <td className="px-5 py-4 font-medium">
                          {booking.currency !== "-"
                            ? `${booking.currency} ${booking.amount}`
                            : booking.amount}
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                            {booking.status}
                          </span>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ),
      )}
    </div>
  );
}