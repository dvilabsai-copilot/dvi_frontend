/** V24: Super Admin-only multi-vehicle workbook coordination.
 * No pricing is recomputed here. Each vehicle comparison registers the exact
 * records used by its existing Copy/Download functions. Hidden accordion
 * categories remain mounted and therefore can be exported in full.
 */
import React from "react";
import { downloadReadableVehicleMultiSheetWorkbook, type VehicleExportRecord } from "./SuperAdminVehicleExcelWorkbook";

type VehicleType = { id: number; label: string };
type RegisteredSheet = { typeId: number; label: string; records: VehicleExportRecord[]; columns: number };
type WorkbookContextValue = {
  register: (sheet: RegisteredSheet) => void;
  download: (filename: string) => number;
  vehicleTypes: VehicleType[];
  isIncluded: (typeId: number) => boolean;
  toggleIncluded: (typeId: number, included: boolean) => void;
};
const WorkbookContext = React.createContext<WorkbookContextValue | null>(null);
export const useSuperAdminVehicleWorkbook = () => React.useContext(WorkbookContext);

export const SuperAdminVehicleWorkbookProvider: React.FC<{
  vehicleTypes: VehicleType[];
  enabled?: boolean;
  children: React.ReactNode;
}> = ({ vehicleTypes, enabled = true, children }) => {
  const registry = React.useRef(new Map<number, RegisteredSheet>());
  const [excluded, setExcluded] = React.useState<Set<number>>(() => new Set());
  const register = React.useCallback((sheet: RegisteredSheet) => {
    registry.current.set(sheet.typeId, sheet);
  }, []);
  const toggleIncluded = React.useCallback((typeId: number, included: boolean) => {
    setExcluded((current) => {
      const next = new Set(current);
      if (included) next.delete(typeId);
      else next.add(typeId);
      return next;
    });
  }, []);
  const isIncluded = (typeId: number) => !excluded.has(typeId);
  const download = (filename: string): number => {
    const chosen = vehicleTypes.filter(({ id }) => !excluded.has(id));
    if (!chosen.length) throw new Error("Select at least one vehicle category for Excel.");
    const sheets = chosen.map(({ id, label }) => {
      const registered = registry.current.get(id);
      if (!registered || !registered.records.length || registered.columns < 2) {
        throw new Error(`Vehicle comparison is not ready: ${label}. Refresh the page and try again.`);
      }
      return { name: label, records: registered.records, columns: registered.columns };
    });
    downloadReadableVehicleMultiSheetWorkbook(sheets, filename);
    return sheets.length;
  };
  if (!enabled) return <>{children}</>;
  return <WorkbookContext.Provider value={{ register, download, vehicleTypes, isIncluded, toggleIncluded }}>
    {children}
  </WorkbookContext.Provider>;
};

/** Explicit category selection is separate from the existing vendor radio
 * buttons and the one-at-a-time vehicle accordion. Initially all are included. */
export const SuperAdminVehicleExcelPicker: React.FC = () => {
  const context = useSuperAdminVehicleWorkbook();
  if (!context || !context.vehicleTypes.length) return null;
  return <div data-testid="super-admin-excel-sheet-picker"
    className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-purple-100 bg-purple-50/60 px-4 py-2 text-xs">
    <span className="font-semibold text-purple-950">Include in Excel:</span>
    {context.vehicleTypes.map(({ id, label }) => <label key={id}
      className="inline-flex cursor-pointer items-center gap-1.5 text-gray-800">
      <input type="checkbox" className="h-3.5 w-3.5 accent-purple-700"
        checked={context.isIncluded(id)}
        onChange={(event) => context.toggleIncluded(id, event.target.checked)}
        aria-label={`Include ${label} in Excel workbook`} />
      <span>{label}</span>
    </label>)}
    <span className="text-gray-500">One worksheet per selected vehicle type</span>
  </div>;
};
