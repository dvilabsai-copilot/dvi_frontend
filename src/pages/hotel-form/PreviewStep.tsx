// FILE: src/pages/hotel-form/PreviewStep.tsx
import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

type ApiCtx = {
  apiGetFirst: (ps: string[]) => Promise<any>;
};

// Safe string render
const S = (v: any) => (v === null || v === undefined || v === "" ? "-" : String(v));
const isNumericLike = (v: any) => {
  if (v === null || v === undefined || v === "") return false;
  const n = Number(v);
  return Number.isFinite(n);
};

const to12h = (val: any) => {
  const raw = String(val ?? "").trim();
  if (!raw || raw === "-") return "-";
  const hhmmss = raw.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
  if (!hhmmss) return raw;
  let h = Number(hhmmss[1]);
  const m = hhmmss[2];
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${m} ${suffix}`;
};

const gstTypeLabel = (v: any) => {
  const s = String(v ?? "").toLowerCase();
  if (v === 1 || s.includes("include")) return "Included";
  if (v === 2 || s.includes("exclude")) return "Excluded";
  return S(v);
};

export default function PreviewStep({
  api,
  hotelId,
  hotelData,
  onPrev,
}: {
  api: ApiCtx;
  hotelId: string;
  hotelData: any;
  onPrev: () => void;
}) {
  // Normalize all fields your screenshot shows
  const info = useMemo(() => {
    const h = hotelData || {};

    // status: 1/true -> Active, else In-Active
    const statusRaw =
      h.status ?? h.hotel_status ?? h.isActive ?? h.active ?? h.hotelStatus ?? 1;
    const isActive =
      typeof statusRaw === "boolean" ? statusRaw : Number(statusRaw) === 1;

    return {
      hotelName: S(h.hotel_name ?? h.name),
      hotelCode: S(h.hotel_code ?? h.code),
      hotelMobile: S(
        h.hotel_mobile ??
          h.hotel_mobile_no ??
          h.phone ??
          (Array.isArray(h.mobiles) ? h.mobiles.join(",") : h.mobiles)
      ),
      hotelEmail: S(h.hotel_email ?? h.email),

      hotelPlace: S(h.hotel_place ?? h.place),

      // NOTE: API gives numeric/category id under hotel_category
      hotelCategory: S(
        h.hotel_category ?? h.category ?? h.starCategory ?? h.categoryStar ?? h.stars ?? h.star
      ),

      // >>> Important: read the hotel_* keys coming from your API
      country: S(
        h.hotel_country ?? h.country_name ?? h.country ?? h.countryName
      ),
      state: S(
        h.hotel_state ?? h.state_name ?? h.state ?? h.stateName
      ),
      city: S(
        h.hotel_city ?? h.city_name ?? h.city ?? h.cityName
      ),

      pincode: S(h.hotel_pincode ?? h.pincode ?? h.pin_code ?? h.zip ?? h.zipcode),

      // Lat/Long also arrive as hotel_latitude / hotel_longitude
      latitude: S(h.hotel_latitude ?? h.latitude ?? h.lat),
      longitude: S(h.hotel_longitude ?? h.longitude ?? h.lng ?? h.long),

      // Prefer the exact API key 'hotel_address'
      address: S(
        h.hotel_address ??
          h.address ??
          [
            h.address_line1 ?? h.address1,
            h.address_line2 ?? h.address2,
            h.area ?? h.locality,
            h.city_name ?? h.city ?? h.hotel_city,
            h.state_name ?? h.state ?? h.hotel_state,
            h.hotel_pincode ?? h.pincode ?? h.zip,
          ]
            .filter(Boolean)
            .join(", ")
      ),

      isActive,
    };
  }, [hotelData]);

  const { data: roomsRaw = [] } = useQuery({
    queryKey: ["preview-rooms", hotelId],
    enabled: !!hotelId,
    queryFn: () =>
      api
        .apiGetFirst([
          `/api/v1/hotels/${hotelId}/rooms`,
          `/api/v1/hotels/rooms?hotelId=${hotelId}`,
          `/api/v1/rooms?hotelId=${hotelId}`,
        ])
        .catch(() => []),
  });

  const { data: amenitiesRaw = [] } = useQuery({
    queryKey: ["preview-amenities", hotelId],
    enabled: !!hotelId,
    queryFn: () =>
      api
        .apiGetFirst([
          `/api/v1/hotels/${hotelId}/amenities`,
          `/api/v1/hotel-amenities?hotelId=${hotelId}`,
        ])
        .catch(() => []),
  });

  const { data: reviewsRaw = [] } = useQuery({
    queryKey: ["preview-reviews", hotelId],
    enabled: !!hotelId,
    queryFn: () =>
      api
        .apiGetFirst([
          `/api/v1/hotels/${hotelId}/reviews`,
          `/api/v1/hotels/${hotelId}/feedback`,
          `/api/v1/hotels/reviews?hotelId=${hotelId}`,
        ])
        .catch(() => []),
  });

  const { data: categoriesRaw = [] } = useQuery({
    queryKey: ["preview-categories"],
    queryFn: () =>
      api
        .apiGetFirst([
          "/api/v1/hotels/categories",
          "/api/v1/hotels/meta/categories",
          "/api/v1/meta/hotels/categories",
        ])
        .catch(() => []),
  });

  const { data: countriesRaw = [] } = useQuery({
    queryKey: ["preview-countries"],
    queryFn: () =>
      api
        .apiGetFirst(["/api/v1/meta/countries", "/api/v1/locations/countries", "/api/v1/countries"])
        .catch(() => []),
  });

  const { data: statesRaw = [] } = useQuery({
    queryKey: ["preview-states-all"],
    queryFn: () =>
      api
        .apiGetFirst(["/api/v1/meta/states?all=1", "/api/v1/locations/states?all=1", "/api/v1/states?all=1"])
        .catch(() => []),
  });

  const { data: citiesRaw = [] } = useQuery({
    queryKey: ["preview-cities-all"],
    queryFn: () =>
      api
        .apiGetFirst(["/api/v1/meta/cities?all=1", "/api/v1/locations/cities?all=1", "/api/v1/cities?all=1"])
        .catch(() => []),
  });

  const resolveLabel = (value: any, list: any[]) => {
    const str = String(value ?? "").trim();
    if (!str || str === "-") return "-";
    const hit = (list || []).find((x: any) => String(x?.id ?? x?.value ?? x) === str);
    if (hit) return String(hit?.name ?? hit?.label ?? hit?.title ?? hit);
    return str;
  };

  const categoryLabel =
    isNumericLike(info.hotelCategory) && Array.isArray(categoriesRaw)
      ? resolveLabel(info.hotelCategory, categoriesRaw as any[])
      : info.hotelCategory;

  const countryLabel =
    isNumericLike(info.country) && Array.isArray(countriesRaw)
      ? resolveLabel(info.country, countriesRaw as any[])
      : info.country;

  const stateLabel =
    isNumericLike(info.state) && Array.isArray(statesRaw)
      ? resolveLabel(info.state, statesRaw as any[])
      : info.state;

  const cityLabel =
    isNumericLike(info.city) && Array.isArray(citiesRaw)
      ? resolveLabel(info.city, citiesRaw as any[])
      : info.city;

  const rooms = useMemo(() => {
    const src = Array.isArray(roomsRaw)
      ? roomsRaw
      : roomsRaw?.items ?? roomsRaw?.data ?? roomsRaw?.rows ?? [];
    return (src as any[]).map((r: any) => {
      const food: string[] = [];
      if (Number(r.breakfast_included ?? 0) === 1) food.push("Breakfast");
      if (Number(r.lunch_included ?? 0) === 1) food.push("Lunch");
      if (Number(r.dinner_included ?? 0) === 1) food.push("Dinner");

      return {
        title: S(r.room_title ?? r.title),
        refCode: S(r.room_ref_code),
        maxAdults: S(r.total_max_adults ?? r.max_adult),
        maxChildren: S(r.total_max_childrens ?? r.max_children),
        ac: Number(r.air_conditioner_availability ?? 0) === 1 ? "Yes" : "No",
        food: food.length ? food.join(", ") : "N/A",
        checkIn: S(r.check_in_time),
        checkOut: S(r.check_out_time),
        gstType: gstTypeLabel(r.gst_type),
        gstPct: S(r.gst_percentage),
        amenities: S(r.inbuilt_amenities),
      };
    });
  }, [roomsRaw]);

  const amenities = useMemo(() => {
    const src = Array.isArray(amenitiesRaw)
      ? amenitiesRaw
      : amenitiesRaw?.items ?? amenitiesRaw?.data ?? amenitiesRaw?.rows ?? [];
    return (src as any[]).map((a: any) => ({
      title: S(a.amenities_title ?? a.title),
      quantity: S(a.quantity ?? a.amenities_qty),
      availability: Number(a.availability_type ?? 1) === 2 ? "Duration" : "24/7",
      start: Number(a.availability_type ?? 1) === 2 ? S(a.start_time ?? a.available_start_time) : "--",
      end: Number(a.availability_type ?? 1) === 2 ? S(a.end_time ?? a.available_end_time) : "--",
      status: Number(a.status ?? 1) === 1 ? "Active" : "In-Active",
    }));
  }, [amenitiesRaw]);

  const reviews = useMemo(() => {
    const src = Array.isArray(reviewsRaw)
      ? reviewsRaw
      : reviewsRaw?.items ?? reviewsRaw?.data ?? reviewsRaw?.rows ?? [];
    return (src as any[]).map((r: any) => ({
      rating: S(r.hotel_rating ?? r.rating),
      description: S(r.hotel_description ?? r.description ?? r.review_description),
      createdOn: S(r.createdon ?? r.createdAt ?? r.created_at),
    }));
  }, [reviewsRaw]);

  return (
    <>
      {/* Step header to match the “Preview” tab look */}
      <div className="pv-step-title">Preview</div>

      <div className="pv-card">
        <div className="pv-section-title">Basic Info</div>

        {/* 3-column details grid, exactly like the screenshot */}
        <div className="pv-grid">
          {/* Row 1 */}
          <div className="pv-field">
            <div className="pv-label">Hotel Name</div>
            <div className="pv-value">{info.hotelName}</div>
          </div>
          <div className="pv-field">
            <div className="pv-label">Hotel Code</div>
            <div className="pv-value">{info.hotelCode}</div>
          </div>
          <div className="pv-field">
            <div className="pv-label">Hotel Mobile</div>
            <div className="pv-value pv-dim">{info.hotelMobile}</div>
          </div>

          {/* Row 2 */}
          <div className="pv-field">
            <div className="pv-label">Hotel Email</div>
            <div className="pv-value pv-dim">{info.hotelEmail}</div>
          </div>
          <div className="pv-field">
            <div className="pv-label">Hotel Place</div>
            <div className="pv-value">{info.hotelPlace}</div>
          </div>
          <div className="pv-field">
            <div className="pv-label">Hotel Category</div>
            <div className="pv-value">{categoryLabel}</div>
          </div>

          {/* Row 3 */}
          <div className="pv-field">
            <div className="pv-label">Country</div>
            <div className="pv-value">{countryLabel}</div>
          </div>
          <div className="pv-field">
            <div className="pv-label">State</div>
            <div className="pv-value">{stateLabel}</div>
          </div>
          <div className="pv-field">
            <div className="pv-label">City</div>
            <div className="pv-value">{cityLabel}</div>
          </div>

          {/* Row 4 */}
          <div className="pv-field">
            <div className="pv-label">Pincode</div>
            <div className="pv-value pv-dim">{info.pincode}</div>
          </div>
          <div className="pv-field">
            <div className="pv-label">Latitude</div>
            <div className="pv-value pv-dim">{info.latitude}</div>
          </div>
          <div className="pv-field">
            <div className="pv-label">Longitude</div>
            <div className="pv-value pv-dim">{info.longitude}</div>
          </div>

          {/* Row 5 (Address + Status) */}
          <div className="pv-field pv-address">
            <div className="pv-label">Address</div>
            <div className="pv-value pv-dim">{info.address}</div>
          </div>
          <div className="pv-field">
            <div className="pv-label">Hotel Status</div>
            <div className={`pv-status ${info.isActive ? "pv-ok" : "pv-bad"}`}>
              {info.isActive ? "Active" : "In-Active"}
            </div>
          </div>
          {/* The last third column stays empty to keep the grid aligned like screenshot */}
          <div className="pv-field pv-empty" />
        </div>

        <hr className="pv-divider" />

        <div className="pv-section-title">Rooms</div>
        {rooms.length === 0 ? (
          <div className="pv-empty-text">No Rooms Found</div>
        ) : (
          rooms.map((r, idx) => (
            <div key={`room-${idx}`} className="pv-block">
              <h5 className="pv-subtitle">Rooms #{idx + 1}/{rooms.length}</h5>
              <div className="pv-grid">
                <div className="pv-field"><div className="pv-label">Room Title</div><div className="pv-value">{r.title}</div></div>
                <div className="pv-field"><div className="pv-label">Room Reference Code</div><div className="pv-value">{r.refCode}</div></div>
                <div className="pv-field"><div className="pv-label">Total Max Adults</div><div className="pv-value">{r.maxAdults}</div></div>
                <div className="pv-field"><div className="pv-label">Total Max Children</div><div className="pv-value">{r.maxChildren}</div></div>
                <div className="pv-field"><div className="pv-label">Air Conditioner</div><div className="pv-value">{r.ac}</div></div>
                <div className="pv-field"><div className="pv-label">Food Applicable</div><div className="pv-value">{r.food}</div></div>
                <div className="pv-field"><div className="pv-label">Check In Time</div><div className="pv-value">{to12h(r.checkIn)}</div></div>
                <div className="pv-field"><div className="pv-label">Check Out Time</div><div className="pv-value">{to12h(r.checkOut)}</div></div>
                <div className="pv-field"><div className="pv-label">GST Type</div><div className="pv-value">{r.gstType}</div></div>
                <div className="pv-field"><div className="pv-label">GST Percentage</div><div className="pv-value">{r.gstPct}</div></div>
                <div className="pv-field"><div className="pv-label">Inbuilt Amenities</div><div className="pv-value">{r.amenities}</div></div>
              </div>
              <hr className="pv-divider" />
            </div>
          ))
        )}

        <div className="pv-section-title">Amenities</div>
        {amenities.length === 0 ? (
          <div className="pv-empty-text">No Amenities Found</div>
        ) : (
          amenities.map((a, idx) => (
            <div key={`amenity-${idx}`} className="pv-block">
              <h5 className="pv-subtitle">Amenities #{idx + 1}/{amenities.length}</h5>
              <div className="pv-grid">
                <div className="pv-field"><div className="pv-label">Amenities Title</div><div className="pv-value">{a.title}</div></div>
                <div className="pv-field"><div className="pv-label">Quantity</div><div className="pv-value">{a.quantity}</div></div>
                <div className="pv-field"><div className="pv-label">Availability Type</div><div className="pv-value">{a.availability}</div></div>
                <div className="pv-field"><div className="pv-label">Start Time</div><div className="pv-value">{a.start}</div></div>
                <div className="pv-field"><div className="pv-label">End Time</div><div className="pv-value">{a.end}</div></div>
                <div className="pv-field"><div className="pv-label">Status</div><div className="pv-value">{a.status}</div></div>
              </div>
              <hr className="pv-divider" />
            </div>
          ))
        )}

        <div className="pv-section-title">List of Reviews</div>
        <div className="pv-table-wrap">
          <table className="pv-table">
            <thead>
              <tr>
                <th>S.no</th>
                <th>Rating</th>
                <th>Description</th>
                <th>Created On</th>
              </tr>
            </thead>
            <tbody>
              {reviews.length === 0 ? (
                <tr>
                  <td colSpan={4} className="pv-empty-text">No Reviews Found</td>
                </tr>
              ) : (
                reviews.map((r, idx) => (
                  <tr key={`review-${idx}`}>
                    <td>{idx + 1}</td>
                    <td>{r.rating}</td>
                    <td>{r.description}</td>
                    <td>{r.createdOn}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pv-bottom">
        <button type="button" onClick={onPrev} className="pv-btn pv-btn-back">
          Back
        </button>
      </div>

      {/* Styles tuned to match your screenshot */}
      <style>{`
        :root{
          --pv-bg:#fdf5ff;
          --pv-card:#ffffff;
          --pv-border:#f0e7ff;
          --pv-shadow:0 10px 30px rgba(139,92,246,.08);
          --pv-text:#3a3a4a;
          --pv-muted:#9aa0b4;
          --pv-primary:#c026d3;
          --pv-bad:#ef4444;
          --pv-ok:#16a34a;
        }

        .pv-step-title{
          font-weight:600; color:#9c27b0; margin-bottom:.75rem;
        }

        .pv-card{
          background:var(--pv-card);
          border:1px solid var(--pv-border);
          border-radius:14px;
          padding:16px 18px;
          box-shadow:var(--pv-shadow);
        }

        .pv-section-title{
          color:#b012ce;
          font-weight:700;
          font-size:18px;
          margin-bottom:10px;
        }

        .pv-grid{
          display:grid;
          grid-template-columns: 1fr;
          gap: 14px 18px;
        }
        @media(min-width: 1024px){
          .pv-grid{
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .pv-field{}
        .pv-label{
          font-size:13px; color:#7b7f8c;
          margin-bottom:4px;
        }
        .pv-value{
          font-size:15px; color:var(--pv-text); font-weight:600;
        }
        .pv-dim{
          color:#9aa0b4; font-weight:600;
        }
        .pv-address{
          grid-column: span 2;
        }
        @media(max-width: 1023px){
          .pv-address{ grid-column: span 1; }
        }
        .pv-status{
          font-weight:700;
        }
        .pv-status.pv-bad{ color: var(--pv-bad); }
        .pv-status.pv-ok{ color: var(--pv-ok); }

        .pv-empty{ }

        .pv-divider{
          border:0; border-top:1px solid var(--pv-border);
          margin-top:16px;
        }

        .pv-subtitle{ color:#b012ce; font-size:16px; margin:8px 0; }
        .pv-empty-text{ color:#6b7280; font-size:14px; padding:8px 0; }
        .pv-block{ margin-bottom:8px; }
        .pv-table-wrap{ border:1px solid var(--pv-border); border-radius:10px; overflow:hidden; }
        .pv-table{ width:100%; border-collapse:collapse; }
        .pv-table th,.pv-table td{ padding:8px 10px; border-bottom:1px solid var(--pv-border); text-align:left; font-size:13px; }
        .pv-table thead th{ background:#faf7ff; color:#5b5f6b; }

        .pv-bottom{
          display:flex; align-items:center; justify-content:flex-start;
          margin-top:16px;
        }
        .pv-btn{
          display:inline-flex; align-items:center; gap:.45rem;
          border-radius:12px; padding:.7rem 1.4rem; font-weight:600;
          border:1px solid transparent; cursor:pointer;
        }
        .pv-btn-back{
          background:#9ca3af; color:#fff; border-color:#9ca3af;
        }
        .pv-btn-back:hover{ background:#6b7280; }
        .pv-value,
        .pv-dim {
          color: #111827 !important; /* near-black */
        }
      `}</style>
    </>
  );
}
