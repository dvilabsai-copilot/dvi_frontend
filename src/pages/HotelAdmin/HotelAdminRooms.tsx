import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  ArrowLeft,
  BedDouble,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  getHotelAdminSelectedHotelId,
  hasHotelAdminPermission,
  HotelAdminAPI,
  setHotelAdminSelectedHotelId,
  type HotelAdminContext,
} from "@/services/hotelAdminService";

type RoomRecord =
  Record<string, unknown>;

type RoomForm = {
  room_title: string;
  room_type_id: string;
  no_of_rooms: string;
  max_adult: string;
  max_children: string;
  ac_availability: boolean;
  status: boolean;
  check_in_time: string;
  check_out_time: string;
  gst_type: string;
  gst_percentage: string;
  food_breakfast: boolean;
  food_lunch: boolean;
  food_dinner: boolean;
};

const EMPTY_ROOM: RoomForm = {
  room_title: "",
  room_type_id: "",
  no_of_rooms: "1",
  max_adult: "2",
  max_children: "0",
  ac_availability: true,
  status: true,
  check_in_time: "",
  check_out_time: "",
  gst_type: "1",
  gst_percentage: "0",
  food_breakfast: false,
  food_lunch: false,
  food_dinner: false,
};

function asString(
  value: unknown,
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value);
}

function asNumber(
  value: unknown,
): number {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function asBoolean(
  value: unknown,
): boolean {
  return (
    value === true ||
    value === 1 ||
    value === "1"
  );
}

function roomId(
  room: RoomRecord,
): number {
  return Number(
    room.room_ID ??
      room.room_id ??
      room.id ??
      0,
  );
}

function unwrapRows(
  value: unknown,
): RoomRecord[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is RoomRecord =>
        Boolean(
          item &&
            typeof item === "object",
        ),
    );
  }

  if (
    !value ||
    typeof value !== "object"
  ) {
    return [];
  }

  const object =
    value as Record<string, unknown>;

  for (const key of [
    "rows",
    "items",
    "data",
  ]) {
    const candidate =
      object[key];

    if (Array.isArray(candidate)) {
      return candidate.filter(
        (item): item is RoomRecord =>
          Boolean(
            item &&
              typeof item ===
                "object",
          ),
      );
    }
  }

  if (
    object.data &&
    typeof object.data === "object"
  ) {
    const nested =
      object.data as Record<
        string,
        unknown
      >;

    for (const key of [
      "rows",
      "items",
      "data",
    ]) {
      if (
        Array.isArray(nested[key])
      ) {
        return (
          nested[key] as unknown[]
        ).filter(
          (
            item,
          ): item is RoomRecord =>
            Boolean(
              item &&
                typeof item ===
                  "object",
            ),
        );
      }
    }
  }

  return [];
}

function positiveHotelId(
  value: unknown,
): number | null {
  const parsed = Number(value);

  return Number.isInteger(parsed) &&
    parsed > 0
    ? parsed
    : null;
}

function formFromRoom(
  room: RoomRecord,
): RoomForm {
  return {
    room_title:
      asString(room.room_title),

    room_type_id:
      asString(room.room_type_id),

    no_of_rooms:
      asString(
        room.no_of_rooms_available ??
          room.no_of_rooms ??
          1,
      ),

    max_adult:
      asString(
        room.total_max_adults ??
          room.max_adult ??
          0,
      ),

    max_children:
      asString(
        room.total_max_childrens ??
          room.max_children ??
          0,
      ),

    ac_availability:
      asBoolean(
        room.air_conditioner_availability ??
          room.ac_availability,
      ),

    status:
      asBoolean(room.status),

    check_in_time:
      asString(
        room.check_in_time,
      ).slice(0, 5),

    check_out_time:
      asString(
        room.check_out_time,
      ).slice(0, 5),

    gst_type:
      asString(
        room.gst_type ?? 1,
      ),

    gst_percentage:
      asString(
        room.gst_percentage ?? 0,
      ),

    food_breakfast:
      asBoolean(
        room.breakfast_included,
      ),

    food_lunch:
      asBoolean(
        room.lunch_included,
      ),

    food_dinner:
      asBoolean(
        room.dinner_included,
      ),
  };
}

