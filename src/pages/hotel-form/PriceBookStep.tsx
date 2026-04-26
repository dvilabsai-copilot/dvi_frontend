// FILE: src/pages/hotel-form/PriceBookStep.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { PricebookRow } from "./HotelForm";

type ApiCtx = {
  apiGetFirst: (ps: string[]) => Promise<any>;
  apiPost: (p: string, b: any) => Promise<any>;
  apiPatch?: (p: string, b: any) => Promise<any>;
};

type AmenityOption = { id: number; name: string };
type RoomRow = {
  room_ID: number;
  room_title?: string | null;
  room_ref_code?: string | null;
  room_type_id?: number | null;
  gst_type?: any;
  gst_percentage?: any;
};

type RatePlanOption = {
  ratePlanCode?: string | null;
  rateplanId: string;
  ratePlanName: string;
  description?: string | null;
  occupancy?: string[];
  isFallback?: boolean;
  includesBreakfast?: number;
  includesLunch?: number;
  includesDinner?: number;
};

type RangeViewRoomRow = {
  roomId: number;
  roomName: string;
  roomType: string;
  rateplanId: string;
  prices: Record<string, number>;
};

type RangeViewOccupancyRow = {
  roomId: number;
  roomName: string;
  roomType: string;
  rateplanId: string;
  occupancyType: string;
  values: Record<string, number>;
};

type MealRangeRow = {
  mealType: string;
  values: Record<string, number | null>;
};

type AmenityRangeRow = {
  amenityName: string;
  priceType: string;
  values: Record<string, string | null>;
};

