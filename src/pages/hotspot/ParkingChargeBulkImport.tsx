// FILE: src/pages/hotspots/ParkingChargeBulkImport.tsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import { hotspotService } from "@/services/hotspotService";

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

function downloadSample() {
  const rows = [
    ["hotspot_name", "hotspot_location", "vehicle_type_title", "parking_charge"],
    ["Calangute Beach", "Goa", "Sedan", "80"],
    ["Dudhsagar Falls", "Goa Railway Station", "SUV", "120"],
    ["Basilica of Bom Jesus", "Goa Bus Stand", "Tempo Traveller", "150"],
  ];
  const csv = rows.map(r => r.map(s => {
    const v = String(s ?? "");
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  }).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "parking_charges_sample.csv";
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

const Page: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [rows, setRows] = useState<TempRow[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [lastConfirm, setLastConfirm] = useState<null | {
    sessionId: string;
    total: number;
    imported: number;
    failed: number;
  }>(null);

  const stagedCount = useMemo(
    () => rows.filter((r) => (r.row_status ?? "staged") === "staged").length,
    [rows]
  );
  const importedCount = useMemo(
    () => rows.filter((r) => r.row_status === "imported").length,
    [rows]
  );
  const rejectedCount = useMemo(
    () => rows.filter((r) => r.row_status === "rejected").length,
    [rows]
  );

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([k]) => Number(k)),
    [selected]
  );
  const allChecked = useMemo(
    () => {
      const stagedRows = rows.filter((r) => (r.row_status ?? "staged") === "staged");
      return stagedRows.length > 0 && stagedRows.every((r) => selected[r.id]);
    },
    [rows, selected]
  );
  const someChecked = useMemo(
    () => rows.some(r => (r.row_status ?? "staged") === "staged" && selected[r.id]),
    [rows, selected]
  );

  const refreshTemplist = async (id = sessionId) => {
    if (!id) return;
    const res = await hotspotService.getParkingTempList(id);
    setRows(res.rows || []);
    const next: Record<number, boolean> = {};
    (res.rows || []).forEach(r => {
      next[r.id] = (r.row_status ?? "staged") === "staged";
    });
    setSelected(next);
  };

  const onUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert("Choose a CSV first");
    setBusy(true);
    try {
      const out = await hotspotService.uploadParkingCsv(file);
      setSessionId(out.sessionId);
      localStorage.setItem(PARKING_IMPORT_SESSION_KEY, out.sessionId);
      setLastConfirm(null);
      await refreshTemplist(out.sessionId);
      const rejected = Number(out.rejectedCount ?? 0);
      alert(`Uploaded. Staged ${out.stagedCount} row(s). Rejected ${rejected} row(s).`);
    } catch (err: any) {
      alert(err?.message || "Upload failed");
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
      const res = await hotspotService.confirmParkingImport(sessionId, selectedIds);
      setLastConfirm({
        sessionId: res.sessionId,
        total: Number(res.total ?? 0),
        imported: Number(res.imported ?? 0),
        failed: Number(res.failed ?? 0),
      });
      alert(`Imported ${res.imported}/${res.total}. Failed: ${res.failed}.`);
      await refreshTemplist();
    } catch (e: any) {
      alert(e?.message || "Confirm failed");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (sessionId) refreshTemplist(sessionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    const saved = localStorage.getItem(PARKING_IMPORT_SESSION_KEY) || "";
    if (saved) setSessionId(saved);
  }, []);

  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#5e3a82]">Vehicle Parking Charge Bulk import</h1>
        <nav className="text-xs text-gray-500 space-x-1">
          <span>Dashboard</span><span>&gt;</span><span>Hotspot Parking Charge</span><span>&gt;</span>
          <span className="text-primary">Vehicle Parking Charge Bulk import</span>
        </nav>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#f0dafb]">
        <div className="px-8 py-10">
          <form onSubmit={onUpload} className="flex flex-col items-center">
            <div className="w-full border-2 border-dashed border-[#e5c7ff] rounded-2xl py-16 flex flex-col items-center justify-center mb-10 bg-[#fff9ff]">
              <div className="flex flex-col items-center gap-4">
                <div className="h-20 w-20 rounded-full border border-[#f0dafb] flex items-center justify-center">
                  <span className="text-4xl opacity-30">📄</span>
                </div>
                <div className="flex flex-col items-center gap-4">
                  <label className="inline-flex items-center justify-center px-6 py-2 rounded-full border border-gray-300 bg-white text-sm cursor-pointer shadow-sm hover:shadow-md transition">
                    <span>{file ? file.name : "Choose File"}</span>
                    <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} ref={fileRef} disabled={busy}/>
                  </label>
                  <button type="submit" disabled={!file || busy} className="px-8 py-2 rounded-full text-sm font-medium text-white bg-gradient-to-r from-primary to-pink-500 shadow hover:shadow-md transition disabled:opacity-60">
                    {busy ? "Uploading..." : "Upload"}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 mb-8">
              <button type="button" onClick={downloadSample} className="text-sm text-primary underline-offset-2 hover:underline">
                Download Sample CSV
              </button>
              <p className="text-[11px] text-gray-500"><span className="text-xs">ℹ️</span> Only CSV files are supported.</p>
            </div>

            <div className="w-full">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-gray-600">
                  {sessionId ? (
                    <>
                      Session: <span className="font-mono">{sessionId}</span> •
                      {" "}Staged {stagedCount} • Imported {importedCount} • Rejected {rejectedCount}
                    </>
                  ) : "Upload a CSV to start staging rows"}
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => refreshTemplist()} disabled={!sessionId || busy} className="px-4 py-2 rounded-full text-sm font-medium border border-gray-300 bg-white hover:bg-gray-50 transition disabled:opacity-60">
                    Refresh
                  </button>
                  <button type="button" onClick={onConfirm} disabled={!sessionId || busy || selectedIds.length === 0} className="px-4 py-2 rounded-full text-sm font-medium text-white bg-gradient-to-r from-primary to-pink-500 shadow hover:shadow-md transition disabled:opacity-60">
                    Confirm Import ({selectedIds.length})
                  </button>
                </div>
              </div>

              {lastConfirm && (
                <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
                  Last import summary: Imported {lastConfirm.imported}/{lastConfirm.total}, Failed {lastConfirm.failed}.
                  {stagedCount === 0 && rows.length > 0 && (
                    <span className="ml-2 text-emerald-700">No staged rows remain, but imported/rejected rows are shown below.</span>
                  )}
                </div>
              )}

              <div className="overflow-x-auto rounded-xl border border-[#f0dafb]">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">
                        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={allChecked}
                            ref={(el) => { if (el) el.indeterminate = !allChecked && someChecked; }}
                            onChange={() => {
                              const next: Record<number, boolean> = {};
                              const v = !allChecked;
                              rows.forEach(r => {
                                if ((r.row_status ?? "staged") === "staged") next[r.id] = v;
                                else next[r.id] = false;
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
                    {rows.length === 0 ? (
                      <tr>
                        <td className="px-4 py-8 text-center text-gray-500" colSpan={7}>
                          {lastConfirm
                            ? "No rows found for this session."
                            : "No rows."}
                        </td>
                      </tr>
                    ) : (
                      rows.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2">
                            <input
                              type="checkbox"
                              checked={!!selected[r.id]}
                              disabled={(r.row_status ?? "staged") !== "staged"}
                              onChange={(e) => setSelected(p => ({ ...p, [r.id]: e.target.checked }))}
                            />
                          </td>
                          <td className="px-4 py-2 font-medium">{r.hotspot_name}</td>
                          <td className="px-4 py-2">{r.hotspot_location}</td>
                          <td className="px-4 py-2">{r.vehicle_type_title}</td>
                          <td className="px-4 py-2 text-right">{r.parking_charge}</td>
                          <td className="px-4 py-2">
                            {(r.row_status ?? "staged") === "staged" ? (
                              <span className="rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-700">Staged</span>
                            ) : r.row_status === "imported" ? (
                              <span className="rounded bg-sky-50 px-2 py-1 text-xs text-sky-700">Imported</span>
                            ) : (
                              <span className="rounded bg-rose-50 px-2 py-1 text-xs text-rose-700">Rejected</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-xs text-gray-600">{r.reason || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Page;
