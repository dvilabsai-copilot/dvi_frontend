import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  BedDouble,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import {
  toast,
} from "sonner";

import {
  Button,
} from "@/components/ui/button";

import {
  Input,
} from "@/components/ui/input";

import {
  api,
} from "@/lib/api";

import {
  hasHotelAdminPermission,
  HotelAdminAPI,
  setHotelAdminSelectedHotelId,
  type HotelAdminContext,
} from "@/services/hotelAdminService";

type RoomRow = {
  room_ID: number;
  hotel_id: number;
  hotel_name: string | null;
  room_title: string | null;
  room_type_id: number | null;
  no_of_rooms_available: number;
  total_max_adults: number;
  total_max_childrens: number;
  air_conditioner_availability:
    | number
    | boolean
    | null;
  check_in_time: unknown;
  check_out_time: unknown;

  rate_min: number | null;
  rate_max: number | null;
  rate_plan_count: number;

  status:
    | number
    | boolean
    | null;
};

type RoomIndexResponse = {
  items: RoomRow[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  search: string;
};

const PAGE_SIZE = 25;

function isActive(
  value: unknown,
) {
  return (
    value === true ||
    value === 1 ||
    value === "1"
  );
}

function timeText(
  value: unknown,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "-";
  }

  const text =
    String(value).trim();

  const isoMatch =
    text.match(
      /T(\d{2}):(\d{2})/,
    );

  if (isoMatch) {
    return `${isoMatch[1]}:${isoMatch[2]}`;
  }

  return text;
}