const formatCurrency = (value: number) => `₹ ${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const OCCUPANCY_FIELDS = [
  "SINGLE",
  "DOUBLE",
  "TRIPLE",
  "QUAD",
  "PENTA",
  "HEXA",
  "HEPTA",
  "OCTA",
  "NONA",
  "DECA",
  "EXTRABED",
  "EXTRAADULT",
  "EXTRACHILD",
  "EXTRAADULT2",
  "EXTRACHILD2",
  "EXTRAADULT3",
  "EXTRACHILD3",
  "EXTRAINFANT",
] as const;

const ROOM_GRID_OCCUPANCY_TYPES = [
  "SINGLE",
  "DOUBLE",
  "TRIPLE",
  "QUAD",
  "PENTA",
  "HEXA",
  "HEPTA",
  "OCTA",
  "NONA",
  "DECA",
] as const;

const formatDateLabel = (isoDate?: string) => {
  const d = isoDate ? new Date(`${isoDate}T00:00:00`) : new Date();
  const weekday = d.toLocaleString("en-US", { weekday: "short" }).toUpperCase();
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const year = d.getFullYear();
  return `${weekday} - ${day} ${month}, ${year}`;
};

const LOCAL_VALIDATION_MESSAGES = new Set([
  "Start date and End date should be required.",
  "Start date should be required.",
  "End date should be required.",
  "Please enter at least one price for the amenities.",
  "Please enter at least one price for the rooms.",
  "No rooms to update",
]);

const uiErrorMessage = (err: any, fallback: string) => {
  const msg = String(err?.message ?? "").trim();
  if (LOCAL_VALIDATION_MESSAGES.has(msg)) return msg;
  return fallback;
};

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

  // ---------- helpers ----------
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
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [selectedRatePlanId, setSelectedRatePlanId] = useState<string>("");
  const [occupancyDrafts, setOccupancyDrafts] = useState<Record<string, Record<string, string>>>({});
  const [roomStartDate, setRoomStartDate] = useState<string>("");
  const [roomEndDate, setRoomEndDate] = useState<string>("");
  const roomStartRef = useRef<HTMLInputElement | null>(null);
  const roomEndRef = useRef<HTMLInputElement | null>(null);

  /* -----------------------------------------------------------
   *  Room Availability — own state (self-contained card)
   * --------------------------------------------------------- */
  const [availRoomId, setAvailRoomId] = useState<number | null>(null);
  const [availStartDate, setAvailStartDate] = useState<string>("");
  const [availEndDate, setAvailEndDate] = useState<string>("");
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
          Number(r.value) ??
          0,
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

  useEffect(() => {
    if (!rooms.length) return;
    if (selectedRoomId === null) {
      setSelectedRoomId(Number(rooms[0].room_ID));
    }
  }, [rooms, selectedRoomId]);

  const selectedRoom = useMemo(
    () => rooms.find((room) => Number(room.room_ID) === Number(selectedRoomId)) || null,
    [rooms, selectedRoomId]
  );

  const { data: roomRatePlansRaw, isLoading: roomRatePlansLoading } = useQuery({
    queryKey: ["hotel-room-rateplans", hotelId, selectedRoomId],
    enabled: !!hotelId && selectedRoomId !== null,
    queryFn: async () => {
      if (selectedRoomId === null) return { items: [] };
      return api.apiGetFirst([
        `/api/v1/hotels/${hotelId}/rooms/${selectedRoomId}/rateplans`,
        `/api/v1/hotels/rateplans`,
      ]).catch(() => ({ items: [] }));
    },
  });

  const roomRatePlans = useMemo<RatePlanOption[]>(() => {
    const rows = Array.isArray(roomRatePlansRaw)
      ? roomRatePlansRaw
      : roomRatePlansRaw?.items ?? [];
    return rows.map((row: any) => ({
      ratePlanCode: row.ratePlanCode ?? row.rate_plan_code ?? null,
      rateplanId: String(row.rateplanId ?? row.defaultRateplanId ?? row.default_rateplan_id ?? ""),
      ratePlanName: String(row.ratePlanName ?? row.rate_plan_name ?? row.description ?? row.rateplanId ?? "Rate Plan"),
      description: row.description ?? null,
      occupancy: Array.isArray(row.occupancy) ? row.occupancy : [],
      isFallback: Boolean(row.isFallback),
      includesBreakfast: Number(row.includesBreakfast ?? 0),
      includesLunch: Number(row.includesLunch ?? 0),
      includesDinner: Number(row.includesDinner ?? 0),
    })).filter((row: RatePlanOption) => row.rateplanId);
  }, [roomRatePlansRaw]);

  useEffect(() => {
    if (!roomRatePlans.length) {
      setSelectedRatePlanId("");
      return;
    }
    const stillExists = roomRatePlans.some((plan) => plan.rateplanId === selectedRatePlanId);
    if (!selectedRatePlanId || !stillExists) {
      setSelectedRatePlanId(roomRatePlans[0].rateplanId);
    }
  }, [roomRatePlans, selectedRatePlanId]);

  const selectedRatePlan = useMemo(
    () => roomRatePlans.find((plan) => plan.rateplanId === selectedRatePlanId) || null,
    [roomRatePlans, selectedRatePlanId]
  );

  const roomSelectionKey = useMemo(() => {
    if (!selectedRoomId || !selectedRatePlanId) return "";
    return `${selectedRoomId}:${selectedRatePlanId}`;
  }, [selectedRoomId, selectedRatePlanId]);

  const currentOccupancyDraft = roomSelectionKey ? occupancyDrafts[roomSelectionKey] || {} : {};

  const activeRangeStart = roomStartDate || "";
  const activeRangeEnd = roomEndDate || "";
  const normalizedRangeStart = ymd(activeRangeStart) || activeRangeStart;
  const normalizedRangeEnd = ymd(activeRangeEnd) || activeRangeEnd;
  const normalizedMealStart = ymd(mealStartDate) || mealStartDate;
  const normalizedMealEnd = ymd(mealEndDate) || mealEndDate;
  const normalizedAmenitiesStart = ymd(amenitiesStartDate) || amenitiesStartDate;
  const normalizedAmenitiesEnd = ymd(amenitiesEndDate) || amenitiesEndDate;
  const canLoadRangeView = Boolean(
    hotelId && selectedRoomId && selectedRatePlanId && normalizedRangeStart && normalizedRangeEnd
  );
  const canLoadMealRangeView = Boolean(hotelId && normalizedMealStart && normalizedMealEnd);
  const canLoadAmenitiesRangeView = Boolean(hotelId && normalizedAmenitiesStart && normalizedAmenitiesEnd);

  const {
    data: rangeViewRaw,
    refetch: refetchRangeView,
  } = useQuery({
    queryKey: [
      "hotel-pricebook-range-view",
      hotelId,
      selectedRoomId,
      selectedRatePlanId,
      normalizedRangeStart,
      normalizedRangeEnd,
    ],
    enabled: canLoadRangeView,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("startDate", normalizedRangeStart);
      params.set("endDate", normalizedRangeEnd);
      params.set("roomId", String(selectedRoomId));
      params.set("rateplanId", selectedRatePlanId);
      return api.apiGetFirst([`/api/v1/hotels/${hotelId}/pricebook/range-view?${params.toString()}`]);
    },
  });

  const rangeViewDates = useMemo<string[]>(
    () => (canLoadRangeView && Array.isArray(rangeViewRaw?.dates) ? rangeViewRaw.dates : []),
    [canLoadRangeView, rangeViewRaw]
  );

  const rangeViewRoomRows = useMemo<RangeViewRoomRow[]>(
    () => (canLoadRangeView && Array.isArray(rangeViewRaw?.rooms) ? rangeViewRaw.rooms : []),
    [canLoadRangeView, rangeViewRaw]
  );

  const rangeViewOccupancyRows = useMemo<RangeViewOccupancyRow[]>(
    () => (canLoadRangeView && Array.isArray(rangeViewRaw?.occupancies) ? rangeViewRaw.occupancies : []),
    [canLoadRangeView, rangeViewRaw]
  );

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

      // Primary parity route in Nest: PATCH /hotels/:id
      if (api.apiPatch) {
        return api.apiPatch(patchPath, payload);
      }

      // Fallback if apiPatch is unavailable in context
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

  // Meal details save (kept)
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

  // ---------- Amenities price book: match your controller + service exactly ----------
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

  // Room price book (bulk) - kept
  const roomMut = useMutation({
    mutationFn: async () => {
      if (!rooms.length) throw new Error("No rooms to update");
      if (!selectedRoomId) throw new Error("Room selection is required.");
      if (!selectedRatePlanId) throw new Error("Rate plan selection is required.");

      const roomStart = roomStartDate || roomStartRef.current?.value || "";
      const roomEnd = roomEndDate || roomEndRef.current?.value || "";

      const occupancyRates = Object.fromEntries(
        Object.entries(currentOccupancyDraft)
          .map(([key, value]) => [key, toMaybeNum(value)])
          .filter(([, value]) => value !== undefined)
      ) as Record<string, number>;

      if (Object.keys(occupancyRates).length === 0) {
        throw new Error("Please enter at least one price for the rooms.");
      }

      if (!roomStart && !roomEnd) {
        throw new Error("Start date and End date should be required.");
      }
      if (!roomStart) {
        throw new Error("Start date should be required.");
      }
      if (!roomEnd) {
        throw new Error("End date should be required.");
      }

      const selectedRoomRef = selectedRoom?.room_ref_code || undefined;
      const payloadItem: any = {
        hotel_id: toNum(hotelId),
        room_id: Number(selectedRoomId),
        axisroomsRoomId: selectedRoomRef,
        startDate: ymd(roomStart) || roomStart,
        endDate: ymd(roomEnd) || roomEnd,
        ratePlanCode: selectedRatePlan?.ratePlanCode || undefined,
        rateplanId: selectedRatePlanId,
        ratePlanName: selectedRatePlan?.ratePlanName || selectedRatePlanId,
        occupancyRates,
        roomPrice: occupancyRates.DOUBLE ?? occupancyRates.SINGLE,
        extraBed: occupancyRates.EXTRABED,
        childWithBed: occupancyRates.CHILD_WITH_BED ?? occupancyRates.EXTRACHILD,
        childWithoutBed: occupancyRates.CHILD_WITHOUT_BED ?? occupancyRates.EXTRACHILD,
        status: 1,
      };

      const payload = { items: [payloadItem], status: 1 };

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
      throw lastErr || new Error("No room pricebook endpoint available");
    },
  });

  const renderedRangeDates = useMemo(() => rangeViewDates, [rangeViewDates]);

  /* -----------------------------------------------------------
   *  Room Availability — self-contained mutation + range-view query
   *  Uses own availRoomId / availStartDate / availEndDate state
   * --------------------------------------------------------- */
  const availSelectedRoom = useMemo(
    () => rooms.find((r) => Number(r.room_ID) === availRoomId) ?? null,
    [rooms, availRoomId]
  );

  // Default-select the first room when rooms load
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
  const availViewFreeByDate = useMemo<Record<string, number | null>>(
    () => (canLoadAvailView && availRangeRaw?.freeRooms ? availRangeRaw.freeRooms : {}),
    [canLoadAvailView, availRangeRaw]
  );

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
    occupancyKey: string,
    value: string
  ) => {
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

  return (
    <>
      <h3 className="text-pink-600 font-semibold mb-4">Hotel Price Book</h3>

      {/* ====== Hotel Margin ====== */}
      <div className="border rounded-xl bg-white shadow-sm mb-4 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b pb-3 mb-3">
          <h5 className="font-semibold text-gray-800 text-sm md:text-base">
            Hotel Margin
          </h5>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setHotelDetailsError("");
                setHotelDetailsSuccess("");
                hotelDetailsMut.mutate();
              }}
              className="px-4 py-2 rounded-lg text-white text-sm bg-gradient-to-r from-pink-500 to-purple-600"
            >
              {hotelDetailsMut.isPending ? "Saving..." : "Update"}
            </button>
          </div>
        </div>

        {hotelDetailsError && (
          <div className="mb-3 text-sm text-red-600">{hotelDetailsError}</div>
        )}
        {hotelDetailsSuccess && (
          <div className="mb-3 text-sm text-green-600">{hotelDetailsSuccess}</div>
        )}

        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 md:col-span-4">
            <label className="block text-xs font-medium mb-1">
              Hotel Margin (%)
            </label>
            <input
              type="number"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Enter Hotel Margin"
              value={hotelMargin}
              onChange={(e) => setHotelMargin(e.target.value)}
            />
          </div>

          <div className="col-span-12 md:col-span-4">
            <label className="block text-xs font-medium mb-1">
              Margin GST Type
            </label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={hotelMarginGstType}
              onChange={(e) =>
                setHotelMarginGstType(e.target.value as "Included" | "Excluded")
              }
            >
              <option value="">Select GST Type</option>
              <option value="Included">Included</option>
              <option value="Excluded">Excluded</option>
            </select>
          </div>

          <div className="col-span-12 md:col-span-4">
            <label className="block text-xs font-medium mb-1">
              Margin GST Percentage
            </label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={hotelMarginGstPercentage}
              onChange={(e) => setHotelMarginGstPercentage(e.target.value)}
            >
              <option value="">Select GST %</option>
              {["0", "5", "12", "18", "28"].map((p) => (
                <option key={p} value={p}>
                  {p}%
                </option>
              ))}
            </select>
          </div>
        </div>

      </div>

      {/* ====== Meal Details ====== */}
      <div className="border rounded-xl bg-white shadow-sm mb-4 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b pb-3 mb-3">
          <h5 className="font-semibold text-gray-800 text-sm md:text/base">
            Meal Details
          </h5>

          <div className="flex items-center gap-2">
            <input
              ref={mealStartRef}
              type="date"
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="Start Date"
              value={mealStartDate}
              onChange={(e) => setMealStartDate(e.target.value)}
            />
            <input
              ref={mealEndRef}
              type="date"
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="End Date"
              value={mealEndDate}
              onChange={(e) => setMealEndDate(e.target.value)}
            />
            <button
              type="button"
              onClick={() => {
                const msg = validateMealSection();
                if (msg) {
                  setMealError(msg);
                  return;
                }
                const mealStart = mealStartDate || mealStartRef.current?.value || "";
                const mealEnd = mealEndDate || mealEndRef.current?.value || "";
                setMealError("");
                setMealSuccess("");
                mealMut.mutate({
                  startDate: mealStart,
                  endDate: mealEnd,
                  breakfastCost: toMaybeNum(breakfastCost),
                  lunchCost: toMaybeNum(lunchCost),
                  dinnerCost: toMaybeNum(dinnerCost),
                } as any);
              }}
              disabled={mealMut.isPending}
              className={`px-4 py-2 rounded-lg text-white text-sm
                bg-gradient-to-r from-pink-500 to-purple-600
                disabled:opacity-50`}
            >
              {mealMut.isPending ? "Saving..." : "Update"}
            </button>
          </div>
        </div>

        {mealError && <div className="mb-3 text-sm text-red-600">{mealError}</div>}
  {mealSuccess && <div className="mb-3 text-sm text-green-600">{mealSuccess}</div>}

        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 md:col-span-4">
            <label className="block text-xs font-medium mb-1">
              Breakfast Cost (₹)
            </label>
            <input
              type="number"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Enter Breakfast Cost"
              value={breakfastCost}
              onChange={(e) => setBreakfastCost(e.target.value)}
            />
          </div>

          <div className="col-span-12 md:col-span-4">
            <label className="block text-xs font-medium mb-1">
              Lunch Cost (₹)
            </label>
            <input
              type="number"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Enter Lunch Cost"
              value={lunchCost}
              onChange={(e) => setLunchCost(e.target.value)}
            />
          </div>

          <div className="col-span-12 md:col-span-4">
            <label className="block text-xs font-medium mb-1">
              Dinner Cost (₹)
            </label>
            <input
              type="number"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Enter Dinner Cost"
              value={dinnerCost}
              onChange={(e) => setDinnerCost(e.target.value)}
            />
          </div>
        </div>

        {canLoadMealRangeView && (
          <div className="mt-6">
            <h5 className="mb-3 font-semibold text-gray-800 text-sm md:text-base">
              Hotel Meal Plan Details
            </h5>
            <div style={{ width: "100%", overflowX: "auto", scrollbarWidth: "thin", scrollbarColor: "#4b0082 #e0e0e0" }}>
              <table style={{ borderCollapse: "collapse", boxShadow: "0 0 10px rgba(0,0,0,0.1)", minWidth: `${180 + mealRangeDates.length * 190}px` }}>
                <thead>
                  <tr>
                    <th style={{ ...stickyHeaderBase, position: "sticky", left: 0, minWidth: 180, zIndex: 5 }}>Meal Type</th>
                    {mealRangeDates.map((date) => (
                      <th key={`meal-${date}`} style={{ background: "linear-gradient(to bottom, rgb(114,49,207), rgb(195,60,166), rgb(238,63,206))", color: "white", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", padding: "4px 16px", border: "1px solid #ddd", whiteSpace: "nowrap", textAlign: "center" }}>
                        {formatDateLabel(date)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mealRangeRows.length === 0 || mealRangeDates.length === 0 ? (
                    <tr>
                      <td style={{ padding: "6px 10px", border: "1px solid #ddd", background: "#f4f4f4", color: "#666", textAlign: "center" }} colSpan={1 + Math.max(mealRangeDates.length, 1)}>
                        No data found
                      </td>
                    </tr>
                  ) : (
                    mealRangeRows.map((row) => (
                      <tr key={`meal-row-${row.mealType}`}>
                        <td style={{ ...stickyBodyBase, position: "sticky", left: 0, minWidth: 180, zIndex: 4 }}>{row.mealType}</td>
                        {mealRangeDates.map((date) => (
                          <td key={`meal-${row.mealType}-${date}`} style={{ padding: "4px 16px", border: "1px solid #ddd", background: "#f9f9f9", color: "#333", whiteSpace: "nowrap", textAlign: "center" }}>
                            {renderMealCell(row.values?.[date])}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ====== Amenities Details ====== */}
      <div className="border rounded-xl bg-white shadow-sm mb-4 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b pb-3 mb-3">
          <h5 className="font-semibold text-gray-800 text-sm md:text-base">
            Amenities Details
          </h5>

          <div className="flex items-center gap-2">
            <input
              ref={amenitiesStartRef}
              type="date"
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="Start Date"
              value={amenitiesStartDate}
              onChange={(e) => setAmenitiesStartDate(e.target.value)}
            />
            <input
              ref={amenitiesEndRef}
              type="date"
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="End Date"
              value={amenitiesEndDate}
              onChange={(e) => setAmenitiesEndDate(e.target.value)}
            />
            <button
              type="button"
              onClick={() => {
                const msg = validateAmenitiesSection();
                if (msg) {
                  setAmenitiesError(msg);
                  return;
                }
                const aStart = amenitiesStartDate || amenitiesStartRef.current?.value || "";
                const aEnd = amenitiesEndDate || amenitiesEndRef.current?.value || "";
                setAmenitiesStartDate(aStart);
                setAmenitiesEndDate(aEnd);
                setAmenitiesError("");
                setAmenitiesSuccess("");
                amenityMut.mutate();
              }}
              disabled={amenityMut.isPending}
              className={`px-4 py-2 rounded-lg text-white text-sm
                bg-gradient-to-r from-pink-500 to-purple-600
                disabled:opacity-50`}
            >
              {amenityMut.isPending ? "Saving..." : "Update"}
            </button>
          </div>
        </div>

        {amenitiesError && (
          <div className="mb-3 text-sm text-red-600">{amenitiesError}</div>
        )}
        {amenitiesSuccess && (
          <div className="mb-3 text-sm text-green-600">{amenitiesSuccess}</div>
        )}

        <div className="grid grid-cols-12 gap-4">
          {amenityOptions.length === 0 ? (
            <div className="col-span-12 text-sm text-gray-500">No more amenities found.</div>
          ) : (
            amenityOptions.map((a, index) => {
              const val = amenityCharges[a.id] || { hours: "", day: "" };
              return (
                <div key={a.id} className={`col-span-12 md:col-span-6 grid grid-cols-12 gap-3 ${index % 2 === 0 ? "md:pr-6 md:border-r md:border-gray-200" : "md:pl-6"}`}>
                  <div className="col-span-12 md:col-span-5">
                    <label className="block text-xs font-medium mb-1">Amenities Title</label>
                    <div className="text-pink-600 font-semibold text-sm mt-2">{a.name}</div>
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <label className="block text-xs font-medium mb-1">Hours Charge</label>
                    <input
                      type="number"
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="Hours Charge"
                      value={val.hours || ""}
                      onChange={(e) =>
                        setAmenityCharges((prev) => ({
                          ...prev,
                          [a.id]: { ...(prev[a.id] || {}), hours: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="col-span-12 md:col-span-3">
                    <label className="block text-xs font-medium mb-1">Day Charge (₹)</label>
                    <input
                      type="number"
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="Day Charge"
                      value={val.day || ""}
                      onChange={(e) =>
                        setAmenityCharges((prev) => ({
                          ...prev,
                          [a.id]: { ...(prev[a.id] || {}), day: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {canLoadAmenitiesRangeView && (
          <div className="mt-6">
            <h5 className="mb-3 font-semibold text-gray-800 text-sm md:text-base">
              Hotel Amenities Price Details
            </h5>
            <div style={{ width: "100%", overflowX: "auto", scrollbarWidth: "thin", scrollbarColor: "#4b0082 #e0e0e0" }}>
              <table style={{ borderCollapse: "collapse", boxShadow: "0 0 10px rgba(0,0,0,0.1)", minWidth: `${320 + amenitiesRangeDates.length * 190}px` }}>
                <thead>
                  <tr>
                    <th style={{ ...stickyHeaderBase, position: "sticky", left: 0, minWidth: 170, zIndex: 5 }}>Amenities Name</th>
                    <th style={{ ...stickyHeaderBase, position: "sticky", left: 170, minWidth: 120, zIndex: 5 }}>Price Type</th>
                    {amenitiesRangeDates.map((date) => (
                      <th key={`amenity-${date}`} style={{ background: "linear-gradient(to bottom, rgb(114,49,207), rgb(195,60,166), rgb(238,63,206))", color: "white", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", padding: "4px 16px", border: "1px solid #ddd", whiteSpace: "nowrap", textAlign: "center" }}>
                        {formatDateLabel(date)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {amenitiesRangeRows.length === 0 || amenitiesRangeDates.length === 0 ? (
                    <tr>
                      <td style={{ padding: "6px 10px", border: "1px solid #ddd", background: "#f4f4f4", color: "#666", textAlign: "center" }} colSpan={2 + Math.max(amenitiesRangeDates.length, 1)}>
                        No data found
                      </td>
                    </tr>
                  ) : (
                    amenitiesRangeRows.map((row) => (
                      <tr key={`amenity-row-${row.amenityName}-${row.priceType}`}>
                        <td style={{ ...stickyBodyBase, position: "sticky", left: 0, minWidth: 170, zIndex: 4 }}>{row.amenityName}</td>
                        <td style={{ ...stickyBodyBase, position: "sticky", left: 170, minWidth: 120, zIndex: 4 }}>{row.priceType}</td>
                        {amenitiesRangeDates.map((date) => (
                          <td key={`amenity-${row.amenityName}-${row.priceType}-${date}`} style={{ padding: "4px 16px", border: "1px solid #ddd", background: "#f9f9f9", color: "#333", whiteSpace: "nowrap", textAlign: "center" }}>
                            {renderAmenityCell(row.values?.[date])}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ====== Room Details ====== */}
      <div className="border rounded-xl bg-white shadow-sm mb-4 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b pb-3 mb-3">
          <h5 className="font-semibold text-gray-800 text-sm md:text-base">
            Room Details
          </h5>

          <div className="flex items-center gap-2">
            <div>
              <div className="flex items-center gap-2">
                <input
                  ref={roomStartRef}
                  type="date"
                  className={`rounded-lg px-3 py-2 text-sm ${
                    roomStartDateError ? "border border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500" : "border"
                  }`}
                  placeholder="Start Date"
                  value={roomStartDate}
                  onChange={(e) => {
                    setRoomStartDate(e.target.value);
                    if (roomStartDateError) setRoomStartDateError("");
                    if (roomDateValidationMessage) setRoomDateValidationMessage("");
                  }}
                />
                <input
                  ref={roomEndRef}
                  type="date"
                  className={`rounded-lg px-3 py-2 text-sm ${
                    roomEndDateError ? "border border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500" : "border"
                  }`}
                  placeholder="End Date"
                  value={roomEndDate}
                  onChange={(e) => {
                    setRoomEndDate(e.target.value);
                    if (roomEndDateError) setRoomEndDateError("");
                    if (roomDateValidationMessage) setRoomDateValidationMessage("");
                  }}
                />
              </div>
              {roomDateValidationMessage && (
                <div className="mt-1 text-sm text-red-600">{roomDateValidationMessage}</div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                const rStart = roomStartDate || roomStartRef.current?.value || "";
                const rEnd = roomEndDate || roomEndRef.current?.value || "";
                const hasAnyOccupancyValue = Object.values(currentOccupancyDraft).some(
                  (value) => String(value ?? "").trim() !== ""
                );
                setRoomStartDate(rStart);
                setRoomEndDate(rEnd);
                setRoomError("");
                setRoomSuccess("");
                setRoomStartDateError("");
                setRoomEndDateError("");
                setRoomDateValidationMessage("");

                if (!rStart && !rEnd) {
                  setRoomStartDateError("Start date should be required.");
                  setRoomEndDateError("End date should be required.");
                  setRoomDateValidationMessage("Start date and End date should be required.");
                  setRoomError("Please fill in all required fields.");
                  return;
                }
                if (!rStart) {
                  setRoomStartDateError("Start date should be required.");
                  setRoomDateValidationMessage("Start date should be required.");
                  setRoomError("Please fill in all required fields.");
                  return;
                }
                if (!rEnd) {
                  setRoomEndDateError("End date should be required.");
                  setRoomDateValidationMessage("End date should be required.");
                  setRoomError("Please fill in all required fields.");
                  return;
                }

                if (!hasAnyOccupancyValue) {
                  setRoomError("Please fill in all required fields.");
                  return;
                }

                roomMut.mutate(undefined, {
                  onSuccess: () => {
                    setRoomError("");
                    setRoomSuccess("Room price book saved successfully.");
                    setOccupancyDrafts((prev) => ({
                      ...prev,
                      [roomSelectionKey]: {},
                    }));
                    refetchRangeView();
                  },
                  onError: (e: any) => {
                    setRoomSuccess("");
                    setRoomError(uiErrorMessage(e, "Room pricebook failed. Please try again."));
                  },
                });
              }}
              className="px-4 py-2 rounded-lg text-white text-sm bg-gradient-to-r from-pink-500 to-purple-600"
            >
              Update
            </button>
          </div>
        </div>

        {roomError && <div className="mb-3 text-sm text-red-600">{roomError}</div>}
        {roomSuccess && <div className="mb-3 text-sm text-green-600">{roomSuccess}</div>}

        {rooms.length === 0 ? (
          <div className="text-sm text-gray-500">No rooms found.</div>
        ) : (
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-4">
              <label className="block text-xs font-medium mb-1">Choose Room</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={selectedRoomId ?? ""}
                onChange={(e) => setSelectedRoomId(e.target.value ? Number(e.target.value) : null)}
              >
                {rooms.map((room) => (
                  <option key={room.room_ID} value={room.room_ID}>
                    {roomDropdownLabel(room)}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-12 md:col-span-4">
              <label className="block text-xs font-medium mb-1">Choose Rate Plan</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={selectedRatePlanId}
                onChange={(e) => setSelectedRatePlanId(e.target.value)}
                disabled={roomRatePlansLoading || roomRatePlans.length === 0}
              >
                {roomRatePlans.map((plan) => (
                  <option key={plan.rateplanId} value={plan.rateplanId}>
                    {plan.ratePlanCode || plan.rateplanId} - {plan.ratePlanName}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-12 md:col-span-4 rounded-xl border border-dashed border-pink-200 bg-pink-50 px-3 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-pink-700 mb-1">
                Plan Meaning
              </div>
              <div className="text-sm text-gray-700">
                {selectedRatePlan?.description || "Select a room and rate plan to manage occupancy pricing."}
              </div>
              {selectedRatePlan && (
                <div className="mt-2 text-xs text-gray-500">
                  {selectedRatePlan.isFallback
                    ? "Legacy / fallback rate plan"
                    : `Includes${selectedRatePlan.includesBreakfast ? " Breakfast" : ""}${selectedRatePlan.includesLunch ? ", Lunch" : ""}${selectedRatePlan.includesDinner ? ", Dinner" : ""}`}
                </div>
              )}
            </div>

            {roomRatePlans.length === 0 && !roomRatePlansLoading ? (
              <div className="col-span-12 text-sm text-gray-500">
                No rate plans found for the selected room.
              </div>
            ) : (
              OCCUPANCY_FIELDS.map((occupancyKey) => (
                <div key={occupancyKey} className="col-span-12 md:col-span-3 lg:col-span-2">
                  <label className="block text-xs font-medium mb-1">
                    {occupancyKey} (₹)
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-lg px-3 py-2 text-sm border"
                    placeholder={`Enter ${occupancyKey}`}
                    value={currentOccupancyDraft[occupancyKey] || ""}
                    onChange={(e) => setRoomField(occupancyKey, e.target.value)}
                  />
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ====== Range-based Occupancy Grid ====== */}
      {canLoadRangeView && (
        <div className="border rounded-xl bg-white shadow-sm mb-4 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h5 className="mb-0 font-semibold text-gray-800 text-sm md:text-base">
              Hotel Occupancy Details
            </h5>
            <div className="text-xs text-gray-600 text-right">
              <div className="font-medium">Selected Range</div>
              <div>{rangeSummary}</div>
            </div>
          </div>
          <div style={{ width: "100%", overflowX: "auto", scrollbarWidth: "thin", scrollbarColor: "#4b0082 #e0e0e0" }}>
            <table style={{ borderCollapse: "collapse", boxShadow: "0 0 10px rgba(0,0,0,0.1)", minWidth: `${540 + renderedRangeDates.length * 140}px` }}>
              <thead>
                <tr>
                  <th style={{ ...stickyHeaderBase, position: "sticky", left: 0, minWidth: 180, zIndex: 5 }}>Room Name</th>
                  <th style={{ ...stickyHeaderBase, position: "sticky", left: 180, minWidth: 180, zIndex: 5 }}>Room Type</th>
                  <th style={{ ...stickyHeaderBase, position: "sticky", left: 360, minWidth: 180, zIndex: 5 }}>Occupancy Type</th>
                  {renderedRangeDates.map((date) => (
                    <th key={`occ-header-${date}`} style={{ background: "linear-gradient(to bottom, rgb(114,49,207), rgb(195,60,166), rgb(238,63,206))", color: "white", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", padding: "4px 16px", border: "1px solid #ddd", whiteSpace: "nowrap", textAlign: "center" }}>
                      {formatDateLabel(date)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {occupancyGridRows.length === 0 || renderedRangeDates.length === 0 ? (
                  <tr>
                    <td style={{ padding: "6px 10px", border: "1px solid #ddd", background: "#f4f4f4", color: "#666", textAlign: "center" }} colSpan={3 + Math.max(renderedRangeDates.length, 1)}>
                      No occupancy prices found for the selected room, rate plan, and date range.
                    </td>
                  </tr>
                ) : (
                  occupancyGridRows.map((row) => (
                    <tr key={`occ-range-${row.roomId}-${row.rateplanId}-${row.occupancyType}`}>
                      <td style={{ ...stickyBodyBase, position: "sticky", left: 0, minWidth: 180, zIndex: 4 }}>{row.roomName || "N/A"}</td>
                      <td style={{ ...stickyBodyBase, position: "sticky", left: 180, minWidth: 180, zIndex: 4 }}>{row.roomType || "N/A"}</td>
                      <td style={{ ...stickyBodyBase, position: "sticky", left: 360, minWidth: 180, zIndex: 4 }}>{row.occupancyType || "N/A"}</td>
                      {renderedRangeDates.map((date) => (
                        <td key={`${row.roomId}-${row.occupancyType}-${date}`} style={{ padding: "4px 16px", border: "1px solid #ddd", background: "#f9f9f9", color: "#333", whiteSpace: "nowrap", textAlign: "center" }}>
                          {formatCurrency(Number(row.values?.[date] || 0))}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ====== Room Availability ====== */}
      <div className="border rounded-xl bg-white shadow-sm mb-4 p-4">

        {/* Header — mirrors Room Details header style */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b pb-3 mb-3">
          <h5 className="font-semibold text-gray-800 text-sm md:text-base">Room Availability</h5>

          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              className="rounded-lg px-3 py-2 text-sm border"
              value={availStartDate}
              onChange={(e) => { setAvailStartDate(e.target.value); setAvailError(""); setAvailSuccess(""); }}
            />
            <input
              type="date"
              className="rounded-lg px-3 py-2 text-sm border"
              value={availEndDate}
              onChange={(e) => { setAvailEndDate(e.target.value); setAvailError(""); setAvailSuccess(""); }}
            />
            <button
              type="button"
              onClick={() => {
                setAvailError(""); setAvailSuccess("");
                if (!availRoomId) { setAvailError("Please select a room."); return; }
                if (!availStartDate) { setAvailError("Start date is required."); return; }
                if (!availEndDate) { setAvailError("End date is required."); return; }
                if (availFreeRooms === "") { setAvailError("Free Rooms count is required."); return; }
                availMut.mutate(undefined, {
                  onSuccess: () => {
                    setAvailError("");
                    setAvailSuccess("Room availability saved successfully.");
                    setAvailFreeRooms("");
                    refetchAvailView();
                  },
                  onError: (e: any) => {
                    setAvailSuccess("");
                    setAvailError(e?.message || "Failed to save availability.");
                  },
                });
              }}
              disabled={availMut.isPending}
              className="px-4 py-2 rounded-lg text-white text-sm bg-gradient-to-r from-pink-500 to-purple-600 disabled:opacity-50"
            >
              {availMut.isPending ? "Saving..." : "Update"}
            </button>
          </div>
        </div>

        {availError && <div className="mb-3 text-sm text-red-600">{availError}</div>}
        {availSuccess && <div className="mb-3 text-sm text-green-600">{availSuccess}</div>}

        {/* Body — room dropdown + free rooms input, mirrors occupancy body grid */}
        {rooms.length === 0 ? (
          <div className="text-sm text-gray-500">No rooms found.</div>
        ) : (
          <div className="grid grid-cols-12 gap-4 mb-4">
            {/* Room selector */}
            <div className="col-span-12 md:col-span-4">
              <label className="block text-xs font-medium mb-1">Choose Room</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={availRoomId ?? ""}
                onChange={(e) => {
                  setAvailRoomId(e.target.value ? Number(e.target.value) : null);
                  setAvailError(""); setAvailSuccess(""); setAvailFreeRooms("");
                }}
              >
                {rooms.map((room) => (
                  <option key={room.room_ID} value={room.room_ID}>
                    {roomDropdownLabel(room)}
                  </option>
                ))}
              </select>
            </div>

            {/* Free Rooms input */}
            <div className="col-span-12 md:col-span-3">
              <label className="block text-xs font-medium mb-1">Free Rooms</label>
              <input
                type="number"
                min={0}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="e.g. 5"
                value={availFreeRooms}
                onChange={(e) => { setAvailFreeRooms(e.target.value); setAvailError(""); setAvailSuccess(""); }}
              />
            </div>

            {/* Hint */}
            <div className="col-span-12 md:col-span-5 flex items-end">
              <p className="text-xs text-gray-500">
                {availStartDate && availEndDate
                  ? <>Availability for <strong>{formatDateLabel(normalizedAvailStart)}</strong> → <strong>{formatDateLabel(normalizedAvailEnd)}</strong>. Enter free rooms count and click <strong>Update</strong>.</>
                  : "Select a date range above, then enter the number of free rooms available and click Update."}
              </p>
            </div>
          </div>
        )}

        {/* Read-back table — auto-loads when room + dates selected */}
        {canLoadAvailView && (
          <div style={{ width: "100%", overflowX: "auto", scrollbarWidth: "thin", scrollbarColor: "#4b0082 #e0e0e0" }}>
            <table style={{ borderCollapse: "collapse", boxShadow: "0 0 10px rgba(0,0,0,0.1)", minWidth: `${200 + availViewDates.length * 150}px` }}>
              <thead>
                <tr>
                  <th style={{ ...stickyHeaderBase, position: "sticky", left: 0, minWidth: 200, zIndex: 5 }}>Room</th>
                  {availViewDates.map((date) => (
                    <th key={`avail-h-${date}`} style={{ background: "linear-gradient(to bottom, rgb(22,163,74), rgb(16,185,129))", color: "white", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", padding: "4px 16px", border: "1px solid #ddd", whiteSpace: "nowrap", textAlign: "center" }}>
                      {formatDateLabel(date)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ ...stickyBodyBase, position: "sticky", left: 0, minWidth: 200, zIndex: 4, fontWeight: "600" }}>
                    {availSelectedRoom ? roomDropdownLabel(availSelectedRoom) : "Free Rooms"}
                  </td>
                  {availViewDates.map((date) => {
                    const val = availViewFreeByDate[date];
                    const isSet = val !== null && val !== undefined;
                    return (
                      <td key={`avail-d-${date}`} style={{
                        padding: "4px 16px",
                        border: "1px solid #ddd",
                        background: isSet ? "#f0fdf4" : "#fef2f2",
                        color: isSet ? "#166534" : "#dc2626",
                        whiteSpace: "nowrap",
                        textAlign: "center",
                        fontWeight: "600",
                        fontSize: "0.8rem",
                      }}>
                        {isSet ? `${val} rooms` : "Not Set"}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>


      {/* ====== Footer ====== */}
      <div className="flex items-center justify-between mt-6">
        <button
          type="button"
          onClick={onPrev}
          className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-sm"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="px-5 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm"
        >
          Continue
        </button>
      </div>
    </>
  );
}
