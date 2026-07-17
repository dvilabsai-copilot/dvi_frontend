/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";

export function VendorStepVehicleTypeCostDeleteDialogs({ context }: { context: Record<string, any> }) {
  const { deleteDriverCostId, deleteLocalId, deleteOutstationId, handleDeleteDriverCost, handleDeleteLocal, handleDeleteOutstation, setDeleteDriverCostId, setDeleteLocalId, setDeleteOutstationId } = context;
  const dialog = (onClose: () => void, onDelete: () => Promise<void>, warning?: string) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"><div className="w-[380px] rounded-lg bg-white px-7 py-6 text-center shadow-xl"><div className="mb-3 text-4xl text-gray-500">⚠️</div><h2 className="text-xl font-semibold text-gray-700">Are you sure?</h2><p className="mt-3 text-sm text-gray-600">Do you really want to delete this record?</p>{warning && <p className="mt-2 text-sm font-semibold text-red-600">{warning}</p>}<p className="text-sm text-gray-600">This process cannot be undone. Do you want to continue?</p><div className="mt-6 flex justify-center gap-3"><Button type="button" variant="secondary" onClick={onClose}>Close</Button><Button type="button" className="bg-red-500 text-white hover:bg-red-600" onClick={async () => { await onDelete(); onClose(); }}>Delete</Button></div></div></div>
  );
  return <>{deleteDriverCostId !== null && dialog(() => setDeleteDriverCostId(null), () => handleDeleteDriverCost(deleteDriverCostId), "All related local and outstation rates will be permanently deleted.")}{deleteOutstationId !== null && dialog(() => setDeleteOutstationId(null), () => handleDeleteOutstation(deleteOutstationId))}{deleteLocalId !== null && dialog(() => setDeleteLocalId(null), () => handleDeleteLocal(deleteLocalId))}</>;
}
