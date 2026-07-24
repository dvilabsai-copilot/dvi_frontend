// FILE: src/pages/Settings/VehicleTypeModal.tsx

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

export type VehicleTypeFormValues = {
  title: string;
 occupancy: string; // keep string for controlled input
};

export function VehicleTypeModal(props: {
  open: boolean;
  mode: "create" | "edit";
  initial?: Partial<VehicleTypeFormValues>;
  onClose: () => void;
  onSubmit: (values: VehicleTypeFormValues) => Promise<void> | void;
}) {
  const { open, mode, initial, onClose, onSubmit } = props;

  const titleText = mode === "create" ? "Add Vehicle Type" : "Update Vehicle Type";
  const submitLabel = mode === "create" ? "Save" : "Update";

  const initialState: VehicleTypeFormValues = useMemo(
    () => ({
      title: initial?.title ?? "",
      occupancy: initial?.occupancy ?? "",
    }),
    [initial]
  );

  const [values, setValues] = useState<VehicleTypeFormValues>(initialState);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setValues(initialState);
  }, [open, initialState]);

  if (!open) return null;

  const isValid =
    values.title.trim().length > 0 &&
    values.occupancy.trim().length > 0 &&
    !Number.isNaN(Number(values.occupancy));

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    try {
      setSubmitting(true);
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
 {/* overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

 {/* modal */}
      <div className="relative w-[780px] max-w-[92vw] rounded-lg bg-white shadow-2xl">
        <div className="px-10 py-10">
          <h2 className="text-center text-3xl font-semibold text-slate-600">
            {titleText}
          </h2>

          <div className="mt-10 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                Vehicle Type Title <span className="text-red-500">*</span>
              </label>
              <Input
                value={values.title}
                onChange={(e) => setValues((s) => ({ ...s, title: e.target.value }))}
                placeholder="Enter the Vehicle Type Title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                Occupancy <span className="text-red-500">*</span>
              </label>
              <Input
                value={values.occupancy}
                onChange={(e) => setValues((s) => ({ ...s, occupancy: e.target.value }))}
                placeholder="Enter the occupancy"
              />
            </div>
          </div>

          <div className="mt-12 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-gray-400 px-10 py-3 text-white font-semibold hover:bg-gray-500 transition"
              disabled={submitting}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isValid || submitting}
              className={`rounded-md px-12 py-3 text-white font-semibold transition
                ${
                  !isValid || submitting
                    ? "bg-purple-300 cursor-not-allowed"
                    : "bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600"
                }`}
            >
              {submitting ? "Saving..." : submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

