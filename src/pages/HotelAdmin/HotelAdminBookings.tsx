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

type BulkBookingAction =
  | "approve"
  | "reject"
  | "confirm";

type BookingRow = {
  key: string;
  bookingId: number | null;
  reference: string;
  hotel: string;
  guest: string;
  room: string;
  checkIn: string;
  checkOut: string;
  amount: string;
  approvalStatus: string;
  confirmationStatus: string;
  status: string;
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

function normalizeBooking(
  raw: RawRecord,
  index: number,
): BookingRow {
  const bookingIdValue =
    Number(
      raw.bookingId ??
        raw.booking_id ??
        raw.confirmed_itinerary_plan_hotel_details_ID ??
        raw.confirmed_itinerary_plan_hotel_detail_id ??
        raw.confirmed_itinerary_plan_hotel_details_id,
    );

  const bookingId =
    Number.isInteger(bookingIdValue) &&
    bookingIdValue > 0
      ? bookingIdValue
      : null;

  const approvalStatus =
    stringValue(
      raw.approvalStatus,
      raw.hotel_approval_status,
    ) || "-";

  const confirmationStatus =
    stringValue(
      raw.confirmationStatus,
      raw.manual_confirmation_status,
    ) || "-";

  const reference =
    stringValue(
      raw.booking_reference,
      raw.booking_ref,
      raw.booking_id,
      raw.bookingId,
      raw.confirmation_number,
      raw.confirmation_no,
      raw.itinerary_code,
      raw.itinerary_id,
      raw.confirmed_itinerary_id,
      raw.id,
    ) || `Booking ${index + 1}`;

  const statusValue =
    raw.booking_status ??
    raw.status_label ??
    raw.status;

  let status =
    stringValue(statusValue);

  if (status === "1") {
    status = "Active";
  } else if (status === "0") {
    status = "Inactive";
  }

  return {
    key:
      stringValue(
        raw.hotel_detail_id,
        raw.confirmed_itinerary_plan_hotel_detail_id,
        raw.confirmed_itinerary_plan_hotel_details_id,
        raw.id,
        `${reference}-${index}`,
      ),

    bookingId,
    approvalStatus,
    confirmationStatus,

    reference,

    hotel:
      stringValue(
        raw.hotel_name,
        raw.hotelCode,
        raw.hotel,
        raw.property_name,
      ) || "-",

    guest:
      stringValue(
        raw.guest_name,
        raw.lead_guest_name,
        raw.customer_name,
        raw.client_name,
        raw.pax_name,
        raw.traveller_name,
      ) || "-",

    room:
      stringValue(
        raw.room_title,
        raw.rooms,
        raw.room_name,
        raw.room_type,
        raw.hotel_room_name,
      ) || "-",

    checkIn:
      stringValue(
        raw.checkIn,
        raw.check_in_date,
        raw.checkin_date,
        raw.check_in,
        raw.from_date,
        raw.start_date,
      ) || "-",

    checkOut:
      stringValue(
        raw.checkOut,
        raw.check_out_date,
        raw.checkout_date,
        raw.check_out,
        raw.to_date,
        raw.end_date,
      ) || "-",

    amount:
      formatAmount(
        raw.total ??
        raw.total_amount ??
        raw.hotel_amount ??
        raw.room_amount ??
        raw.amount ??
        raw.total_price ??
        raw.price,
      ),

    status:
      status || "-",
  };
}

function canApproveBooking(
  booking: BookingRow,
): boolean {
  return (
    booking.approvalStatus ===
    "PENDING_APPROVAL"
  );
}

function canRejectBooking(
  booking: BookingRow,
): boolean {
  return canApproveBooking(booking);
}

function canConfirmBooking(
  booking: BookingRow,
): boolean {
  return (
    booking.approvalStatus ===
      "APPROVED" &&
    booking.confirmationStatus ===
      "PENDING_CONFIRMATION"
  );
}

function canBulkActOnBooking(
  booking: BookingRow,
): boolean {
  return (
    canApproveBooking(booking) ||
    canRejectBooking(booking) ||
    canConfirmBooking(booking)
  );
}
export default function HotelAdminBookings() {
  const [context, setContext] =
    useState<HotelAdminContext | null>(
      null,
    );

  const [rows, setRows] =
    useState<BookingRow[]>([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [accessDenied, setAccessDenied] =
    useState(false);

  const [selectedIds, setSelectedIds] =
    useState<Set<number>>(
      () => new Set(),
    );

  const [bulkAction, setBulkAction] =
    useState<BulkBookingAction | null>(
      null,
    );

  const [bulkMessage, setBulkMessage] =
    useState("");

  const [view, setView] =
    useState<
      "all" | "pending"
    >("all");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const me =
          await HotelAdminAPI.me();

        if (cancelled) return;

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

        const response =
          view === "pending"
            ? await HotelAdminAPI
                .pendingBookingApprovals()
            : await HotelAdminAPI
                .bookings();

        if (cancelled) return;

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

  const filtered =
    useMemo(() => {
      const term =
        search
          .trim()
          .toLowerCase();

      if (!term) {
        return rows;
      }

      return rows.filter(
        (row) =>
          [
            row.reference,
            row.hotel,
            row.guest,
            row.room,
            row.checkIn,
            row.checkOut,
            row.status,
          ].some((value) =>
            value
              .toLowerCase()
              .includes(term),
          ),
      );
    }, [rows, search]);

  const canEditBookings =
    context
      ? hasHotelAdminPermission(
          context,
          "bookings",
          "edit",
        )
      : false;

  const selectableFilteredIds =
    view === "pending"
      ? filtered
          .filter(
            (row) =>
              row.bookingId !== null &&
              canBulkActOnBooking(row),
          )
          .map(
            (row) =>
              row.bookingId as number,
          )
      : [];

  const allVisibleSelected =
    selectableFilteredIds.length > 0 &&
    selectableFilteredIds.every(
      (id) => selectedIds.has(id),
    );

  const selectedRows =
    rows.filter(
      (row) =>
        row.bookingId !== null &&
        selectedIds.has(
          row.bookingId,
        ),
    );

  const canRunSelected = (
    action: BulkBookingAction,
  ): boolean => {
    if (!selectedRows.length) {
      return false;
    }

    return selectedRows.every(
      (row) =>
        action === "approve"
          ? canApproveBooking(row)
          : action === "reject"
            ? canRejectBooking(row)
            : canConfirmBooking(row),
    );
  };

  const toggleBooking = (
    bookingId: number,
  ) => {
    setSelectedIds((current) => {
      const next =
        new Set(current);

      if (next.has(bookingId)) {
        next.delete(bookingId);
      } else {
        next.add(bookingId);
      }

      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedIds((current) => {
      const next =
        new Set(current);

      if (allVisibleSelected) {
        selectableFilteredIds.forEach(
          (id) => next.delete(id),
        );
      } else {
        selectableFilteredIds.forEach(
          (id) => next.add(id),
        );
      }

      return next;
    });
  };

  const runBulkAction = async (
    action: BulkBookingAction,
  ) => {
    if (
      !canEditBookings ||
      !canRunSelected(action) ||
      bulkAction
    ) {
      setError(
        "Selected bookings are not ready for this bulk action.",
      );
      return;
    }

    const bookingIds =
      Array.from(selectedIds);

    try {
      setBulkAction(action);
      setError("");
      setBulkMessage("");

      const result =
        await HotelAdminAPI
          .bulkBookingAction({
            bookingIds,
            action,
          });

      const response =
        view === "pending"
          ? await HotelAdminAPI.pendingBookingApprovals()
          : await HotelAdminAPI.bookings();

      setRows(
        rowsFromResponse(response).map(
          normalizeBooking,
        ),
      );

      setSelectedIds(
        new Set(),
      );

      const resultObject =
        recordValue(result);

      const count =
        Number(
          resultObject?.count ??
            bookingIds.length,
        );

      const label =
        action === "approve"
          ? "approved"
          : action === "reject"
            ? "rejected"
            : "confirmed";

      setBulkMessage(
        `${Number.isFinite(count) ? count : bookingIds.length} booking(s) ${label} successfully.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Bulk booking action failed.",
      );
    } finally {
      setBulkAction(null);
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
          {view === "pending"
            ? "Approve, reject and confirm manual hotel bookings for hotels assigned to this Hotel Admin."
            : "View real bookings for hotels assigned to this Hotel Admin."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setView("all");
            setSelectedIds(new Set());
            setError("");
            setBulkMessage("");
          }}
          className={
            view === "all"
              ? "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              : "rounded-md border bg-white px-4 py-2 text-sm font-medium"
          }
        >
          All Bookings
        </button>

        <button
          type="button"
          onClick={() => {
            setView("pending");
            setSelectedIds(new Set());
            setError("");
            setBulkMessage("");
          }}
          className={
            view === "pending"
              ? "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              : "rounded-md border bg-white px-4 py-2 text-sm font-medium"
          }
        >
          Pending Hotel Approval
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {bulkMessage ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {bulkMessage}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search booking, guest, hotel..."
              className="pl-9"
            />
          </div>

          <div className="text-sm text-muted-foreground">
            {filtered.length} booking
            {filtered.length === 1
              ? ""
              : "s"}
          </div>
        </div>

        {view === "pending" ? (
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
          <button
            type="button"
            onClick={toggleAllVisible}
            disabled={
              !selectableFilteredIds.length ||
              Boolean(bulkAction)
            }
            className="rounded-md border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            {allVisibleSelected
              ? "Clear Visible"
              : "Select All"}
          </button>

          <button
            type="button"
            onClick={() =>
              void runBulkAction("approve")
            }
            disabled={
              !canEditBookings ||
              !canRunSelected("approve") ||
              Boolean(bulkAction)
            }
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {bulkAction === "approve"
              ? "Approving..."
              : "Approve Selected"}
          </button>

          <button
            type="button"
            onClick={() =>
              void runBulkAction("reject")
            }
            disabled={
              !canEditBookings ||
              !canRunSelected("reject") ||
              Boolean(bulkAction)
            }
            className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {bulkAction === "reject"
              ? "Rejecting..."
              : "Reject Selected"}
          </button>

          <button
            type="button"
            onClick={() =>
              void runBulkAction("confirm")
            }
            disabled={
              !canEditBookings ||
              !canRunSelected("confirm") ||
              Boolean(bulkAction)
            }
            className="rounded-md border border-primary px-3 py-2 text-sm font-medium text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {bulkAction === "confirm"
              ? "Confirming..."
              : "Confirm Selected"}
          </button>

          <span className="ml-auto text-sm text-muted-foreground">
            {selectedIds.size} selected
            {!canEditBookings
              ? " · Edit permission required for bulk actions"
              : selectableFilteredIds.length === 0
                ? " · No bookings currently ready for manual bulk action"
                : ""}
          </span>
        </div>

        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1350px] text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-5 py-3">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisible}
                    disabled={
                      !selectableFilteredIds.length ||
                      Boolean(bulkAction)
                    }
                    aria-label="Select all visible bookings"
                  />
                </th>

                <th className="px-5 py-3">
                  Reference
                </th>

                <th className="px-5 py-3">
                  Hotel
                </th>

                <th className="px-5 py-3">
                  Guest
                </th>

                <th className="px-5 py-3">
                  Room
                </th>

                <th className="px-5 py-3">
                  Check In
                </th>

                <th className="px-5 py-3">
                  Check Out
                </th>

                <th className="px-5 py-3">
                  Amount
                </th>

                <th className="px-5 py-3">
                  Approval
                </th>

                <th className="px-5 py-3">
                  Confirmation
                </th>

                <th className="px-5 py-3">
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-5 py-12 text-center text-muted-foreground"
                  >
                    {view === "pending"
                      ? "No hotel bookings are currently pending approval or confirmation."
                      : "No bookings found."}
                  </td>
                </tr>
              ) : null}

              {filtered.map((booking) => (
                <tr key={booking.key}>
                  <td className="px-5 py-4">
                    <input
                      type="checkbox"
                      checked={
                        booking.bookingId !== null &&
                        selectedIds.has(
                          booking.bookingId,
                        )
                      }
                      disabled={
                        view !== "pending" ||
                        booking.bookingId === null ||
                        !canBulkActOnBooking(
                          booking,
                        ) ||
                        Boolean(bulkAction)
                      }
                      onChange={() => {
                        if (
                          booking.bookingId !== null
                        ) {
                          toggleBooking(
                            booking.bookingId,
                          );
                        }
                      }}
                      aria-label={`Select booking ${booking.reference}`}
                    />
                  </td>

                  <td className="px-5 py-4 font-medium text-primary">
                    {booking.reference}
                  </td>

                  <td className="px-5 py-4">
                    {booking.hotel}
                  </td>

                  <td className="px-5 py-4">
                    {booking.guest}
                  </td>

                  <td className="px-5 py-4">
                    {booking.room}
                  </td>

                  <td className="px-5 py-4">
                    {booking.checkIn}
                  </td>

                  <td className="px-5 py-4">
                    {booking.checkOut}
                  </td>

                  <td className="px-5 py-4 font-medium">
                    {booking.amount}
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                      {booking.approvalStatus}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                      {booking.confirmationStatus}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                      {booking.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}