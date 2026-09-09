// FILE: src/pages/HotelForm.tsx
import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { hotelFormApi } from "@/services/hotels";
import { API_BASE_URL as APP_API_BASE_URL } from "@/lib/api";

/* ========= Types ========= */
export type HotelForm = {
  hotel_name: string;
  hotel_place: string;
  axisrooms_property_id?: string;
  hotel_status: number | string;
  hotel_mobile_no: string;
  hotel_email_id: string;
  hotel_category: number | string;
  hotel_powerbackup: number | string;
  hotel_country: number | string;
  hotel_state: number | string;
  hotel_city: number | string;
  hotel_postal_code: string;
  hotel_code: string;
  resavenue_hotel_code?: string;
  hotel_margin: number | string;
  hotel_margin_gst_type: number | string;
  hotel_margin_gst_percentage: number | string;
  hotel_latitude?: string;
  hotel_longitude?: string;
  hotel_hotspot_status: number | string;
  hotel_address: string;
};
export type RoomForm = {
  room_type: string;
  room_title: string;
  preferred_for: string;
  no_of_rooms: number | string;
  ac_availability: number | string;
  status: number | string;
  max_adult: number | string;
  max_children: number | string;
  check_in_time: string;
  check_out_time: string;
  gst_type: string;
  gst_percentage: number | string;
  amenities: (string | number)[];
  food_breakfast: boolean;
  food_lunch: boolean;
  food_dinner: boolean;
  gallery?: FileList | null;
};
export type AmenityRow = {
  id?: number | string;
  amenities_title: string;
  amenities_qty: number | string;
  availability_type: number | string;
  available_start_time?: string;
  available_end_time?: string;
  status: number | string;
  amenities_code?: string;
};
export type PricebookRow = {
  id?: number | string;
  plan_title: string;
  room_type?: string;
  meal_plan: string;
  occupancy_type: string;
  base_price: number | string;
  extra_adult_price: number | string;
  extra_child_price: number | string;
  status: number | string;
};
export type ReviewForm = {
  hotel_rating: number | string;
  review_description: string;
};

/* Export helpers for steps (context shape) */
function stripHotelAdminApiPrefix(path: string) {
  return path.replace(/^\/api\/v1/, "");
}

function mapHotelAdminHotelPath(path: string, body?: any) {
  const clean = stripHotelAdminApiPrefix(path);

  const queryIndex = clean.indexOf("?");

  const queryParams =
    queryIndex >= 0
      ? new URLSearchParams(
          clean.substring(queryIndex + 1),
        )
      : new URLSearchParams();

  const queryHotelId =
    String(
      queryParams.get("hotelId") || "",
    ).trim();

  const bodyHotelId =
    String(
      body?.hotelId ??
      body?.hotel_id ??
      body?.items?.[0]?.hotelId ??
      body?.items?.[0]?.hotel_id ??
      (Array.isArray(body)
        ? body?.[0]?.hotelId ??
          body?.[0]?.hotel_id
        : "") ??
      "",
    ).trim();

  const contextualHotelId =
    /^\d+$/.test(queryHotelId)
      ? queryHotelId
      : /^\d+$/.test(bodyHotelId)
        ? bodyHotelId
        : null;

  /*
   * Shared Super Admin form components contain legacy/global
   * fallback endpoints. Hotel Admin must never call those
   * endpoints directly; rewrite them through Hotel Admin scope.
   */

  if (
    contextualHotelId &&
    /^\/hotel-amenities\/bulk(?:\?.*)?$/.test(clean)
  ) {
    return `/hotel-admin/hotels/${contextualHotelId}/amenities/bulk`;
  }

  if (
    contextualHotelId &&
    /^\/hotel-amenities(?:\/list)?(?:\?.*)?$/.test(clean)
  ) {
    return `/hotel-admin/hotels/${contextualHotelId}/amenities`;
  }

  const amenitiesHotelMatch =
    clean.match(
      /^\/hotel-amenities\/(\d+)(?:\?.*)?$/,
    );

  if (amenitiesHotelMatch) {
    return `/hotel-admin/hotels/${amenitiesHotelMatch[1]}/amenities`;
  }

  if (
    contextualHotelId &&
    /^\/hotel-amenities-pricebook(?:\?.*)?$/.test(clean)
  ) {
    const amenityId =
      String(
        queryParams.get("amenityId") ??
        body?.amenityId ??
        body?.amenity_id ??
        "",
      ).trim();

    if (/^\d+$/.test(amenityId)) {
      return `/hotel-admin/hotels/${contextualHotelId}/amenities/${amenityId}/pricebook`;
    }
  }

  if (
    contextualHotelId &&
    /^\/hotel-meal-pricebook(?:\?.*)?$/.test(clean)
  ) {
    return `/hotel-admin/hotels/${contextualHotelId}/meal-pricebook`;
  }

  const mealPricebookMatch =
    clean.match(
      /^\/hotels\/meal-pricebook\/(\d+)(?:\?.*)?$/,
    );

  if (mealPricebookMatch) {
    return `/hotel-admin/hotels/${mealPricebookMatch[1]}/meal-pricebook`;
  }

  if (
    contextualHotelId &&
    /^\/hotel-room-pricebook\/bulk(?:\?.*)?$/.test(clean)
  ) {
    return `/hotel-admin/hotels/${contextualHotelId}/rates`;
  }

  if (
    contextualHotelId &&
    /^\/(?:rooms|hotel-rooms)(?:\?.*)?$/.test(clean)
  ) {
    return `/hotel-admin/hotels/${contextualHotelId}/rooms`;
  }

  if (
    contextualHotelId &&
    /^\/hotels\/basic(?:\?.*)?$/.test(clean)
  ) {
    return `/hotel-admin/hotels/${contextualHotelId}`;
  }

  if (
    contextualHotelId &&
    /^\/hotels\/amenities(?:\?.*)?$/.test(clean)
  ) {
    return `/hotel-admin/hotels/${contextualHotelId}/amenities`;
  }

  if (
    contextualHotelId &&
    /^\/hotels\/reviews(?:\?.*)?$/.test(clean)
  ) {
    return `/hotel-admin/hotels/${contextualHotelId}/reviews`;
  }

  if (clean === "/hotels") {
    return "/hotel-admin/hotels";
  }

  const match = clean.match(/^\/hotels\/(\d+)(.*)$/);

  if (!match) {
    return clean;
  }

  const hotelId = match[1];
  const suffix = match[2] || "";

  if (suffix.startsWith("/pricebook/range-view")) {
    return `/hotel-admin/hotels/${hotelId}/rates${suffix.substring(
      "/pricebook/range-view".length,
    )}`;
  }

  if (suffix === "/rooms/pricebook/bulk") {
    return `/hotel-admin/hotels/${hotelId}/rates`;
  }

  const ratePlanMatch =
    suffix.match(/^\/rooms\/(\d+)\/rateplans(.*)$/);

  if (ratePlanMatch) {
    return `/hotel-admin/hotels/${hotelId}/rooms/${ratePlanMatch[1]}/rate-plans${ratePlanMatch[2] || ""}`;
  }

  return `/hotel-admin/hotels/${hotelId}${suffix}`;
}

