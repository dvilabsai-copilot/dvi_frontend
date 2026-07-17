import type { Dispatch, SetStateAction } from "react";
import { Ban, Pencil, Share2 } from "lucide-react";
import type {
  SimpleOption,
  VehicleAvailabilityCell,
  VehicleAvailabilityRow,
} from "@/services/vehicle-availability";

export type SelectedCell = {
  row: VehicleAvailabilityRow;
  cell: VehicleAvailabilityCell;
} | null;

export function VehicleAvailabilityActionModals({
  assignModalOpen,
  setAssignModalOpen,
  assignContext,
  setAssignContext,
  assigning,
  assignVehicleId,
  setAssignVehicleId,
  assignDriverId,
  setAssignDriverId,
  assignVehicleOptions,
  assignDriverOptions,
  submitAssignVehicle,
  blockModalOpen,
  setBlockModalOpen,
  blockContext,
  setBlockContext,
  blocking,
  blockReason,
  setBlockReason,
  submitBlockVehicle,
}: {
  assignModalOpen: boolean;
  setAssignModalOpen: Dispatch<SetStateAction<boolean>>;
  assignContext: SelectedCell;
  setAssignContext: Dispatch<SetStateAction<SelectedCell>>;
  assigning: boolean;
  assignVehicleId: number | "";
  setAssignVehicleId: Dispatch<SetStateAction<number | "">>;
  assignDriverId: number | "";
  setAssignDriverId: Dispatch<SetStateAction<number | "">>;
  assignVehicleOptions: SimpleOption[];
  assignDriverOptions: SimpleOption[];
  submitAssignVehicle: () => void;
  blockModalOpen: boolean;
  setBlockModalOpen: Dispatch<SetStateAction<boolean>>;
  blockContext: SelectedCell;
  setBlockContext: Dispatch<SetStateAction<SelectedCell>>;
  blocking: boolean;
  blockReason: string;
  setBlockReason: Dispatch<SetStateAction<string>>;
  submitBlockVehicle: () => void;
}) {
  return (
    <>
      {assignModalOpen && assignContext ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/40 p-4"
          onClick={() => {
            if (assigning) return;
            setAssignModalOpen(false);
            setAssignContext(null);
          }}
        >
          <div
            className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 text-base font-semibold text-slate-900">Assign Vehicle</div>
            <div className="mb-4 text-xs text-slate-600">
              {assignContext.cell.itineraryQuoteId || `Plan #${assignContext.cell.itineraryPlanId}`} • {assignContext.cell.date}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Vehicle</label>
                <select
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                  value={assignVehicleId === "" ? "" : String(assignVehicleId)}
                  onChange={(e) => setAssignVehicleId(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">Choose Vehicle</option>
                  {assignVehicleOptions.map((v) => (
                    <option key={v.id} value={String(v.id)}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-700">Driver (optional)</label>
                <select
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                  value={assignDriverId === "" ? "" : String(assignDriverId)}
                  onChange={(e) => setAssignDriverId(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">Choose Driver</option>
                  {assignDriverOptions.map((v) => (
                    <option key={v.id} value={String(v.id)}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700"
                disabled={assigning}
                onClick={() => {
                  setAssignModalOpen(false);
                  setAssignContext(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                disabled={assigning}
                onClick={submitAssignVehicle}
              >
                {assigning ? "Saving..." : "Assign"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
            {blockModalOpen && blockContext ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4"
          onClick={() => {
            if (blocking) return;
            setBlockModalOpen(false);
            setBlockContext(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900">
              Block Vehicle
            </h2>

            <div className="mt-2 text-sm text-slate-600">
              {blockContext.row.registrationNumber} — {blockContext.cell.date}
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm text-slate-700">
                Reason
              </label>

              <textarea
                className="min-h-[100px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-purple-400"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Enter blocking reason"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={blocking}
                className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 disabled:opacity-60"
                onClick={() => {
                  setBlockModalOpen(false);
                  setBlockContext(null);
                  setBlockReason("");
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={blocking}
                className="rounded bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
                onClick={submitBlockVehicle}
              >
                {blocking ? "Blocking..." : "Block Vehicle"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

