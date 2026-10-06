import { api } from "@/lib/api";
import type { TollRouteEditor } from "./tollChargeBatch";
import { parseTollCharge } from "./tollChargeBatch";

export async function exportTollCharges(routes: TollRouteEditor[]) {
  if (!routes.length || routes.some((route) =>
    route.saveState !== "saved" || route.dirty || route.loadError ||
    route.locationId === null || !route.rows.length
  )) {
    throw new Error("Only successfully saved routes can be exported.");
  }

  const vehicles = new Map<number, string>();
  for (const route of routes) {
    for (const row of route.rows) {
      if (parseTollCharge(row.charge) === null) {
        throw new Error("An invalid toll amount cannot be exported.");
      }
      if (!vehicles.has(row.vehicle_type_id)) {
        vehicles.set(row.vehicle_type_id, row.vehicle_type_name);
      }
    }
  }

  const columns = Array.from(vehicles.entries());
  const nameCounts = new Map<string, number>();
  columns.forEach(([, name]) => nameCounts.set(name, (nameCounts.get(name) || 0) + 1));
  const headers = [
    "Source Location",
    "Destination Location",
    ...columns.map(([id, name]) =>
      (nameCounts.get(name) || 0) > 1 ? name + " (ID " + id + ")" : name
    ),
  ];

  const data: Array<Array<string | number | null>> = [headers];
  for (const route of routes) {
    const amounts = new Map(route.rows.map((row) => [
      row.vehicle_type_id, parseTollCharge(row.charge),
    ]));
    data.push([
      route.source,
      route.destination,
      ...columns.map(([id]) => amounts.has(id) ? amounts.get(id)! : null),
    ]);
  }

  const XLSX = await import("xlsx");
  const sheet = XLSX.utils.aoa_to_sheet(data);

  // Keep names as literal text, even when they start with formula characters.
  for (let row = 0; row < data.length; row++) {
    for (let column = 0; column < data[row].length; column++) {
      const value = data[row][column];
      const address = XLSX.utils.encode_cell({ r: row, c: column });
      if (typeof value === "string") {
        sheet[address] = { t: "s", v: value };
      } else if (typeof value === "number" && sheet[address]) {
        sheet[address].z = "0.00";
      }
    }
  }

  sheet["!cols"] = [
    { wch: 48 }, { wch: 48 },
    ...columns.map(([, name]) => ({ wch: Math.min(40, Math.max(20, name.length + 2)) })),
  ];
  sheet["!autofilter"] = { ref: sheet["!ref"]! };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Toll Charges");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  XLSX.writeFile(workbook, "Toll-Charges-" + timestamp + ".xlsx", { compression: true });
}

type SavedTollExportRow = {
  locationId: number;
  source: string;
  destination: string;
  vehicleTypeId: number;
  vehicleName: string;
  amount: number;
};

export async function exportAllSavedTollCharges(): Promise<{
  routeCount: number;
  duplicatesSkipped: number;
}> {
  const result = await api("/locations/tolls/bulk-export") as {
    rows: SavedTollExportRow[];
    total: number;
    duplicatesSkipped: number;
  };

  if (!result || !Array.isArray(result.rows) ||
      !Number.isSafeInteger(result.duplicatesSkipped) ||
      result.duplicatesSkipped < 0 ||
      result.total !== result.rows.length) {
    throw new Error("The complete toll export could not be loaded.");
  }
  if (!result.rows.length) {
    throw new Error("No saved toll charges are available to download.");
  }

  const routes = new Map<number, TollRouteEditor>();
  const seen = new Set<string>();

  for (const item of result.rows) {
    if (
      !Number.isSafeInteger(item.locationId) || item.locationId <= 0 ||
      !Number.isSafeInteger(item.vehicleTypeId) || item.vehicleTypeId <= 0 ||
      typeof item.source !== "string" ||
      typeof item.destination !== "string" ||
      typeof item.vehicleName !== "string" ||
      typeof item.amount !== "number" ||
      !Number.isFinite(item.amount) || item.amount < 0
    ) {
      throw new Error("Invalid saved toll data. Export stopped.");
    }

    const key = item.locationId + ":" + item.vehicleTypeId;
    if (seen.has(key)) throw new Error("Duplicate toll data. Export stopped.");
    seen.add(key);

    if (!routes.has(item.locationId)) {
      routes.set(item.locationId, {
        locationId: item.locationId,
        source: item.source,
        destination: item.destination,
        rows: [],
        saveState: "saved",
        dirty: false,
        loadError: "",
        saveError: "",
      });
    }

    const route = routes.get(item.locationId)!;
    if (route.source !== item.source || route.destination !== item.destination) {
      throw new Error("Inconsistent route names. Export stopped.");
    }
    route.rows.push({
      vehicle_type_id: item.vehicleTypeId,
      vehicle_type_name: item.vehicleName,
      charge: String(item.amount),
    });
  }

  await exportTollCharges(Array.from(routes.values()));
  return {
    routeCount: routes.size,
    duplicatesSkipped: result.duplicatesSkipped,
  };
}
