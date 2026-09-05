import {
  useCallback,
  useEffect,
  useMemo,
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

type AnyRecord = Record<string, unknown>;

type RoomOption = {
  id: number;
  name: string;
};

type RatePlan = {
  id: number;
  rateplanId: string;
  name: string;
  code: string | null;
  mealPlan: string | null;
  currency: string | null;
  occupancy: unknown;
};

const STANDARD_OCCUPANCIES = [
  "SINGLE",
  "DOUBLE",
  "TRIPLE",
  "EXTRABED",
  "CHILD_WITH_BED",
  "CHILD_WITHOUT_BED",
];

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

function dateRange(
  start: string,
  end: string,
) {
  const result: string[] = [];

  const current =
    new Date(
      `${start}T00:00:00.000Z`,
    );

  const last =
    new Date(
      `${end}T00:00:00.000Z`,
    );

  while (
    current.getTime() <=
    last.getTime()
  ) {
    result.push(
      current
        .toISOString()
        .slice(0, 10),
    );

    current.setUTCDate(
      current.getUTCDate() + 1,
    );
  }

  return result;
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
    .map((row) => {
      const item =
        recordValue(row);

      if (!item) {
        return null;
      }

      const id =
        Number(
          item.room_ID ??
            item.room_id ??
            item.id ??
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
            item.room_title ??
              item.room_name ??
              `Room #${id}`,
          ).trim() ||
          `Room #${id}`,
      };
    })
    .filter(
      (
        item,
      ): item is RoomOption =>
        Boolean(item),
    );
}

function numericString(
  value: unknown,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  const number =
    Number(value);

  return Number.isFinite(number)
    ? String(number)
    : "";
}

function extractRateData(
  response: unknown,
  requestedDates: string[],
) {
  const object =
    recordValue(response) ?? {};

  const responseDates =
    Array.isArray(object.dates)
      ? object.dates
          .map(String)
          .filter(Boolean)
      : [];

  const dates =
    responseDates.length
      ? responseDates
      : requestedDates;

  const foundKeys =
    new Set<string>();

  const values: Record<
    string,
    Record<string, string>
  > = {};

  function ensureKey(
    key: string,
  ) {
    const clean =
      key
        .trim()
        .toUpperCase();

    if (!clean) {
      return "";
    }

    foundKeys.add(clean);

    if (!values[clean]) {
      values[clean] = {};
    }

    return clean;
  }

  const rawOccupancies =
    Array.isArray(
      object.occupancies,
    )
      ? object.occupancies
      : [];

  for (
    const occupancy
    of rawOccupancies
  ) {
    if (
      typeof occupancy ===
      "string"
    ) {
      ensureKey(occupancy);
      continue;
    }

    const row =
      recordValue(occupancy);

    if (!row) {
      continue;
    }

    const key =
      ensureKey(
        String(
          row.occupancy ??
            row.occupancyKey ??
            row.occupancy_key ??
            row.key ??
            row.code ??
            row.name ??
            row.type ??
            "",
        ),
      );

    if (!key) {
      continue;
    }

    const rowValues =
      recordValue(
        row.values ??
          row.rates ??
          row.prices,
      );

    for (const date of dates) {
      const value =
        rowValues?.[date] ??
        row[date];

      const normalized =
        numericString(value);

      if (normalized !== "") {
        values[key][date] =
          normalized;
      }
    }
  }

  const otherCollections =
    [
      object.rooms,
      object.rows,
      object.items,
    ];

  for (
    const collection
    of otherCollections
  ) {
    if (!Array.isArray(collection)) {
      continue;
    }

    for (const candidate of collection) {
      const row =
        recordValue(candidate);

      if (!row) {
        continue;
      }

      const directKey =
        String(
          row.occupancy ??
            row.occupancyKey ??
            row.occupancy_key ??
            row.key ??
            row.code ??
            row.type ??
            "",
        );

      if (directKey) {
        const key =
          ensureKey(directKey);

        const rowValues =
          recordValue(
            row.values ??
              row.rates ??
              row.prices,
          );

        for (const date of dates) {
          const normalized =
            numericString(
              rowValues?.[date] ??
                row[date],
            );

          if (
            key &&
            normalized !== ""
          ) {
            values[key][date] =
              normalized;
          }
        }
      }

      for (const date of dates) {
        const dateObject =
          recordValue(row[date]);

        if (!dateObject) {
          continue;
        }

        Object.entries(
          dateObject,
        ).forEach(
          ([rawKey, rawValue]) => {
            const key =
              ensureKey(rawKey);

            const normalized =
              numericString(
                rawValue,
              );

            if (
              key &&
              normalized !== ""
            ) {
              values[key][date] =
                normalized;
            }
          },
        );
      }
    }
  }

  STANDARD_OCCUPANCIES.forEach(
    ensureKey,
  );

  return {
    dates,
    keys: Array.from(
      foundKeys,
    ),
    values,
  };
}

