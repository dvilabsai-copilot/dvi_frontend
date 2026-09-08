import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  ArrowLeft,
  Loader2,
  Save,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getHotelAdminSelectedHotelId,
  hasHotelAdminPermission,
  HotelAdminAPI,
  setHotelAdminSelectedHotelId,
  type HotelAdminContext,
} from "@/services/hotelAdminService";

type AnyRecord =
  Record<string, unknown>;

type RoomOption = {
  id: number;
  name: string;
  totalRooms: number;
};

type AvailabilityRow = {
  date: string;
  free: string;
  source: string;
  cta: boolean;
  ctd: boolean;
  stopsell: boolean;
};

function dateValue(
  offset: number,
) {
  const value = new Date();

  value.setDate(
    value.getDate() + offset,
  );

  return value
    .toISOString()
    .slice(0, 10);
}

function recordValue(
  value: unknown,
): AnyRecord | null {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? (value as AnyRecord)
    : null;
}

function normalizeRooms(
  value: unknown,
): RoomOption[] {
  let rows: unknown[] = [];

  if (Array.isArray(value)) {
    rows = value;
  } else {
    const object =
      recordValue(value);

    if (object) {
      const candidate =
        object.items ??
        object.rows ??
        object.data;

      if (Array.isArray(candidate)) {
        rows = candidate;
      }
    }
  }

  return rows
    .map((raw) => {
      const row =
        recordValue(raw);

      if (!row) {
        return null;
      }

      const id =
        Number(
          row.room_ID ??
            row.room_id ??
            row.id ??
            0,
        );

      if (
        !Number.isInteger(id) ||
        id <= 0
      ) {
        return null;
      }

      return {
        id,
        name:
          String(
            row.room_title ??
              row.room_name ??
              `Room #${id}`,
          ).trim() ||
          `Room #${id}`,

        totalRooms:
          Number(
            row.no_of_rooms_available ??
              row.no_of_rooms ??
              0,
          ) || 0,
      };
    })
    .filter(
      (
        item,
      ): item is RoomOption =>
        Boolean(item),
    );
}

function normalizeAvailability(
  value: unknown,
): AvailabilityRow[] {
  const object =
    recordValue(value);

  if (!object) {
    return [];
  }

  const dates =
    Array.isArray(object.dates)
      ? object.dates.map(String)
      : [];

  const items =
    Array.isArray(object.items)
      ? object.items
      : [];

  const itemMap =
    new Map<
      string,
      AnyRecord
    >();

  items.forEach((raw) => {
    const row =
      recordValue(raw);

    if (!row) {
      return;
    }

    const date =
      String(
        row.date ?? "",
      );

    if (date) {
      itemMap.set(
        date,
        row,
      );
    }
  });

  return dates.map(
    (date) => {
      const row =
        itemMap.get(date) ??
        {};

      const restrictions =
        recordValue(
          row.restrictions,
        ) ?? {};

      const rawFree =
        row.free;

      return {
        date,

        free:
          rawFree === null ||
          rawFree === undefined
            ? ""
            : String(rawFree),

        source:
          String(
            row.source ??
              "manual",
          ),

        cta:
          Boolean(
            restrictions.cta,
          ),

        ctd:
          Boolean(
            restrictions.ctd,
          ),

        stopsell:
          Boolean(
            restrictions.stopsell,
          ),
      };
    },
  );
}

