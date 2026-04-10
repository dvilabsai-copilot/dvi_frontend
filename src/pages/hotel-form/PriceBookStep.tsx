// FILE: src/pages/hotel-form/PriceBookStep.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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
   *  NEW: Room Details section state
   * --------------------------------------------------------- */
  type RoomInput = {
    roomPrice?: string;
    extraBed?: string;
    childWithBed?: string;
    childWithoutBed?: string;
    gstType?: "Included" | "Excluded" | "";
    gstPct?: string; // "0", "5", "12", "18", "28"
    startDate?: string;
    endDate?: string;
  };
  const [roomInputs, setRoomInputs] = useState<Record<number, RoomInput>>({});
  const [roomStartDate, setRoomStartDate] = useState<string>("");
  const [roomEndDate, setRoomEndDate] = useState<string>("");
  const roomStartRef = useRef<HTMLInputElement | null>(null);
  const roomEndRef = useRef<HTMLInputElement | null>(null);

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
    setRoomInputs((prev) => {
      const next = { ...prev };
      rooms.forEach((r) => {
        if (!next[r.room_ID]) {
          next[r.room_ID] = {
            gstType: toUiGstType(r.gst_type ?? 1),
            gstPct:
              r.gst_percentage === null ||
              r.gst_percentage === undefined ||
              r.gst_percentage === ""
                ? "0"
                : String(Number(r.gst_percentage)),
          };
        }
      });
      return next;
    });
  }, [rooms]);

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
    },
    onError: (e: any) => {
      setAmenitiesSuccess("");
      setAmenitiesError(
        uiErrorMessage(e, "Amenities save failed. Please try again.")
      );
    },
  });

  // Room price book (bulk) — kept
  const roomMut = useMutation({
    mutationFn: async () => {
      if (!rooms.length) throw new Error("No rooms to update");

      const roomStart = roomStartDate || roomStartRef.current?.value || "";
      const roomEnd = roomEndDate || roomEndRef.current?.value || "";

      const items = rooms
        .map((r) => {
          const v = roomInputs[r.room_ID] || {};
          const hasAny =
            v.roomPrice ||
            v.extraBed ||
            v.childWithBed ||
            v.childWithoutBed ||
            v.gstType ||
            v.gstPct;
          if (!hasAny) return null;

          return {
            hotel_id: toNum(hotelId),
            room_id: r.room_ID,
            startDate: ymd(roomStart) || roomStart,
            endDate: ymd(roomEnd) || roomEnd,
            roomPrice: toMaybeNum(v.roomPrice),
            extraBed: toMaybeNum(v.extraBed),
            childWithBed: toMaybeNum(v.childWithBed),
            childWithoutBed: toMaybeNum(v.childWithoutBed),
            gstType: v.gstType || undefined,
            gstPercentage: toMaybeNum(v.gstPct),
            status: 1, // harmless; backend may ignore
          };
        })
        .filter(Boolean) as any[];

      const hasAnyCharge = items.some(
        (x) =>
          x.roomPrice !== undefined ||
          x.extraBed !== undefined ||
          x.childWithBed !== undefined ||
          x.childWithoutBed !== undefined
      );

      if (!hasAnyCharge) {
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

      const payload = { items, status: 1 };

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
    onSuccess: () => {
      setRoomError("");
      setRoomSuccess("Room price book saved successfully.");
    },
    onError: (e: any) => {
      setRoomSuccess("");
      setRoomError(uiErrorMessage(e, "Room pricebook failed. Please try again."));
    },
  });

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
    key: keyof RoomInput,
    value: string
  ) => {
    setRoomInputs((prev) => ({
      ...prev,
      [roomId]: { ...(prev[roomId] || {}), [key]: value },
    }));
  };

  const roomCardHeader = (r: RoomRow, index: number) => {
    const title =
      r.room_title ||
      r.room_ref_code ||
      (r.room_type_id ? `Room Type #${r.room_type_id}` : `Room #${r.room_ID}`);
    return `#${index + 1} - ${title} ${
      r.room_ref_code ? `| [${r.room_ref_code}]` : ""
    }`;
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

        <div className="grid grid-cols-12 gap-3">
          {amenityOptions.length === 0 ? (
            <div className="col-span-12 text-sm text-gray-500">No more amenities found.</div>
          ) : (
            amenityOptions.map((a) => {
              const val = amenityCharges[a.id] || { hours: "", day: "" };
              return (
                <React.Fragment key={a.id}>
                  <div className="col-span-12 md:col-span-4">
                    <label className="block text-xs font-medium mb-1">Amenities Title</label>
                    <div className="text-pink-600 font-semibold text-sm mt-2">{a.name}</div>
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <label className="block text-xs font-medium mb-1">Hours Charge (₹)</label>
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
                  <div className="col-span-12 md:col-span-4">
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
                </React.Fragment>
              );
            })
          )}
        </div>
      </div>

      {/* ====== Room Details ====== */}
      <div className="border rounded-xl bg-white shadow-sm mb-4 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b pb-3 mb-3">
          <h5 className="font-semibold text-gray-800 text-sm md:text-base">
            Room Details
          </h5>

          <div className="flex items-center gap-2">
            <input
              ref={roomStartRef}
              type="date"
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="Start Date"
              value={roomStartDate}
              onChange={(e) => setRoomStartDate(e.target.value)}
            />
            <input
              ref={roomEndRef}
              type="date"
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="End Date"
              value={roomEndDate}
              onChange={(e) => setRoomEndDate(e.target.value)}
            />

            <button
              type="button"
              onClick={() => {
                const rStart = roomStartDate || roomStartRef.current?.value || "";
                const rEnd = roomEndDate || roomEndRef.current?.value || "";
                setRoomStartDate(rStart);
                setRoomEndDate(rEnd);
                setRoomError("");
                setRoomSuccess("");
                roomMut.mutate();
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
            {rooms.map((r, idx) => {
              const v = roomInputs[r.room_ID] || {};
              return (
                <div
                  key={r.room_ID}
                  className="col-span-12 border-b border-dashed pb-4 mb-4 last:border-b-0 last:pb-0 last:mb-0"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                    <h6 className="font-semibold text-sm text-gray-700">
                      {roomCardHeader(r, idx)}
                    </h6>
                  </div>

                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-12 md:col-span-3">
                      <label className="block text-xs font-medium">
                        Room Price (₹)
                      </label>
                      <input
                        className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="Enter the Room Price"
                        value={v.roomPrice || ""}
                        onChange={(e) =>
                          setRoomField(r.room_ID, "roomPrice", e.target.value)
                        }
                        type="number"
                      />
                    </div>

                    <div className="col-span-12 md:col-span-3">
                      <label className="block text-xs font-medium">
                        Extra Bed Charge (₹)
                      </label>
                      <input
                        className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="Enter the Extra Bed Charge"
                        value={v.extraBed || ""}
                        onChange={(e) =>
                          setRoomField(r.room_ID, "extraBed", e.target.value)
                        }
                        type="number"
                      />
                    </div>

                    <div className="col-span-12 md:col-span-3">
                      <label className="block text-xs font-medium">
                        Child with Bed (₹)
                      </label>
                      <input
                        className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="Enter the Child with Bed"
                        value={v.childWithBed || ""}
                        onChange={(e) =>
                          setRoomField(
                            r.room_ID,
                            "childWithBed",
                            e.target.value
                          )
                        }
                        type="number"
                      />
                    </div>

                    <div className="col-span-12 md:col-span-3">
                      <label className="block text-xs font-medium">
                        Child Without Bed (₹)
                      </label>
                      <input
                        className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                        placeholder="Enter the Child Without Bed"
                        value={v.childWithoutBed || ""}
                        onChange={(e) =>
                          setRoomField(
                            r.room_ID,
                            "childWithoutBed",
                            e.target.value
                          )
                        }
                        type="number"
                      />
                    </div>

                    <div className="col-span-12 md:col-span-3">
                      <label className="block text-xs font-medium">
                        GST Type
                      </label>
                      <select
                        className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                        value={v.gstType || ""}
                        onChange={(e) =>
                          setRoomField(
                            r.room_ID,
                            "gstType",
                            e.target.value as any
                          )
                        }
                      >
                        <option value="">Select</option>
                        <option value="Included">Included</option>
                        <option value="Excluded">Excluded</option>
                      </select>
                    </div>

                    <div className="col-span-12 md:col-span-3">
                      <label className="block text-xs font-medium">
                        GST Percentage
                      </label>
                      <select
                        className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                        value={v.gstPct || "0"}
                        onChange={(e) =>
                          setRoomField(r.room_ID, "gstPct", e.target.value)
                        }
                      >
                        {gstPercentages.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
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
