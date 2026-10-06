import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { hotspotService, type ParkingChargeRecordRow } from "@/services/hotspotService";
import {
  getAuthenticatedRoleId,
  getAuthenticatedUser,
} from "@/services/accessControl";
import { USER_ROLES } from "@/constants/systemRoles";
import ParkingMultiSelect from "./ParkingMultiSelect";
import { loadParkingMatrixPage } from "./parkingMatrix";

type TempRow = {
  id: number;
  hotspot_name: string;
  hotspot_location: string;
  vehicle_type_title: string;
  parking_charge: number;
  row_status?: "staged" | "imported" | "rejected";
  reason?: string;
};

const PARKING_IMPORT_SESSION_KEY = "parkingChargeImportSessionId";
const RECORD_PAGE_SIZE = 5;

const Page: React.FC = () => {
  const role = getAuthenticatedRoleId(getAuthenticatedUser());
  const isVendor = role === USER_ROLES.VENDOR;

  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [rows, setRows] = useState<TempRow[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});

  const [recordsBusy, setRecordsBusy] = useState(false);
  const [recordRows, setRecordRows] = useState<ParkingChargeRecordRow[]>([]);
  const [recordPage, setRecordPage] = useState(1);
  const [recordTotal, setRecordTotal] = useState(0);
  const [recordTotalPages, setRecordTotalPages] = useState(1);
  const [hotspotOptions, setHotspotOptions] = useState<Array<{ id: number; name: string }>>([]);
  const [vehicleTypeOptions, setVehicleTypeOptions] = useState<Array<{ id: number; name: string }>>([]);
  const [hotspotFilterIds, setHotspotFilterIds] = useState<number[]>([]);
  const [vehicleTypeFilterIds, setVehicleTypeFilterIds] = useState<number[]>([]);
  const recordsRequest = useRef(0);
  const [editedCharges, setEditedCharges] = useState<Record<string, string>>({});

  const matrixVehicles = useMemo(() =>
    vehicleTypeOptions.filter((vehicle) =>
      !vehicleTypeFilterIds.length || vehicleTypeFilterIds.includes(vehicle.id)
    ), [vehicleTypeOptions, vehicleTypeFilterIds]);

  const matrixHotspots = useMemo(() => {
    const unique = new Map<number, string>();
    recordRows.forEach((row) => unique.set(row.hotspotId, row.hotspotName));
    return Array.from(unique, ([id, name]) => ({ id, name }));
  }, [recordRows]);

  const matrixCells = useMemo(() =>
    new Map(recordRows.map((row) => [
      `${row.hotspotId}:${row.vehicleTypeId}`, row
    ])), [recordRows]);

  const hasPendingCharges = Object.keys(editedCharges).length > 0;

  const stagedCount = useMemo(
    () => rows.filter((r) => (r.row_status ?? "staged") === "staged").length,
    [rows]
  );
  const rejectedCount = useMemo(
    () => rows.filter((r) => r.row_status === "rejected").length,
    [rows]
  );
  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, value]) => value).map(([id]) => Number(id)),
    [selected]
  );
  const allChecked = useMemo(() => {
    const stagedRows = rows.filter((r) => (r.row_status ?? "staged") === "staged");
    return stagedRows.length > 0 && stagedRows.every((r) => selected[r.id]);
  }, [rows, selected]);
  const someChecked = useMemo(
    () => rows.some((r) => (r.row_status ?? "staged") === "staged" && selected[r.id]),
    [rows, selected]
  );

  const pageNumbers = useMemo(() => {
    const start = Math.max(1, Math.min(recordPage - 2, recordTotalPages - 4));
    const end = Math.min(recordTotalPages, start + 4);
    return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
  }, [recordPage, recordTotalPages]);

  const loadRecords = useCallback(async () => {
    const request = ++recordsRequest.current;
    setRecordsBusy(true);
    setRecordRows([]);
    try {
      const result = await loadParkingMatrixPage({
        page: recordPage,
        pageSize: RECORD_PAGE_SIZE,
        hotspotIds: hotspotFilterIds,
        vehicleTypeIds: vehicleTypeFilterIds,
      });
      if (request !== recordsRequest.current) return;
      setRecordRows(result.rows || []);
      setRecordTotal(Number(result.total || 0));
      setRecordTotalPages(Math.max(1, Number(result.totalPages || 1)));
      setHotspotOptions(result.options?.hotspots || []);
      setVehicleTypeOptions(result.options?.vehicleTypes || []);
      setEditedCharges({});
      if (result.page !== recordPage) setRecordPage(result.page);
    } catch (error: any) {
      if (request === recordsRequest.current) {
        setRecordTotal(0);
        setRecordTotalPages(1);
        alert(error?.message || "Unable to load parking charge records");
      }
    } finally {
      if (request === recordsRequest.current) setRecordsBusy(false);
    }
  }, [recordPage, hotspotFilterIds, vehicleTypeFilterIds]);

  const refreshTemplist = async (id = sessionId) => {
    if (!id) return;
    const result = await hotspotService.getParkingTempList(id);
    const previewRows = (result.rows || []).filter((row) => row.row_status !== "imported");
    setRows(previewRows);

    const next: Record<number, boolean> = {};
    previewRows.forEach((row) => {
      next[row.id] = (row.row_status ?? "staged") === "staged";
    });
    setSelected(next);

    if (previewRows.length === 0) {
      setSessionId("");
      localStorage.removeItem(PARKING_IMPORT_SESSION_KEY);
    }
  };

  const onDownloadSample = async () => {
    try {
      await hotspotService.downloadParkingSampleCsv();
    } catch (error: any) {
      alert(error?.message || "Sample CSV download failed");
    }
  };

  const onUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return alert("Choose a CSV first");
    setBusy(true);
    try {
      const result = await hotspotService.uploadParkingCsv(file);
      setSessionId(result.sessionId);
      localStorage.setItem(PARKING_IMPORT_SESSION_KEY, result.sessionId);
      await refreshTemplist(result.sessionId);
      alert(
        `Uploaded. Staged ${result.stagedCount} row(s). Rejected ${Number(
          result.rejectedCount ?? 0
        )} row(s).`
      );
    } catch (error: any) {
      alert(error?.message || "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
      setFile(null);
    }
  };

  const onConfirm = async () => {
    if (!sessionId) return alert("Upload first");
    if (selectedIds.length === 0) return alert("Select at least one row");
    setBusy(true);
    try {
     const result = await hotspotService.confirmParkingImport(sessionId, selectedIds);
alert(`Imported ${result.imported}/${result.total}. Failed: ${result.failed}.`);

if (!isVendor) {
  await loadRecords();
}

      if (Number(result.failed || 0) === 0) {
        setRows([]);
        setSelected({});
        setSessionId("");
        localStorage.removeItem(PARKING_IMPORT_SESSION_KEY);
      } else {
        await refreshTemplist(sessionId);
      }
    } catch (error: any) {
      alert(error?.message || "Confirm failed");
    } finally {
      setBusy(false);
    }
  };

  const onSubmitChanges = async () => {
    const changedRows = Object.entries(editedCharges).map(([key, value]) => {
      const row = recordRows.find(
        (item) => `${item.hotspotId}:${item.vehicleTypeId}` === key
      );
      return row ? { row, value } : null;
    }).filter(Boolean) as Array<{ row: ParkingChargeRecordRow; value: string }>;

    if (changedRows.length === 0) return alert("No parking charge changes to submit");

    const payload = changedRows.map(({ row, value }) => ({
      hotspotId: row.hotspotId,
      vehicleTypeId: row.vehicleTypeId,
      parkingCharge: Number(value),
    }));

    if (payload.some((row) => !Number.isFinite(row.parkingCharge) || row.parkingCharge < 0)) {
      return alert("Parking charge must be a number greater than or equal to 0");
    }

    setRecordsBusy(true);
    try {
      await hotspotService.updateParkingChargeRecords(payload);
      alert(`Updated ${payload.length} parking charge row(s).`);
      await loadRecords();
    } catch (error: any) {
      alert(error?.message || "Unable to update parking charges");
    } finally {
      setRecordsBusy(false);
    }
  };

  const onDeleteRecord = async (row: ParkingChargeRecordRow) => {
    if (row.id == null) return;
    if (!window.confirm(`Delete parking charge for ${row.hotspotName} - ${row.vehicleType}?`)) {
      return;
    }

    setRecordsBusy(true);
    try {
      await hotspotService.deleteParkingChargeRecord(row.id);
      await loadRecords();
    } catch (error: any) {
      alert(error?.message || "Unable to delete parking charge");
    } finally {
      setRecordsBusy(false);
    }
  };

  const clearFilters = () => {
    setHotspotFilterIds([]);
    setVehicleTypeFilterIds([]);
    setRecordPage(1);
  };

