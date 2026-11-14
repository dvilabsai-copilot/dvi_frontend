import { useState, type ClipboardEvent } from "react";

export function OriginCoordinateFields({ idPrefix, labelPrefix, latitude, longitude, latitudeError, longitudeError, onChange }: {
  idPrefix: string;
  labelPrefix: string;
  latitude: string;
  longitude: string;
  latitudeError?: string;
  longitudeError?: string;
  onChange: (latitude: string, longitude: string) => void;
}) {
  const [pasteError, setPasteError] = useState("");
  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData("text").trim();
    if (!text.includes(",")) return;
    event.preventDefault();
    const parts = text.split(",").map((part) => part.trim());
    const lat = Number(parts[0]);
    const lng = Number(parts[1]);
    if (parts.length !== 2 || !parts[0] || !parts[1] ||
        !Number.isFinite(lat) || Math.abs(lat) > 90 ||
        !Number.isFinite(lng) || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) {
      setPasteError("Paste valid coordinates as latitude, longitude.");
      return;
    }
    setPasteError("");
    onChange(parts[0], parts[1]);
  };
  return <>
    <div className="space-y-1">
      <label className="text-sm text-slate-600" htmlFor={`${idPrefix}-latitude`}>{labelPrefix} Latitude</label>
      <input id={`${idPrefix}-latitude`} type="number" step="any" min="-90" max="90"
        value={latitude} onPaste={onPaste} placeholder="Latitude (optional)"
        onChange={(event) => { setPasteError(""); onChange(event.target.value, longitude); }}
        className={`w-full rounded border px-3 py-2 ${pasteError || latitudeError ? "border-red-400" : ""}`} />
      {pasteError || latitudeError ? <p className="text-xs text-red-600">{pasteError || latitudeError}</p> : null}
    </div>
    <div className="space-y-1">
      <label className="text-sm text-slate-600" htmlFor={`${idPrefix}-longitude`}>{labelPrefix} Longitude</label>
      <input id={`${idPrefix}-longitude`} type="number" step="any" min="-180" max="180"
        value={longitude} onPaste={onPaste} placeholder="Longitude (optional)"
        onChange={(event) => { setPasteError(""); onChange(latitude, event.target.value); }}
        className={`w-full rounded border px-3 py-2 ${pasteError || longitudeError ? "border-red-400" : ""}`} />
      {pasteError || longitudeError ? <p className="text-xs text-red-600">{pasteError || longitudeError}</p> : null}
    </div>
  </>;
}