export default function HotelAdminRooms() {
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

  const [rows, setRows] =
    useState<RoomRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [accessDenied, setAccessDenied] =
    useState(false);

  const [formOpen, setFormOpen] =
    useState(false);

  const [editingRoom, setEditingRoom] =
    useState<RoomRecord | null>(
      null,
    );

  const [roomForm, setRoomForm] =
    useState<RoomForm>(EMPTY_ROOM);

  const [saving, setSaving] =
    useState(false);

  const [deleteRoom, setDeleteRoom] =
    useState<RoomRecord | null>(
      null,
    );

  const [deleting, setDeleting] =
    useState(false);

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

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setAccessDenied(false);

      const nextContext =
        await HotelAdminAPI.me();

      setContext(nextContext);

      if (
        !hasHotelAdminPermission(
          nextContext,
          "rooms",
          "view",
        )
      ) {
        setAccessDenied(true);
        setRows([]);
        return;
      }

      const selectedHotelId =
        getHotelAdminSelectedHotelId() ??
        positiveHotelId(
          nextContext.defaultHotel
            ?.hotel_id,
        );

      if (!selectedHotelId) {
        setError(
          "No assigned hotel is available.",
        );
        return;
      }

      setHotelId(selectedHotelId);

      setHotelAdminSelectedHotelId(
        selectedHotelId,
      );

      const [
        roomResponse,
        hotelResponse,
      ] = await Promise.all([
        HotelAdminAPI.rooms(
          selectedHotelId,
        ),
        HotelAdminAPI.hotel(
          selectedHotelId,
        ),
      ]);

      setRows(
        unwrapRows(roomResponse),
      );

      if (
        hotelResponse &&
        typeof hotelResponse ===
          "object"
      ) {
        const hotelObject =
          hotelResponse as Record<
            string,
            unknown
          >;

        const actualHotel =
          hotelObject.data &&
          typeof hotelObject.data ===
            "object"
            ? (hotelObject.data as Record<
                string,
                unknown
              >)
            : hotelObject;

        setHotelName(
          asString(
            actualHotel.hotel_name,
          ),
        );
      }
    } catch (err) {
      setRows([]);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load rooms.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    if (!canCreate) return;

    setEditingRoom(null);
    setRoomForm(EMPTY_ROOM);
    setFormOpen(true);
  }

  function openEdit(
    room: RoomRecord,
  ) {
    if (!canEdit) return;

    setEditingRoom(room);

    setRoomForm(
      formFromRoom(room),
    );

    setFormOpen(true);
  }

  function setTextField(
    key: keyof RoomForm,
    value: string,
  ) {
    setRoomForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function setBooleanField(
    key: keyof RoomForm,
    value: boolean,
  ) {
    setRoomForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function saveRoom() {
    if (!hotelId) {
      return;
    }

    const editingId =
      editingRoom
        ? roomId(editingRoom)
        : null;

    if (
      editingRoom &&
      !editingId
    ) {
      toast.error(
        "Invalid room ID",
      );
      return;
    }

    if (
      !roomForm.room_title.trim()
    ) {
      toast.error(
        "Room title is required",
      );
      return;
    }

    const totalRooms =
      Number(
        roomForm.no_of_rooms,
      );

    const maxAdult =
      Number(
        roomForm.max_adult,
      );

    const maxChildren =
      Number(
        roomForm.max_children,
      );

    const roomTypeId =
      roomForm.room_type_id.trim()
        ? Number(
            roomForm.room_type_id,
          )
        : null;

    const gstPercentage =
      Number(
        roomForm.gst_percentage,
      );

    if (
      !Number.isInteger(totalRooms) ||
      totalRooms < 0
    ) {
      toast.error(
        "Total rooms must be a valid whole number.",
      );
      return;
    }

    if (
      !Number.isInteger(maxAdult) ||
      maxAdult < 0 ||
      !Number.isInteger(
        maxChildren,
      ) ||
      maxChildren < 0
    ) {
      toast.error(
        "Occupancy values must be valid whole numbers.",
      );
      return;
    }

    if (
      roomTypeId !== null &&
      (!Number.isInteger(
        roomTypeId,
      ) ||
        roomTypeId <= 0)
    ) {
      toast.error(
        "Room Type ID must be a positive whole number.",
      );
      return;
    }

    if (
      !Number.isFinite(
        gstPercentage,
      ) ||
      gstPercentage < 0 ||
      gstPercentage > 100
    ) {
      toast.error(
        "GST percentage must be between 0 and 100.",
      );
      return;
    }

    const payload:
      Record<string, unknown> = {
        hotel_id: hotelId,

        room_title:
          roomForm.room_title.trim(),

        no_of_rooms:
          totalRooms,

        max_adult:
          maxAdult,

        max_children:
          maxChildren,

        ac_availability:
          roomForm.ac_availability
            ? 1
            : 0,

        status:
          roomForm.status
            ? 1
            : 0,

        gst_type:
          Number(
            roomForm.gst_type,
          ),

        gst_percentage:
          gstPercentage,

        food_breakfast:
          roomForm.food_breakfast,

        food_lunch:
          roomForm.food_lunch,

        food_dinner:
          roomForm.food_dinner,
      };

    if (roomTypeId !== null) {
      payload.room_type_id =
        roomTypeId;
    }

    if (
      roomForm.check_in_time
    ) {
      payload.check_in_time =
        roomForm.check_in_time;
    }

    if (
      roomForm.check_out_time
    ) {
      payload.check_out_time =
        roomForm.check_out_time;
    }

    try {
      setSaving(true);

      if (
        editingRoom &&
        editingId
      ) {
        payload.room_ID =
          editingId;

        await HotelAdminAPI.updateRoom(
          hotelId,
          editingId,
          payload,
        );

        toast.success(
          "Room updated successfully",
        );
      } else {
        await HotelAdminAPI.createRoom(
          hotelId,
          payload,
        );

        toast.success(
          "Room created successfully",
        );
      }

      setFormOpen(false);
      setEditingRoom(null);

      const response =
        await HotelAdminAPI.rooms(
          hotelId,
        );

      setRows(
        unwrapRows(response),
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to save room",
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (
      !hotelId ||
      !deleteRoom ||
      !canDelete
    ) {
      return;
    }

    const id =
      roomId(deleteRoom);

    if (!id) {
      toast.error(
        "Invalid room ID",
      );
      return;
    }

    try {
      setDeleting(true);

      await HotelAdminAPI.deleteRoom(
        hotelId,
        id,
      );

      setRows((current) =>
        current.filter(
          (room) =>
            roomId(room) !== id,
        ),
      );

      setDeleteRoom(null);

      toast.success(
        "Room deleted successfully",
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to delete room",
      );
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading rooms...
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
        You do not have permission to view rooms.
      </div>
    );
  }

  if (error || !hotelId) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error ||
            "Room data is unavailable."}
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
          Select Hotel
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Rooms
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              {hotelName
                ? `${hotelName} · `
                : ""}
              Manage real DVI room inventory and occupancy configuration.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
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

            {canCreate ? (
              <Button
                type="button"
                onClick={openCreate}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Room
              </Button>
            ) : null}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="border-b px-5 py-4">
            <div className="font-semibold">
              Room List
            </div>

            <div className="mt-1 text-xs text-muted-foreground">
              Hotel ID: {hotelId}
              {" · "}
              {rows.length} room type
              {rows.length === 1
                ? ""
                : "s"}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-5 py-3">
                    Room
                  </th>

                  <th className="px-5 py-3">
                    Room Type ID
                  </th>

                  <th className="px-5 py-3">
                    Total Rooms
                  </th>

                  <th className="px-5 py-3">
                    Occupancy
                  </th>

                  <th className="px-5 py-3">
                    AC
                  </th>

                  <th className="px-5 py-3">
                    Check In / Out
                  </th>

                  <th className="px-5 py-3">
                    Status
                  </th>

                  <th className="px-5 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-12 text-center text-muted-foreground"
                    >
                      No rooms have been configured for this hotel.
                    </td>
                  </tr>
                ) : null}

                {rows.map((room) => {
                  const id =
                    roomId(room);

                  const active =
                    asBoolean(
                      room.status,
                    );

                  return (
                    <tr key={id}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 font-medium">
                          <BedDouble className="h-4 w-4 text-primary" />

                          {asString(
                            room.room_title,
                          ) ||
                            `Room #${id}`}
                        </div>

                        <div className="mt-1 text-xs text-muted-foreground">
                          Room ID: {id}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {asString(
                          room.room_type_id,
                        ) || "-"}
                      </td>

                      <td className="px-5 py-4">
                        {asNumber(
                          room.no_of_rooms_available,
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {asNumber(
                          room.total_max_adults,
                        )}{" "}
                        Adult
                        {asNumber(
                          room.total_max_adults,
                        ) === 1
                          ? ""
                          : "s"}
                        {" + "}
                        {asNumber(
                          room.total_max_childrens,
                        )}{" "}
                        Child
                        {asNumber(
                          room.total_max_childrens,
                        ) === 1
                          ? ""
                          : "ren"}
                      </td>

                      <td className="px-5 py-4">
                        {asBoolean(
                          room.air_conditioner_availability,
                        )
                          ? "Yes"
                          : "No"}
                      </td>

                      <td className="px-5 py-4">
                        {asString(
                          room.check_in_time,
                        ) || "-"}
                        {" / "}
                        {asString(
                          room.check_out_time,
                        ) || "-"}
                      </td>

                      <td className="px-5 py-4">
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

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          {canEdit ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openEdit(
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
                              onClick={() =>
                                setDeleteRoom(
                                  room,
                                )
                              }
                            >
                              <Trash2 className="mr-1 h-4 w-4" />
                              Delete
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!saving) {
            setFormOpen(open);

            if (!open) {
              setEditingRoom(null);
            }
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRoom
                ? "Edit Room"
                : "Add Room"}
            </DialogTitle>

            <DialogDescription>
              Save room information directly to the existing DVI hotel room workflow.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium">
                Room Title *
              </label>

              <Input
                value={
                  roomForm.room_title
                }
                onChange={(event) =>
                  setTextField(
                    "room_title",
                    event.target.value,
                  )
                }
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Room Type ID
              </label>

              <Input
                type="number"
                min="1"
                value={
                  roomForm.room_type_id
                }
                onChange={(event) =>
                  setTextField(
                    "room_type_id",
                    event.target.value,
                  )
                }
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Total Rooms
              </label>

              <Input
                type="number"
                min="0"
                value={
                  roomForm.no_of_rooms
                }
                onChange={(event) =>
                  setTextField(
                    "no_of_rooms",
                    event.target.value,
                  )
                }
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Max Adults
              </label>

              <Input
                type="number"
                min="0"
                value={
                  roomForm.max_adult
                }
                onChange={(event) =>
                  setTextField(
                    "max_adult",
                    event.target.value,
                  )
                }
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Max Children
              </label>

              <Input
                type="number"
                min="0"
                value={
                  roomForm.max_children
                }
                onChange={(event) =>
                  setTextField(
                    "max_children",
                    event.target.value,
                  )
                }
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Check-in Time
              </label>

              <Input
                type="time"
                value={
                  roomForm.check_in_time
                }
                onChange={(event) =>
                  setTextField(
                    "check_in_time",
                    event.target.value,
                  )
                }
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Check-out Time
              </label>

              <Input
                type="time"
                value={
                  roomForm.check_out_time
                }
                onChange={(event) =>
                  setTextField(
                    "check_out_time",
                    event.target.value,
                  )
                }
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                GST Type
              </label>

              <select
                value={
                  roomForm.gst_type
                }
                onChange={(event) =>
                  setTextField(
                    "gst_type",
                    event.target.value,
                  )
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="1">
                  Included
                </option>

                <option value="2">
                  Excluded
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                GST %
              </label>

              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={
                  roomForm.gst_percentage
                }
                onChange={(event) =>
                  setTextField(
                    "gst_percentage",
                    event.target.value,
                  )
                }
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Status
              </label>

              <select
                value={
                  roomForm.status
                    ? "1"
                    : "0"
                }
                onChange={(event) =>
                  setBooleanField(
                    "status",
                    event.target.value ===
                      "1",
                  )
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="1">
                  Active
                </option>

                <option value="0">
                  Inactive
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Air Conditioning
              </label>

              <select
                value={
                  roomForm.ac_availability
                    ? "1"
                    : "0"
                }
                onChange={(event) =>
                  setBooleanField(
                    "ac_availability",
                    event.target.value ===
                      "1",
                  )
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="1">
                  Available
                </option>

                <option value="0">
                  Not Available
                </option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <div className="mb-2 text-sm font-medium">
                Included Meals
              </div>

              <div className="flex flex-wrap gap-5 rounded-md border p-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={
                      roomForm.food_breakfast
                    }
                    onChange={(event) =>
                      setBooleanField(
                        "food_breakfast",
                        event.target.checked,
                      )
                    }
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                  Breakfast
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={
                      roomForm.food_lunch
                    }
                    onChange={(event) =>
                      setBooleanField(
                        "food_lunch",
                        event.target.checked,
                      )
                    }
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                  Lunch
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={
                      roomForm.food_dinner
                    }
                    onChange={(event) =>
                      setBooleanField(
                        "food_dinner",
                        event.target.checked,
                      )
                    }
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                  Dinner
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() =>
                setFormOpen(false)
              }
            >
              Cancel
            </Button>

            <Button
              type="button"
              disabled={saving}
              onClick={() =>
                void saveRoom()
              }
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}

              {editingRoom
                ? "Save Room"
                : "Create Room"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteRoom)}
        onOpenChange={(open) => {
          if (
            !open &&
            !deleting
          ) {
            setDeleteRoom(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete Room
            </DialogTitle>

            <DialogDescription>
              This uses DVI's existing room deletion workflow. Associated room rate-plan, price-book and room-gallery rows may also be deactivated by the backend.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md bg-muted/40 p-4 text-sm">
            {deleteRoom
              ? asString(
                  deleteRoom.room_title,
                ) ||
                `Room #${roomId(
                  deleteRoom,
                )}`
              : ""}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() =>
                setDeleteRoom(null)
              }
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() =>
                void confirmDelete()
              }
            >
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}

              {deleting
                ? "Deleting..."
                : "Delete Room"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}