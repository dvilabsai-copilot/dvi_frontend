// FILE: src/pages/hotel-form/AmenitiesStep.tsx
import React, { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AmenityRow } from "./HotelForm";

type ApiCtx = {
  apiGetFirst: (ps: string[]) => Promise<any>;
  apiPost: (p: string, b: any) => Promise<any>;
};

const uiErrorMessage = (_err: any, fallback: string) => fallback;

export default function AmenitiesStep({
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
  const [rows, setRows] = useState<AmenityRow[]>([]);
  const initialRowsRef = useRef<any[]>([]);
  const [validationError, setValidationError] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [statusKind, setStatusKind] = useState<"success" | "error" | "">("");

  const availabilityOptions = [
    { id: 1, name: "24/7" },
    { id: 2, name: "Duration" },
  ];
  const statusOptions = [
    { id: 1, name: "Active" },
    { id: 0, name: "In-Active" },
  ];

  const defaultRow: AmenityRow = {
    amenities_title: "",
    amenities_qty: 1,
    availability_type: 1,
    available_start_time: "",
    available_end_time: "",
    status: 1,
    amenities_code: "",
  };

  useQuery({
    queryKey: ["hotel-amenities", hotelId],
    enabled: !!hotelId,
    queryFn: async () => {
      const raw = await api.apiGetFirst([
        `/api/v1/hotel-amenities?hotelId=${hotelId}`,
        `/api/v1/hotel-amenities/list?hotelId=${hotelId}`,
        `/api/v1/hotel-amenities/${hotelId}`,
        `/api/v1/hotels/${hotelId}/amenities`,
        `/api/v1/hotels/${hotelId}/amenity`,
      ]).catch(() => []);
      const data = Array.isArray(raw) ? raw : (raw?.items ?? raw?.data ?? raw?.rows ?? []);
      const mapped: AmenityRow[] = (data as any[]).map((r) => ({
        id: r.id ?? r.hotel_amenities_id,
        amenities_title: r.amenities_title ?? r.title ?? "",
        amenities_qty: r.quantity ?? r.amenities_qty ?? 1,
        availability_type: r.availability_type ?? 1,
        available_start_time: r.start_time ?? r.available_start_time ?? "",
        available_end_time: r.end_time ?? r.available_end_time ?? "",
        status: r.status ?? 1,
        amenities_code: r.amenities_code ?? r.code ?? "",
      }));
      const effectiveRows = mapped.length ? mapped : [{ ...defaultRow }];
      setRows(effectiveRows);
      initialRowsRef.current = effectiveRows.map((row) => ({
        id: row.id ?? null,
        amenities_title: String(row.amenities_title ?? ""),
        amenities_qty: String(row.amenities_qty ?? ""),
        availability_type: String(row.availability_type ?? ""),
        available_start_time: String(row.available_start_time ?? ""),
        available_end_time: String(row.available_end_time ?? ""),
        status: String(row.status ?? ""),
        amenities_code: String(row.amenities_code ?? ""),
      }));
      return mapped;
    },
  });

  const comparableRow = (row: AmenityRow) => ({
    id: row.id ?? null,
    amenities_title: String(row.amenities_title ?? ""),
    amenities_qty: String(row.amenities_qty ?? ""),
    availability_type: String(row.availability_type ?? ""),
    available_start_time: String(row.available_start_time ?? ""),
    available_end_time: String(row.available_end_time ?? ""),
    status: String(row.status ?? ""),
    amenities_code: String(row.amenities_code ?? ""),
  });

  const handleChange = (index: number, field: keyof AmenityRow, value: any) => {
    setValidationError("");
    setStatusMessage("");
    setStatusKind("");
    setRows((prev) => {
      const clone = [...prev];
      clone[index] = { ...clone[index], [field]: value };
      return clone;
    });
  };

  const addRow = () => setRows((prev) => [...prev, { ...defaultRow }]);
  const removeRow = (index: number) =>
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));

  const validateRows = (items: AmenityRow[]) => {
    for (let i = 0; i < items.length; i += 1) {
      const row: any = items[i];
      const n = i + 1;

      if (!String(row.amenities_title ?? "").trim()) {
        return `Amenities ${n}: Amenities Title is required`;
      }
      if (!String(row.amenities_qty ?? "").trim()) {
        return `Amenities ${n}: Amenities Qty is required`;
      }
      if (row.availability_type === "" || row.availability_type === null || row.availability_type === undefined) {
        return `Amenities ${n}: Availability Type is required`;
      }
      if (Number(row.availability_type) === 2) {
        if (!String(row.available_start_time ?? "").trim()) {
          return `Amenities ${n}: Start Time is required`;
        }
        if (!String(row.available_end_time ?? "").trim()) {
          return `Amenities ${n}: End Time is required`;
        }
      }
      if (row.status === "" || row.status === null || row.status === undefined) {
        return `Amenities ${n}: Status is required`;
      }
    }
    return null;
  };

  async function postFirstAmenity(paths: string[], payloadArray: any[]) {
    const bodies = [{ items: payloadArray }, payloadArray];
    let lastErr: any;
    for (const url of paths) {
      for (const body of bodies) {
        try { return await api.apiPost(url, body); } catch (e) { lastErr = e; }
      }
    }
    throw lastErr || new Error("No amenities endpoint available");
  }

  const saveMut = useMutation({
    mutationFn: async (items: AmenityRow[]) => {
      const changedItems = items.filter((row, idx) => {
        const prev = initialRowsRef.current[idx];
        if (!prev) return true;
        return JSON.stringify(comparableRow(row)) !== JSON.stringify(prev);
      });

      if (!changedItems.length) {
        return { success: true, count: 0, skipped: true } as any;
      }

      const payload = changedItems.map((r) => ({
        id: r.id ?? undefined,
        hotel_id: Number(hotelId),
        amenities_title: r.amenities_title,
        quantity: Number(r.amenities_qty || 0),
        availability_type: Number(r.availability_type || 1),
        start_time: r.available_start_time || null,
        end_time: r.available_end_time || null,
        status: Number(r.status || 1),
        amenities_code: r.amenities_code || null,
      }));
      const candidatePaths = [
        `/api/v1/hotel-amenities/bulk`,
        `/api/v1/hotel-amenities`,
        `/api/v1/hotels/${hotelId}/amenities/bulk`,
        `/api/v1/hotels/${hotelId}/amenities`,
      ];
      const chunkSize = 50;
      const chunks: any[][] = [];
      for (let i = 0; i < payload.length; i += chunkSize) {
        chunks.push(payload.slice(i, i + chunkSize));
      }

      const results: any[] = [];
      for (const chunk of chunks) {
        results.push(await postFirstAmenity(candidatePaths, chunk));
      }
      return { success: true, batches: results.length, items: results };
    },
    onSuccess: () => {
      qc.invalidateQueries();
      setStatusKind("success");
      setStatusMessage("Amenities saved successfully.");
      onNext();
    },
    onError: (e: any) => {
      setStatusKind("error");
      setStatusMessage(uiErrorMessage(e, "Failed saving amenities. Please try again."));
    },
  });

  return (
    <>
      <h3 className="text-pink-600 font-semibold mb-4">Amenities</h3>

      <div className="flex justify-end mb-3">
        <button
          type="button"
          onClick={addRow}
          className="px-4 py-2 rounded-lg border border-dashed border-purple-300 text-purple-700 text-sm"
        >
          + Add Amenities
        </button>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {rows.map((row, idx) => {
          const isTimeBased = Number(row.availability_type) === 2;
          const showCode = row.id !== undefined && row.id !== null && String(row.id) !== "";
          return (
            <div key={row.id ?? idx} className="col-span-12 border-b border-dashed pb-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <h6 className="font-semibold text-sm">
                  Amenities {idx + 1}/{rows.length}
                </h6>
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 disabled:opacity-50"
                  disabled={rows.length === 1}
                >
                  Delete
                </button>
              </div>

              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 md:col-span-3">
                  <label className="block text-xs font-medium">Amenities Title *</label>
                  <input
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="Enter Amenities Title"
                    value={row.amenities_title}
                    onChange={(e) => handleChange(idx, "amenities_title", e.target.value)}
                  />
                </div>

                <div className="col-span-12 md:col-span-1">
                  <label className="block text-xs font-medium">Quantity *</label>
                  <input
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                    value={row.amenities_qty}
                    readOnly
                    onChange={(e) => handleChange(idx, "amenities_qty", e.target.value)}
                  />
                </div>

                <div className="col-span-12 md:col-span-2">
                  <label className="block text-xs font-medium">Availability Type *</label>
                  <select
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                    value={row.availability_type}
                    onChange={(e) => {
                      const nextVal = Number(e.target.value);
                      handleChange(idx, "availability_type", nextVal);
                      if (nextVal !== 2) {
                        handleChange(idx, "available_start_time", "");
                        handleChange(idx, "available_end_time", "");
                      }
                    }}
                  >
                    {availabilityOptions.map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>

                {isTimeBased && (
                  <>
                    <div className="col-span-12 md:col-span-3">
                      <label className="block text-xs font-medium">Available Start Time *</label>
                      <input
                        type="time"
                        className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                        value={row.available_start_time || ""}
                        onChange={(e) => handleChange(idx, "available_start_time", e.target.value)}
                      />
                    </div>

                    <div className="col-span-12 md:col-span-3">
                      <label className="block text-xs font-medium">Available End Time *</label>
                      <input
                        type="time"
                        className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                        value={row.available_end_time || ""}
                        onChange={(e) => handleChange(idx, "available_end_time", e.target.value)}
                      />
                    </div>
                  </>
                )}

                <div className="col-span-12 md:col-span-2">
                  <label className="block text-xs font-medium">Status *</label>
                  <select
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                    value={row.status}
                    onChange={(e) => handleChange(idx, "status", Number(e.target.value))}
                  >
                    {statusOptions.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {showCode && (
                  <div className="col-span-12 md:col-span-2">
                    <label className="block text-xs font-medium">Amenities Code</label>
                    <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                      value={row.amenities_code || ""} readOnly />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {validationError && (
        <div className="mt-3 text-sm text-red-600">{validationError}</div>
      )}
      {statusMessage && (
        <div
          className={`mt-2 text-sm ${
            statusKind === "success" ? "text-green-600" : "text-red-600"
          }`}
        >
          {statusMessage}
        </div>
      )}

      <div className="flex items-center justify-between mt-8">
        <button type="button" onClick={onPrev} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300">
          Back
        </button>

        <button
          type="button"
          onClick={() => {
            const msg = validateRows(rows);
            if (msg) {
              setValidationError(msg);
              return;
            }
            setValidationError("");
            setStatusMessage("");
            setStatusKind("");
            saveMut.mutate(rows);
          }}
          className="px-5 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 text-white"
        >
          Update & Continue
        </button>
      </div>
    </>
  );
}