useEffect(() => {
  if (isVendor) return;

  void loadRecords();
}, [isVendor, loadRecords]);

  useEffect(() => {
    const saved = localStorage.getItem(PARKING_IMPORT_SESSION_KEY) || "";
    if (saved) {
      setSessionId(saved);
      void refreshTemplist(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="px-8 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#5e3a82]">
          Vehicle Parking Charge Bulk import
        </h1>
        <nav className="space-x-1 text-xs text-gray-500">
          <span>Dashboard</span><span>&gt;</span><span>Hotspot Parking Charge</span><span>&gt;</span>
          <span className="text-primary">Vehicle Parking Charge Bulk import</span>
        </nav>
      </div>

      <div className="rounded-2xl border border-[#f0dafb] bg-white shadow-sm">
        <div className="px-8 py-10">
          <form onSubmit={onUpload} className="flex flex-col items-center">
            <div className="mb-10 flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#e5c7ff] bg-[#fff9ff] py-16">
              <div className="flex flex-col items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#f0dafb]">
                  <span className="text-4xl opacity-30">📄</span>
                </div>
                <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-2 text-sm shadow-sm transition hover:shadow-md">
                  <span>{file ? file.name : "Choose File"}</span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    disabled={busy}
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  />
                </label>
                <button
                  type="submit"
                  disabled={!file || busy}
                  className="rounded-full bg-gradient-to-r from-primary to-pink-500 px-8 py-2 text-sm font-medium text-white shadow transition hover:shadow-md disabled:opacity-60"
                >
                  {busy ? "Uploading..." : "Upload"}
                </button>
              </div>
            </div>

            <div className="mb-8 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={onDownloadSample}
                className="text-sm text-primary underline-offset-2 hover:underline"
              >
                Download Sample CSV
              </button>
              <p className="text-[11px] text-gray-500">
                <span className="text-xs">ℹ️</span> Only CSV files are supported.
              </p>
            </div>
          </form>

          {sessionId && rows.length > 0 && (
            <div className="mb-10 w-full">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Session: <span className="font-mono">{sessionId}</span> • Staged {stagedCount} • Rejected {rejectedCount}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => refreshTemplist()}
                    disabled={busy}
                    className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:opacity-60"
                  >
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={onConfirm}
                    disabled={busy || selectedIds.length === 0}
                    className="rounded-full bg-gradient-to-r from-primary to-pink-500 px-4 py-2 text-sm font-medium text-white shadow transition hover:shadow-md disabled:opacity-60"
                  >
                    Confirm Import ({selectedIds.length})
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[#f0dafb]">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">
                        <label className="inline-flex cursor-pointer select-none items-center gap-2">
                          <input
                            type="checkbox"
                            checked={allChecked}
                            ref={(element) => {
                              if (element) element.indeterminate = !allChecked && someChecked;
                            }}
                            onChange={() => {
                              const next: Record<number, boolean> = {};
                              const value = !allChecked;
                              rows.forEach((row) => {
                                next[row.id] =
                                  (row.row_status ?? "staged") === "staged" ? value : false;
                              });
                              setSelected(next);
                            }}
                          />
                          <span>Select</span>
                        </label>
                      </th>
                      <th className="px-4 py-2 text-left">Hotspot</th>
                      <th className="px-4 py-2 text-left">Location (token)</th>
                      <th className="px-4 py-2 text-left">Vehicle Type</th>
                      <th className="px-4 py-2 text-right">Parking Charge</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-left">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={!!selected[row.id]}
                            disabled={(row.row_status ?? "staged") !== "staged"}
                            onChange={(event) =>
                              setSelected((previous) => ({
                                ...previous,
                                [row.id]: event.target.checked,
                              }))
                            }
                          />
                        </td>
                        <td className="px-4 py-2 font-medium">{row.hotspot_name}</td>
                        <td className="px-4 py-2">{row.hotspot_location}</td>
                        <td className="px-4 py-2">{row.vehicle_type_title}</td>
                        <td className="px-4 py-2 text-right">{row.parking_charge}</td>
                        <td className="px-4 py-2">
                          {(row.row_status ?? "staged") === "staged" ? (
                            <span className="rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-700">Staged</span>
                          ) : (
                            <span className="rounded bg-rose-50 px-2 py-1 text-xs text-rose-700">Rejected</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-600">{row.reason || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {!isVendor && (
          <div className="w-full rounded-xl border border-[#f0dafb] p-5">
            <h2 className="mb-4 text-lg font-semibold text-[#5e3a82]">Parking Charge Records</h2>

            <div className="mb-4 grid items-start gap-3 md:grid-cols-[1fr_1fr_auto]">
              <ParkingMultiSelect
                label="Hotspots"
                options={hotspotOptions}
                selected={hotspotFilterIds}
                disabled={recordsBusy || Object.keys(editedCharges).length > 0}
                onChange={(ids) => {
                  setHotspotFilterIds(ids);
                  setRecordPage(1);
                }}
              />
              <ParkingMultiSelect
                label="Vehicle Types"
                options={vehicleTypeOptions}
                selected={vehicleTypeFilterIds}
                disabled={recordsBusy || Object.keys(editedCharges).length > 0}
                onChange={(ids) => {
                  setVehicleTypeFilterIds(ids);
                  setRecordPage(1);
                }}
              />
              <button
                type="button"
                onClick={clearFilters}
                disabled={recordsBusy || Object.keys(editedCharges).length > 0}
                className="mt-6 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Clear Filters
              </button>
            </div>
            <p className="mb-4 text-xs text-gray-500">
              Select up to 20 hotspots and 20 vehicle types.
              Every matching hotspot and vehicle combination is shown.
              Empty selections include all options.
              {Object.keys(editedCharges).length > 0 &&
                " Submit your charge changes before changing filters, pages, or deleting charges."}
            </p>

            <div
              className="overflow-x-auto rounded-xl border border-gray-200"
              role="region"
              aria-label="Parking charges by hotspot and vehicle"
              tabIndex={0}
            >
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <caption className="sr-only">
                  Parking charges. Each row is a hotspot and each column is a vehicle type.
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="sticky left-0 z-10 min-w-[220px] border-b bg-gray-50 px-4 py-3 text-left">
                      Hotspot
                    </th>
                    {matrixVehicles.map((vehicle) => (
                      <th key={vehicle.id} scope="col" className="min-w-[180px] border-b border-l bg-gray-50 px-4 py-3 text-left">
                        {vehicle.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!matrixHotspots.length ? (
                    <tr>
                      <td colSpan={matrixVehicles.length + 1} className="px-4 py-8 text-center text-gray-500">
                        {recordsBusy ? "Loading..." : "No records."}
                      </td>
                    </tr>
                  ) : matrixHotspots.map((hotspot) => (
                    <tr key={hotspot.id}>
                      <th scope="row" className="sticky left-0 z-10 border-b bg-white px-4 py-3 text-left align-top font-medium">
                        {hotspot.name}
                      </th>
                      {matrixVehicles.map((vehicle) => {
                        const key = `${hotspot.id}:${vehicle.id}`;
                        const row = matrixCells.get(key);
                        return (
                          <td key={vehicle.id} className="border-b border-l px-4 py-3 align-top">
                            {row ? (
                              <div className="space-y-2">
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  min="0"
                                  step="0.01"
                                  disabled={recordsBusy || busy}
                                  aria-label={hotspot.name + " - " + vehicle.name + " parking charge"}
                                  value={editedCharges[key] ?? String(row.parkingCharge)}
                                  className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm disabled:opacity-60"
                                  onChange={(event) =>
                                    setEditedCharges((previous) => ({
                                      ...previous,
                                      [key]: event.target.value,
                                    }))
                                  }
                                />
                                {row.id != null && (
                                  <button
                                    type="button"
                                    disabled={recordsBusy || busy || hasPendingCharges}
                                    aria-label={"Delete " + hotspot.name + " - " + vehicle.name + " parking charge"}
                                    onClick={() => onDeleteRecord(row)}
                                    className="block text-xs font-medium text-rose-600 hover:underline disabled:opacity-50"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">Unavailable</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                disabled={recordsBusy || Object.keys(editedCharges).length === 0}
                onClick={onSubmitChanges}
                className="rounded-full bg-gradient-to-r from-primary to-pink-500 px-6 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                Submit Changes
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
              <span className="text-gray-600">
                Showing {recordTotal === 0 ? 0 : (recordPage - 1) * RECORD_PAGE_SIZE + 1}–
                {Math.min(recordPage * RECORD_PAGE_SIZE, recordTotal)} of {recordTotal} hotspots
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={recordPage <= 1 || recordsBusy || hasPendingCharges}
                  onClick={() => setRecordPage((page) => Math.max(1, page - 1))}
                  className="rounded border px-3 py-1 disabled:opacity-50"
                >
                  Previous
                </button>
                {pageNumbers.map((page) => (
                  <button
                    key={page}
                    type="button"
                    disabled={recordsBusy || hasPendingCharges}
                    onClick={() => setRecordPage(page)}
                    className={`rounded border px-3 py-1 ${page === recordPage ? "bg-primary text-white" : "bg-white"}`}
                  >
                    {page}
                  </button>
                ))}
                              <button
                  type="button"
                  disabled={recordPage >= recordTotalPages || recordsBusy || hasPendingCharges}
                  onClick={() => setRecordPage((page) => Math.min(recordTotalPages, page + 1))}
                  className="rounded border px-3 py-1 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Page;