export default function HotelAdminAvailability() {
  const navigate =
    useNavigate();

  const [context, setContext] =
    useState<HotelAdminContext | null>(
      null,
    );

  const [hotelId, setHotelId] =
    useState<number | null>(null);

  const [hotelName, setHotelName] =
    useState("");

  const [rooms, setRooms] =
    useState<RoomOption[]>([]);

  const [roomId, setRoomId] =
    useState<number | null>(null);

  const [startDate, setStartDate] =
    useState(dateValue(0));

  const [endDate, setEndDate] =
    useState(dateValue(6));

  const [rows, setRows] =
    useState<AvailabilityRow[]>([]);

  const [loadingSetup, setLoadingSetup] =
    useState(true);

  const [
    loadingAvailability,
    setLoadingAvailability,
  ] = useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [accessDenied, setAccessDenied] =
    useState(false);

  const canCreate =
    hasHotelAdminPermission(
      context,
      "availability",
      "create",
    );

  const canEdit =
    hasHotelAdminPermission(
      context,
      "availability",
      "edit",
    );

  const canSave =
    canCreate || canEdit;

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        setLoadingSetup(true);
        setError("");

        const me =
          await HotelAdminAPI.me();

        if (cancelled) {
          return;
        }

        setContext(me);

        if (
          !hasHotelAdminPermission(
            me,
            "availability",
            "view",
          )
        ) {
          setAccessDenied(true);
          return;
        }

        const id =
          getHotelAdminSelectedHotelId() ??
          Number(
            me.defaultHotel
              ?.hotel_id ??
              0,
          );

        if (
          !Number.isInteger(id) ||
          id <= 0
        ) {
          throw new Error(
            "No assigned hotel is available.",
          );
        }

        setHotelId(id);

        setHotelAdminSelectedHotelId(
          id,
        );

        const [
          roomResponse,
          hotelResponse,
        ] = await Promise.all([
          HotelAdminAPI.rooms(id),
          HotelAdminAPI.hotel(id),
        ]);

        if (cancelled) {
          return;
        }

        const roomOptions =
          normalizeRooms(
            roomResponse,
          );

        setRooms(roomOptions);

        setRoomId(
          roomOptions[0]?.id ??
            null,
        );

        const hotelObject =
          recordValue(
            hotelResponse,
          );

        const hotelData =
          recordValue(
            hotelObject?.data,
          ) ??
          hotelObject;

        setHotelName(
          String(
            hotelData?.hotel_name ??
              "",
          ),
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load availability.",
        );
      } finally {
        if (!cancelled) {
          setLoadingSetup(false);
        }
      }
    }

    void setup();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadAvailability =
    useCallback(async () => {
      if (
        !hotelId ||
        !roomId
      ) {
        setRows([]);
        return;
      }

      if (
        new Date(startDate) >
        new Date(endDate)
      ) {
        setError(
          "Start date must be before or equal to end date.",
        );
        return;
      }

      try {
        setLoadingAvailability(
          true,
        );

        setError("");

        const response =
          await HotelAdminAPI.availability(
            hotelId,
            roomId,
            startDate,
            endDate,
          );

        setRows(
          normalizeAvailability(
            response,
          ),
        );
      } catch (err) {
        setRows([]);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load availability.",
        );
      } finally {
        setLoadingAvailability(
          false,
        );
      }
    }, [
      hotelId,
      roomId,
      startDate,
      endDate,
    ]);

  useEffect(() => {
    if (!accessDenied) {
      void loadAvailability();
    }
  }, [
    loadAvailability,
    accessDenied,
  ]);

  function updateFreeRooms(
    date: string,
    value: string,
  ) {
    if (
      value &&
      !/^\d+$/.test(value)
    ) {
      return;
    }

    setRows((current) =>
      current.map((row) =>
        row.date === date
          ? {
              ...row,
              free: value,
            }
          : row,
      ),
    );
  }

  async function save() {
    if (
      !hotelId ||
      !roomId ||
      !canSave
    ) {
      return;
    }

    const items =
      rows
        .filter(
          (row) =>
            row.free.trim() !==
            "",
        )
        .map((row) => ({
          startDate: row.date,
          endDate: row.date,
          freeRooms:
            Number(row.free),
        }));

    if (!items.length) {
      toast.error(
        "Enter availability for at least one date.",
      );
      return;
    }

    const invalid =
      items.find(
        (item) =>
          !Number.isInteger(
            item.freeRooms,
          ) ||
          item.freeRooms < 0,
      );

    if (invalid) {
      toast.error(
        "Available rooms must be non-negative whole numbers.",
      );
      return;
    }

    try {
      setSaving(true);

      await HotelAdminAPI.saveAvailability(
        hotelId,
        roomId,
        items,
      );

      toast.success(
        "Availability saved successfully",
      );

      await loadAvailability();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to save availability",
      );
    } finally {
      setSaving(false);
    }
  }

  const selectedRoom =
    rooms.find(
      (room) =>
        room.id === roomId,
    ) ?? null;

  if (loadingSetup) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />

        <span className="ml-2 text-sm text-muted-foreground">
          Loading availability...
        </span>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
        You do not have permission to view availability.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Availability
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            {hotelName
              ? `${hotelName} · `
              : ""}
            Manage real room inventory from DVI.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() =>
            navigate(
              "/hotel-admin/hotels",
            )
          }
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Change Hotel
        </Button>
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Room
            </label>

            <select
              value={
                roomId ?? ""
              }
              onChange={(event) =>
                setRoomId(
                  Number(
                    event.target.value,
                  ) || null,
                )
              }
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {rooms.length === 0 ? (
                <option value="">
                  No rooms available
                </option>
              ) : null}

              {rooms.map(
                (room) => (
                  <option
                    key={room.id}
                    value={room.id}
                  >
                    {room.name}
                  </option>
                ),
              )}
            </select>

            {selectedRoom ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Configured rooms:{" "}
                {selectedRoom.totalRooms}
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Start Date
            </label>

            <Input
              type="date"
              value={startDate}
              onChange={(event) =>
                setStartDate(
                  event.target.value,
                )
              }
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              End Date
            </label>

            <Input
              type="date"
              value={endDate}
              onChange={(event) =>
                setEndDate(
                  event.target.value,
                )
              }
            />
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <div className="font-semibold">
              Room Inventory
            </div>

            <div className="mt-1 text-xs text-muted-foreground">
              Inventory and provider restrictions are loaded from the existing DVI availability workflow.
            </div>
          </div>

          {loadingAvailability ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-5 py-3">
                  Date
                </th>

                <th className="px-5 py-3">
                  Available Rooms
                </th>

                <th className="px-5 py-3">
                  Source
                </th>

                <th className="px-5 py-3">
                  Restrictions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {!loadingAvailability &&
              rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-12 text-center text-muted-foreground"
                  >
                    No availability rows returned for this date range.
                  </td>
                </tr>
              ) : null}

              {rows.map((row) => (
                <tr key={row.date}>
                  <td className="px-5 py-4 font-medium">
                    {row.date}
                  </td>

                  <td className="px-5 py-4">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={row.free}
                      disabled={!canSave}
                      onChange={(event) =>
                        updateFreeRooms(
                          row.date,
                          event.target.value,
                        )
                      }
                      placeholder="Not set"
                      className="w-36"
                    />
                  </td>

                  <td className="px-5 py-4">
                    {row.source || "manual"}
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      {row.cta ? (
                        <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                          CTA
                        </span>
                      ) : null}

                      {row.ctd ? (
                        <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                          CTD
                        </span>
                      ) : null}

                      {row.stopsell ? (
                        <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                          Stop Sell
                        </span>
                      ) : null}

                      {!row.cta &&
                      !row.ctd &&
                      !row.stopsell ? (
                        <span className="text-xs text-muted-foreground">
                          None
                        </span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t px-5 py-4">
          {!canSave ? (
            <span className="text-sm text-muted-foreground">
              View-only availability access
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              Blank inventory values are not overwritten.
            </span>
          )}

          <Button
            disabled={
              !canSave ||
              saving ||
              loadingAvailability ||
              !roomId
            }
            onClick={() =>
              void save()
            }
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}

            {saving
              ? "Saving..."
              : "Save Availability"}
          </Button>
        </div>
      </div>
    </div>
  );
}