function occupancyLabel(
  key: string,
) {
  return key
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

export default function HotelAdminRates() {
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

  const [plans, setPlans] =
    useState<RatePlan[]>([]);

  const [
    selectedRatePlanId,
    setSelectedRatePlanId,
  ] = useState("");

  const [startDate, setStartDate] =
    useState(dateValue(0));

  const [endDate, setEndDate] =
    useState(dateValue(6));

  const [dates, setDates] =
    useState<string[]>([]);

  const [occupancies, setOccupancies] =
    useState<string[]>([]);

  const [rates, setRates] =
    useState<
      Record<
        string,
        Record<string, string>
      >
    >({});

  const [loadingSetup, setLoadingSetup] =
    useState(true);

  const [loadingPlans, setLoadingPlans] =
    useState(false);

  const [loadingRates, setLoadingRates] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [accessDenied, setAccessDenied] =
    useState(false);

  const canCreate =
    hasHotelAdminPermission(
      context,
      "rates",
      "create",
    );

  const canEdit =
    hasHotelAdminPermission(
      context,
      "rates",
      "edit",
    );

  const canSave =
    canCreate || canEdit;

  const selectedPlan =
    useMemo(
      () =>
        plans.find(
          (plan) =>
            plan.rateplanId ===
            selectedRatePlanId,
        ) ?? null,
      [
        plans,
        selectedRatePlanId,
      ],
    );

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
            "rates",
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
            : "Failed to load pricing.",
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

  useEffect(() => {
    if (
      !hotelId ||
      !roomId ||
      accessDenied
    ) {
      setPlans([]);
      setSelectedRatePlanId("");
      return;
    }

    let cancelled = false;

    async function loadPlans() {
      try {
        setLoadingPlans(true);
        setError("");

        const response =
          await HotelAdminAPI.ratePlans(
            hotelId,
            roomId,
          );

        if (cancelled) {
          return;
        }

        const nextPlans =
          Array.isArray(
            response.items,
          )
            ? response.items
            : [];

        setPlans(nextPlans);

        setSelectedRatePlanId(
          nextPlans[0]
            ?.rateplanId ??
            "",
        );
      } catch (err) {
        if (!cancelled) {
          setPlans([]);
          setSelectedRatePlanId("");

          setError(
            err instanceof Error
              ? err.message
              : "Failed to load rate plans.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingPlans(false);
        }
      }
    }

    void loadPlans();

    return () => {
      cancelled = true;
    };
  }, [
    hotelId,
    roomId,
    accessDenied,
  ]);

  const loadRates =
    useCallback(async () => {
      if (
        !hotelId ||
        !roomId ||
        !selectedRatePlanId
      ) {
        setDates(
          dateRange(
            startDate,
            endDate,
          ),
        );

        setOccupancies(
          STANDARD_OCCUPANCIES,
        );

        setRates({});
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
        setLoadingRates(true);
        setError("");

        const requestedDates =
          dateRange(
            startDate,
            endDate,
          );

        const response =
          await HotelAdminAPI.rates(
            hotelId,
            {
              startDate,
              endDate,
              roomId,
              rateplanId:
                selectedRatePlanId,
            },
          );

        const normalized =
          extractRateData(
            response,
            requestedDates,
          );

        setDates(
          normalized.dates,
        );

        setOccupancies(
          normalized.keys,
        );

        setRates(
          normalized.values,
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load rates.",
        );
      } finally {
        setLoadingRates(false);
      }
    }, [
      hotelId,
      roomId,
      selectedRatePlanId,
      startDate,
      endDate,
    ]);

  useEffect(() => {
    void loadRates();
  }, [loadRates]);

  function updateRate(
    occupancy: string,
    date: string,
    value: string,
  ) {
    if (
      value &&
      !/^\d*\.?\d*$/.test(value)
    ) {
      return;
    }

    setRates((current) => ({
      ...current,
      [occupancy]: {
        ...(current[
          occupancy
        ] ?? {}),
        [date]: value,
      },
    }));
  }

  async function saveRates() {
    if (
      !hotelId ||
      !roomId ||
      !selectedPlan ||
      !canSave
    ) {
      return;
    }

    const items =
      dates
        .map((date) => {
          const occupancyRates:
            Record<
              string,
              number
            > = {};

          occupancies.forEach(
            (occupancy) => {
              const raw =
                rates[
                  occupancy
                ]?.[date];

              if (
                raw ===
                  undefined ||
                raw.trim() ===
                  ""
              ) {
                return;
              }

              const value =
                Number(raw);

              if (
                Number.isFinite(
                  value,
                ) &&
                value >= 0
              ) {
                occupancyRates[
                  occupancy
                ] = value;
              }
            },
          );

          if (
            Object.keys(
              occupancyRates,
            ).length === 0
          ) {
            return null;
          }

          return {
            room_id: roomId,
            startDate: date,
            endDate: date,
            occupancyRates,
            rateplanId:
              selectedPlan.rateplanId,
            ratePlanName:
              selectedPlan.name,
          };
        })
        .filter(
          (
            item,
          ): item is NonNullable<
            typeof item
          > => Boolean(item),
        );

    if (!items.length) {
      toast.error(
        "Enter at least one rate before saving.",
      );
      return;
    }

    try {
      setSaving(true);

      await HotelAdminAPI.saveRates(
        hotelId,
        { items },
      );

      toast.success(
        "Pricing saved successfully",
      );

      await loadRates();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to save pricing",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loadingSetup) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="ml-2 text-sm text-muted-foreground">
          Loading pricing...
        </span>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
        You do not have permission to view rates.
      </div>
    );
  }

  if (
    error &&
    !hotelId
  ) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Rates & Pricing
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            {hotelName
              ? `${hotelName} · `
              : ""}
            Manage real DVI room occupancy pricing.
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Rate Plan
            </label>

            <select
              value={
                selectedRatePlanId
              }
              disabled={
                loadingPlans ||
                plans.length === 0
              }
              onChange={(event) =>
                setSelectedRatePlanId(
                  event.target.value,
                )
              }
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
            >
              {plans.length === 0 ? (
                <option value="">
                  {loadingPlans
                    ? "Loading..."
                    : "No active rate plans"}
                </option>
              ) : null}

              {plans.map(
                (plan) => (
                  <option
                    key={plan.id}
                    value={
                      plan.rateplanId
                    }
                  >
                    {plan.name ||
                      plan.rateplanId}
                  </option>
                ),
              )}
            </select>
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

        {selectedPlan ? (
          <div className="mt-4 rounded-lg bg-muted/40 px-4 py-3 text-sm">
            <span className="font-medium">
              {selectedPlan.name}
            </span>

            {selectedPlan.code
              ? ` · ${selectedPlan.code}`
              : ""}

            {selectedPlan.mealPlan
              ? ` · ${selectedPlan.mealPlan}`
              : ""}

            {selectedPlan.currency
              ? ` · ${selectedPlan.currency}`
              : ""}
          </div>
        ) : null}
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
              Occupancy Price Book
            </div>

            <div className="mt-1 text-xs text-muted-foreground">
              Prices are saved directly into the existing DVI room price-book workflow.
            </div>
          </div>

          {loadingRates ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-max text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="sticky left-0 z-10 min-w-44 bg-muted/40 px-4 py-3 text-left">
                  Occupancy
                </th>

                {dates.map(
                  (date) => (
                    <th
                      key={date}
                      className="min-w-36 px-3 py-3 text-left"
                    >
                      {date}
                    </th>
                  ),
                )}
              </tr>
            </thead>

            <tbody className="divide-y">
              {occupancies.map(
                (occupancy) => (
                  <tr key={occupancy}>
                    <td className="sticky left-0 bg-white px-4 py-3 font-medium">
                      {occupancyLabel(
                        occupancy,
                      )}
                    </td>

                    {dates.map(
                      (date) => (
                        <td
                          key={`${occupancy}-${date}`}
                          className="px-3 py-2"
                        >
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              rates[
                                occupancy
                              ]?.[
                                date
                              ] ?? ""
                            }
                            disabled={
                              !canSave ||
                              !selectedRatePlanId
                            }
                            onChange={(
                              event,
                            ) =>
                              updateRate(
                                occupancy,
                                date,
                                event
                                  .target
                                  .value,
                              )
                            }
                            className="w-32"
                            placeholder="0"
                          />
                        </td>
                      ),
                    )}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t px-5 py-4">
          {!canSave ? (
            <span className="text-sm text-muted-foreground">
              View-only pricing access
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              Blank cells are left unchanged.
            </span>
          )}

          <Button
            disabled={
              !canSave ||
              saving ||
              loadingRates ||
              !selectedRatePlanId ||
              dates.length === 0
            }
            onClick={() =>
              void saveRates()
            }
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}

            {saving
              ? "Saving..."
              : "Save Pricing"}
          </Button>
        </div>
      </div>
    </div>
  );
}