export default function HotelAdminRooms() {
  const navigate =
    useNavigate();

  const [
    context,
    setContext,
  ] =
    useState<
      HotelAdminContext | null
    >(null);

  const [
    rows,
    setRows,
  ] =
    useState<RoomRow[]>([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    deletingId,
    setDeletingId,
  ] =
    useState<number | null>(
      null,
    );

  const [
    accessDenied,
    setAccessDenied,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    searchInput,
    setSearchInput,
  ] =
    useState("");

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    page,
    setPage,
  ] =
    useState(1);

  const [
    total,
    setTotal,
  ] =
    useState(0);

  const [
    totalPages,
    setTotalPages,
  ] =
    useState(0);

  const canCreate =
    hasHotelAdminPermission(
      context,
      "rooms",
      "create",
    );

  const canEdit =
    hasHotelAdminPermission(
      context,
      "rooms",
      "edit",
    );

  const canDelete =
    hasHotelAdminPermission(
      context,
      "rooms",
      "delete",
    );

  const canViewRates =
    hasHotelAdminPermission(
      context,
      "rates",
      "view",
    );

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          setSearch(
            searchInput.trim(),
          );

          setPage(1);
        },
        350,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [searchInput]);

  const load =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError("");
          setAccessDenied(false);

          const me =
            await HotelAdminAPI.me();

          setContext(me);

          if (
            !hasHotelAdminPermission(
              me,
              "rooms",
              "view",
            )
          ) {
            setAccessDenied(true);
            setRows([]);
            return;
          }

          const params =
            new URLSearchParams({
              page:
                String(page),

              limit:
                String(PAGE_SIZE),
            });

          if (search) {
            params.set(
              "search",
              search,
            );
          }

          const response =
            (await api(
              `/hotel-admin/rooms?${params.toString()}`,
            )) as RoomIndexResponse;

          setRows(
            Array.isArray(
              response.items,
            )
              ? response.items
              : [],
          );

          setTotal(
            Number(
              response
                .pagination
                ?.total ?? 0,
            ),
          );

          setTotalPages(
            Number(
              response
                .pagination
                ?.totalPages ?? 0,
            ),
          );
        }
        catch (err) {
          setRows([]);

          setError(
            err instanceof Error
              ? err.message
              : "Failed to load rooms.",
          );
        }
        finally {
          setLoading(false);
        }
      },
      [
        page,
        search,
      ],
    );

  useEffect(() => {
    void load();
  }, [load]);

  function openRates(
    room: RoomRow,
  ) {
    setHotelAdminSelectedHotelId(
      room.hotel_id,
    );

    navigate(
      `/hotel-admin/rates?roomId=${room.room_ID}`,
    );
  }

  function editRoom(
    room: RoomRow,
  ) {
    setHotelAdminSelectedHotelId(
      room.hotel_id,
    );

    navigate(
      `/hotel-admin/hotels/${room.hotel_id}/edit?tab=rooms`,
    );
  }

  async function deleteRoom(
    room: RoomRow,
  ) {
    const confirmed =
      window.confirm(
        `Delete room "${room.room_title || `#${room.room_ID}`}" from ${room.hotel_name || `Hotel #${room.hotel_id}`}?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(
        room.room_ID,
      );

      await HotelAdminAPI.deleteRoom(
        room.hotel_id,
        room.room_ID,
      );

      toast.success(
        "Room deleted successfully",
      );

      await load();
    }
    catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to delete room",
      );
    }
    finally {
      setDeletingId(null);
    }
  }

  if (accessDenied) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
        You do not have permission to view rooms.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Rooms
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            All rooms across hotels assigned to your Hotel Admin account.
          </p>
        </div>

        {canCreate ? (
          <Button
            type="button"
            onClick={() =>
              navigate(
                "/hotel-admin/hotels",
              )
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Room
          </Button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={
                searchInput
              }
              onChange={(
                event,
              ) =>
                setSearchInput(
                  event.target.value,
                )
              }
              placeholder="Search hotel, room or room type..."
              className="pl-9"
            />
          </div>

          <div className="text-sm text-muted-foreground">
            {total.toLocaleString()} room
            {total === 1
              ? ""
              : "s"}
          </div>
        </div>

        {error ? (
          <div className="border-b border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1450px] text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3">
                  Hotel Name
                </th>

                <th className="px-4 py-3">
                  Room
                </th>

                <th className="px-4 py-3">
                  Room Type ID
                </th>

                <th className="px-4 py-3">
                  Total Rooms
                </th>

                <th className="px-4 py-3">
                  Occupancy
                </th>

                <th className="px-4 py-3">
                  AC
                </th>

                <th className="px-4 py-3">
                  Check In / Out
                </th>

                <th className="px-4 py-3">
                  Rate / Pricing
                </th>

                <th className="px-4 py-3">
                  Status
                </th>

                <th className="px-4 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-5 py-12 text-center"
                  >
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Loading rooms...
                    </div>
                  </td>
                </tr>
              ) : null}

              {!loading &&
              rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-5 py-12 text-center text-muted-foreground"
                  >
                    No rooms found.
                  </td>
                </tr>
              ) : null}

              {!loading &&
                rows.map(
                  (room) => {
                    const active =
                      isActive(
                        room.status,
                      );

                    return (
                      <tr
                        key={`${room.hotel_id}-${room.room_ID}`}
                      >
                        <td className="px-4 py-4">
                          <div className="font-medium">
                            {room.hotel_name ||
                              `Hotel #${room.hotel_id}`}
                          </div>

                          <div className="mt-1 text-xs text-muted-foreground">
                            Hotel ID: {room.hotel_id}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 font-medium">
                            <BedDouble className="h-4 w-4 text-primary" />

                            {room.room_title ||
                              `Room #${room.room_ID}`}
                          </div>

                          <div className="mt-1 text-xs text-muted-foreground">
                            Room ID: {room.room_ID}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          {room.room_type_id ??
                            "-"}
                        </td>

                        <td className="px-4 py-4">
                          {room.no_of_rooms_available}
                        </td>

                        <td className="px-4 py-4">
                          {room.total_max_adults} Adult
                          {room.total_max_adults ===
                          1
                            ? ""
                            : "s"}
                          {" + "}
                          {room.total_max_childrens} Child
                          {room.total_max_childrens ===
                          1
                            ? ""
                            : "ren"}
                        </td>

                        <td className="px-4 py-4">
                          {isActive(
                            room.air_conditioner_availability,
                          )
                            ? "Yes"
                            : "No"}
                        </td>

                        <td className="px-4 py-4">
                          {timeText(
                            room.check_in_time,
                          )}
                          {" / "}
                          {timeText(
                            room.check_out_time,
                          )}
                        </td>

                        <td className="px-4 py-4">
                          {canViewRates ? (
                            <div className="space-y-2">
                              {room.rate_min !== null &&
                              room.rate_min !== undefined ? (
                                <div>
                                  <div className="text-xs text-muted-foreground">
                                    Saved Rate
                                  </div>

                                  <div className="font-semibold">
                                    {room.rate_max !== null &&
                                    room.rate_max !== undefined &&
                                    room.rate_max !== room.rate_min
                                      ? `${room.rate_min} - ${room.rate_max}`
                                      : room.rate_min}
                                  </div>

                                  {room.rate_plan_count > 0 ? (
                                    <div className="text-xs text-muted-foreground">
                                      {room.rate_plan_count} rate plan
                                      {room.rate_plan_count === 1
                                        ? ""
                                        : "s"}
                                    </div>
                                  ) : null}
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground">
                                  Not Priced
                                </div>
                              )}

                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  openRates(
                                    room,
                                  )
                                }
                              >
                                {room.rate_min !== null &&
                                room.rate_min !== undefined
                                  ? "Manage Rates"
                                  : "Add Rates"}
                              </Button>
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={
                              active
                                ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
                                : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                            }
                          >
                            {active
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            {canEdit ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  editRoom(
                                    room,
                                  )
                                }
                              >
                                <Pencil className="mr-1 h-4 w-4" />
                                Edit
                              </Button>
                            ) : null}

                            {canDelete ? (
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                disabled={
                                  deletingId ===
                                  room.room_ID
                                }
                                onClick={() =>
                                  void deleteRoom(
                                    room,
                                  )
                                }
                              >
                                {deletingId ===
                                room.room_ID ? (
                                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="mr-1 h-4 w-4" />
                                )}

                                Delete
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  },
                )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Page {totalPages === 0
              ? 0
              : page}
            {" of "}
            {totalPages.toLocaleString()}
            {" · "}
            {total.toLocaleString()} total rooms
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                loading ||
                page <= 1
              }
              onClick={() =>
                setPage(
                  (current) =>
                    Math.max(
                      1,
                      current - 1,
                    ),
                )
              }
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                loading ||
                totalPages === 0 ||
                page >= totalPages
              }
              onClick={() =>
                setPage(
                  (current) =>
                    current + 1,
                )
              }
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}