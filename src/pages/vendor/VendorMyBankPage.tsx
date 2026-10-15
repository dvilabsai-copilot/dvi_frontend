
import React, { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  VendorBankDetailsSection,
  type VendorBankDetailsHandle,
} from "./steps/VendorBankDetailsSection";

export default function VendorMyBankPage() {
  const bankRef = useRef<VendorBankDetailsHandle>(null);
  const [vendorId, setVendorId] = useState<number>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadVendor = async () => {
      try {
        const result = (await api(
          "/vendor-bank-details/me"
        )) as { vendorId: number };

        if (active) {
          setVendorId(result.vendorId);
        }
      } catch {
        if (active) {
          setError(
            "Your login is not linked to a valid vendor account."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadVendor();

    return () => {
      active = false;
    };
  }, []);

  const save = async () => {
    if (!vendorId) return;

    setSaving(true);

    try {
      await bankRef.current?.submitIfDirty(vendorId);
    } catch {
      // The bank section displays the validation/API error.
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading bank details...</div>;
  }

  if (error || !vendorId) {
    return (
      <div className="p-6 text-red-600">
        {error || "Vendor account unavailable."}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-2 text-2xl font-semibold">
        My Bank Details
      </h1>

      <div className="rounded-xl border bg-white p-6">
        <VendorBankDetailsSection
          ref={bankRef}
          vendorId={vendorId}
        />

        <div className="mt-6 flex justify-end">
          <Button
            type="button"
            disabled={saving}
            onClick={save}
          >
            {saving
              ? "Submitting..."
              : "Submit Bank Details"}
          </Button>
        </div>
      </div>
    </div>
  );
}
