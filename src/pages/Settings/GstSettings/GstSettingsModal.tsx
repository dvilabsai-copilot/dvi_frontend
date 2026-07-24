// FILE: src/pages/Settings/GstSettingsModal.tsx

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

export type GstFormValues = {
  gstTitle: string;
 gst: string; // keep as string for input control
  cgst: string;
  sgst: string;
  igst: string;
};

export function GstSettingsModal(props: {
  open: boolean;
  mode: "create" | "edit";
  initial?: Partial<GstFormValues>;
  onClose: () => void;
  onSubmit: (values: GstFormValues) => Promise<void> | void;
}) {
  const { open, mode, initial, onClose, onSubmit } = props;

  const title = mode === "create" ? "Add GST Settings" : "Update GST Settings";
  const submitLabel = mode === "create" ? "Save" : "Update";

  const initialState: GstFormValues = useMemo(
    () => ({
      gstTitle: initial?.gstTitle ?? "",
      gst: initial?.gst ?? "",
      cgst: initial?.cgst ?? "",
      sgst: initial?.sgst ?? "",
      igst: initial?.igst ?? "",
    }),
    [initial]
  );

  const [values, setValues] = useState<GstFormValues>(initialState);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setValues(initialState);
  }, [open, initialState]);

  if (!open) return null;

  const setField = (k: keyof GstFormValues, v: string) =>
    setValues((s) => ({ ...s, [k]: v }));

  const isValid =
    values.gstTitle.trim().length > 0 &&
    values.gst.trim().length > 0 &&
    values.cgst.trim().length > 0 &&
    values.sgst.trim().length > 0 &&
    values.igst.trim().length > 0;

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
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

 {/* modal */}
      <div className="relative w-[720px] max-w-[92vw] rounded-lg bg-white shadow-2xl">
        <div className="px-10 py-10">
          <h2 className="text-center text-3xl font-semibold text-slate-600">
            {title}
          </h2>

          <div className="mt-10 space-y-6">
            <Field label="GST Title" required>
              <Input
                value={values.gstTitle}
                onChange={(e) => setField("gstTitle", e.target.value)}
                placeholder="Enter the GST title"
              />
            </Field>

            <Field label="GST" required>
              <Input
                value={values.gst}
                onChange={(e) => setField("gst", e.target.value)}
                placeholder="Enter the Gst value"
              />
            </Field>

            <Field label="CGST" required>
              <Input
                value={values.cgst}
                onChange={(e) => setField("cgst", e.target.value)}
                placeholder="Enter the CGST Value"
              />
            </Field>

            <Field label="SGST" required>
              <Input
                value={values.sgst}
                onChange={(e) => setField("sgst", e.target.value)}
                placeholder="Enter the SGST Value"
              />
            </Field>

            <Field label="IGST" required>
              <Input
                value={values.igst}
                onChange={(e) => setField("igst", e.target.value)}
                placeholder="Enter the IGST Value"
              />
            </Field>
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

function Field(props: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-2">
        {props.label}{" "}
        {props.required ? <span className="text-red-500">*</span> : null}
      </label>
      {props.children}
    </div>
  );
}
