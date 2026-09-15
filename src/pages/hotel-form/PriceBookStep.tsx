/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useQuery,
  useQueries,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type { PricebookRow } from "./HotelForm";
import { PriceBookStepView } from "./PriceBookStepView";
import { formatCurrency, OCCUPANCY_FIELDS, ROOM_GRID_OCCUPANCY_TYPES, formatDateLabel, LOCAL_VALIDATION_MESSAGES, uiErrorMessage } from "./priceBook.utils";
import type { ApiCtx, AmenityOption, RoomRow, RatePlanOption, RangeViewOccupancyRow, MealRangeRow, AmenityRangeRow } from "./priceBook.utils";
export default function PriceBookStep({
  api,
  hotelId,
  onPrev,
  onNext,
}: {
  api: ApiCtx;
  hotelId: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  const qc = useQueryClient();
  const [hotelDetailsError, setHotelDetailsError] = useState<string>("");
  const [mealError, setMealError] = useState<string>("");
  const [amenitiesError, setAmenitiesError] = useState<string>("");
  const [roomError, setRoomError] = useState<string>("");
  const [hotelDetailsSuccess, setHotelDetailsSuccess] = useState<string>("");
  const [mealSuccess, setMealSuccess] = useState<string>("");
  const [amenitiesSuccess, setAmenitiesSuccess] = useState<string>("");
  const [roomSuccess, setRoomSuccess] = useState<string>("");
  const [roomStartDateError, setRoomStartDateError] = useState<string>("");
  const [roomEndDateError, setRoomEndDateError] = useState<string>("");
  const [roomDateValidationMessage, setRoomDateValidationMessage] = useState<string>("");
  const toNum = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const toMaybeNum = (v: any) => {
    if (v === "" || v === null || v === undefined) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const ymd = (d: string) => {
    const s = String(d ?? "").trim();
    if (!s) return "";
    const ymdFormat = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymdFormat) return `${ymdFormat[1]}-${ymdFormat[2]}-${ymdFormat[3]}`;
    const dmyFormat = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (dmyFormat) return `${dmyFormat[3]}-${dmyFormat[2]}-${dmyFormat[1]}`;
    const dt = new Date(s);
    return Number.isNaN(dt.getTime()) ? "" : dt.toISOString().slice(0, 10);
  };
  /* -----------------------------------------------------------
   *  STATE: (kept) Margin & Meal section state (unchanged)
   * --------------------------------------------------------- */
  const [hotelMargin, setHotelMargin] = useState<string>("");
  const [hotelMarginGstType, setHotelMarginGstType] = useState<string>("");
  const [hotelMarginGstPercentage, setHotelMarginGstPercentage] =
    useState<string>("");
  const [breakfastCost, setBreakfastCost] = useState<string>("");
  const [lunchCost, setLunchCost] = useState<string>("");
  const [dinnerCost, setDinnerCost] = useState<string>("");
  const [mealStartDate, setMealStartDate] = useState<string>("");
  const [mealEndDate, setMealEndDate] = useState<string>("");
  const mealStartRef = useRef<HTMLInputElement | null>(null);
  const mealEndRef = useRef<HTMLInputElement | null>(null);
  /* -----------------------------------------------------------
   *  NEW: Amenities Details section state
   * --------------------------------------------------------- */
  const [amenitiesStartDate, setAmenitiesStartDate] = useState<string>("");
  const [amenitiesEndDate, setAmenitiesEndDate] = useState<string>("");
  const amenitiesStartRef = useRef<HTMLInputElement | null>(null);
  const amenitiesEndRef = useRef<HTMLInputElement | null>(null);
  const [amenityCharges, setAmenityCharges] = useState<Record<number, { hours?: string; day?: string }>>({});
    /* -----------------------------------------------------------
   *  NEW: AxisRooms-compatible Room Details state
   * --------------------------------------------------------- */
  const [selectedRoomIds, setSelectedRoomIds] = useState<number[]>([]);
  const [selectedRatePlanIds, setSelectedRatePlanIds] = useState<
    Record<number, string>
  >({});
  const [occupancyDrafts, setOccupancyDrafts] = useState<
    Record<string, Record<string, string>>
  >({});
  const [roomStartDate, setRoomStartDate] = useState<string>("");
  const [roomEndDate, setRoomEndDate] = useState<string>("");
  const roomStartRef = useRef<HTMLInputElement | null>(null);
  const roomEndRef = useRef<HTMLInputElement | null>(null);
  /* -----------------------------------------------------------
   *  Room Availability â€” own state (self-contained card)
   * --------------------------------------------------------- */
  const [availRoomId, setAvailRoomId] = useState<number | null>(null);
  const [availStartDate, setAvailStartDate] = useState<string>("");
  const [availEndDate, setAvailEndDate] = useState<string>("");
  const availStartRef = useRef<HTMLInputElement | null>(null);
  const availEndRef = useRef<HTMLInputElement | null>(null);
  const [availFreeRooms, setAvailFreeRooms] = useState<string>("");
  const [availError, setAvailError] = useState<string>("");
  const [availSuccess, setAvailSuccess] = useState<string>("");
  /* ================= Static dropdowns ================= */
  const gstTypes = [
    { id: "Included", name: "Included" },
    { id: "Excluded", name: "Excluded" },
  ];
  const gstPercentages = [
    { id: "0", name: "0% GST - %0" },
    { id: "5", name: "5% GST - %5" },
    { id: "12", name: "12% GST - %12" },
    { id: "18", name: "18% GST - %18" },
    { id: "28", name: "28% GST - %28" },
  ];
  /* ================= Load: Basic Info to prefill margin ================= */
  const { data: basicInfoRaw } = useQuery({
    queryKey: ["hotel-basic-info-for-pricebook", hotelId],
    enabled: !!hotelId,
    queryFn: () =>
      api
        .apiGetFirst([
          `/api/v1/hotels/${hotelId}`,
          `/api/v1/hotels/${hotelId}/basic`,
          `/api/v1/hotels/basic?hotelId=${hotelId}`,
        ])
        .catch(() => null),
  });
  const toUiGstType = (val: any): "Included" | "Excluded" => {
    const s = String(val ?? "").toLowerCase();
    if (val === 1 || s.includes("include") || s === "incl" || s === "included")
      return "Included";
    if (val === 2 || s.includes("exclude") || s === "excl" || s === "exclusive")
      return "Excluded";
    return "Included";
  };
  const toApiGstType = (val: string): number => {
    const s = String(val ?? "").toLowerCase();
    if (s.includes("exclude")) return 2;
    return 1;
  };
  useEffect(() => {
    if (!basicInfoRaw) return;
    const row = Array.isArray(basicInfoRaw)
      ? basicInfoRaw[0] ?? null
      : basicInfoRaw;
    if (!row) return;
    const margin = row.hotel_margin ?? row.margin ?? row.hotelMargin ?? "";
    const gstTypeUi = toUiGstType(
      row.hotel_margin_gst_type ??
        row.margin_gst_type ??
        row.gst_type ??
        row.hotel_gst_type ??
        1
    );
    const gstPctRaw =
      row.hotel_margin_gst_percentage ??
      row.margin_gst_percentage ??
      row.gst_percentage ??
      row.hotel_gst_percentage ??
      "";
    const gstPctId =
      gstPctRaw === "" || gstPctRaw === null || gstPctRaw === undefined
        ? ""
        : String(Number(gstPctRaw));
    setHotelMargin(String(margin ?? ""));
    setHotelMarginGstType(gstTypeUi);
    setHotelMarginGstPercentage(gstPctId);
  }, [basicInfoRaw]);
  const basicRequiredFields = useMemo(() => {
    const row = Array.isArray(basicInfoRaw)
      ? basicInfoRaw[0] ?? null
      : basicInfoRaw;
    const code = String(row?.hotel_code ?? row?.code ?? "").trim();
    const email = String(
      row?.hotel_email_id ?? row?.hotel_email ?? row?.email ?? "",
    ).trim();
    return {
      hotel_code: code || `DVI${hotelId}`,
      hotel_email_id: email || "noreply@dvi.co.in",
    };
  }, [basicInfoRaw, hotelId]);
  /* ================= Load: Amenities list ================= */
  const { data: amenityOptions = [] as AmenityOption[] } = useQuery({
    queryKey: ["hotel-amenities", hotelId],
    enabled: !!hotelId,
    queryFn: async () => {
      const raw = await api
        .apiGetFirst([
          `/api/v1/hotels/${hotelId}/amenities`,
          `/api/v1/hotel-amenities?hotelId=${hotelId}`,
          `/api/v1/hotels/amenities?hotelId=${hotelId}`,
        ])
        .catch(() => []);
      const rows = Array.isArray(raw)
        ? raw
        : raw?.items ?? raw?.data ?? raw?.rows ?? [];
      return rows.map((r: any) => ({
        id:
          r.hotel_amenities_id ??
          r.amenity_id ??
          r.id ??
          (Number.isFinite(Number(r.value)) ? Number(r.value) : 0),
        name: r.amenities_title ?? r.name ?? r.title ?? "Amenity",
      }));
    },
  });
  useEffect(() => {
    if (!amenityOptions.length) return;
    setAmenityCharges((prev) => {
      const next = { ...prev };
      amenityOptions.forEach((a) => {
        if (!next[a.id]) next[a.id] = { hours: "", day: "" };
      });
      return next;
    });
  }, [amenityOptions]);
  /* ================= Load: Rooms list ================= */
  const { data: rooms = [] as RoomRow[] } = useQuery({
    queryKey: ["hotel-rooms-for-pricebook", hotelId],
    enabled: !!hotelId,
    queryFn: async () => {
      const raw = await api
        .apiGetFirst([
          `/api/v1/hotels/${hotelId}/rooms`,
          `/api/v1/rooms?hotelId=${hotelId}`,
          `/api/v1/hotel-rooms?hotelId=${hotelId}`,
        ])
        .catch(() => []);
      const rows = Array.isArray(raw)
        ? raw
        : raw?.items ?? raw?.data ?? raw?.rows ?? [];
      return rows.map((r: any) => ({
        room_ID: Number(r.room_ID ?? r.room_id ?? r.id),
        room_title: r.room_title ?? r.title ?? null,
        room_ref_code: r.room_ref_code ?? r.room_type ?? null,
        room_type_id: r.room_type_id ?? null,
        gst_type: r.gst_type,
        gst_percentage: r.gst_percentage,
      }));
    },
  });
    const toRatePlanOptions = useCallback((raw: any): RatePlanOption[] => {
    const rows = Array.isArray(raw)
      ? raw
      : raw?.items ?? [];

    return rows
      .map((row: any) => ({
        ratePlanCode: row.ratePlanCode ?? row.rate_plan_code ?? null,
        rateplanId: String(
          row.rateplanId ??
            row.defaultRateplanId ??
            row.default_rateplan_id ??
            ""
        ),
        ratePlanName: String(
          row.ratePlanName ??
            row.rate_plan_name ??
            row.description ??
            row.rateplanId ??
            "Rate Plan"
        ),
        description: row.description ?? null,
        occupancy: Array.isArray(row.occupancy) ? row.occupancy : [],
        isFallback: Boolean(row.isFallback),
        includesBreakfast: Number(row.includesBreakfast ?? 0),
        includesLunch: Number(row.includesLunch ?? 0),
        includesDinner: Number(row.includesDinner ?? 0),
      }))
      .filter((row: RatePlanOption) => row.rateplanId);
  }, []);

  const roomRatePlanQueries = useQueries({
    queries: rooms.map((room) => {
      const roomId = Number(room.room_ID);

      return {
        queryKey: ["hotel-room-rateplans", hotelId, roomId],
        enabled: !!hotelId && roomId > 0,
        queryFn: async () =>
          api
            .apiGetFirst([
              `/api/v1/hotels/${hotelId}/rooms/${roomId}/rateplans`,
            ])
            .catch(() => ({ items: [] })),
      };
    }),
  });

  const roomRatePlansByRoom = useMemo<
    Record<number, RatePlanOption[]>
  >(() => {
    const next: Record<number, RatePlanOption[]> = {};

    rooms.forEach((room, index) => {
      const roomId = Number(room.room_ID);
      next[roomId] = toRatePlanOptions(roomRatePlanQueries[index]?.data);
    });

    return next;
  }, [roomRatePlanQueries, rooms, toRatePlanOptions]);

  const roomRatePlansLoading = roomRatePlanQueries.some(
    (query) => query.isLoading
  );

  useEffect(() => {
    setSelectedRatePlanIds((prev) => {
      const next = { ...prev };
      let changed = false;

      rooms.forEach((room) => {
        const roomId = Number(room.room_ID);
        const plans = roomRatePlansByRoom[roomId] || [];
        const current = next[roomId];

        if (plans.length === 0) {
          if (current) {
            delete next[roomId];
            changed = true;
          }
          return;
        }

        if (
          !current ||
          !plans.some((plan) => plan.rateplanId === current)
        ) {
          next[roomId] = plans[0].rateplanId;
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [roomRatePlansByRoom, rooms]);

  useEffect(() => {
    setSelectedRoomIds((prev) => {
      const availableRoomIds = new Set(
        rooms.map((room) => Number(room.room_ID))
      );
      const next = prev.filter((roomId) =>
        availableRoomIds.has(roomId)
      );

      return next.length === prev.length ? prev : next;
    });
  }, [rooms]);

  const getRoomSelectionKey = useCallback(
    (roomId: number) => {
      const rateplanId = selectedRatePlanIds[roomId];
      return rateplanId ? `${roomId}:${rateplanId}` : "";
    },
    [selectedRatePlanIds]
  );

  const getRoomOccupancyDraft = useCallback(
    (roomId: number) => {
      const key = getRoomSelectionKey(roomId);
      return key ? occupancyDrafts[key] || {} : {};
    },
    [getRoomSelectionKey, occupancyDrafts]
  );

  const activeRangeStart = roomStartDate || "";
  const activeRangeEnd = roomEndDate || "";
  const normalizedRangeStart = ymd(activeRangeStart) || activeRangeStart;
  const normalizedRangeEnd = ymd(activeRangeEnd) || activeRangeEnd;
  const normalizedMealStart = ymd(mealStartDate) || mealStartDate;
  const normalizedMealEnd = ymd(mealEndDate) || mealEndDate;
  const normalizedAmenitiesStart =
    ymd(amenitiesStartDate) || amenitiesStartDate;
  const normalizedAmenitiesEnd =
    ymd(amenitiesEndDate) || amenitiesEndDate;

  const hasRoomRatePlanSelection = rooms.some((room) =>
    Boolean(selectedRatePlanIds[Number(room.room_ID)])
  );

  const canLoadRangeView = Boolean(
    hotelId &&
      hasRoomRatePlanSelection &&
      normalizedRangeStart &&
      normalizedRangeEnd
  );

  const canLoadMealRangeView = Boolean(
    hotelId && normalizedMealStart && normalizedMealEnd
  );

  const canLoadAmenitiesRangeView = Boolean(
    hotelId && normalizedAmenitiesStart && normalizedAmenitiesEnd
  );

  const roomRangeQueries = useQueries({
    queries: rooms.map((room) => {
      const roomId = Number(room.room_ID);
      const rateplanId = selectedRatePlanIds[roomId] || "";

      return {
        queryKey: [
          "hotel-pricebook-range-view",
          hotelId,
          roomId,
          rateplanId,
          normalizedRangeStart,
          normalizedRangeEnd,
        ],
        enabled: canLoadRangeView && !!rateplanId,
        queryFn: async () => {
          const params = new URLSearchParams();
          params.set("startDate", normalizedRangeStart);
          params.set("endDate", normalizedRangeEnd);
          params.set("roomId", String(roomId));
          params.set("rateplanId", rateplanId);

          return api.apiGetFirst([
            `/api/v1/hotels/${hotelId}/pricebook/range-view?${params.toString()}`,
          ]);
        },
      };
    }),
  });

  const rangeViewDates = useMemo<string[]>(() => {
    const dates = roomRangeQueries.flatMap<string>((query) => {
      const data = query.data as any;

      return Array.isArray(data?.dates)
        ? data.dates.map((date: any) => String(date))
        : [];
    });

    return Array.from(new Set(dates)).sort();
  }, [roomRangeQueries]);

  const rangeViewOccupancyRows = useMemo<
    RangeViewOccupancyRow[]
  >(
    () =>
      roomRangeQueries.flatMap((query) => {
        const data = query.data as any;

        return Array.isArray(data?.occupancies)
          ? (data.occupancies as RangeViewOccupancyRow[])
          : [];
      }),
    [roomRangeQueries]
  );

  const refetchRangeView = useCallback(async () => {
    await Promise.all(
      roomRangeQueries.map((query) => query.refetch())
    );
  }, [roomRangeQueries]);
  const {
    data: mealRangeRaw,
    refetch: refetchMealRangeView,
  } = useQuery({
    queryKey: ["hotel-meal-pricebook-range-view", hotelId, normalizedMealStart, normalizedMealEnd],
    enabled: canLoadMealRangeView,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("startDate", normalizedMealStart);
      params.set("endDate", normalizedMealEnd);
      return api.apiGetFirst([`/api/v1/hotels/${hotelId}/meal-pricebook/range-view?${params.toString()}`]);
    },
  });
  const mealRangeDates = useMemo<string[]>(
    () => (canLoadMealRangeView && Array.isArray(mealRangeRaw?.dates) ? mealRangeRaw.dates : []),
    [canLoadMealRangeView, mealRangeRaw]
  );
  const mealRangeRows = useMemo<MealRangeRow[]>(
    () => (canLoadMealRangeView && Array.isArray(mealRangeRaw?.rows) ? mealRangeRaw.rows : []),
    [canLoadMealRangeView, mealRangeRaw]
  );
  const {
    data: amenitiesRangeRaw,
    refetch: refetchAmenitiesRangeView,
  } = useQuery({
    queryKey: ["hotel-amenities-pricebook-range-view", hotelId, normalizedAmenitiesStart, normalizedAmenitiesEnd],
    enabled: canLoadAmenitiesRangeView,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("startDate", normalizedAmenitiesStart);
      params.set("endDate", normalizedAmenitiesEnd);
      return api.apiGetFirst([`/api/v1/hotels/${hotelId}/amenities-pricebook/range-view?${params.toString()}`]);
    },
  });
  const amenitiesRangeDates = useMemo<string[]>(
    () => (canLoadAmenitiesRangeView && Array.isArray(amenitiesRangeRaw?.dates) ? amenitiesRangeRaw.dates : []),
    [canLoadAmenitiesRangeView, amenitiesRangeRaw]
  );
  const amenitiesRangeRows = useMemo<AmenityRangeRow[]>(
    () => (canLoadAmenitiesRangeView && Array.isArray(amenitiesRangeRaw?.rows) ? amenitiesRangeRaw.rows : []),
    [canLoadAmenitiesRangeView, amenitiesRangeRaw]
  );
  /* -----------------------------------------------------------
   *  MUTATIONS
   * --------------------------------------------------------- */
  const hotelDetailsMut = useMutation({
    mutationFn: async () => {
      const payload = {
        hotel_margin: toMaybeNum(hotelMargin) ?? 0,
        hotel_margin_gst_type: toApiGstType(hotelMarginGstType),
        hotel_margin_gst_percentage: toMaybeNum(hotelMarginGstPercentage) ?? 0,
        hotel_code: basicRequiredFields.hotel_code,
        hotel_email_id: basicRequiredFields.hotel_email_id,
        hotel_email: basicRequiredFields.hotel_email_id,
      };
      const patchPath = `/api/v1/hotels/${hotelId}`;
      if (api.apiPatch) {
        return api.apiPatch(patchPath, payload);
      }
      return api.apiPost(patchPath, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hotel-basic-info-for-pricebook", hotelId] });
      setHotelDetailsError("");
      setHotelDetailsSuccess("Hotel details updated successfully.");
    },
    onError: (e: any) => {
      setHotelDetailsSuccess("");
      setHotelDetailsError(
        uiErrorMessage(e, "Hotel details update failed. Please try again.")
      );
    },
  });
  const mealMut = useMutation({
    mutationFn: async (body: {
      startDate: string;
      endDate: string;
      breakfastCost?: number;
      lunchCost?: number;
      dinnerCost?: number;
    }) => {
      const payload: any = {
        startDate: ymd(body.startDate) || body.startDate,
        endDate: ymd(body.endDate) || body.endDate,
      };
      if (Number.isFinite(body.breakfastCost as number))
        payload.breakfastCost = body.breakfastCost;
      if (Number.isFinite(body.lunchCost as number))
        payload.lunchCost = body.lunchCost;
      if (Number.isFinite(body.dinnerCost as number))
        payload.dinnerCost = body.dinnerCost;
      const attempts: Array<{ path: string; body: any }> = [
        {
          path: `/api/v1/hotels/${hotelId}/meal-pricebook`,
          body: payload,
        },
        {
          path: `/api/v1/hotels/meal-pricebook/${hotelId}`,
          body: payload,
        },
        {
          path: `/api/v1/hotel-meal-pricebook`,
          body: { ...payload, hotel_id: toNum(hotelId) },
        },
        {
          path: `/api/v1/hotel-meal-pricebook?hotelId=${hotelId}`,
          body: payload,
        },
        {
          path: `/api/v1/hotels/${hotelId}/meal-price-book`,
          body: payload,
        },
      ];
      let lastErr: any;
      for (const attempt of attempts) {
        try {
          return await api.apiPost(attempt.path, attempt.body);
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr || new Error("No meal pricebook endpoint available");
    },
    onSuccess: () => {
      setMealError("");
      setMealSuccess("Meal details saved successfully.");
      refetchMealRangeView();
    },
    onError: (e: any) => {
      setMealSuccess("");
      setMealError(uiErrorMessage(e, "Meal save failed. Please try again."));
    },
  });
  const amenityMut = useMutation({
    mutationFn: async () => {
      const amenitiesStart = amenitiesStartDate || amenitiesStartRef.current?.value || "";
      const amenitiesEnd = amenitiesEndDate || amenitiesEndRef.current?.value || "";
      if (!amenitiesStart || !amenitiesEnd) {
        throw new Error("Start date and End date should be required.");
      }
      const startDate = ymd(amenitiesStart);
      const endDate = ymd(amenitiesEnd);
      const filled = amenityOptions
        .map((a) => {
          const val = amenityCharges[a.id] || {};
          return {
            amenityId: a.id,
            hoursCharge: toMaybeNum(val.hours),
            dayCharge: toMaybeNum(val.day),
          };
        })
        .filter((x) => x.hoursCharge !== undefined || x.dayCharge !== undefined);
      if (!filled.length) {
        throw new Error("Please enter at least one price for the amenities.");
      }
      const results: any[] = [];
      for (const row of filled) {
        const payload = {
          startDate,
          endDate,
          hoursCharge: row.hoursCharge,
          dayCharge: row.dayCharge,
        };
        const primary = `/api/v1/hotels/${hotelId}/amenities/${row.amenityId}/pricebook`;
        const alias = `/api/v1/hotel-amenities-pricebook?hotelId=${hotelId}&amenityId=${row.amenityId}`;
        let err: any;
        try {
          results.push(await api.apiPost(primary, payload));
          continue;
        } catch (e) {
          err = e;
        }
        results.push(
          await api.apiPost(alias, payload).catch((e) => {
            throw err || e;
          })
        );
      }
      return results;
    },
    onSuccess: () => {
      setAmenitiesError("");
      setAmenitiesSuccess("Amenities price book saved successfully.");
      qc.invalidateQueries({ queryKey: ["hotel-amenities", hotelId] });
      refetchAmenitiesRangeView();
    },
    onError: (e: any) => {
      setAmenitiesSuccess("");
      setAmenitiesError(
        uiErrorMessage(e, "Amenities save failed. Please try again.")
      );
    },
  });
  const roomMut = useMutation({
    mutationFn: async (roomIds: number[]) => {
      if (!rooms.length) {
        throw new Error("No rooms to update");
      }

      const targetRoomIds = Array.from(
        new Set(
          roomIds
            .map((roomId) => Number(roomId))
            .filter((roomId) => Number.isFinite(roomId) && roomId > 0)
        )
      );

      if (!targetRoomIds.length) {
        throw new Error("Please select at least one room.");
      }

      const roomStart =
        roomStartDate || roomStartRef.current?.value || "";
      const roomEnd =
        roomEndDate || roomEndRef.current?.value || "";

      if (!roomStart && !roomEnd) {
        throw new Error("Start date and End date should be required.");
      }

      if (!roomStart) {
        throw new Error("Start date should be required.");
      }

      if (!roomEnd) {
        throw new Error("End date should be required.");
      }

      const payloadItems = targetRoomIds.map((roomId) => {
        const room = rooms.find(
          (item) => Number(item.room_ID) === roomId
        );

        if (!room) {
          throw new Error("Room selection is required.");
        }

        const selectedRatePlanId =
          selectedRatePlanIds[roomId] || "";

        if (!selectedRatePlanId) {
          throw new Error("Rate plan selection is required.");
        }

        const selectedRatePlan =
          (roomRatePlansByRoom[roomId] || []).find(
            (plan) => plan.rateplanId === selectedRatePlanId
          ) || null;

        const roomSelectionKey =
          `${roomId}:${selectedRatePlanId}`;

        const currentOccupancyDraft =
          occupancyDrafts[roomSelectionKey] || {};

        const occupancyRates = Object.fromEntries(
          Object.entries(currentOccupancyDraft)
            .filter(([key]) =>
              OCCUPANCY_FIELDS.includes(
                key as (typeof OCCUPANCY_FIELDS)[number]
              )
            )
            .map(([key, value]) => [
              key,
              toMaybeNum(value),
            ])
            .filter(([, value]) => value !== undefined)
        ) as Record<string, number>;

        if (Object.keys(occupancyRates).length === 0) {
          throw new Error(
            "Please enter at least one price for the rooms."
          );
        }

        return {
          hotel_id: toNum(hotelId),
          room_id: roomId,
          axisroomsRoomId:
            room.room_ref_code || undefined,
          startDate: ymd(roomStart) || roomStart,
          endDate: ymd(roomEnd) || roomEnd,
          ratePlanCode:
            selectedRatePlan?.ratePlanCode || undefined,
          rateplanId: selectedRatePlanId,
          ratePlanName:
            selectedRatePlan?.ratePlanName ||
            selectedRatePlanId,
          occupancyRates,
          roomPrice:
            occupancyRates.DOUBLE ??
            occupancyRates.SINGLE,
          extraBed: occupancyRates.EXTRABED,
          childWithBed: occupancyRates.CHILD_WITH_BED,
          childWithoutBed:
            occupancyRates.CHILD_WITHOUT_BED,
          status: 1,
        };
      });

      const payload = {
        items: payloadItems,
        status: 1,
      };

      const paths = [
        `/api/v1/hotels/${hotelId}/rooms/pricebook/bulk`,
        `/api/v1/hotel-room-pricebook/bulk?hotelId=${hotelId}`,
        `/api/v1/hotels/${hotelId}/room-price-book/bulk`,
      ];

      let lastErr: any;

      for (const p of paths) {
        try {
          return await api.apiPost(p, payload);
        } catch (e) {
          lastErr = e;
        }
      }

      throw (
        lastErr ||
        new Error("No room pricebook endpoint available")
      );
    },
  });
  const renderedRangeDates = useMemo(() => rangeViewDates, [rangeViewDates]);
  /* -----------------------------------------------------------
   *  Room Availability â€” self-contained mutation + range-view query
   *  Uses own availRoomId / availStartDate / availEndDate state
   * --------------------------------------------------------- */
  const availSelectedRoom = useMemo(
    () => rooms.find((r) => Number(r.room_ID) === availRoomId) ?? null,
    [rooms, availRoomId]
  );
  useEffect(() => {
    if (rooms.length > 0 && availRoomId === null) {
      setAvailRoomId(Number(rooms[0].room_ID));
    }
  }, [rooms, availRoomId]);
  const availMut = useMutation({
    mutationFn: async () => {
      if (!availRoomId) throw new Error("Please select a room.");
      if (!availStartDate || !availEndDate) throw new Error("Please select a date range.");
      if (availFreeRooms === "") throw new Error("Please enter the number of free rooms.");
      const s = ymd(availStartDate) || availStartDate;
      const e = ymd(availEndDate) || availEndDate;
      return api.apiPost(
        `/api/v1/hotels/${hotelId}/rooms/${availRoomId}/availability`,
        { items: [{ startDate: s, endDate: e, freeRooms: Number(availFreeRooms) }] }
      );
    },
    onSuccess: () => {
      setAvailError("");
      setAvailSuccess("Room availability saved successfully.");
      setAvailFreeRooms("");
      qc.invalidateQueries({
        queryKey: ["hotel-room-avail-range", hotelId, availRoomId, ymd(availStartDate) || availStartDate, ymd(availEndDate) || availEndDate],
      });
    },
    onError: (e: any) => {
      setAvailSuccess("");
      setAvailError(e?.message || "Failed to save availability.");
    },
  });
  const normalizedAvailStart = ymd(availStartDate) || availStartDate;
  const normalizedAvailEnd = ymd(availEndDate) || availEndDate;
  const canLoadAvailView = Boolean(
    hotelId && availRoomId && normalizedAvailStart && normalizedAvailEnd
  );
  const { data: availRangeRaw, refetch: refetchAvailView } = useQuery({
    queryKey: ["hotel-room-avail-range", hotelId, availRoomId, normalizedAvailStart, normalizedAvailEnd],
    enabled: canLoadAvailView,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("startDate", normalizedAvailStart);
      params.set("endDate", normalizedAvailEnd);
      return api.apiGetFirst([
        `/api/v1/hotels/${hotelId}/rooms/${availRoomId}/availability/range-view?${params.toString()}`,
      ]);
    },
  });
  const availViewDates = useMemo<string[]>(
    () => (canLoadAvailView && Array.isArray(availRangeRaw?.dates) ? availRangeRaw.dates : []),
    [canLoadAvailView, availRangeRaw]
  );
  type RoomAvailabilityRestrictionView = {
    cta: boolean;
    ctd: boolean;
    stopsell: boolean;
  };
  type RoomAvailabilityDateView = {
    free: number | null;
    source?: string;
    restrictions: RoomAvailabilityRestrictionView;
  };
  const toRestrictionBool = (value: unknown): boolean => {
    if (typeof value === "boolean") return value;
    const normalized = String(value ?? "").trim().toLowerCase();
    return [
      "1",
      "true",
      "yes",
      "y",
      "close",
      "closed",
      "stop",
      "stopsell",
      "stop sell",
      "on",
    ].includes(normalized);
  };
  const yn = (value: unknown) => (toRestrictionBool(value) ? "Y" : "N");
  const availViewByDate = useMemo<Record<string, RoomAvailabilityDateView>>(() => {
    if (!canLoadAvailView || !availRangeRaw) return {};
    if (Array.isArray(availRangeRaw.items)) {
      return availRangeRaw.items.reduce(
        (acc: Record<string, RoomAvailabilityDateView>, item: any) => {
          if (!item?.date) return acc;
          acc[item.date] = {
            free:
              item.free === null || item.free === undefined
                ? null
                : Number(item.free),
            source: item.source,
            restrictions: {
              cta: toRestrictionBool(item?.restrictions?.cta),
              ctd: toRestrictionBool(item?.restrictions?.ctd),
              stopsell: toRestrictionBool(item?.restrictions?.stopsell),
            },
          };
          return acc;
        },
        {},
      );
    }
    if (availRangeRaw.freeRooms && typeof availRangeRaw.freeRooms === "object") {
      return Object.entries(availRangeRaw.freeRooms).reduce(
        (acc: Record<string, RoomAvailabilityDateView>, [date, free]) => {
          acc[date] = {
            free: free === null || free === undefined ? null : Number(free),
            restrictions: {
              cta: false,
              ctd: false,
              stopsell: false,
            },
          };
          return acc;
        },
        {},
      );
    }
    return {};
  }, [canLoadAvailView, availRangeRaw]);
  const occupancyGridRows = useMemo(
    () => rangeViewOccupancyRows,
    [rangeViewOccupancyRows]
  );
  const rangeSummary = useMemo(() => {
    if (!normalizedRangeStart || !normalizedRangeEnd) return "Select a start date and end date above to view saved pricing.";
    return `${formatDateLabel(normalizedRangeStart)} to ${formatDateLabel(normalizedRangeEnd)}`;
  }, [normalizedRangeEnd, normalizedRangeStart]);
  const renderMealCell = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "";
    return formatCurrency(value);
  };
  const renderAmenityCell = (value: string | null | undefined) => {
    if (value === null || value === undefined || value === "") return "";
    const numericValue = Number(value);
    if (Number.isFinite(numericValue) && numericValue === 0) {
      return "No Price";
    }
    return Number.isFinite(numericValue) ? formatCurrency(numericValue) : String(value);
  };
  const stickyHeaderBase = {
    background: "#444",
    color: "white",
    fontWeight: "bold",
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
    padding: "4px 10px",
    border: "1px solid #ddd",
    whiteSpace: "nowrap" as const,
  };
  const stickyBodyBase = {
    padding: "4px 10px",
    border: "1px solid #ddd",
    background: "#f9f9f9",
    color: "#333",
    whiteSpace: "nowrap" as const,
    textAlign: "left" as const,
  };
  /* -----------------------------------------------------------
   *  Derived state & helpers
   * --------------------------------------------------------- */
  const validateMealSection = () => {
    const startVal = mealStartDate || mealStartRef.current?.value || "";
    const endVal = mealEndDate || mealEndRef.current?.value || "";
    if (!startVal && !endVal) return "Start date and End date should be required.";
    if (!startVal) return "Start date should be required.";
    if (!endVal) return "End date should be required.";
    if (breakfastCost === "" && lunchCost === "" && dinnerCost === "") {
      return "Please enter at least one price for the meal.";
    }
    return null;
  };
  const validateAmenitiesSection = () => {
    const startVal = amenitiesStartDate || amenitiesStartRef.current?.value || "";
    const endVal = amenitiesEndDate || amenitiesEndRef.current?.value || "";
    if (!startVal && !endVal) return "Start date and End date should be required.";
    if (!startVal) return "Start date should be required.";
    if (!endVal) return "End date should be required.";
    const hasAny = amenityOptions.some((a) => {
      const val = amenityCharges[a.id] || {};
      return (val.hours ?? "") !== "" || (val.day ?? "") !== "";
    });
    if (!hasAny) return "Please enter at least one price for the amenities.";
    return null;
  };
  const setRoomField = (
    roomId: number,
    occupancyKey: string,
    value: string
  ) => {
    const roomSelectionKey =
      getRoomSelectionKey(roomId);

    if (!roomSelectionKey) return;

    setOccupancyDrafts((prev) => ({
      ...prev,
      [roomSelectionKey]: {
        ...(prev[roomSelectionKey] || {}),
        [occupancyKey]: value,
      },
    }));
  };
  const roomDropdownLabel = (room: RoomRow) => {
    const roomIdLabel = room.room_ref_code || `ROOM-${room.room_ID}`;
    const roomTitle = room.room_title || `Room #${room.room_ID}`;
    return `${roomIdLabel} - ${roomTitle}`;
  };
    const priceBookViewContext = {
    OCCUPANCY_FIELDS,
    amenitiesEndDate,
    amenitiesEndRef,
    amenitiesError,
    amenitiesRangeDates,
    amenitiesRangeRows,
    amenitiesStartDate,
    amenitiesStartRef,
    amenitiesSuccess,
    amenityCharges,
    amenityMut,
    availEndDate,
    availEndRef,
    availError,
    availFreeRooms,
    availMut,
    availRoomId,
    availSelectedRoom,
    availStartDate,
    availStartRef,
    availSuccess,
    availViewByDate,
    availViewDates,
    breakfastCost,
    canLoadAmenitiesRangeView,
    canLoadAvailView,
    canLoadMealRangeView,
    canLoadRangeView,
    dinnerCost,
    formatCurrency,
    formatDateLabel,
    getRoomOccupancyDraft,
    getRoomSelectionKey,
    hotelDetailsError,
    hotelDetailsMut,
    hotelDetailsSuccess,
    hotelMargin,
    hotelMarginGstPercentage,
    hotelMarginGstType,
    lunchCost,
    mealEndDate,
    mealEndRef,
    mealError,
    mealMut,
    mealRangeDates,
    mealRangeRows,
    mealStartDate,
    mealStartRef,
    mealSuccess,
    normalizedAvailEnd,
    normalizedAvailStart,
    amenityOptions,
    rooms,
    roomRatePlansByRoom,
    roomRatePlansLoading,
    refetchRangeView,
    refetchAvailView,
    onPrev,
    onNext,
    occupancyGridRows,
    rangeSummary,
    renderAmenityCell,
    renderMealCell,
    renderedRangeDates,
    roomDateValidationMessage,
    roomDropdownLabel,
    roomEndDate,
    roomEndDateError,
    roomEndRef,
    roomError,
    roomMut,
    roomStartDate,
    roomStartDateError,
    roomStartRef,
    roomSuccess,
    selectedRatePlanIds,
    selectedRoomIds,
    setAmenitiesEndDate,
    setAmenitiesError,
    setAmenitiesStartDate,
    setAmenitiesSuccess,
    setAmenityCharges,
    setAvailEndDate,
    setAvailError,
    setAvailFreeRooms,
    setAvailRoomId,
    setAvailStartDate,
    setAvailSuccess,
    setBreakfastCost,
    setDinnerCost,
    setHotelDetailsError,
    setHotelDetailsSuccess,
    setHotelMargin,
    setHotelMarginGstPercentage,
    setHotelMarginGstType,
    setLunchCost,
    setMealEndDate,
    setMealError,
    setMealStartDate,
    setMealSuccess,
    setOccupancyDrafts,
    setRoomDateValidationMessage,
    setRoomEndDate,
    setRoomEndDateError,
    setRoomError,
    setRoomField,
    setRoomStartDate,
    setRoomStartDateError,
    setRoomSuccess,
    setSelectedRatePlanIds,
    setSelectedRoomIds,
    stickyBodyBase,
    stickyHeaderBase,
    toMaybeNum,
    uiErrorMessage,
    validateAmenitiesSection,
    validateMealSection,
    yn
  };
  return <PriceBookStepView context={priceBookViewContext} />;
}
