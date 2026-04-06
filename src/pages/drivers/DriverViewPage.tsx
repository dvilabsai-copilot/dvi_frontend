import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  fetchDriverLookups,
  getDriver,
  type DriverBasicInfo,
  type DriverCostDetails,
  type DriverDocument,
  type DriverReview,
  type Option,
} from "@/services/drivers";

type DriverViewState = {
  basicInfo: DriverBasicInfo;
  costDetails: DriverCostDetails;
  documents: DriverDocument[];
  reviews: DriverReview[];
  renewalHistory: Array<{
    id: string | number;
    licenseNumber?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
  }>;
};

const emptyBasic: DriverBasicInfo = {
  vendorId: "",
  vehicleTypeId: "",
  driverName: "",
  primaryMobile: "",
  alternativeMobile: "",
  whatsappMobile: "",
  email: "",
  licenseNumber: "",
  licenseIssueDate: "",
  licenseExpireDate: "",
  dateOfBirth: "",
  bloodGroup: "",
  gender: "",
  aadharNumber: "",
  panNumber: "",
  voterId: "",
  address: "",
  profileFile: null,
  profileUrl: "",
};

const emptyCost: DriverCostDetails = {
  driverSalary: "",
  foodCost: "",
  accommodationCost: "",
  bhattaCost: "",
  earlyMorningCharges: "",
  eveningCharges: "",
};

function val(x: any) {
  if (x === undefined || x === null || x === "") return "--";
  return String(x);
}

function formatDate(x: any) {
  if (!x) return "--";
  const d = new Date(x);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleDateString("en-GB");
}

function findLabel(list: Option[], id: any) {
  const s = String(id ?? "");
  const found = list.find((o) => String(o.id) === s);
  return found?.label || "--";
}

