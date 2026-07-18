// FILE: src/pages/hotel-form/RoomsStep.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { RoomForm } from "./HotelForm";
import { API_BASE_URL, getToken } from "../../lib/api";
import type { RoomOption } from "./RoomFieldPickers";
import { RoomFormRow } from "./RoomFormRow";

/* ========= API ctx from parent ========= */
type ApiCtx = {
  apiGet: (p: string) => Promise<any>;
  apiPost: (p: string, b: any) => Promise<any>;
  apiGetFirst: (ps: string[]) => Promise<any>;
  apiDelete?: (p: string) => Promise<any>;
};

/* ========= Helpers ========= */
// DB expects 1 (Included) / 2 (Excluded)
const toGstNum = (v: any): 1 | 2 => {
  if (v === 1 || v === "1") return 1;
  if (v === 2 || v === "2") return 2;
  const s = String(v ?? "").toLowerCase();
  if (s.includes("include")) return 1;
  if (s.includes("exclude")) return 2;
  return 1;
};

const toNumberOrDefault = (value: any, fallback: number): number => {
  if (value === "" || value === null || value === undefined) {
    return fallback;
  }

  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const toDbStatus = (value: any): 0 | 1 => {
  return toNumberOrDefault(value, 1) === 0 ? 0 : 1;
};

const toDbFlag = (value: any): 0 | 1 => {
  return value === true || value === 1 || value === "1" ? 1 : 0;
};

const toStringOrNull = (value: any): string | null => {
  const s = String(value ?? "").trim();
  return s.length ? s : null;
};

// "12:00 PM" → "12:00"
const to24h = (val: string): string => {
  if (!val) return "";
  const ampm = val.trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
  if (!ampm) {
    return /^\d{2}:\d{2}$/.test(val) ? val : "";
  }
  let h = parseInt(ampm[1], 10);
  const m = ampm[2];
  const p = ampm[3].toUpperCase();
  if (p === "AM") h = h === 12 ? 0 : h;
  else h = h === 12 ? 12 : h + 12;
  return `${String(h).padStart(2, "0")}:${m}`;
};

// "12:00" → "12:00 PM"
const to12h = (val: string): string => {
  if (!val) return "";
  const m = val.match(/^(\d{2}):(\d{2})$/);
  if (!m) return val;
  let h = parseInt(m[1], 10);
  const min = m[2];
  const suf = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${min} ${suf}`;
};

// Defensive getter for time fields that might arrive as {} / Date / string
const getTimeString = (t: any): string => {
  if (!t) return "";
  if (typeof t === "string") return t;
  try {
    const d = new Date(t as any);
    if (!isNaN(d.getTime())) {
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    }
  } catch {}
  return "";
};

/** Generate a non-null room_ref_code if backend didn't give one */
const generateRoomRefCode = (hotelId: string | number, rowIndex: number) => {
  const prefix = "DVIR"; // matches existing style like DVIRDEL...
  const hidPart = String(hotelId || "")
    .replace(/\D/g, "")
    .padStart(3, "0")
    .slice(-3);
  const idxPart = String(rowIndex + 1).padStart(2, "0");
  const rand = Math.floor(100000 + Math.random() * 900000); // 6 digits
  return `${prefix}${hidPart}${idxPart}${rand}`;
};

/* ========= Room field pickers are kept in their own presentation module. ========= */
export default function RoomsStep({
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
  const [rows, setRows] = useState<RoomForm[]>([]);
  const initialRowsRef = useRef<any[]>([]);
  const [validationError, setValidationError] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [statusKind, setStatusKind] = useState<"success" | "error" | "">("");
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [topSuccessMessage, setTopSuccessMessage] = useState("");
  const topSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTopSuccess = (message: string) => {
    setTopSuccessMessage(message);

    if (topSuccessTimerRef.current) {
      clearTimeout(topSuccessTimerRef.current);
    }

    topSuccessTimerRef.current = setTimeout(() => {
      setTopSuccessMessage("");
      topSuccessTimerRef.current = null;
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (topSuccessTimerRef.current) {
        clearTimeout(topSuccessTimerRef.current);
      }
    };
  }, []);

  const defaultRow: RoomForm = {
    room_type: "",
    room_title: "",
    preferred_for: [] as (number | string)[],
    no_of_rooms: 1,
    ac_availability: 1,
    status: 1,
    max_adult: 2,
    max_children: 0,
    check_in_time: "12:00",
    check_out_time: "11:00",
    // @ts-ignore numeric 1/2 for DB
    gst_type: 1,
    gst_percentage: 5,
    amenities: [],
    food_breakfast: false,
    food_lunch: false,
    food_dinner: false,
    gallery: null,
  };

  /* ========= Meta (GST types) ========= */
  const gstTypes = [
    { id: 1 as const, name: "Included" },
    { id: 2 as const, name: "Excluded" },
  ];

  /* ========= GST Percentages ========= */
  const { data: gstPercentsRaw = [] } = useQuery({
    queryKey: ["gstPercentages-room"],
    queryFn: () =>
      api
        .apiGetFirst([
          "/api/v1/meta/gst/percentages",
          "/api/v1/gst/percentages",
          "/api/v1/meta/gst/percents",
        ])
        .catch(() => [
          { id: 4, name: "5%", value: 5 },
          { id: 2, name: "18%", value: 18 },
          { id: 1, name: "12%", value: 12 },
          { id: 7, name: "0%", value: 0 },
        ]),
  });

  const gstPercentOptions = useMemo(() => {
    const raw = (gstPercentsRaw as any[]).map((p) => {
      const val = Number(p?.value ?? p?.id ?? p);
      const v = Number.isFinite(val) ? val : 0;
      return { id: v, label: `${v} % GST - %${v}` };
    });
    const PRIORITY = [5, 18, 12, 0, 28];
    raw.sort((a, b) => {
      const ai = PRIORITY.indexOf(a.id);
      const bi = PRIORITY.indexOf(b.id);
      if (ai !== -1 || bi !== -1)
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      return a.id - b.id;
    });
    return raw;
  }, [gstPercentsRaw]);

  /* ========= Preferred For (static) ========= */
  const preferredForOptions = [
    { id: 1, name: "Family" },
    { id: 2, name: "Couple" },
    { id: 3, name: "Business" },
    { id: 4, name: "Group" },
  ];

  /* ========= Room Types ========= */
  const staticRoomTypesFallback = useMemo(
    () => [
      { id: 1, room_type: "Deluxe Room" },
      { id: 2, room_type: "Executive Room" },
      { id: 3, room_type: "Suite" },
    ],
    []
  );

  const useStaticOnly =
    typeof window !== "undefined" &&
    window.localStorage.getItem("USE_ROOM_TYPE_STATIC") === "1";

  const hid = useMemo(() => {
    const n = Number(hotelId);
    return Number.isFinite(n) ? n : null;
  }, [hotelId]);

  const { data: roomTypesRaw = [] } = useQuery({
    queryKey: ["hotel-room-types", hid, useStaticOnly],
    enabled: !useStaticOnly,
    queryFn: async () => {
      const endpoints: string[] = [];
      if (hid !== null) {
        endpoints.push(
          `/api/v1/hotels/${hid}/roomtypes`,
          `/api/v1/hotels/${hid}/room-types`
        );
        endpoints.push(
          `/api/v1/hotels/roomtypes?hotelId=${hid}`,
          `/api/v1/hotels/room-types?hotelId=${hid}`
        );
      }
      endpoints.push(`/api/v1/room-types`);
      try {
        const data = await api.apiGetFirst(endpoints);
        return data;
      } catch {
        console.warn(
          "[RoomsStep] Room types endpoint(s) unavailable; using static fallback."
        );
        return staticRoomTypesFallback;
      }
    },
  });

  const roomTypeOptions: Opt[] = useMemo(() => {
    const src = useStaticOnly ? staticRoomTypesFallback : (roomTypesRaw as any[]);
    return src.map((r: any) => ({
      id: r?.id ?? r?.roomtype_id ?? r?.room_type_id ?? r?.value ?? r,
      name: r?.room_type ?? r?.name ?? r?.title ?? String(r),
    }));
  }, [roomTypesRaw, useStaticOnly, staticRoomTypesFallback]);

  const roomTypeNameToId = useMemo(() => {
    const map = new Map<string, number | string>();
    roomTypeOptions.forEach((o) => map.set(o.name.toLowerCase(), o.id));
    return map;
  }, [roomTypeOptions]);

  /* ========= Inbuilt Amenities ========= */
  const { data: inbuiltAmenities = [] } = useQuery({
    queryKey: ["inbuilt-amenities-room"],
    queryFn: () =>
      api
        .apiGetFirst([
          "/api/v1/hotels/inbuilt-amenities",
          "/api/v1/meta/inbuilt-amenities",
          "/api/v1/inbuilt-amenities",
        ])
        .catch(() => []),
  });

  const amenityOpts: Opt[] = useMemo(
    () =>
      (inbuiltAmenities as any[]).map((a) => ({
        id:
          a?.id ??
          a?.inbuilt_amenity_type_id ??
          a?.amenity_type_id ??
          a?.value ??
          a,
        name:
          a?.inbuilt_amenity_title ??
          a?.inbuilt_amenties_title ??
          a?.title ??
          a?.name ??
          String(a),
      })),
    [inbuiltAmenities]
  );

  /* ========= Load existing rooms ========= */
  useQuery({
    queryKey: ["hotel-rooms", hotelId],
    enabled: !!hotelId,
    queryFn: async () => {
      const raw = await api
        .apiGetFirst([
          `/api/v1/hotels/${hotelId}/rooms`,
          `/api/v1/hotels/rooms?hotelId=${hotelId}`,
          `/api/v1/rooms?hotelId=${hotelId}`,
        ])
        .catch(() => []);
      const data = Array.isArray(raw) ? raw : raw?.items ?? raw?.data ?? raw?.rows ?? [];

      const mapped = (data as any[]).map((r, index) => {
        // preferred_for: "1,2" | ["1","2"] | "Family" → array
        const prefArr = Array.isArray(r?.preferred_for)
          ? (r.preferred_for as any[])
              .map((x) => String(x).trim())
              .filter(Boolean)
          : String(r?.preferred_for ?? "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);

        // string list "1,5,7" → [1,5,7]
        const amenitiesFromString = String(r?.inbuilt_amenities ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
          .map((s) => (Number.isFinite(Number(s)) ? Number(s) : s));

        const ci = to24h(getTimeString(r?.check_in_time)) || "12:00";
        const co = to24h(getTimeString(r?.check_out_time)) || "11:00";

        const base: any = {
          room_ID: r.room_ID ?? r.room_id ?? undefined,
          room_type: r.room_type_id ?? r.roomtype_id ?? r.room_type ?? "",
          room_title: r.room_title ?? r.title ?? "",
          preferred_for: prefArr,
          no_of_rooms: r.no_of_rooms ?? r.no_of_rooms_available ?? r.count ?? 1,
          ac_availability:
            r.ac_availability ??
            r.air_conditioner_availability ??
            (r.ac ? 1 : 0),
          status: r.status ?? 1,
          max_adult: r.max_adult ?? r.total_max_adults ?? 2,
          max_children: r.max_children ?? r.total_max_childrens ?? 0,
          check_in_time: ci,
          check_out_time: co,
          // @ts-ignore keep numeric 1/2
          gst_type: toGstNum(r.gst_type ?? 1),
          gst_percentage: Number(r.gst_percentage ?? 5),
          amenities: Array.isArray(r.amenities)
            ? r.amenities
                .map(
                  (a: any) =>
                    a?.id ?? a?.inbuilt_amenity_type_id ?? a?.amenity_type_id ?? a
                )
                .filter((x: any) => x !== null && x !== undefined)
            : amenitiesFromString,
          food_breakfast:
            (r.food_breakfast ?? (r.breakfast_included === 1)) || false,
          food_lunch: (r.food_lunch ?? (r.lunch_included === 1)) || false,
          food_dinner: (r.food_dinner ?? (r.dinner_included === 1)) || false,
          gallery: null,
        };

        // preserve existing room_ref_code if present; otherwise generate one
        base.room_ref_code =
          r.room_ref_code ||
          generateRoomRefCode(hotelId ?? hid ?? "", index);

        return base as RoomForm;
      });

      const effectiveRows = mapped.length ? mapped : [defaultRow];
      setRows(effectiveRows);
      initialRowsRef.current = effectiveRows.map((r) => comparableRow(r));
      return mapped;
    },
  });

  /* ========= Handlers ========= */
  const handleChange = (i: number, field: keyof RoomForm, value: any) => {
    setValidationError("");
    setStatusMessage("");
    setStatusKind("");
    setRows((prev) => {
      const copy = [...prev] as any[];
      if (field === "gst_type") value = toGstNum(value);
      if (field === "gst_percentage") value = Number(value ?? 0);
      copy[i] = { ...copy[i], [field]: value };
      return copy as RoomForm[];
    });
  };

  const addRow = () =>
    setRows((p) => {
      const nextIndex = p.length;
      const refCode = generateRoomRefCode(hotelId ?? "", nextIndex);
      return [
        ...p,
        { ...(defaultRow as any), room_ref_code: refCode } as RoomForm,
      ];
    });

  const getPersistedRoomId = (row: any): number | null => {
    const raw = row?.room_ID ?? row?.room_id;
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  };

  const removeRowLocal = (target: { index: number; roomId: number | null }) => {
    setRows((prev) => {
      let next: RoomForm[];

      if (target.roomId) {
        next = prev.filter((r: any) => {
          const rid = Number(r?.room_ID ?? r?.room_id);
          return rid !== target.roomId;
        });
      } else {
        next = prev.filter((_, idx) => idx !== target.index);
      }

      if (!next.length) {
        return [
          {
            ...(defaultRow as any),
            room_ref_code: generateRoomRefCode(hotelId ?? "", 0),
          } as RoomForm,
        ];
      }

      return next;
    });

    initialRowsRef.current = initialRowsRef.current.filter((prev, idx) => {
      if (target.roomId) {
        return Number((prev as any)?.room_ID ?? (prev as any)?.room_id) !== target.roomId;
      }
      return idx !== target.index;
    });

    setDeleteIndex(null);
  };

  const deleteRoomMut = useMutation({
    mutationFn: async (target: { index: number; roomId: number | null }) => {
      if (!target.roomId) {
        return { success: true, localOnly: true };
      }

      if (!api.apiDelete) {
        throw new Error("Room delete API is not available");
      }

      return api.apiDelete(`/api/v1/hotels/${hotelId}/rooms/${target.roomId}`);
    },
    onSuccess: (_res, target) => {
      removeRowLocal(target);
      qc.invalidateQueries({ queryKey: ["hotel-rooms", hotelId] });
      setStatusKind("");
      setStatusMessage("");
      showTopSuccess("Room deleted successfully.");
    },
    onError: (e: any) => {
      setStatusKind("error");
      setStatusMessage(
        uiErrorMessage(e, "Failed to delete room. Please try again.")
      );
    },
  });
  const validateRows = (items: RoomForm[]) => {
    for (let i = 0; i < items.length; i += 1) {
      const row: any = items[i];
      const n = i + 1;

      if (!String(row.room_type ?? "").trim()) return `Room ${n}: Room Type is required`;
      if (!String(row.room_title ?? "").trim()) return `Room ${n}: Room Title is required`;
      if (!String(row.no_of_rooms ?? "").trim()) return `Room ${n}: No of Rooms Availability is required`;
      if (row.ac_availability === "" || row.ac_availability === null || row.ac_availability === undefined) {
        return `Room ${n}: AC Availability is required`;
      }
      if (row.status === "" || row.status === null || row.status === undefined) {
        return `Room ${n}: Status is required`;
      }
      if (!String(row.max_adult ?? "").trim()) return `Room ${n}: Max Adult is required`;
      if (!String(row.max_children ?? "").trim()) return `Room ${n}: Max Children is required`;
      if (!String(row.check_in_time ?? "").trim()) return `Room ${n}: Check-In Time is required`;
      if (!String(row.check_out_time ?? "").trim()) return `Room ${n}: Check-Out Time is required`;
      if (row.gst_type === "" || row.gst_type === null || row.gst_type === undefined) {
        return `Room ${n}: GST Type is required`;
      }
      if (row.gst_percentage === "" || row.gst_percentage === null || row.gst_percentage === undefined) {
        return `Room ${n}: GST Percentage is required`;
      }
    }
    return null;
  };

  const comparableRow = (row: any) => {
    const amenities = Array.isArray(row?.amenities)
      ? [...row.amenities].map(String).sort()
      : [];
    const preferred = Array.isArray(row?.preferred_for)
      ? [...row.preferred_for].map(String).sort()
      : [];
    return {
      room_ID: row?.room_ID ?? row?.room_id ?? null,
      room_ref_code: row?.room_ref_code ?? "",
      room_type: String(row?.room_type ?? ""),
      room_title: String(row?.room_title ?? ""),
      preferred_for: preferred,
      no_of_rooms: String(row?.no_of_rooms ?? ""),
      ac_availability: String(row?.ac_availability ?? ""),
      status: String(row?.status ?? ""),
      max_adult: String(row?.max_adult ?? ""),
      max_children: String(row?.max_children ?? ""),
      check_in_time: String(row?.check_in_time ?? ""),
      check_out_time: String(row?.check_out_time ?? ""),
      gst_type: String(row?.gst_type ?? ""),
      gst_percentage: String(row?.gst_percentage ?? ""),
      amenities,
      food_breakfast: Boolean(row?.food_breakfast),
      food_lunch: Boolean(row?.food_lunch),
      food_dinner: Boolean(row?.food_dinner),
    };
  };

  /* ========= Save ========= */
  const saveMut = useMutation({
    mutationFn: async (items: RoomForm[]) => {
      const hotelIdNum = Number(hotelId);

      const changedItems = items;

      // ✅ Map UI → dvi_hotel_rooms column names & types
      const payload = items.map((r, index) => {
        // Resolve room_type_id from typed text or numeric value
        const rawType = (r as any).room_type;
        let room_type_id: number | null = null;
        const asNum = Number(rawType);
        if (Number.isFinite(asNum) && String(rawType).trim() !== "") {
          room_type_id = asNum;
        } else {
          const typed = String(rawType ?? "").trim().toLowerCase();
          if (typed && roomTypeNameToId.has(typed)) {
            const id = roomTypeNameToId.get(typed)!;
            const n = Number(id);
            room_type_id = Number.isFinite(n) ? n : null;
          }
        }

        if (room_type_id === null) {
          const fallbackId = Number(roomTypeOptions?.[0]?.id ?? 1);
          room_type_id = Number.isFinite(fallbackId) ? fallbackId : 1;
        }

        const preferred_for = Array.isArray(r.preferred_for)
          ? (r.preferred_for as any[])
              .map(String)
              .filter(Boolean)
              .join(",")
          : (r as any).preferred_for || null;

        const inbuilt_amenitiesStr = (r.amenities ?? [])
          .map((id) => Number(id))
          .filter((n) => Number.isFinite(n))
          .join(",");

        // keep existing room_ref_code if present; otherwise generate a new one
        const room_ref_code =
          (r as any).room_ref_code ||
          generateRoomRefCode(hotelIdNum || hotelId, index);

        return {
          room_ID: (r as any).room_ID ?? (r as any).room_id,
          hotel_id: hotelIdNum,
          room_type_id,

          room_title: toStringOrNull(r.room_title),
          preferred_for,

          no_of_rooms_available: toNumberOrDefault(r.no_of_rooms, 1),
          air_conditioner_availability: toDbFlag(r.ac_availability),

          status: toDbStatus((r as any).status),

          total_max_adults: toNumberOrDefault(r.max_adult, 0),
          total_max_childrens: toNumberOrDefault(r.max_children, 0),
          check_in_time:
            to12h((r as any).check_in_time) || (r as any).check_in_time || null,
          check_out_time:
            to12h((r as any).check_out_time) ||
            (r as any).check_out_time ||
            null,
          gst_type: toGstNum((r as any).gst_type),
          gst_percentage: toNumberOrDefault(r.gst_percentage, 0),
          inbuilt_amenities: inbuilt_amenitiesStr || null,
          breakfast_included: toDbFlag(r.food_breakfast),
          lunch_included: toDbFlag(r.food_lunch),
          dinner_included: toDbFlag(r.food_dinner),
          room_ref_code,
          // createdby/createdon/updatedon/deleted handled server-side
        };
      });

      const endpoints = [
        `/api/v1/hotels/${hotelId}/rooms/bulk`,
        `/api/v1/hotels/${hotelId}/rooms`,
        `/api/v1/rooms/bulk`,
      ];
      let lastErr: any;
      let jsonResult: any;
      const chunkSize = 25;
      const chunks: any[][] = [];
      for (let i = 0; i < payload.length; i += chunkSize) {
        chunks.push(payload.slice(i, i + chunkSize));
      }

      // 1) Save room rows as before
      const batchResults: any[] = [];
      for (const batch of chunks) {
        jsonResult = null;
        for (const p of endpoints) {
          try {
            try {
              jsonResult = await api.apiPost(p, { items: batch });
            } catch {
              jsonResult = await api.apiPost(p, batch);
            }
            break;
          } catch (e) {
            lastErr = e;
          }
        }
        if (!jsonResult) {
          throw lastErr || new Error("No rooms endpoint available");
        }
        batchResults.push(jsonResult);
      }
      jsonResult = { success: true, batches: batchResults.length, items: batchResults };

      // 2) NEW: upload room gallery files (non-blocking for main flow)
      try {
        // reload rooms to map room_ref_code → room_ID
        const rawAfter = await api
          .apiGetFirst([
            `/api/v1/hotels/${hotelId}/rooms`,
            `/api/v1/hotels/rooms?hotelId=${hotelId}`,
            `/api/v1/rooms?hotelId=${hotelId}`,
          ])
          .catch(() => []);
        const roomsAfter = Array.isArray(rawAfter)
          ? rawAfter
          : rawAfter?.items ?? rawAfter?.data ?? rawAfter?.rows ?? [];

        const byRef = new Map<string, any>();
        (roomsAfter as any[]).forEach((r: any) => {
          if (r?.room_ref_code) {
            byRef.set(String(r.room_ref_code), r);
          }
        });

        const uploadPromises: Promise<any>[] = [];

        changedItems.forEach((row, index) => {
          const filesLike: any = (row as any).gallery;
          if (!filesLike || (filesLike as FileList).length === 0) return;

          const roomRefCode = (payload[index] as any).room_ref_code as string;
          if (!roomRefCode) return;

          const match = byRef.get(String(roomRefCode));
          const roomId = match?.room_ID ?? match?.room_id;
          if (!roomId) return;

          const fd = new FormData();
          Array.from(filesLike as FileList).forEach((f) => {
            fd.append("files", f);
          });
          fd.append("room_ref_code", roomRefCode);

          const base = API_BASE_URL.replace(/\/+$/, "");
          const url = `${base}/hotels/${hotelIdNum}/rooms/${roomId}/gallery`;

          const token = getToken();
          const headers: Record<string, string> = {};
          if (token) headers["Authorization"] = `Bearer ${token}`;

          uploadPromises.push(
            fetch(url, {
              method: "POST",
              headers,
              body: fd,
            }).then(async (res) => {
              if (!res.ok) {
                const text = await res.text().catch(() => "");
                console.error(
                  "[RoomsStep] Room gallery upload failed",
                  res.status,
                  text
                );
              }
            })
          );
        });

        if (uploadPromises.length) {
          await Promise.all(uploadPromises);
        }
      } catch (err) {
        console.error("[RoomsStep] Room gallery upload error", err);
      }

      return jsonResult;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      setStatusKind("");
      setStatusMessage("");
      showTopSuccess("Rooms saved successfully.");
      setTimeout(() => {
        onNext();
      }, 400);
    },
    onError: (e: any) => {
      setStatusKind("error");
      setStatusMessage(uiErrorMessage(e, "Failed to save rooms. Please try again."));
    },
  });

  return (
    <>
      {topSuccessMessage && (
        <div className="fixed top-20 left-1/2 z-[100] w-[92vw] max-w-[680px] -translate-x-1/2">
          <div className="flex items-center justify-between rounded-md bg-green-600 px-4 py-3 text-white shadow-lg">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4" />
              <span>{topSuccessMessage}</span>
            </div>

            <button
              type="button"
              onClick={() => setTopSuccessMessage("")}
              className="inline-flex h-6 w-6 items-center justify-center rounded text-white/90 transition hover:bg-white/15 hover:text-white"
              aria-label="Close success message"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <h3 className="text-pink-600 font-semibold mb-4">Rooms</h3>

      <div className="flex justify-end mb-3">
        <button
          type="button"
          onClick={addRow}
          className="px-4 py-2 rounded-lg border border-dashed border-purple-300 text-purple-700 text-sm"
        >
          + Add Rooms
        </button>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {rows.map((row, idx) => (
          <RoomFormRow
            key={idx}
            row={row}
            index={idx}
            totalRows={rows.length}
            roomTypeOptions={roomTypeOptions}
            preferredForOptions={preferredForOptions}
            gstTypes={gstTypes}
            gstPercentOptions={gstPercentOptions}
            amenityOptions={amenityOpts}
            onChange={(field, value) => handleChange(idx, field, value)}
            onDelete={() => setDeleteIndex(idx)}
            deleteDisabled={deleteRoomMut.isPending}
            to12h={to12h}
          />
        ))}
      </div>

      {validationError && (
        <div className="mt-3 text-sm text-red-600">{validationError}</div>
      )}
      {statusMessage && statusKind === "error" && (
        <div className="mt-2 text-sm text-red-600">
          {statusMessage}
        </div>
      )}
{deleteIndex !== null && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div className="w-[420px] rounded-lg bg-white px-8 py-7 text-center shadow-xl">
      <h2 className="text-2xl font-semibold text-gray-600">
        Confirmation Alert?
      </h2>

      <div className="my-4 text-5xl text-gray-500">🗑️</div>

      <p className="text-base text-gray-600">
        Are you sure? want to delete this room{" "}
        <strong>
          "{(rows[deleteIndex] as any)?.room_title || "ROOM"}"
        </strong>
      </p>

      <p className="mt-1 text-base text-gray-600">
        This action cannot be undone.
      </p>

      <div className="mt-7 flex justify-center gap-4">
        <button
          type="button"
          disabled={deleteRoomMut.isPending}
          onClick={() => setDeleteIndex(null)}
          className="rounded-md border border-purple-700 px-7 py-2 text-purple-700 disabled:opacity-60"
        >
          Close
        </button>

        <button
          type="button"
          disabled={deleteRoomMut.isPending}
          onClick={() => {
            if (deleteIndex === null) return;
            const row = rows[deleteIndex] as any;
            deleteRoomMut.mutate({
              index: deleteIndex,
              roomId: getPersistedRoomId(row),
            });
          }}
          className="rounded-md bg-red-500 px-7 py-2 text-white disabled:opacity-60"
        >
          {deleteRoomMut.isPending ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  </div>
)}


      <div className="flex items-center justify-between mt-8">
        <button
          type="button"
          onClick={onPrev}
          className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
        >
          Back
        </button>
        <button
          type="button"
          disabled={saveMut.isPending}
          onClick={() => {
            const msg = validateRows(rows);
            if (msg) {
              setValidationError(msg);
              return;
            }
            setValidationError("");
            setStatusMessage("");
            setStatusKind("");
            console.log("[RoomsStep] Update & Continue clicked", {
              hotelId,
              rowsCount: rows.length,
            });
            saveMut.mutate(rows);
          }}
          className="px-5 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 text-white disabled:opacity-60"
        >
          {saveMut.isPending ? "Saving..." : "Update & Continue"}
        </button>
      </div>
    </>
  );
}
