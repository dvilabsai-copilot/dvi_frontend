// FILE: src/pages/pricebook/PricebookExportPage.tsx

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { isValid, parseISO, format } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { ExportPricebookAPI, type MasterOption } from "@/services/exportPricebookService";
import { SharedDatePicker } from "@/components/SharedDatePicker";

const parseYmd = (value: string) => {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
};
const formatYmd = (date: Date) => format(date, "yyyy-MM-dd");

const tabs = [
  "Hotel Pricebook",
  "Amenities Pricebook",
  "Vehicle Pricebook",
  "Guide Pricebook",
  "Hotspot Pricebook",
  "Activity Pricebook",
  "Toll",
  "Parking",
];

const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function PricebookExportPage() {
  const [activeTab, setActiveTab] = useState(0);

  // masters
  const [stateOptions, setStateOptions] = useState<MasterOption[]>([]);
  const [cityOptions, setCityOptions] = useState<MasterOption[]>([]);
  const [vendorOptions, setVendorOptions] = useState<MasterOption[]>([]);
  const [branchOptions, setBranchOptions] = useState<MasterOption[]>([]);
  const [hotspotLocationOptions, setHotspotLocationOptions] = useState<MasterOption[]>([]);
  const [vehicleTypeOptions, setVehicleTypeOptions] = useState<MasterOption[]>([]);

  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [loadingHotspots, setLoadingHotspots] = useState(false);
  const [loadingVehicleTypes, setLoadingVehicleTypes] = useState(false);

  // form values (store ids/values)
  const [stateId, setStateId] = useState("");
  const [cityId, setCityId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [hotspotLocation, setHotspotLocation] = useState("");
  const [vehicleTypeId, setVehicleTypeId] = useState("");

  // toll list
  const [tollSearch, setTollSearch] = useState("");
  const [tollLoading, setTollLoading] = useState(false);
  const [tollRows, setTollRows] = useState<
    { id: number; sourceLocation: string; destinationLocation: string; vehicleTypeTitle: string; tollCharge: number }[]
  >([]);

  // parking list
  const [parkingLoading, setParkingLoading] = useState(false);
  const [parkingRows, setParkingRows] = useState<
    { id: string; hotspotName: string; vehicleTypeName: string; parkingCharge: number }[]
  >([]);

  // initial masters load
  useEffect(() => {
    (async () => {
      setLoadingStates(true);
      try {
        const states = await ExportPricebookAPI.getStates(101);
        setStateOptions(states);
      } catch (e: any) {
        setStateOptions([]);
        toast.error(e?.message || "Failed to load states");
      } finally {
        setLoadingStates(false);
      }
    })();

    (async () => {
      setLoadingVendors(true);
      try {
        const vendors = await ExportPricebookAPI.getVendors();
        setVendorOptions(vendors);
      } catch (e: any) {
        setVendorOptions([]);
        toast.error(e?.message || "Failed to load vendors");
      } finally {
        setLoadingVendors(false);
      }
    })();

    (async () => {
      setLoadingVehicleTypes(true);
      try {
        const vts = await ExportPricebookAPI.getVehicleTypes();
        setVehicleTypeOptions(vts);
      } catch (e: any) {
        setVehicleTypeOptions([]);
        toast.error(e?.message || "Failed to load vehicle types");
      } finally {
        setLoadingVehicleTypes(false);
      }
    })();

    (async () => {
      setLoadingHotspots(true);
      try {
        const locs = await ExportPricebookAPI.getHotspotLocations();
        setHotspotLocationOptions(locs);
      } catch (e: any) {
        setHotspotLocationOptions([]);
        toast.error(e?.message || "Failed to load hotspot locations");
      } finally {
        setLoadingHotspots(false);
      }
    })();
  }, []);

  // cities on state change
  useEffect(() => {
    if (!stateId) {
      setCityId("");
      setCityOptions([]);
      return;
    }

    (async () => {
      setLoadingCities(true);
      try {
        setCityId("");
        const cities = await ExportPricebookAPI.getCitiesByState(stateId);
        setCityOptions(cities);
      } catch (e: any) {
        setCityOptions([]);
        toast.error(e?.message || "Failed to load cities");
      } finally {
        setLoadingCities(false);
      }
    })();
  }, [stateId]);

  // branches on vendor change
  useEffect(() => {
    if (!vendorId) {
      setBranchId("");
      setBranchOptions([]);
      return;
    }

    (async () => {
      setLoadingBranches(true);
      try {
        setBranchId("");
        const branches = await ExportPricebookAPI.getVendorBranches(vendorId);
        setBranchOptions(branches);
      } catch (e: any) {
        setBranchOptions([]);
        toast.error(e?.message || "Failed to load vendor branches");
      } finally {
        setLoadingBranches(false);
      }
    })();
  }, [vendorId]);

  // toll list real API (tab 6)
  useEffect(() => {
    if (activeTab !== 6) return;

    if (!vehicleTypeId) {
      setTollRows([]);
      return;
    }

    (async () => {
      setTollLoading(true);
      try {
        const res = await ExportPricebookAPI.getTollPricebook({
          vehicleTypeId: Number(vehicleTypeId),
        });
        setTollRows(res.rows || []);
      } catch (e: any) {
        setTollRows([]);
        toast.error(e?.message || "Failed to load toll list");
      } finally {
        setTollLoading(false);
      }
    })();
  }, [activeTab, vehicleTypeId]);

  const filteredTollRows = useMemo(() => {
    const q = tollSearch.trim().toLowerCase();
    if (!q) return tollRows;
    return tollRows.filter((r) => {
      return (
        String(r.sourceLocation || "").toLowerCase().includes(q) ||
        String(r.destinationLocation || "").toLowerCase().includes(q) ||
        String(r.vehicleTypeTitle || "").toLowerCase().includes(q) ||
        String(r.tollCharge || "").toLowerCase().includes(q)
      );
    });
  }, [tollRows, tollSearch]);

  // parking list real API (tab 7)
  useEffect(() => {
    if (activeTab !== 7) return;

    if (!vehicleTypeId && !hotspotLocation) {
      setParkingRows([]);
      return;
    }

    (async () => {
      setParkingLoading(true);
      try {
        const res = await ExportPricebookAPI.getParkingPricebook({
          vehicleTypeId: vehicleTypeId ? Number(vehicleTypeId) : undefined,
          hotspotLocation: hotspotLocation || undefined,
        });
        setParkingRows(res.rows || []);
      } catch (e: any) {
        setParkingRows([]);
        toast.error(e?.message || "Failed to load parking list");
      } finally {
        setParkingLoading(false);
      }
    })();
  }, [activeTab, vehicleTypeId, hotspotLocation]);

  const renderOptions = (opts: MasterOption[]) => {
    if (!opts.length) return <div className="px-3 py-2 text-sm text-muted-foreground">No options</div>;
    return opts.map((o) => (
      <SelectItem key={o.id} value={o.id}>
        {o.label}
      </SelectItem>
    ));
  };

  const handleExport = async () => {
    try {
      if (activeTab === 0) {
        if (!stateId || !cityId || !startDate || !endDate) {
          toast.error("Please select State, City, Start Date and End Date.");
          return;
        }
        await ExportPricebookAPI.downloadHotelRoomExcel({
          stateId: Number(stateId),
          cityId: Number(cityId),
          startDate,
          endDate,
        });
        toast.success("Hotel Room Pricebook exported.");
        return;
      }

      if (activeTab === 1) {
        if (!stateId || !cityId || !month || !year) {
          toast.error("Please select State, City, Month and Year.");
          return;
        }
        await ExportPricebookAPI.downloadHotelAmenitiesExcel({
          stateId: Number(stateId),
          cityId: Number(cityId),
          month,
          year,
        });
        toast.success("Amenities Pricebook exported.");
        return;
      }

      if (activeTab === 2) {
        if (!vendorId || !branchId || !month || !year) {
          toast.error("Please select Vendor, Branch, Month and Year.");
          return;
        }
        await ExportPricebookAPI.downloadVehicleExcel({
          vendorId: Number(vendorId),
          vendorBranchId: Number(branchId),
          month,
          year,
        });
        toast.success("Vehicle Pricebook exported.");
        return;
      }

      if (activeTab === 3) {
        if (!month || !year) {
          toast.error("Please select Month and Year.");
          return;
        }
        await ExportPricebookAPI.downloadGuideExcel({ month, year });
        toast.success("Guide Pricebook exported.");
        return;
      }

      if (activeTab === 4) {
        if (!hotspotLocation) {
          toast.error("Please select Hotspot Location.");
          return;
        }
        await ExportPricebookAPI.downloadHotspotExcel({ hotspotLocation });
        toast.success("Hotspot Pricebook exported.");
        return;
      }

      if (activeTab === 5) {
        if (!month || !year) {
          toast.error("Please select Month and Year.");
          return;
        }
        await ExportPricebookAPI.downloadActivityExcel({ month, year });
        toast.success("Activity Pricebook exported.");
        return;
      }

      if (activeTab === 6) {
        if (!vehicleTypeId) {
          toast.error("Please select Vehicle Type.");
          return;
        }
        await ExportPricebookAPI.downloadTollExcel({ vehicleTypeId: Number(vehicleTypeId) });
        toast.success("Toll Pricebook exported.");
        return;
      }

      if (activeTab === 7) {
        if (!vehicleTypeId || !hotspotLocation) {
          toast.error("Please select Vehicle Type and Hotspot Location.");
          return;
        }
        await ExportPricebookAPI.downloadParkingExcel({
          vehicleTypeId: Number(vehicleTypeId),
          hotspotLocation,
        });
        toast.success("Parking Pricebook exported.");
        return;
      }
    } catch (e: any) {
      toast.error(e?.message || "Export failed");
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[180px]">
              <Label className="text-sm text-muted-foreground">State <span className="text-red-500">*</span></Label>
              <Select value={stateId} onValueChange={setStateId} disabled={loadingStates}>
                <SelectTrigger className="mt-1 bg-background">
                  <SelectValue placeholder={loadingStates ? "Loading..." : "Choose State"} />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">{renderOptions(stateOptions)}</SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[180px]">
              <Label className="text-sm text-muted-foreground">City <span className="text-red-500">*</span></Label>
              <Select value={cityId} onValueChange={setCityId} disabled={!stateId || loadingCities}>
                <SelectTrigger className="mt-1 bg-background">
                  <SelectValue placeholder={!stateId ? "Select State first" : loadingCities ? "Loading..." : "Choose City"} />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">{renderOptions(cityOptions)}</SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[140px]">
              <Label className="text-sm text-muted-foreground">Start Date <span className="text-red-500">*</span></Label>
              <SharedDatePicker
                label="Start Date"
                value={startDate}
                placeholder="Start Date"
                triggerClassName="mt-1 h-10 w-full"
                parseValue={parseYmd}
                formatValue={formatYmd}
                onChange={(value) => {
                  setStartDate(value);
                  if (endDate && endDate < value) setEndDate("");
                }}
              />
            </div>

            <div className="flex-1 min-w-[140px]">
              <Label className="text-sm text-muted-foreground">End Date <span className="text-red-500">*</span></Label>
              <SharedDatePicker
                label="End Date"
                value={endDate}
                placeholder="End Date"
                minDate={parseYmd(startDate)}
                defaultMonth={parseYmd(startDate)}
                triggerClassName="mt-1 h-10 w-full"
                parseValue={parseYmd}
                formatValue={formatYmd}
                onChange={setEndDate}
              />
            </div>

            <Button onClick={handleExport} variant="outline" className="border-emerald-500 text-emerald-600 hover:bg-emerald-50">
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
          </div>
        );

      case 1:
        return (
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[180px]">
              <Label className="text-sm text-muted-foreground">State <span className="text-red-500">*</span></Label>
              <Select value={stateId} onValueChange={setStateId} disabled={loadingStates}>
                <SelectTrigger className="mt-1 bg-background">
                  <SelectValue placeholder={loadingStates ? "Loading..." : "Choose State"} />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">{renderOptions(stateOptions)}</SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[180px]">
              <Label className="text-sm text-muted-foreground">City <span className="text-red-500">*</span></Label>
              <Select value={cityId} onValueChange={setCityId} disabled={!stateId || loadingCities}>
                <SelectTrigger className="mt-1 bg-background">
                  <SelectValue placeholder={!stateId ? "Select State first" : loadingCities ? "Loading..." : "Choose City"} />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">{renderOptions(cityOptions)}</SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[140px]">
              <Label className="text-sm text-muted-foreground">Month <span className="text-red-500">*</span></Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="mt-1 bg-background"><SelectValue placeholder="Choose Any One" /></SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {months.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[120px]">
              <Label className="text-sm text-muted-foreground">Year <span className="text-red-500">*</span></Label>
              <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="mt-1" placeholder="Year" min="2019" max="2035" />
            </div>

            <Button onClick={handleExport} variant="outline" className="border-emerald-500 text-emerald-600 hover:bg-emerald-50">
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
          </div>
        );

      case 2:
        return (
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[180px]">
              <Label className="text-sm text-muted-foreground">Vendor Name <span className="text-red-500">*</span></Label>
              <Select value={vendorId} onValueChange={setVendorId} disabled={loadingVendors}>
                <SelectTrigger className="mt-1 bg-background">
                  <SelectValue placeholder={loadingVendors ? "Loading..." : "Choose Vendor"} />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">{renderOptions(vendorOptions)}</SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[180px]">
              <Label className="text-sm text-muted-foreground">Vendor Branch <span className="text-red-500">*</span></Label>
              <Select value={branchId} onValueChange={setBranchId} disabled={!vendorId || loadingBranches}>
                <SelectTrigger className="mt-1 bg-background">
                  <SelectValue placeholder={!vendorId ? "Select Vendor first" : loadingBranches ? "Loading..." : "Choose Vendor Branch"} />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">{renderOptions(branchOptions)}</SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[140px]">
              <Label className="text-sm text-muted-foreground">Month <span className="text-red-500">*</span></Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="mt-1 bg-background"><SelectValue placeholder="Choose Month" /></SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {months.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[120px]">
              <Label className="text-sm text-muted-foreground">Year <span className="text-red-500">*</span></Label>
              <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="mt-1" placeholder="Year" min="2019" max="2035" />
            </div>

            <Button onClick={handleExport} variant="outline" className="border-emerald-500 text-emerald-600 hover:bg-emerald-50">
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
          </div>
        );

      case 3:
        return (
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[180px] max-w-[250px]">
              <Label className="text-sm text-muted-foreground">Month <span className="text-red-500">*</span></Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="mt-1 bg-background"><SelectValue placeholder="Choose Any One" /></SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {months.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[140px] max-w-[200px]">
              <Label className="text-sm text-muted-foreground">Year <span className="text-red-500">*</span></Label>
              <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="mt-1" placeholder="Year" min="2019" max="2035" />
            </div>

            <Button onClick={handleExport} variant="outline" className="border-emerald-500 text-emerald-600 hover:bg-emerald-50">
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
          </div>
        );

      case 4:
        return (
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[280px] max-w-[420px]">
              <Label className="text-sm text-muted-foreground">Hotspot Location <span className="text-red-500">*</span></Label>
              <Select value={hotspotLocation} onValueChange={setHotspotLocation} disabled={loadingHotspots}>
                <SelectTrigger className="mt-1 bg-background">
                  <SelectValue placeholder={loadingHotspots ? "Loading..." : "Choose Location"} />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">{renderOptions(hotspotLocationOptions)}</SelectContent>
              </Select>
            </div>

            <Button onClick={handleExport} variant="outline" className="border-emerald-500 text-emerald-600 hover:bg-emerald-50">
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
          </div>
        );

      case 5:
        return (
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[180px] max-w-[250px]">
              <Label className="text-sm text-muted-foreground">Month <span className="text-red-500">*</span></Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="mt-1 bg-background"><SelectValue placeholder="Choose Month" /></SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {months.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[140px] max-w-[200px]">
              <Label className="text-sm text-muted-foreground">Year <span className="text-red-500">*</span></Label>
              <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="mt-1" placeholder="Year" min="2019" max="2035" />
            </div>

            <Button onClick={handleExport} variant="outline" className="border-emerald-500 text-emerald-600 hover:bg-emerald-50">
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[180px] max-w-[280px]">
                <Label className="text-sm text-muted-foreground">Vehicle Type <span className="text-red-500">*</span></Label>
                <Select value={vehicleTypeId} onValueChange={setVehicleTypeId} disabled={loadingVehicleTypes}>
                  <SelectTrigger className="mt-1 bg-background">
                    <SelectValue placeholder={loadingVehicleTypes ? "Loading..." : "Choose Vehicle Type"} />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">{renderOptions(vehicleTypeOptions)}</SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleExport}
                variant="outline"
                className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                disabled={!vehicleTypeId}
              >
                <Download className="h-4 w-4 mr-2" /> Export
              </Button>
            </div>

            {!!vehicleTypeId && (
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-foreground">Toll Price List</h3>
                    <Input
                      placeholder="Search..."
                      className="w-48"
                      value={tollSearch}
                      onChange={(e) => setTollSearch(e.target.value)}
                    />
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-semibold">S.No</TableHead>
                          <TableHead className="font-semibold">Source Location</TableHead>
                          <TableHead className="font-semibold">Destination Location</TableHead>
                          <TableHead className="font-semibold">Vehicle Type</TableHead>
                          <TableHead className="font-semibold">Toll Charge</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tollLoading ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">Loading...</TableCell>
                          </TableRow>
                        ) : filteredTollRows.length ? (
                          filteredTollRows.map((row, idx) => (
                            <TableRow key={row.id}>
                              <TableCell>{idx + 1}</TableCell>
                              <TableCell>{row.sourceLocation}</TableCell>
                              <TableCell>{row.destinationLocation}</TableCell>
                              <TableCell>{row.vehicleTypeTitle}</TableCell>
                              <TableCell>₹{row.tollCharge}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">No data</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                    <span>Showing 1 to {filteredTollRows.length} of {filteredTollRows.length} entries</span>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" disabled>Previous</Button>
                      <Button variant="default" size="sm" className="bg-primary" disabled>1</Button>
                      <Button variant="outline" size="sm" disabled>Next</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[180px] max-w-[280px]">
                <Label className="text-sm text-muted-foreground">Vehicle Type <span className="text-red-500">*</span></Label>
                <Select value={vehicleTypeId} onValueChange={setVehicleTypeId} disabled={loadingVehicleTypes}>
                  <SelectTrigger className="mt-1 bg-background">
                    <SelectValue placeholder={loadingVehicleTypes ? "Loading..." : "Choose Vehicle Type"} />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">{renderOptions(vehicleTypeOptions)}</SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[200px] max-w-[420px]">
                <Label className="text-sm text-muted-foreground">Hotspot Location <span className="text-red-500">*</span></Label>
                <Select value={hotspotLocation} onValueChange={setHotspotLocation} disabled={loadingHotspots}>
                  <SelectTrigger className="mt-1 bg-background">
                    <SelectValue placeholder={loadingHotspots ? "Loading..." : "Choose Location"} />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">{renderOptions(hotspotLocationOptions)}</SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleExport}
                variant="outline"
                className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                disabled={!vehicleTypeId || !hotspotLocation}
              >
                <Download className="h-4 w-4 mr-2" /> Export
              </Button>
            </div>

            {(vehicleTypeId || hotspotLocation) && (
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-foreground">Parking Price List</h3>
                    <div className="text-sm text-muted-foreground">
                      {parkingLoading ? "Loading..." : `Total: ${parkingRows.length}`}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-semibold">S.No</TableHead>
                          <TableHead className="font-semibold">Hotspot Name</TableHead>
                          <TableHead className="font-semibold">Vehicle Type</TableHead>
                          <TableHead className="font-semibold">Parking Charge</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parkingLoading ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">Loading...</TableCell>
                          </TableRow>
                        ) : parkingRows.length ? (
                          parkingRows.map((r, idx) => (
                            <TableRow key={r.id}>
                              <TableCell>{idx + 1}</TableCell>
                              <TableCell>{r.hotspotName}</TableCell>
                              <TableCell>{r.vehicleTypeName}</TableCell>
                              <TableCell>₹{r.parkingCharge}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">No data</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f0fa] p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Export Price Details</h1>
        <div className="text-sm text-muted-foreground">Dashboard &gt; Export Price Details</div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="flex flex-wrap border-b border-border">
            {tabs.map((tab, idx) => (
              <button
                key={tab}
                onClick={() => setActiveTab(idx)}
                className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                  activeTab === idx ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
                {activeTab === idx && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
              </button>
            ))}
          </div>

          <div className="p-6">{renderTabContent()}</div>
        </CardContent>
      </Card>

      <div className="mt-8 text-center text-sm text-muted-foreground">DVI Holidays @ 2025</div>
    </div>
  );
}