export default function DriverViewPage() {
  const nav = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [vendors, setVendors] = useState<Option[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<Option[]>([]);

  const [data, setData] = useState<DriverViewState>({
    basicInfo: emptyBasic,
    costDetails: emptyCost,
    documents: [],
    reviews: [],
    renewalHistory: [],
  });

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!id) {
        setError("Driver ID is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const [lookups, driver] = await Promise.all([
          fetchDriverLookups(),
          getDriver(id),
        ]);

        if (!mounted) return;

        setVendors(lookups.vendors || []);
        setVehicleTypes(lookups.vehicleTypes || []);

        const rawDriver: any = driver;
        const renewalHistoryRaw =
          rawDriver?.licenseRenewalHistory ||
          rawDriver?.renewalHistory ||
          rawDriver?.licenseRenewals ||
          [];

        setData({
          basicInfo: { ...emptyBasic, ...(driver.basicInfo || {}) },
          costDetails: { ...emptyCost, ...(driver.costDetails || {}) },
          documents: driver.documents || [],
          reviews: driver.reviews || [],
          renewalHistory: Array.isArray(renewalHistoryRaw)
            ? renewalHistoryRaw.map((row: any, idx: number) => ({
                id: row?.id ?? row?.driver_license_renewal_log_ID ?? idx,
                licenseNumber: row?.licenseNumber ?? row?.license_number,
                startDate: row?.startDate ?? row?.start_date,
                endDate: row?.endDate ?? row?.end_date,
                status: row?.status,
              }))
            : [],
        });
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load driver details.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const titleVendor = useMemo(
    () => findLabel(vendors, data.basicInfo.vendorId),
    [vendors, data.basicInfo.vendorId]
  );

  const titleVehicle = useMemo(
    () =>
      data.basicInfo.vehicleTypeId
        ? findLabel(vehicleTypes, data.basicInfo.vehicleTypeId)
        : "No Vehicle Found !!!",
    [vehicleTypes, data.basicInfo.vehicleTypeId]
  );

  const driverTitle = useMemo(() => {
    const basic = data.basicInfo as any;
    const code = basic?.driverCode || basic?.driver_code;
    if (data.basicInfo.driverName && code) {
      return `${data.basicInfo.driverName} - ${code}`;
    }
    return data.basicInfo.driverName || "View Driver";
  }, [data.basicInfo]);

  const currentStatus = useMemo(() => {
    const basic = data.basicInfo as any;
    const statusRaw = basic?.status;
    if (statusRaw === true || statusRaw === 1 || statusRaw === "1") return "Active";
    if (statusRaw === false || statusRaw === 0 || statusRaw === "0") return "In-Active";
    if (typeof statusRaw === "string" && statusRaw.trim()) return statusRaw;
    return "--";
  }, [data.basicInfo]);

  const gstType = useMemo(() => {
    const cost: any = data.costDetails;
    return cost?.gstType || cost?.driverGstType || cost?.driver_gst_type || "--";
  }, [data.costDetails]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-xl font-semibold text-slate-800">View Driver</div>
        <div className="mt-2 text-sm text-slate-500">Loading driver details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-xl font-semibold text-slate-800">View Driver</div>
        <div className="mt-2 text-sm text-red-600">{error}</div>
        <div className="mt-4">
          <Button type="button" variant="secondary" onClick={() => nav("/driver")}>
            Back to Drivers
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">{driverTitle}</h1>
          <p className="text-sm text-slate-500 mt-1">Driver Preview</p>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={() => nav("/driver")}>Back</Button>
          <Button type="button" onClick={() => nav(`/driver/${id}/edit`)}>Edit Driver</Button>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-3 border-b bg-slate-50">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="px-3 py-1.5 text-sm font-medium rounded-md bg-white border">Basic Info</button>
            <button type="button" className="px-3 py-1.5 text-sm text-slate-600 rounded-md bg-white border">Cost</button>
            <button type="button" className="px-3 py-1.5 text-sm text-slate-600 rounded-md bg-white border">Uploaded Docs</button>
            <button type="button" className="px-3 py-1.5 text-sm text-slate-600 rounded-md bg-white border">License Renewal History</button>
            <button type="button" className="px-3 py-1.5 text-sm text-slate-600 rounded-md bg-white border">Feedback & Review</button>
          </div>
        </CardContent>
        <CardContent className="p-6">
          <div className="text-2xl font-semibold text-sky-700 mb-6">Basic Info</div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-x-10 gap-y-7 text-sm">
            {data.basicInfo.profileUrl ? (
              <div>
                <div className="text-gray-500">Profile</div>
                <img
                  src={data.basicInfo.profileUrl}
                  alt="Driver profile"
                  className="mt-2 h-24 w-24 rounded-full object-cover border"
                />
              </div>
            ) : null}

            <div>
              <div className="text-gray-500">Vendor Name</div>
              <div className="text-gray-800 mt-1">{titleVendor}</div>
            </div>

            <div>
              <div className="text-gray-500">Vehicle Type</div>
              <div className="text-gray-800 mt-1">{titleVehicle}</div>
            </div>

            <div>
              <div className="text-gray-500">Driver Name</div>
              <div className="text-gray-800 mt-1">{val(data.basicInfo.driverName)}</div>
            </div>

            <div>
              <div className="text-gray-500">Date Of Birth</div>
              <div className="text-gray-800 mt-1">{formatDate(data.basicInfo.dateOfBirth)}</div>
            </div>

            <div>
              <div className="text-gray-500">Blood Group</div>
              <div className="text-gray-800 mt-1">{val(data.basicInfo.bloodGroup)}</div>
            </div>

            <div>
              <div className="text-gray-500">Gender</div>
              <div className="text-gray-800 mt-1">{val(data.basicInfo.gender)}</div>
            </div>

            <div>
              <div className="text-gray-500">Primary Mobile Number</div>
              <div className="text-gray-800 mt-1">{val(data.basicInfo.primaryMobile)}</div>
            </div>

            <div>
              <div className="text-gray-500">Alternative Mobile Number</div>
              <div className="text-gray-800 mt-1">{val(data.basicInfo.alternativeMobile)}</div>
            </div>

            <div>
              <div className="text-gray-500">Whatsapp Mobile Number</div>
              <div className="text-gray-800 mt-1">{val(data.basicInfo.whatsappMobile)}</div>
            </div>

            <div>
              <div className="text-gray-500">Email Id</div>
              <div className="text-gray-800 mt-1">{val(data.basicInfo.email)}</div>
            </div>

            <div>
              <div className="text-gray-500">Aadharcard Number</div>
              <div className="text-gray-800 mt-1">{val(data.basicInfo.aadharNumber)}</div>
            </div>

            <div>
              <div className="text-gray-500">Pan Card</div>
              <div className="text-gray-800 mt-1">{val(data.basicInfo.panNumber)}</div>
            </div>

            <div>
              <div className="text-gray-500">Voter Id</div>
              <div className="text-gray-800 mt-1">{val(data.basicInfo.voterId)}</div>
            </div>

            <div>
              <div className="text-gray-500">License Number</div>
              <div className="text-gray-800 mt-1">{val(data.basicInfo.licenseNumber)}</div>
            </div>

            <div>
              <div className="text-gray-500">License Issue Date</div>
              <div className="text-gray-800 mt-1">{formatDate(data.basicInfo.licenseIssueDate)}</div>
            </div>

            <div>
              <div className="text-gray-500">License Expire Date</div>
              <div className="text-gray-800 mt-1">{formatDate(data.basicInfo.licenseExpireDate)}</div>
            </div>

            <div>
              <div className="text-gray-500">License Address</div>
              <div className="text-gray-800 mt-1">{val(data.basicInfo.address)}</div>
            </div>

            <div>
              <div className="text-gray-500">Status</div>
              <div className="mt-1">
                <span
                  className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                    currentStatus === "Active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {currentStatus}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-10 text-2xl font-semibold text-sky-700">Cost</div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-x-10 gap-y-6 text-sm mt-4">
            <div>
              <div className="text-gray-500">Driver Salary</div>
              <div className="mt-1">{val(data.costDetails.driverSalary)}</div>
            </div>
            <div>
              <div className="text-gray-500">Food Cost</div>
              <div className="mt-1">{val(data.costDetails.foodCost)}</div>
            </div>
            <div>
              <div className="text-gray-500">Accommodation Cost</div>
              <div className="mt-1">{val(data.costDetails.accommodationCost)}</div>
            </div>
            <div>
              <div className="text-gray-500">Bhatta Cost</div>
              <div className="mt-1">{val(data.costDetails.bhattaCost)}</div>
            </div>
            <div>
              <div className="text-gray-500">GST Type</div>
              <div className="mt-1">{val(gstType)}</div>
            </div>
            <div>
              <div className="text-gray-500">Evening Charges (After 6 PM)</div>
              <div className="mt-1">{val(data.costDetails.eveningCharges)}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-gray-500">Early Morning Charges (Before 6 AM)</div>
              <div className="mt-1">{val(data.costDetails.earlyMorningCharges)}</div>
            </div>
          </div>

          <div className="mt-10 text-2xl font-semibold text-sky-700">Uploaded Documents</div>

          <div className="mt-4 text-sm text-gray-700 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.documents?.length ? (
              data.documents.map((d) => (
                <a
                  key={String(d.id)}
                  className="border rounded-md p-2 hover:border-sky-300"
                  href={d.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <div className="text-xs text-gray-500 mb-2">{val(d.documentType)}</div>
                  <img
                    src={d.fileUrl}
                    alt={d.fileName}
                    className="h-24 w-full object-cover rounded border"
                  />
                  <div className="text-xs mt-2 text-sky-700 truncate">{val(d.fileName)}</div>
                </a>
              ))
            ) : (
              <div className="text-gray-500">No Documents Found</div>
            )}
          </div>

          <div className="mt-10 text-2xl font-semibold text-sky-700">Renewal History</div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full border border-slate-200 text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-3 py-2 border-b">S.no</th>
                  <th className="text-left px-3 py-2 border-b">License Number</th>
                  <th className="text-left px-3 py-2 border-b">Validity Start Date</th>
                  <th className="text-left px-3 py-2 border-b">Validity End Date</th>
                  <th className="text-left px-3 py-2 border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.renewalHistory.length ? (
                  data.renewalHistory.map((row, index) => {
                    const statusLabel = row.status || "Active";
                    return (
                      <tr key={String(row.id)} className="border-b">
                        <td className="px-3 py-2">{index + 1}</td>
                        <td className="px-3 py-2">{val(row.licenseNumber)}</td>
                        <td className="px-3 py-2">{formatDate(row.startDate)}</td>
                        <td className="px-3 py-2">{formatDate(row.endDate)}</td>
                        <td className="px-3 py-2">{val(statusLabel)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="px-3 py-3 text-center text-slate-500" colSpan={5}>
                      No License History Found !!!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-10 text-2xl font-semibold text-sky-700">Feedback & Review</div>

          <div className="mt-4 text-sm text-gray-700">
            {data.reviews?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full border border-slate-200 text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-left px-3 py-2 border-b">S.no</th>
                      <th className="text-left px-3 py-2 border-b">Rating</th>
                      <th className="text-left px-3 py-2 border-b">Description</th>
                      <th className="text-left px-3 py-2 border-b">Created On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.reviews.map((r, index) => (
                      <tr key={String(r.id)} className="border-b">
                        <td className="px-3 py-2">{index + 1}</td>
                        <td className="px-3 py-2">{val(r.rating)}</td>
                        <td className="px-3 py-2">{val(r.description)}</td>
                        <td className="px-3 py-2">
                          {r.createdAt ? new Date(r.createdAt).toLocaleString("en-GB") : "--"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-gray-500">No Reviews Found !!!</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