export const api = {
  API_BASE_URL: hotelFormApi.API_BASE_URL,
  token: hotelFormApi.token,
  galleryUploadUrl: (
    hotelId: number | string,
    roomId: number | string,
  ) =>
    `${APP_API_BASE_URL.replace(/\/+$/, "")}/hotel-admin/hotels/${hotelId}/rooms/${roomId}/gallery`,

  apiGet: (path: string) =>
    hotelFormApi.apiGet(
      mapHotelAdminHotelPath(path),
    ),

  apiPost: (path: string, body: any) =>
    hotelFormApi.apiPost(
      mapHotelAdminHotelPath(path, body),
      body,
    ),

  apiPatch: (path: string, body: any) =>
    hotelFormApi.apiPatch(
      mapHotelAdminHotelPath(path),
      body,
    ),

  apiDelete: (path: string) =>
    hotelFormApi.apiDelete(
      mapHotelAdminHotelPath(path),
    ),

  apiGetFirst: (paths: string[]) =>
    hotelFormApi.apiGetFirst(
      paths.map(mapHotelAdminHotelPath),
    ),
};

/* ===== Tabs mapping via ?tab=... ===== */
const tabToStep: Record<string, number> = {
  basic: 1,
  rooms: 2,
  amenities: 3,
  pricebook: 4,
  reviews: 5,
  preview: 6,
};
const stepToTab = [
  "",
  "basic",
  "rooms",
  "amenities",
  "pricebook",
  "reviews",
  "preview",
] as const;

/* ===== Sub-steps ===== */
import BasicStep from "@/pages/hotel-form/BasicStep";
import RoomsStep from "@/pages/hotel-form/RoomsStep";
import AmenitiesStep from "@/pages/hotel-form/AmenitiesStep";
import PriceBookStep from "@/pages/hotel-form/PriceBookStep";
import ReviewStep from "@/pages/hotel-form/ReviewStep";
import PreviewStep from "@/pages/hotel-form/PreviewStep";

