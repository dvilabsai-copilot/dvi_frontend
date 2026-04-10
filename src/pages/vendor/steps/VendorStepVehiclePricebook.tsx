// FILE: src/pages/vendor/steps/VendorStepVehiclePricebook.tsx

import React, { useEffect, useMemo, useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { Option } from "../vendorFormTypes";

type Props = {
  vendorId?: number;
  onBack: () => void;
  onFinish: () => void;
};

const gstTypes = [
  { id: "included", label: "Included" },
  { id: "excluded", label: "Excluded" },
];

const toPickerDate = (value: string) => {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
};

const toYmd = (date?: Date) => {
  if (!date) return "";
  return format(date, "yyyy-MM-dd");
};

const PricebookDatePicker = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) => {
  const selected = toPickerDate(value);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-10 w-36 items-center justify-between rounded-md border border-input bg-background px-3 text-left text-sm"
        >
          <span className={selected ? "text-foreground" : "text-muted-foreground"}>
            {selected ? format(selected, "dd-MM-yyyy") : placeholder}
          </span>
          <CalendarIcon className="h-4 w-4 text-purple-600" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => onChange(toYmd(date))}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};

export const VendorStepVehiclePricebook: React.FC<Props> = ({
  vendorId,
  onBack,
  onFinish,
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Dropdowns
  const [vehicleTypeOptions, setVehicleTypeOptions] = useState<Option[]>([]);
  const [gstPercentOptions, setGstPercentOptions] = useState<Option[]>([]);

  // ----- Vendor margin state -----
  const [vendorMarginPercent, setVendorMarginPercent] = useState<string>("0");
  const [vendorMarginGstType, setVendorMarginGstType] =
    useState<string>("included");
  const [vendorMarginGstPercent, setVendorMarginGstPercent] =
    useState<string>("0");

  // ----- Driver/extra cost state -----
  const [driverCosts, setDriverCosts] = useState<any[]>([]);
  const [editableDriverRows, setEditableDriverRows] = useState<any[]>([]);
  const [vehicleExtraRows, setVehicleExtraRows] = useState<any[]>([]);

  // ----- PHP parity pricebook rows -----
  const [localFormRows, setLocalFormRows] = useState<any[]>([]);
  const [outstationFormRows, setOutstationFormRows] = useState<any[]>([]);
  const [localRentalByRow, setLocalRentalByRow] = useState<Record<string, string>>({});
  const [outstationRentalByRow, setOutstationRentalByRow] = useState<Record<string, string>>({});
  const [localStartDate, setLocalStartDate] = useState("");
  const [localEndDate, setLocalEndDate] = useState("");
  const [outstationStartDate, setOutstationStartDate] = useState("");
  const [outstationEndDate, setOutstationEndDate] = useState("");
  const [localPreview, setLocalPreview] = useState<{ days: Array<{ key: string; label: string }>; rows: Array<{ vehicle_type_title: string; time_limit_title: string; prices: Array<number | null> }> }>({ days: [], rows: [] });

  // ----- Local KM Limit modal -----
  const [localKmOpen, setLocalKmOpen] = useState(false);
  const [localKmForm, setLocalKmForm] = useState({
    vehicleType: "",
    title: "",
    hours: "",
    kmLimit: "",
  });

  // ----- Outstation KM Limit modal -----
  const [outKmOpen, setOutKmOpen] = useState(false);
  const [outKmForm, setOutKmForm] = useState({
    vehicleType: "",
    title: "",
    kmLimit: "",
  });

  useEffect(() => {
    if (vendorId) {
      fetchData();
      fetchDropdowns();
    }
  }, [vendorId]);

  useEffect(() => {
    if (!vendorId) return;

    const loadPreview = async () => {
      if (!localStartDate || !localEndDate) {
        setLocalPreview({ days: [], rows: [] });
        return;
      }

      try {
        const preview = (await api(
          `/vendors/${vendorId}/pricebook/local/preview?startDate=${encodeURIComponent(localStartDate)}&endDate=${encodeURIComponent(localEndDate)}`,
        )) as any;
        setLocalPreview(preview ?? { days: [], rows: [] });
      } catch (e) {
        console.error("Failed to load local pricebook preview", e);
      }
    };

    loadPreview();
  }, [vendorId, localStartDate, localEndDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vRes, dcRes, extraRes, localRowsRes, outRowsRes] = await Promise.all([
        api(`/vendors/${vendorId}`),
        api(`/vendors/${vendorId}/vehicle-type-costs`),
        api(`/vendors/${vendorId}/vehicle-extra-costs`),
        api(`/vendors/${vendorId}/pricebook/local/form-rows`),
        api(`/vendors/${vendorId}/pricebook/outstation/form-rows`),
      ]);

      const v = vRes.vendor;
      const gstTypeRaw = String(v.vendor_margin_gst_type ?? "1");
      const gstType =
        gstTypeRaw === "2" || gstTypeRaw === "excluded"
          ? "excluded"
          : "included";
      setVendorMarginPercent(String(v.vendor_margin ?? v.vendor_margin_percent ?? 0));
      setVendorMarginGstType(gstType);
      setVendorMarginGstPercent(String(v.vendor_margin_gst_percentage || 0));

      const normalizedDriverRows = (dcRes as any[]).map((dc) => ({
        vendor_vehicle_type_ID: dc.vendor_vehicle_type_ID,
        vehicle_type_id: dc.vehicle_type_id,
        vehicle_type_title: dc.vehicle_type_title,
        driver_batta: String(dc.driver_batta ?? dc.driver_bhatta ?? 0),
        food_cost: String(dc.food_cost ?? 0),
        accomodation_cost: String(dc.accomodation_cost ?? dc.accommodation_cost ?? 0),
        extra_cost: String(dc.extra_cost ?? 0),
        driver_early_morning_charges: String(dc.driver_early_morning_charges ?? dc.morning_charges ?? 0),
        driver_evening_charges: String(dc.driver_evening_charges ?? dc.evening_charges ?? 0),
      }));

      setDriverCosts(dcRes as any[]);
      setEditableDriverRows(normalizedDriverRows);
      setVehicleExtraRows(
        (extraRes as any[]).map((r: any) => ({
          vendor_branch_id: r.vendor_branch_id,
          vendor_branch_name: r.vendor_branch_name,
          vehicle_type_id: r.vehicle_type_id,
          vehicle_type_title: r.vehicle_type_title,
          extra_km_charge: String(r.extra_km_charge ?? 0),
          extra_hour_charge: String(r.extra_hour_charge ?? 0),
          early_morning_charges: String(r.early_morning_charges ?? 0),
          evening_charges: String(r.evening_charges ?? 0),
        })),
      );
      setLocalFormRows(localRowsRes as any[]);
      setOutstationFormRows(outRowsRes as any[]);

      if (localStartDate && localEndDate) {
        const preview = (await api(
          `/vendors/${vendorId}/pricebook/local/preview?startDate=${encodeURIComponent(localStartDate)}&endDate=${encodeURIComponent(localEndDate)}`,
        )) as any;
        setLocalPreview(preview ?? { days: [], rows: [] });
      }
    } catch (e) {
      console.error("Failed to fetch pricebook data", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [vtRes, gpRes] = await Promise.all([
        api("/dropdowns/vehicle-types"),
        api("/dropdowns/gst-percentages"),
      ]);

      const vehicleItems = ((vtRes as any)?.items ?? vtRes ?? []) as any[];
      const gstItems = ((gpRes as any)?.items ?? gpRes ?? []) as any[];

      setVehicleTypeOptions(
        vehicleItems.map((v: any) => ({
          id: String(v.id ?? v.vehicle_type_id ?? ""),
          label: String(v.label ?? v.name ?? v.vehicle_type_title ?? ""),
        }))
      );

      setGstPercentOptions(
        gstItems.map((g: any) => ({
          id: String(g.id ?? g.gstperc_id ?? ""),
          label: String(g.label ?? g.gstpercentage ?? g.name ?? ""),
        }))
      );
    } catch (e) {
      console.error("Failed to fetch dropdowns", e);
    }
  };

  const handleUpdateMargin = async () => {
    if (!vendorId) return;
    setSaving(true);
    try {
      await api(`/vendors/${vendorId}`, {
        method: "PATCH",
        body: JSON.stringify({
          vendor_margin_percent: Number(vendorMarginPercent),
          vendor_margin_gst_type: vendorMarginGstType,
          vendor_margin_gst_percentage: Number(vendorMarginGstPercent),
        }),
      });
      // Refresh
      await fetchData();
    } catch (e) {
      console.error("Failed to update margin", e);
    } finally {
      setSaving(false);
    }
  };

  const gradientButton =
    "bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600";

  const setDriverCell = (idx: number, field: string, value: string) => {
    setEditableDriverRows((prev) => {
      const clone = [...prev];
      clone[idx] = { ...clone[idx], [field]: value };
      return clone;
    });
  };

  const setExtraCell = (idx: number, field: string, value: string) => {
    setVehicleExtraRows((prev) => {
      const clone = [...prev];
      clone[idx] = { ...clone[idx], [field]: value };
      return clone;
    });
  };

  const handleUpdateDriverAndExtraCosts = async () => {
    if (!vendorId || !editableDriverRows.length) return;
    setSaving(true);
    try {
      for (const row of editableDriverRows) {
        await api(`/vendors/${vendorId}/vehicle-type-costs`, {
          method: "POST",
          body: JSON.stringify({
            vehicle_type_id: Number(row.vehicle_type_id),
            driver_bhatta: Number(row.driver_batta || 0),
            food_cost: Number(row.food_cost || 0),
            accommodation_cost: Number(row.accomodation_cost || 0),
            extra_cost: Number(row.extra_cost || 0),
            morning_charges: Number(row.driver_early_morning_charges || 0),
            evening_charges: Number(row.driver_evening_charges || 0),
          }),
        });
      }
      await fetchData();
    } catch (e) {
      console.error("Failed to update driver/extra costs", e);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateVehicleExtraCosts = async () => {
    if (!vendorId || !vehicleExtraRows.length) return;
    setSaving(true);
    try {
      const groupedByBranch = vehicleExtraRows.reduce((acc: Record<string, any[]>, row) => {
        const key = String(row.vendor_branch_id);
        if (!acc[key]) acc[key] = [];
        acc[key].push(row);
        return acc;
      }, {});

      for (const [branchId, rows] of Object.entries(groupedByBranch)) {
        await api(`/vendors/${vendorId}/vehicle-extra-costs`, {
          method: "POST",
          body: JSON.stringify({
            vendor_branch_id: Number(branchId),
            vehicle_type_id: rows.map((r) => Number(r.vehicle_type_id)),
            vehicle_type_title: rows.map((r) => r.vehicle_type_title),
            extra_km_charge: rows.map((r) => Number(r.extra_km_charge || 0)),
            extra_hour_charge: rows.map((r) => Number(r.extra_hour_charge || 0)),
            early_morning_charges: rows.map((r) => Number(r.early_morning_charges || 0)),
            evening_charges: rows.map((r) => Number(r.evening_charges || 0)),
          }),
        });
      }
      await fetchData();
    } catch (e) {
      console.error("Failed to update vehicle extra costs", e);
    } finally {
      setSaving(false);
    }
  };

  const groupedExtraRows = useMemo(() => {
    return vehicleExtraRows.reduce((acc: Record<string, any[]>, row: any) => {
      const key = `${row.vendor_branch_id}:${row.vendor_branch_name || ""}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(row);
      return acc;
    }, {});
  }, [vehicleExtraRows]);

  const handleLocalKmChange = (
    field: keyof typeof localKmForm,
    value: string
  ) => {
    setLocalKmForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleOutKmChange = (field: keyof typeof outKmForm, value: string) => {
    setOutKmForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleLocalKmSave = async () => {
    if (!vendorId || !localKmForm.vehicleType) return;
    setSaving(true);
    try {
      await api(`/vendors/${vendorId}/local-km-limits`, {
        method: "POST",
        body: JSON.stringify({
          vehicle_type_id: Number(localKmForm.vehicleType),
          loc_km_title: localKmForm.title,
          loc_km_hour: Number(localKmForm.hours || 0),
          loc_km_limit: Number(localKmForm.kmLimit || 0),
          status: 1,
        }),
      });
      setLocalKmOpen(false);
      setLocalKmForm({ vehicleType: "", title: "", hours: "", kmLimit: "" });
      await fetchData();
    } catch (e) {
      console.error("Failed to save local KM limit", e);
    } finally {
      setSaving(false);
    }
  };

  const handleOutKmSave = async () => {
    if (!vendorId || !outKmForm.vehicleType) return;
    setSaving(true);
    try {
      await api(`/vendors/${vendorId}/outstation-km-limits`, {
        method: "POST",
        body: JSON.stringify({
          vehicle_type_id: Number(outKmForm.vehicleType),
          out_km_title: outKmForm.title,
          out_km_limit: Number(outKmForm.kmLimit || 0),
          status: 1,
        }),
      });
      setOutKmOpen(false);
      setOutKmForm({ vehicleType: "", title: "", kmLimit: "" });
      await fetchData();
    } catch (e) {
      console.error("Failed to save outstation KM limit", e);
    } finally {
      setSaving(false);
    }
  };

  const groupedLocalRows = useMemo(() => {
    return localFormRows.reduce((acc: Record<string, any[]>, row: any) => {
      const k = `${row.vendor_branch_id}:${row.vendor_branch_name || ""}`;
      if (!acc[k]) acc[k] = [];
      acc[k].push(row);
      return acc;
    }, {});
  }, [localFormRows]);

  const groupedOutstationRows = useMemo(() => {
    return outstationFormRows.reduce((acc: Record<string, any[]>, row: any) => {
      const k = `${row.vendor_branch_id}:${row.vendor_branch_name || ""}`;
      if (!acc[k]) acc[k] = [];
      acc[k].push(row);
      return acc;
    }, {});
  }, [outstationFormRows]);

  const rowKey = (r: any, type: "local" | "out") =>
    type === "local"
      ? `${r.vendor_branch_id}:${r.vehicle_type_id}:${r.time_limit_id}`
      : `${r.vendor_branch_id}:${r.vehicle_type_id}:${r.kms_limit_id}`;

  const handleLocalPricebookUpdate = async () => {
    if (!vendorId) return;

    const rowsWithCharge = localFormRows
      .map((r) => ({ r, charge: localRentalByRow[rowKey(r, "local")]?.trim() ?? "" }))
      .filter((x) => x.charge !== "");

    if (!rowsWithCharge.length) return;
    if (!localStartDate || !localEndDate) return;

    setSaving(true);
    try {
      await api(`/vendors/${vendorId}/pricebook/local`, {
        method: "POST",
        body: JSON.stringify({
          vendor_id: rowsWithCharge.map((x) => x.r.vendor_id),
          vendor_branch_id: rowsWithCharge.map((x) => x.r.vendor_branch_id),
          vehicle_id: rowsWithCharge.map((x) => x.r.vehicle_id),
          time_limit_id: rowsWithCharge.map((x) => x.r.time_limit_id),
          vehicle_type_id: rowsWithCharge.map((x) => x.r.vehicle_type_id),
          vehicle_type_title: rowsWithCharge.map((x) => x.r.vehicle_type_title),
          vehicle_rental_charge: rowsWithCharge.map((x) => x.charge),
          local_pricebook_start_date: localStartDate,
          local_pricebook_end_date: localEndDate,
        }),
      });
      setLocalRentalByRow({});
      if (localStartDate && localEndDate) {
        const preview = (await api(
          `/vendors/${vendorId}/pricebook/local/preview?startDate=${encodeURIComponent(localStartDate)}&endDate=${encodeURIComponent(localEndDate)}`,
        )) as any;
        setLocalPreview(preview ?? { days: [], rows: [] });
      }
      await fetchData();
    } catch (e) {
      console.error("Failed to update local pricebook", e);
    } finally {
      setSaving(false);
    }
  };

  const handleOutstationPricebookUpdate = async () => {
    if (!vendorId) return;

    const rowsWithCharge = outstationFormRows
      .map((r) => ({ r, charge: outstationRentalByRow[rowKey(r, "out")]?.trim() ?? "" }))
      .filter((x) => x.charge !== "");

    if (!rowsWithCharge.length) return;
    if (!outstationStartDate || !outstationEndDate) return;

    setSaving(true);
    try {
      await api(`/vendors/${vendorId}/pricebook/outstation`, {
        method: "POST",
        body: JSON.stringify({
          vendor_id: rowsWithCharge.map((x) => x.r.vendor_id),
          vendor_branch_id: rowsWithCharge.map((x) => x.r.vendor_branch_id),
          vehicle_id: rowsWithCharge.map((x) => x.r.vehicle_id),
          kms_limit_id: rowsWithCharge.map((x) => x.r.kms_limit_id),
          vehicle_type_id: rowsWithCharge.map((x) => x.r.vehicle_type_id),
          vehicle_type_title: rowsWithCharge.map((x) => x.r.vehicle_type_title),
          outstation_vehicle_rental_charge: rowsWithCharge.map((x) => x.charge),
          outstation_pricebook_start_date: outstationStartDate,
          outstation_pricebook_end_date: outstationEndDate,
        }),
      });
      setOutstationRentalByRow({});
      await fetchData();
    } catch (e) {
      console.error("Failed to update outstation pricebook", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-pink-600">Vehicle Pricebook</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {!vendorId && (
            <p className="text-sm text-red-500">
              Save Basic Info first before editing pricebook.
            </p>
          )}

          {/* ========== Vendor Margin Details ========== */}
          <section className="rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                Vendor Margin Details
              </h2>
              <Button
                type="button"
                className={`${gradientButton} px-6`}
                disabled={!vendorId || saving}
                onClick={handleUpdateMargin}
              >
                {saving ? "Updating..." : "Update"}
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <Label>Vendor Margin %</Label>
                <Input
                  value={vendorMarginPercent}
                  onChange={(e) => setVendorMarginPercent(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label>Vendor Margin GST Type</Label>
                <Select
                  value={vendorMarginGstType}
                  onValueChange={setVendorMarginGstType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose GST Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {gstTypes.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Vendor Margin GST Percentage</Label>
                <Select
                  value={vendorMarginGstPercent}
                  onValueChange={setVendorMarginGstPercent}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose GST %" />
                  </SelectTrigger>
                  <SelectContent>
                    {gstPercentOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* ========== Driver Cost Details (PHP style) ========== */}
          <section className="rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                Driver Cost Details
              </h2>
              <Button
                type="button"
                className={`${gradientButton} px-6`}
                disabled={!vendorId || saving}
                onClick={handleUpdateDriverAndExtraCosts}
              >
                Update
              </Button>
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">
                      VEHICLE TYPE
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      DRIVER COST(₹)
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      FOOD COST(₹)
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      ACCOMMODATION COST(₹)
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      EXTRA COST(₹)
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      MORNING CHARGE(₹)
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      EVENING CHARGE(₹)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {driverCosts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-6 text-center text-sm text-gray-500"
                      >
                        No more records found.
                      </td>
                    </tr>
                  ) : (
                    editableDriverRows.map((dc, idx) => (
                      <tr key={dc.vendor_vehicle_type_ID ?? dc.vehicle_type_id}>
                        <td className="px-4 py-3 border-b border-gray-100">
                          {vehicleTypeOptions.find((o) => o.id === String(dc.vehicle_type_id))?.label || dc.vehicle_type_title || dc.vehicle_type_id}
                        </td>
                        <td className="px-2 py-2 border-b border-gray-100"><Input value={dc.driver_batta} onChange={(e) => setDriverCell(idx, "driver_batta", e.target.value)} /></td>
                        <td className="px-2 py-2 border-b border-gray-100"><Input value={dc.food_cost} onChange={(e) => setDriverCell(idx, "food_cost", e.target.value)} /></td>
                        <td className="px-2 py-2 border-b border-gray-100"><Input value={dc.accomodation_cost} onChange={(e) => setDriverCell(idx, "accomodation_cost", e.target.value)} /></td>
                        <td className="px-2 py-2 border-b border-gray-100"><Input value={dc.extra_cost} onChange={(e) => setDriverCell(idx, "extra_cost", e.target.value)} /></td>
                        <td className="px-2 py-2 border-b border-gray-100"><Input value={dc.driver_early_morning_charges} onChange={(e) => setDriverCell(idx, "driver_early_morning_charges", e.target.value)} /></td>
                        <td className="px-2 py-2 border-b border-gray-100"><Input value={dc.driver_evening_charges} onChange={(e) => setDriverCell(idx, "driver_evening_charges", e.target.value)} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* ========== Vehicle Extra Cost Details (PHP style rows by vehicle type) ========== */}
          <section className="rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                Vehicle Extra Cost Details
              </h2>
              <Button
                type="button"
                className={`${gradientButton} px-6`}
                disabled={!vendorId || saving}
                onClick={handleUpdateVehicleExtraCosts}
              >
                Update
              </Button>
            </div>

            {Object.entries(groupedExtraRows).length === 0 ? (
              <p className="text-sm text-gray-500">
                No vehicles found for this branch.
              </p>
            ) : (
              Object.entries(groupedExtraRows).map(([branchKey, rows], idx) => {
                const branchName = rows[0]?.vendor_branch_name || `Branch #${idx + 1}`;
                return (
                  <div key={branchKey} className="mb-5">
                    <p className="mb-3 text-[28px] leading-none text-pink-600">Branch #{idx + 1} - {branchName}</p>
                    <div className="space-y-3">
                      {rows.map((row: any) => {
                        const absoluteIndex = vehicleExtraRows.findIndex(
                          (r) =>
                            r.vendor_branch_id === row.vendor_branch_id &&
                            String(r.vehicle_type_id) === String(row.vehicle_type_id),
                        );

                        return (
                          <div key={`extra-${row.vendor_branch_id}-${row.vehicle_type_id}`} className="grid grid-cols-12 gap-3 items-end">
                            <div className="col-span-2">
                              <Label className="text-xs">Vehicle Type</Label>
                              <p className="text-purple-600">{row.vehicle_type_title}</p>
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">Extra KM Charge(₹)</Label>
                              <Input
                                value={row.extra_km_charge}
                                onChange={(e) => setExtraCell(absoluteIndex, "extra_km_charge", e.target.value)}
                              />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">Extra Hour Charge(₹)</Label>
                              <Input
                                value={row.extra_hour_charge}
                                onChange={(e) => setExtraCell(absoluteIndex, "extra_hour_charge", e.target.value)}
                              />
                            </div>
                            <div className="col-span-3">
                              <Label className="text-xs">Early Morning Charges (₹)(Before 6 AM)</Label>
                              <Input
                                value={row.early_morning_charges}
                                onChange={(e) => setExtraCell(absoluteIndex, "early_morning_charges", e.target.value)}
                              />
                            </div>
                            <div className="col-span-3">
                              <Label className="text-xs">Evening Charges (₹)(After 8 PM)</Label>
                              <Input
                                value={row.evening_charges}
                                onChange={(e) => setExtraCell(absoluteIndex, "evening_charges", e.target.value)}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </section>

          {/* ========== Local Pricebook (PHP parity) ========== */}
          <section className="rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                Vehicle Rental Cost Details | Local Pricebook
              </h2>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  className="bg-purple-100 px-6 text-sm font-semibold text-purple-700 hover:bg-purple-200"
                  onClick={() => setLocalKmOpen(true)}
                  disabled={!vendorId}
                >
                  + Add KM Limit
                </Button>
                <div className="hidden items-center gap-2 sm:flex">
                  <PricebookDatePicker
                    value={localStartDate}
                    onChange={setLocalStartDate}
                    placeholder="Start Date"
                  />
                  <PricebookDatePicker
                    value={localEndDate}
                    onChange={setLocalEndDate}
                    placeholder="End Date"
                  />
                </div>
                <Button
                  type="button"
                  className={`${gradientButton} px-6`}
                  disabled={!vendorId || saving}
                  onClick={handleLocalPricebookUpdate}
                >
                  Update
                </Button>
              </div>
            </div>

            {Object.entries(groupedLocalRows).length === 0 ? (
              <p className="text-sm text-gray-500">No local pricebook base rows found.</p>
            ) : (
              Object.entries(groupedLocalRows).map(([branchKey, rows], idx) => {
                const branchName = rows[0]?.vendor_branch_name || `Branch #${idx + 1}`;
                return (
                  <div key={branchKey} className="mb-6 rounded-lg border border-gray-200 p-4">
                    <p className="mb-3 text-base font-semibold text-pink-600">Branch #{idx + 1} - {branchName}</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      {rows.map((r: any) => {
                        const k = rowKey(r, "local");
                        return (
                          <div key={k} className="grid grid-cols-3 gap-3 rounded-md border border-gray-100 p-3">
                            <div>
                              <Label className="text-xs">Vehicle Type</Label>
                              <p className="text-sm text-purple-600">{r.vehicle_type_title}</p>
                            </div>
                            <div>
                              <Label className="text-xs">Local KM Limit</Label>
                              <p className="text-sm text-purple-600">{r.time_limit_title}</p>
                            </div>
                            <div>
                              <Label className="text-xs">Rental Charge(₹)</Label>
                              <Input
                                placeholder="Enter the Rental Charge"
                                value={localRentalByRow[k] ?? ""}
                                onChange={(e) =>
                                  setLocalRentalByRow((prev) => ({ ...prev, [k]: e.target.value }))
                                }
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}

            {localStartDate && localEndDate && (
              <div className="mt-5 overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Vehicle Type</th>
                      <th className="px-3 py-2 text-left">KM Limit</th>
                      {localPreview.days.map((d) => (
                        <th key={d.key} className="px-3 py-2 text-center whitespace-nowrap">{d.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {localPreview.rows.length === 0 ? (
                      <tr>
                        <td colSpan={Math.max(3, localPreview.days.length + 2)} className="px-4 py-4 text-center text-gray-500">
                          No data found
                        </td>
                      </tr>
                    ) : (
                      localPreview.rows.map((r, i) => (
                        <tr key={`${r.vehicle_type_title}-${r.time_limit_title}-${i}`}>
                          <td className="px-3 py-2 border-b border-gray-100 text-purple-600">{r.vehicle_type_title}</td>
                          <td className="px-3 py-2 border-b border-gray-100 text-purple-600">{r.time_limit_title}</td>
                          {r.prices.map((p, pi) => (
                            <td key={`${i}-${pi}`} className="px-3 py-2 border-b border-gray-100 text-center">
                              {p == null ? "No Price" : `INR ${p.toFixed(2)}`}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ========== Outstation Pricebook (PHP parity) ========== */}
          <section className="rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                Vehicle Rental Cost Details | Outstation Pricebook
              </h2>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  className="bg-purple-100 px-6 text-sm font-semibold text-purple-700 hover:bg-purple-200"
                  onClick={() => setOutKmOpen(true)}
                  disabled={!vendorId}
                >
                  + Add KM Limit
                </Button>
                <div className="hidden items-center gap-2 sm:flex">
                  <PricebookDatePicker
                    value={outstationStartDate}
                    onChange={setOutstationStartDate}
                    placeholder="Start Date"
                  />
                  <PricebookDatePicker
                    value={outstationEndDate}
                    onChange={setOutstationEndDate}
                    placeholder="End Date"
                  />
                </div>
                <Button
                  type="button"
                  className={`${gradientButton} px-6`}
                  disabled={!vendorId || saving}
                  onClick={handleOutstationPricebookUpdate}
                >
                  Update
                </Button>
              </div>
            </div>

            {Object.entries(groupedOutstationRows).length === 0 ? (
              <p className="text-sm text-gray-500">No outstation pricebook base rows found.</p>
            ) : (
              Object.entries(groupedOutstationRows).map(([branchKey, rows], idx) => {
                const branchName = rows[0]?.vendor_branch_name || `Branch #${idx + 1}`;
                return (
                  <div key={branchKey} className="mb-6 rounded-lg border border-gray-200 p-4">
                    <p className="mb-3 text-base font-semibold text-pink-600">Branch #{idx + 1} - {branchName}</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      {rows.map((r: any) => {
                        const k = rowKey(r, "out");
                        return (
                          <div key={k} className="grid grid-cols-3 gap-3 rounded-md border border-gray-100 p-3">
                            <div>
                              <Label className="text-xs">Vehicle Type</Label>
                              <p className="text-sm text-purple-600">{r.vehicle_type_title}</p>
                            </div>
                            <div>
                              <Label className="text-xs">Outstation KM Limit</Label>
                              <p className="text-sm text-purple-600">{r.kms_limit} KM</p>
                            </div>
                            <div>
                              <Label className="text-xs">Rental Charge(₹)</Label>
                              <Input
                                placeholder="Enter the Rental Charge"
                                value={outstationRentalByRow[k] ?? ""}
                                onChange={(e) =>
                                  setOutstationRentalByRow((prev) => ({ ...prev, [k]: e.target.value }))
                                }
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </section>

          {/* Wizard navigation */}
          <div className="mt-4 flex justify-between">
            <Button variant="outline" type="button" onClick={onBack}>
              Back
            </Button>
            <Button
              type="button"
              onClick={onFinish}
              disabled={!vendorId}
              className={gradientButton}
            >
              Save & Finish
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ========== Local KM Limit Modal ========== */}
      <Dialog open={localKmOpen} onOpenChange={setLocalKmOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Local KM Limit</DialogTitle>
          </DialogHeader>

          <div className="mt-2 space-y-4">
            <div className="space-y-1">
              <Label>
                Vehicle type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={localKmForm.vehicleType}
                onValueChange={(v) => handleLocalKmChange("vehicleType", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose Vehicle Type" />
                </SelectTrigger>
                <SelectContent>
                  {vehicleTypeOptions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Enter Title"
                value={localKmForm.title}
                onChange={(e) => handleLocalKmChange("title", e.target.value)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>
                  Hours <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Enter Hours"
                  value={localKmForm.hours}
                  onChange={(e) =>
                    handleLocalKmChange("hours", e.target.value)
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>
                  Kilometer(KM) <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="KM Limit"
                  value={localKmForm.kmLimit}
                  onChange={(e) =>
                    handleLocalKmChange("kmLimit", e.target.value)
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 flex justify-between">
            <Button
              type="button"
              variant="outline"
              className="px-6"
              onClick={() => setLocalKmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className={`${gradientButton} px-8`}
              onClick={handleLocalKmSave}
              disabled={!vendorId}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== Outstation KM Limit Modal ========== */}
      <Dialog open={outKmOpen} onOpenChange={setOutKmOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Update Outstation KM Limit</DialogTitle>
          </DialogHeader>

          <div className="mt-2 space-y-4">
            <div className="space-y-1">
              <Label>
                Vehicle type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={outKmForm.vehicleType}
                onValueChange={(v) => handleOutKmChange("vehicleType", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose Vehicle Type" />
                </SelectTrigger>
                <SelectContent>
                  {vehicleTypeOptions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>
                Outstation KM Limit Title{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Outstation KM Limit Title"
                value={outKmForm.title}
                onChange={(e) => handleOutKmChange("title", e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>
                Outstation KM Limit <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Outstation KM Limit"
                value={outKmForm.kmLimit}
                onChange={(e) =>
                  handleOutKmChange("kmLimit", e.target.value)
                }
              />
            </div>
          </div>

          <DialogFooter className="mt-4 flex justify-between">
            <Button
              type="button"
              variant="outline"
              className="px-6"
              onClick={() => setOutKmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className={`${gradientButton} px-8`}
              onClick={handleOutKmSave}
              disabled={!vendorId}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
