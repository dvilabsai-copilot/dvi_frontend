// FILE: src/pages/vendor/steps/VendorStepBranch.tsx
// REPLACE-WHOLE-FILE

import React, { useEffect, useState } from "react";
import { BranchForm, Option } from "../vendorFormTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

type Props = {
  branches: BranchForm[];
  setBranches: React.Dispatch<React.SetStateAction<BranchForm[]>>;
  countryOptions: Option[];
  gstTypeOptions: Option[];
  gstPercentOptions: Option[];
  saving: boolean;
  fieldErrors?: Record<number, Partial<Record<keyof BranchForm, string>>>;
  onClearFieldError?: (index: number, field: keyof BranchForm) => void;
  onBack: () => void;
  onSaveAndNext: () => void;
  onDeleteBranch: (index: number) => void;
};

type BranchDropdownState = {
  states: Option[];
  cities: Option[];
};

export const VendorStepBranch: React.FC<Props> = ({
  branches,
  setBranches,
  countryOptions,
  gstTypeOptions,
  gstPercentOptions,
  saving,
  fieldErrors = {},
  onClearFieldError,
  onBack,
  onSaveAndNext,
  onDeleteBranch,
}) => {
  const inputErrorClass = "border-red-400 focus-visible:ring-red-300";

  const [dropdowns, setDropdowns] = useState<Record<number, BranchDropdownState>>(
    {}
  );

  const ensureDropdownState = (index: number) => {
    if (!dropdowns[index]) {
      setDropdowns((prev) => ({
        ...prev,
        [index]: { states: [], cities: [] },
      }));
    }
  };

  const loadStates = async (index: number, countryId: string) => {
    ensureDropdownState(index);
    if (!countryId) return;
    try {
      const states = await api(`/dropdowns/states?countryId=${countryId}`);
      const options: Option[] = (states || []).map((s: any) => ({
        id: String(s.id ?? s.state_id),
        label: s.label ?? s.name ?? s.state_name ?? "",
      }));
      setDropdowns((prev) => ({
        ...prev,
        [index]: { ...(prev[index] || { cities: [] }), states: options },
      }));
    } catch (e) {
      console.error("Failed to load branch states", e);
    }
  };

  const loadCities = async (index: number, stateId: string) => {
    ensureDropdownState(index);
    if (!stateId) return;
    try {
      const cities = await api(`/dropdowns/cities?stateId=${stateId}`);
      const options: Option[] = (cities || []).map((c: any) => ({
        id: String(c.id ?? c.city_id),
        label: c.label ?? c.name ?? c.city_name ?? "",
      }));
      setDropdowns((prev) => ({
        ...prev,
        [index]: { ...(prev[index] || { states: [] }), cities: options },
      }));
    } catch (e) {
      console.error("Failed to load branch cities", e);
    }
  };

  const updateBranch = (index: number, patch: Partial<BranchForm>) => {
    setBranches((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  };

  useEffect(() => {
    branches.forEach((b, index) => {
      if (b.countryId && !(dropdowns[index]?.states?.length)) {
        void loadStates(index, b.countryId);
      }
      if (b.stateId && !(dropdowns[index]?.cities?.length)) {
        void loadCities(index, b.stateId);
      }
    });
  }, [branches]);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-pink-600">Branch Details</CardTitle>
        <Button
          type="button"
          onClick={() =>
            setBranches((prev) => [
              ...prev,
              {
                name: "",
                location: "",
                email: "",
                primaryMobile: "",
                altMobile: "",
                countryId: "",
                stateId: "",
                cityId: "",
                pincode: "",
                gstType: "included",
                gstPercent: "",
                address: "",
              },
            ])
          }
        >
          + Add Branch
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {branches.map((b, idx) => {
          const dd = dropdowns[idx] || { states: [], cities: [] };
          const e = fieldErrors[idx] || {};
          return (
            <div
              key={idx}
              className="rounded-lg border border-gray-200 p-4 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-purple-700">
                  Branch #{idx + 1}
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-500 hover:text-red-600"
                  onClick={() => onDeleteBranch(idx)}
                >
                  ✕ Delete
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <Label>Branch Name *</Label>
                  <Input
                    className={e.name ? inputErrorClass : ""}
                    value={b.name}
                    onChange={(event) => {
                      updateBranch(idx, { name: event.target.value });
                      onClearFieldError?.(idx, "name");
                    }}
                    placeholder="Branch Name"
                  />
                  {e.name ? <p className="text-xs text-red-600">{e.name}</p> : null}
                </div>
                <div>
                  <Label>Branch Location *</Label>
                  <Input
                    className={e.location ? inputErrorClass : ""}
                    value={b.location}
                    onChange={(event) => {
                      updateBranch(idx, { location: event.target.value });
                      onClearFieldError?.(idx, "location");
                    }}
                    placeholder="Branch Location"
                  />
                  {e.location ? <p className="text-xs text-red-600">{e.location}</p> : null}
                </div>
                <div>
                  <Label>Email ID *</Label>
                  <Input
                    className={e.email ? inputErrorClass : ""}
                    value={b.email}
                    onChange={(event) => {
                      updateBranch(idx, { email: event.target.value });
                      onClearFieldError?.(idx, "email");
                    }}
                    placeholder="Email ID"
                  />
                  {e.email ? <p className="text-xs text-red-600">{e.email}</p> : null}
                </div>
                <div>
                  <Label>Primary Mobile Number *</Label>
                  <Input
                    className={e.primaryMobile ? inputErrorClass : ""}
                    value={b.primaryMobile}
                    onChange={(event) => {
                      updateBranch(idx, { primaryMobile: event.target.value });
                      onClearFieldError?.(idx, "primaryMobile");
                    }}
                    placeholder="Primary Mobile Number"
                  />
                  {e.primaryMobile ? <p className="text-xs text-red-600">{e.primaryMobile}</p> : null}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <Label>Alternative Mobile Number *</Label>
                  <Input
                    className={e.altMobile ? inputErrorClass : ""}
                    value={b.altMobile}
                    onChange={(event) => {
                      updateBranch(idx, { altMobile: event.target.value });
                      onClearFieldError?.(idx, "altMobile");
                    }}
                    placeholder="Alternative Mobile Number"
                  />
                  {e.altMobile ? <p className="text-xs text-red-600">{e.altMobile}</p> : null}
                </div>
                <div>
                  <Label>Country *</Label>
                  <Select
                    value={b.countryId}
                    onValueChange={(val) => {
                      updateBranch(idx, {
                        countryId: val,
                        stateId: "",
                        cityId: "",
                      });
                      loadStates(idx, val);
                      onClearFieldError?.(idx, "countryId");
                    }}
                  >
                    <SelectTrigger className={e.countryId ? inputErrorClass : ""}>
                      <SelectValue placeholder="Choose Country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countryOptions.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {e.countryId ? <p className="text-xs text-red-600">{e.countryId}</p> : null}
                </div>
                <div>
                  <Label>State *</Label>
                  <Select
                    value={b.stateId}
                    onValueChange={(val) => {
                      updateBranch(idx, { stateId: val, cityId: "" });
                      loadCities(idx, val);
                      onClearFieldError?.(idx, "stateId");
                    }}
                  >
                    <SelectTrigger className={e.stateId ? inputErrorClass : ""}>
                      <SelectValue placeholder="Choose State" />
                    </SelectTrigger>
                    <SelectContent>
                      {dd.states.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {e.stateId ? <p className="text-xs text-red-600">{e.stateId}</p> : null}
                </div>
                <div>
                  <Label>City *</Label>
                  <Select
                    value={b.cityId}
                    onValueChange={(val) => {
                      updateBranch(idx, { cityId: val });
                      onClearFieldError?.(idx, "cityId");
                    }}
                  >
                    <SelectTrigger className={e.cityId ? inputErrorClass : ""}>
                      <SelectValue placeholder="Choose City" />
                    </SelectTrigger>
                    <SelectContent>
                      {dd.cities.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {e.cityId ? <p className="text-xs text-red-600">{e.cityId}</p> : null}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <Label>Pincode *</Label>
                  <Input
                    className={e.pincode ? inputErrorClass : ""}
                    value={b.pincode}
                    onChange={(event) => {
                      updateBranch(idx, { pincode: event.target.value });
                      onClearFieldError?.(idx, "pincode");
                    }}
                    placeholder="Pincode"
                  />
                  {e.pincode ? <p className="text-xs text-red-600">{e.pincode}</p> : null}
                </div>
                <div>
                  <Label>GST Type *</Label>
                  <Select
                    value={b.gstType}
                    onValueChange={(val) => {
                      updateBranch(idx, { gstType: val });
                      onClearFieldError?.(idx, "gstType");
                    }}
                  >
                    <SelectTrigger className={e.gstType ? inputErrorClass : ""}>
                      <SelectValue placeholder="Included / Excluded" />
                    </SelectTrigger>
                    <SelectContent>
                      {gstTypeOptions.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {e.gstType ? <p className="text-xs text-red-600">{e.gstType}</p> : null}
                </div>
                <div>
                  <Label>GST% *</Label>
                  <Select
                    value={b.gstPercent}
                    onValueChange={(val) => {
                      updateBranch(idx, { gstPercent: val });
                      onClearFieldError?.(idx, "gstPercent");
                    }}
                  >
                    <SelectTrigger className={e.gstPercent ? inputErrorClass : ""}>
                      <SelectValue placeholder="GST%" />
                    </SelectTrigger>
                    <SelectContent>
                      {gstPercentOptions.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {e.gstPercent ? <p className="text-xs text-red-600">{e.gstPercent}</p> : null}
                </div>
                <div>
                  <Label>Address *</Label>
                  <Input
                    className={e.address ? inputErrorClass : ""}
                    value={b.address}
                    onChange={(event) => {
                      updateBranch(idx, { address: event.target.value });
                      onClearFieldError?.(idx, "address");
                    }}
                    placeholder="Address"
                  />
                  {e.address ? <p className="text-xs text-red-600">{e.address}</p> : null}
                </div>
              </div>
            </div>
          );
        })}

        <div className="mt-6 flex justify-between">
          <Button variant="outline" type="button" onClick={onBack}>
            Back
          </Button>
          <Button type="button" onClick={onSaveAndNext} disabled={saving}>
            Save &amp; Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