export default function HotelFormOrchestrator() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const location = useLocation();
  const params = useParams<{ id?: string }>();
  const hotelId = params.id;

  // HOTEL_ADMIN_CURRENT_HOTEL_CONTEXT
  useEffect(() => {
    const selectedHotelId =
      Number(hotelId);

    if (
      Number.isInteger(selectedHotelId) &&
      selectedHotelId > 0
    ) {
      window.localStorage.setItem(
        "hotelAdminSelectedHotelId",
        String(selectedHotelId),
      );
    }
  }, [hotelId]);
  const isEdit = Boolean(hotelId);

  const [hotelRow, setHotelRow] = useState<any | null>(null);

  const qs = new URLSearchParams(location.search);
  const lastPathPart =
    location.pathname
      .split("/")
      .filter(Boolean)
      .pop() || "";

  const routeTab =
    [
      "rooms",
      "amenities",
      "pricebook",
      "reviews",
      "preview",
    ].includes(lastPathPart)
      ? lastPathPart
      : "";

  const currentTab =
    (qs.get("tab") || routeTab || "basic").toLowerCase();
  const activeStep = tabToStep[currentTab] ?? 1;

  const stepEditPath = (id: string | number, tab: string) =>
    `/hotel-admin/hotels/${id}/edit?tab=${tab}`;
  const goToTab = (tab: string, id?: number | string) => {
    const targetId = id ?? hotelId;
    if (!targetId) return;
    nav(stepEditPath(targetId, tab));
  };
  const goToRooms = (id?: number | string) => goToTab("rooms", id);
  const goToAmenities = (id?: number | string) => goToTab("amenities", id);
  const goToPriceBook = (id?: number | string) => goToTab("pricebook", id);
  const goToReviews = (id?: number | string) => goToTab("reviews", id);
  const goToPreview = (id?: number | string) => goToTab("preview", id);

  /* Load existing hotel in edit mode (for Preview & defaults) */
  useEffect(() => {
    if (!isEdit || !hotelId) return;
    let alive = true;
    api.apiGet(`/api/v1/hotels/${hotelId}`)
      .then((row) => {
        if (!alive || !row) return;
        setHotelRow(row);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [isEdit, hotelId]);

  const steps = [
    { n: 1, label: "Basic Info" },
    { n: 2, label: "Rooms" },
    { n: 3, label: "Amenities" },
    { n: 4, label: "Price Book" },
    { n: 5, label: "Review & Feedback" },
    { n: 6, label: "Preview" },
  ];

  const isClickable = (tab: string) => isEdit && Boolean(tab);

  return (
    <div className="p-4">
      {/* Stepper */}
      <div className="mb-4 flex justify-center gap-3">
        {steps.map((s, i) => {
          const isActive = s.n === activeStep;
          const tab = stepToTab[s.n];
          const canClick = isClickable(tab);
          return (
            <div key={s.n} className="flex items-center">
              <button
                type="button"
                onClick={() => canClick && goToTab(tab)}
                className={`w-9 h-9 rounded-full flex items-center justify-center ${
                  isActive ? "bg-purple-600 text-white" : "bg-gray-300 text-white"
                } ${canClick ? "cursor-pointer" : "cursor-default"}`}
                title={s.label}
              >
                {s.n}
              </button>
              <button
                type="button"
                onClick={() => canClick && goToTab(tab)}
                className={`ml-2 text-sm ${
                  isActive ? "text-purple-600" : "text-gray-400"
                } ${canClick ? "hover:underline" : ""}`}
              >
                {s.label}
              </button>
              {i < steps.length - 1 && (
                <div className="mx-3 text-gray-400">{">"}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow p-6">
        {activeStep === 1 && (
          <BasicStep
            api={api}
            isEdit={isEdit}
            hotelId={hotelId}
            onNext={(newId) => goToRooms(newId)}
          />
        )}

        {activeStep === 2 && hotelId && (
          <RoomsStep
            api={api}
            hotelId={hotelId}
            onPrev={() => goToTab("basic")}
            onNext={() => goToAmenities(hotelId)}
          />
        )}

        {activeStep === 3 && hotelId && (
          <AmenitiesStep
            api={api}
            hotelId={hotelId}
            onPrev={() => goToRooms(hotelId)}
            onNext={() => goToPriceBook(hotelId)}
          />
        )}

        {activeStep === 4 && hotelId && (
          <PriceBookStep
            api={api}
            hotelId={hotelId}
            onPrev={() => goToAmenities(hotelId)}
            onNext={() => goToReviews(hotelId)}
          />
        )}

        {activeStep === 5 && hotelId && (
          <ReviewStep
            api={api}
            hotelId={hotelId}
            onPrev={() => goToPriceBook(hotelId)}
            onNext={() => goToPreview(hotelId)}
          />
        )}

        {activeStep === 6 && hotelId && (
          <PreviewStep
            api={api}
            hotelId={hotelId}
            hotelData={hotelRow}
            onPrev={() => goToReviews(hotelId)}
          />
        )}
      </div>
    </div>
  );
}
