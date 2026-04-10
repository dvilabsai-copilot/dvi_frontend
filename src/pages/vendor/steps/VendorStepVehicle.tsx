// FILE: src/pages/vendor/steps/VendorStepVehicle.tsx

import React,{useEffect,useMemo,useState} from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import {api} from "@/lib/api";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Props={
vendorId?:number;
onBack:()=>void;
onNext:()=>void;
};

type Branch={
id:number;
name:string;
vehicleCount:number;
};

type VehicleRow={
id:number;
regNo:string;
vehicleType:string;
fcExpiryDate:string;
status:number;
statusLabel:string;
branchId:number;
_full?:any;
};

type VehicleFormErrors = Partial<{
registrationNumber:string;
registrationDate:string;
engineNumber:string;
vehicleType:string;
ownerName:string;
ownerContactNumber:string;
country:string;
state:string;
city:string;
}>;

const toPickerDate=(value:string)=>{
if(!value) return undefined;
const parsed=parseISO(value);
return isValid(parsed) ? parsed : undefined;
};

const toYmd=(date?:Date)=>{
if(!date) return "";
return format(date,"yyyy-MM-dd");
};

function DatePickerField({
value,
onChange,
placeholder,
hasError,
}:{
value:string;
onChange:(value:string)=>void;
placeholder:string;
hasError?:boolean;
}){
const selected=toPickerDate(value);

return (
<Popover>
<PopoverTrigger asChild>
<button
type="button"
className={`rounded border px-3 py-2 text-left flex items-center justify-between ${hasError ? "border-red-400" : ""}`}
>
<span className={selected ? "text-slate-900" : "text-slate-400"}>
{selected ? format(selected,"dd-MM-yyyy") : placeholder}
</span>
<CalendarIcon className="h-4 w-4 text-violet-600" />
</button>
</PopoverTrigger>
<PopoverContent className="w-auto p-2" align="start">
<Calendar
mode="single"
selected={selected}
onSelect={(date)=>onChange(toYmd(date))}
initialFocus
/>
</PopoverContent>
</Popover>
);
}

export const VendorStepVehicle:React.FC<Props>=({

vendorId,
onBack,
onNext

})=>{

const [branches,setBranches]=useState<Branch[]>([]);
const [selectedBranchId,setSelectedBranchId]=useState<number|null>(null);

const [vehicleRows,setVehicleRows]=useState<VehicleRow[]>([]);

const [search,setSearch]=useState("");

const [isVehicleListOpen,setIsVehicleListOpen]=useState(true);

const [loading,setLoading]=useState(false);

const [vehicleTypeOptions,setVehicleTypeOptions]=useState<any[]>([]);
const [countryOptions,setCountryOptions]=useState<any[]>([]);

const selectedBranch=useMemo(
()=>branches.find(b=>b.id===selectedBranchId),
[branches,selectedBranchId]
);

const [isAddMode,setIsAddMode]=useState(false);
const [editingVehicleId,setEditingVehicleId]=useState<number|null>(null);
const [saving,setSaving]=useState(false);
const [statusUpdatingId,setStatusUpdatingId]=useState<number|null>(null);
const [stateOptions,setStateOptions]=useState<any[]>([]);
const [cityOptions,setCityOptions]=useState<any[]>([]);
const [vehicleFormErrors,setVehicleFormErrors]=useState<VehicleFormErrors>({});

const emptyVehicleForm={
vehicleType:"",
registrationNumber:"",
registrationDate:"",
engineNumber:"",
ownerName:"",
ownerContactNumber:"",
ownerEmailId:"",
ownerAddress:"",
ownerPincode:"",
country:"",
state:"",
city:"",
chassisNumber:"",
vehicleExpiryDate:"",
fuelType:"",
extraKmCharge:"",
earlyMorningCharges:"",
eveningCharges:"",
vehicleVideoUrl:"",
insurancePolicyNumber:"",
insuranceStartDate:"",
insuranceEndDate:"",
insuranceContactNumber:"",
rtoCode:"",
};

const [vehicleForm,setVehicleForm]=useState(emptyVehicleForm);

useEffect(() => {
if (!vendorId) return;

const load = async () => {
await fetchBranches();
await fetchDropdowns();
await fetchVehicles();
};

void load();

},[vendorId]);

const getVehicleTypeLabel = (vehicleTypeId: string) => {

const match = vehicleTypeOptions.find(
(o)=>
String(o.id).trim()===String(vehicleTypeId).trim()
||
Number(o.id)===Number(vehicleTypeId)
);

return match?.label || vehicleTypeId;

};

const handleFieldChange=(
field:keyof typeof vehicleForm,
value:string
)=>{
setVehicleForm(prev=>({...prev,[field]:value}));
setVehicleFormErrors(prev=>({ ...prev, [field]: undefined }));
};

useEffect(()=>{
if(!vehicleForm.country){
setStateOptions([]);
return;
}

api(`/dropdowns/states?countryId=${vehicleForm.country}`)
.then((res:any)=>{
const items=res?.items ?? res ?? [];
setStateOptions(
(items || []).map((item:any)=>({
id:String(item.id ?? item.state_id ?? item.value ?? ""),
label:item.label ?? item.name ?? item.state_name ?? "",
}))
);
})
.catch(console.error);
},[vehicleForm.country]);

useEffect(()=>{
if(!vehicleForm.state){
setCityOptions([]);
return;
}

api(`/dropdowns/cities?stateId=${vehicleForm.state}`)
.then((res:any)=>{
const items=res?.items ?? res ?? [];
setCityOptions(
(items || []).map((item:any)=>({
id:String(item.id ?? item.city_id ?? item.value ?? ""),
label:item.label ?? item.name ?? item.city_name ?? "",
}))
);
})
.catch(console.error);
},[vehicleForm.state]);

const handleCopy=async()=>{

const header=["S.NO","VEHICLE REG. NO","VEHICLE TYPE","FC EXPIRY DATE","STATUS"];

const lines=[

header.join("\t"),

...exportRows.map(row=>

[
row["S.NO"],
row["VEHICLE REG. NO"],
row["VEHICLE TYPE"],
row["FC EXPIRY DATE"],
row["STATUS"]

].join("\t")

)

];

await navigator.clipboard.writeText(lines.join("\n"));

};

const downloadFile=(content:string,filename:string,mime:string)=>{

const blob=new Blob([content],{type:mime});

const url=URL.createObjectURL(blob);

const a=document.createElement("a");

a.href=url;

a.download=filename;

document.body.appendChild(a);

a.click();

document.body.removeChild(a);

URL.revokeObjectURL(url);

};

const handleCsvExport=()=>{

const header=["S.NO","VEHICLE REG. NO","VEHICLE TYPE","FC EXPIRY DATE","STATUS"];

const rows=exportRows.map(row=>

[
row["S.NO"],
row["VEHICLE REG. NO"],
row["VEHICLE TYPE"],
row["FC EXPIRY DATE"],
row["STATUS"]

]

);

const csv=[

header.join(","),
...rows.map(r=>r.join(","))

].join("\n");

downloadFile(csv,"vendor-vehicles.csv","text/csv");

};

const handleExcelExport=()=>{

const header=["S.NO","VEHICLE REG. NO","VEHICLE TYPE","FC EXPIRY DATE","STATUS"];

const rows=exportRows.map(row=>

[
row["S.NO"],
row["VEHICLE REG. NO"],
row["VEHICLE TYPE"],
row["FC EXPIRY DATE"],
row["STATUS"]

]

);

const csv=[

header.join(","),
...rows.map(r=>r.join(","))

].join("\n");

downloadFile(csv,"vendor-vehicles.xls","application/vnd.ms-excel");

};

const handlePdfExport=()=>{

const header=["S.NO","VEHICLE REG. NO","VEHICLE TYPE","FC EXPIRY DATE","STATUS"];

const lines=[

"Vendor Vehicle List",
"",
header.join(" | "),

...exportRows.map(row=>

[
row["S.NO"],
row["VEHICLE REG. NO"],
row["VEHICLE TYPE"],
row["FC EXPIRY DATE"],
row["STATUS"]

].join(" | ")

)

];

downloadFile(lines.join("\n"),"vendor-vehicles.pdf","application/pdf");

};

const handleCloseVehicleList=()=>{
setIsVehicleListOpen(false);
};

const handleOpenAddVehicle = () => {
setEditingVehicleId(null);
setVehicleForm(emptyVehicleForm);
setVehicleFormErrors({});
setIsVehicleListOpen(false);
setIsAddMode(true);
};

const fetchBranches = async () => {

try{

const data=await api(`/vendors/${vendorId}`);

const mapped=(((data as any).branches) || []).map((b:any)=>({

id:Number(b.vendor_branch_id ?? b.id ?? 0),

name:
b.branch_name ||
b.branchName ||
b.vendor_branch_name ||
b.name ||
"Branch",

vehicleCount:0

}));

setBranches(mapped);

if(mapped.length>0 && !selectedBranchId){

setSelectedBranchId(mapped[0].id);
setIsVehicleListOpen(true);

}

return mapped;

}
catch(e){

console.error(e);

return [];

}

};

const fetchDropdowns=async()=>{

try{

const [vtRes,cRes]=await Promise.all([

api("/dropdowns/vehicle-types"),
api("/dropdowns/countries")

]);

const vehicleTypeItems =
(vtRes as any)?.items ??
(vtRes as any)?.data ??
(vtRes as any)?.result ??
vtRes ??
[];

const countryItems=(cRes as any)?.items ?? cRes ?? [];

setVehicleTypeOptions(

(vehicleTypeItems || []).map((item:any)=>({

id:String(
item.id ??
item.vehicle_type_id ??
item.vehicleTypeId ??
item.value ??
item.vehicle_type ??
""
),

label:
item.label ??
item.name ??
item.vehicle_type_name ??
item.vehicleTypeName ??
item.title ??
item.text ??
""

}))

);

setCountryOptions(

(countryItems || []).map((item:any)=>({

id:String(
item.id ??
item.country_id ??
item.value ??
""
),

label:
item.label ??
item.name ??
item.country_name ??
""

}))

);

}
catch(e){

console.error(e);

}

};

const fetchVehicles=async()=>{

if(!vendorId) return;

setLoading(true);

try{

const data=(await api(
`/vendors/${vendorId}/vehicles`
)) as any[];

const mapped:VehicleRow[]=(data || []).map((v:any)=>({

id:Number(v.vehicle_id),

regNo:v.registration_number || "",

vehicleType:String(
v.vehicle_type_id ??
v.vehicleTypeId ??
v.vehicle_type ??
""
),

fcExpiryDate:
v.vehicle_fc_expiry_date ?
v.vehicle_fc_expiry_date.split("T")[0] : "",

status:Number(v.status ?? 0),

statusLabel:
Number(v.status)===1 ?
"Active":"Inactive",

branchId:Number(v.vendor_branch_id),

_full:v

}));

setVehicleRows(mapped);

setBranches((prev) => {

if(!prev.length) return prev;

return prev.map((b) => ({
...b,
vehicleCount:
mapped.filter((v)=>v.branchId===b.id).length
}));

});

}
catch(e){

console.error(e);

}
finally{

setLoading(false);

}

};

const filteredRows=useMemo(()=>{

let rows=vehicleRows;

if(selectedBranchId){

rows=rows.filter(
r=>r.branchId===selectedBranchId
);

}

if(!search.trim()) return rows;

const q=search.toLowerCase();

return rows.filter(r=>{

const vehicleTypeLabel = getVehicleTypeLabel(r.vehicleType);

return(

r.regNo.toLowerCase().includes(q) ||
vehicleTypeLabel.toLowerCase().includes(q)

);

});

},

[
vehicleRows,
search,
selectedBranchId,
vehicleTypeOptions
]

);

const exportRows=filteredRows.map((row,index)=>({

"S.NO":index+1,
"VEHICLE REG. NO":row.regNo,
"VEHICLE TYPE":getVehicleTypeLabel(row.vehicleType),
"FC EXPIRY DATE":row.fcExpiryDate,
STATUS:row.statusLabel

}));

const handleEditVehicle=(row:VehicleRow)=>{

const v=row._full;

if(!v) return;

setEditingVehicleId(v.vehicle_id);

setVehicleForm({
vehicleType:String(v.vehicle_type_id || ""),
registrationNumber:v.registration_number || "",
registrationDate:v.registration_date ? v.registration_date.split("T")[0] : "",
engineNumber:v.engine_number || "",
ownerName:v.owner_name || "",
ownerContactNumber:v.owner_contact_no || "",
ownerEmailId:v.owner_email_id || "",
ownerAddress:v.owner_address || "",
ownerPincode:v.owner_pincode || "",
country:String(v.owner_country || ""),
state:String(v.owner_state || ""),
city:String(v.owner_city || ""),
chassisNumber:v.chassis_number || "",
vehicleExpiryDate:v.vehicle_fc_expiry_date ? v.vehicle_fc_expiry_date.split("T")[0] : "",
fuelType:String(v.fuel_type || ""),
extraKmCharge:String(v.extra_km_charge || ""),
earlyMorningCharges:String(v.early_morning_charges || ""),
eveningCharges:String(v.evening_charges || ""),
vehicleVideoUrl:v.vehicle_video_url || "",
insurancePolicyNumber:v.insurance_policy_number || "",
insuranceStartDate:v.insurance_start_date ? v.insurance_start_date.split("T")[0] : "",
insuranceEndDate:v.insurance_end_date ? v.insurance_end_date.split("T")[0] : "",
insuranceContactNumber:v.insurance_contact_no || "",
rtoCode:v.RTO_code || "",
});

setIsVehicleListOpen(false);
setIsAddMode(true);
setVehicleFormErrors({});

};

const handleSaveVehicle=async()=>{

if(!vendorId || !selectedBranchId) return;

const errors:VehicleFormErrors={};
if(!String(vehicleForm.registrationNumber ?? "").trim()) errors.registrationNumber="This value is required.";
if(!String(vehicleForm.registrationDate ?? "").trim()) errors.registrationDate="This value is required.";
if(!String(vehicleForm.engineNumber ?? "").trim()) errors.engineNumber="This value is required.";
if(!String(vehicleForm.vehicleType ?? "").trim()) errors.vehicleType="This value is required.";
if(!String(vehicleForm.ownerName ?? "").trim()) errors.ownerName="This value is required.";
if(!String(vehicleForm.ownerContactNumber ?? "").trim()) errors.ownerContactNumber="This value is required.";
if(!String(vehicleForm.country ?? "").trim()) errors.country="This value is required.";
if(!String(vehicleForm.state ?? "").trim()) errors.state="This value is required.";
if(!String(vehicleForm.city ?? "").trim()) errors.city="This value is required.";

if(Object.keys(errors).length>0){
setVehicleFormErrors(errors);
return;
}

setVehicleFormErrors({});

setSaving(true);

try{

const payload={
vendor_branch_id:selectedBranchId,
vehicle_type_id:vehicleForm.vehicleType ? Number(vehicleForm.vehicleType) : null,
registration_number:vehicleForm.registrationNumber,
registration_date:vehicleForm.registrationDate ? new Date(vehicleForm.registrationDate) : null,
engine_number:vehicleForm.engineNumber,
owner_name:vehicleForm.ownerName,
owner_contact_no:vehicleForm.ownerContactNumber,
owner_email_id:vehicleForm.ownerEmailId,
owner_address:vehicleForm.ownerAddress,
owner_pincode:vehicleForm.ownerPincode,
owner_country:vehicleForm.country ? Number(vehicleForm.country) : null,
owner_state:vehicleForm.state,
owner_city:vehicleForm.city,
chassis_number:vehicleForm.chassisNumber,
vehicle_fc_expiry_date:vehicleForm.vehicleExpiryDate ? new Date(vehicleForm.vehicleExpiryDate) : null,
fuel_type:vehicleForm.fuelType ? Number(vehicleForm.fuelType) : null,
extra_km_charge:vehicleForm.extraKmCharge ? Number(vehicleForm.extraKmCharge) : 0,
early_morning_charges:vehicleForm.earlyMorningCharges ? Number(vehicleForm.earlyMorningCharges) : 0,
evening_charges:vehicleForm.eveningCharges ? Number(vehicleForm.eveningCharges) : 0,
vehicle_video_url:vehicleForm.vehicleVideoUrl,
insurance_policy_number:vehicleForm.insurancePolicyNumber,
insurance_start_date:vehicleForm.insuranceStartDate ? new Date(vehicleForm.insuranceStartDate) : null,
insurance_end_date:vehicleForm.insuranceEndDate ? new Date(vehicleForm.insuranceEndDate) : null,
insurance_contact_no:vehicleForm.insuranceContactNumber,
RTO_code:vehicleForm.rtoCode,
};

if(editingVehicleId){
await api(`/vendors/vehicles/${editingVehicleId}`,{
method:"PUT",
body:JSON.stringify(payload),
});
}else{
await api(`/vendors/${vendorId}/vehicles`,{
method:"POST",
body:JSON.stringify(payload),
});
}

await fetchVehicles();
setIsAddMode(false);
setIsVehicleListOpen(true);
setEditingVehicleId(null);
setVehicleForm(emptyVehicleForm);
setVehicleFormErrors({});

}catch(e){
console.error("Failed to save vehicle",e);
}finally{
setSaving(false);
}

};

const handleToggleVehicleStatus=async(row:VehicleRow)=>{
if(statusUpdatingId===row.id) return;

setStatusUpdatingId(row.id);
try{
const oldStatus=Number(row.status ?? 0);
const res=(await api(`/vendors/vehicles/${row.id}/status-toggle`,{
method:"POST",
body:JSON.stringify({ oldstatus: oldStatus }),
})) as { success?: boolean; status?: number };

const nextStatus=res?.status != null ? Number(res.status) : (oldStatus===1 ? 0 : 1);

setVehicleRows(prev=>prev.map(v=>v.id===row.id ? {
...v,
status:nextStatus,
statusLabel:nextStatus===1 ? "Active" : "Inactive",
} : v));
}catch(e){
console.error("Failed to toggle vehicle status",e);
}finally{
setStatusUpdatingId(null);
}
};

return (

<div className="rounded-2xl bg-white p-6 shadow-sm space-y-6">

<div>
  <h2 className="mb-4 text-[18px] font-semibold text-pink-600">
    List of Branch
  </h2>

  <div className="flex flex-wrap gap-4">
    {branches.map((branch) => {
      const active = branch.id === selectedBranchId;

      return (
        <button
          key={branch.id}
          type="button"
          onClick={()=>{
                        setSelectedBranchId(branch.id);
                        setIsAddMode(false);
                        setIsVehicleListOpen(true);
     }}
          className={`relative flex min-h-[108px] w-[290px] items-center gap-5 rounded-xl border bg-white px-5 py-4 text-left transition ${
            active ? "border-violet-400 shadow-sm" : "border-violet-200"
          }`}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-pink-50 text-[22px] font-semibold text-pink-600">
            {(branch.name || "B").charAt(0).toUpperCase()}
          </div>

          <div className="flex-1">
            <div className="line-clamp-2 text-[18px] font-medium uppercase leading-8 text-slate-700">
              {branch.name}
            </div>
          </div>

          <div className="absolute right-4 top-4 rounded-lg bg-pink-50 px-3 py-2 text-[18px] font-medium text-violet-600">
            🚗 {branch.vehicleCount}
          </div>
        </button>
      );
    })}
  </div>
</div>

{!isAddMode ? (
<>
<div className="flex justify-between items-center">

<h3 className="text-[18px] font-medium text-slate-700">

Vehicle List in{" "}

<span className="font-semibold uppercase text-pink-600">
{selectedBranch?.name || ""}
</span>

</h3>

<div className="flex gap-3">

<button
onClick={handleCloseVehicleList}
className="bg-red-50 text-red-400 px-4 py-2 rounded"
>
Close
</button>

<button
onClick={handleOpenAddVehicle}
className="bg-violet-500 text-white px-4 py-2 rounded"
>
+ Add vehicle
</button>

</div>

</div>

<div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

<div className="flex items-center gap-3 text-[16px] text-slate-600">
<span>Show</span>

<select className="rounded-md border border-slate-300 bg-white px-3 py-2">
<option>10</option>
<option>25</option>
<option>50</option>
</select>

<span>entries</span>

</div>

<div className="flex flex-wrap items-center gap-3">

<button type="button" onClick={handleCopy} className="rounded-lg border border-violet-400 px-6 py-3 text-[16px] font-medium text-violet-600">
Copy
</button>

<button type="button" onClick={handleExcelExport} className="rounded-lg border border-green-500 px-6 py-3 text-[16px] font-medium text-green-600">
Excel
</button>

<button type="button" onClick={handleCsvExport} className="rounded-lg border border-slate-300 px-6 py-3 text-[16px] font-medium text-slate-500">
CSV
</button>

<button type="button" onClick={handlePdfExport} className="rounded-lg border border-red-400 px-6 py-3 text-[16px] font-medium text-red-500">
PDF
</button>

<input
value={search}
onChange={(e)=>setSearch(e.target.value)}
placeholder="Search"
className="w-[270px] rounded-lg border border-slate-300 px-4 py-3 text-[16px] outline-none"
/>

</div>

</div>

<table className="w-full border rounded-xl overflow-hidden">
  <thead className="bg-gray-50">
    <tr>
      <th className="px-4 py-4 text-left uppercase tracking-wide text-slate-500">S.NO</th>
      <th className="px-4 py-4 text-left uppercase tracking-wide text-slate-500">ACTION</th>
      <th className="px-4 py-4 text-left uppercase tracking-wide text-slate-500">VEHICLE REG. NO</th>
      <th className="px-4 py-4 text-left uppercase tracking-wide text-slate-500">VEHICLE TYPE</th>
      <th className="px-4 py-4 text-left uppercase tracking-wide text-slate-500">FC EXPIRY DATE</th>
      <th className="px-4 py-4 text-left uppercase tracking-wide text-slate-500">STATUS</th>
      <th className="px-4 py-4 text-left uppercase tracking-wide text-slate-500">STATUS LABEL</th>
    </tr>
  </thead>

  <tbody>
    {loading && (
      <tr>
        <td colSpan={7} className="text-center py-8">
          Loading...
        </td>
      </tr>
    )}

    {!loading && filteredRows.map((row, index) => (
      <tr key={row.id} className="border-t border-slate-200">
        <td className="px-4 py-5">{index + 1}</td>

        <td className="px-4 py-5">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => handleEditVehicle(row)}
              className="text-[24px] text-violet-500 leading-none"
            >
              ✎
            </button>

            <button
              type="button"
              className="text-[22px] text-red-400 leading-none"
            >
              🗑
            </button>
          </div>
        </td>

        <td className="px-4 py-5">{row.regNo}</td>

        <td className="px-4 py-5">
          {getVehicleTypeLabel(row.vehicleType)}
        </td>

        <td className="px-4 py-5">
          {row.fcExpiryDate
            ? new Date(row.fcExpiryDate).toLocaleDateString("en-GB")
            : ""}
        </td>

        <td className="px-4 py-5">
          <button
            type="button"
            onClick={() => handleToggleVehicleStatus(row)}
            disabled={statusUpdatingId===row.id}
            className={`inline-flex h-8 w-14 items-center rounded-full px-1 transition ${
              row.status===1 ? "bg-violet-400" : "bg-slate-300"
            } ${statusUpdatingId===row.id ? "opacity-60" : ""}`}
          >
            <div
              className={`h-6 w-6 rounded-full bg-white transition-transform ${
                row.status===1 ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </td>

        <td className="px-4 py-5">
          <span className={`inline-flex rounded-md px-4 py-2 text-[15px] font-medium ${
            row.status===1 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
          }`}>
            {row.statusLabel}
          </span>
        </td>
      </tr>
    ))}
  </tbody>
</table>

<div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between mt-6">
  <div className="text-[16px] text-slate-400">
    Showing {filteredRows.length ? 1 : 0} to {filteredRows.length} of {filteredRows.length} entries
  </div>

  <div className="flex items-center gap-2">
    <button className="rounded-lg bg-slate-100 px-6 py-3 text-[16px] text-slate-500">
      Previous
    </button>

    <button className="rounded-lg bg-violet-500 px-5 py-3 text-[16px] text-white">
      1
    </button>

    <button className="rounded-lg bg-slate-100 px-6 py-3 text-[16px] text-slate-500">
      Next
    </button>
  </div>
</div>
</>
) : (
<div className="rounded-xl border border-slate-200 p-6 space-y-4">
  <h3 className="text-lg font-semibold text-slate-800">
    {editingVehicleId ? "Edit Vehicle" : "Add Vehicle"}
  </h3>

  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
    <div className="space-y-1">
      <input
        value={vehicleForm.registrationNumber}
        onChange={(e)=>handleFieldChange("registrationNumber",e.target.value)}
        placeholder="Registration Number"
        className={`w-full rounded border px-3 py-2 ${vehicleFormErrors.registrationNumber ? "border-red-400" : ""}`}
      />
      {vehicleFormErrors.registrationNumber ? <p className="text-xs text-red-600">{vehicleFormErrors.registrationNumber}</p> : null}
    </div>

    <div className="space-y-1">
      <DatePickerField
        value={vehicleForm.registrationDate}
        onChange={(value)=>handleFieldChange("registrationDate",value)}
        placeholder="Registration Date"
        hasError={Boolean(vehicleFormErrors.registrationDate)}
      />
      {vehicleFormErrors.registrationDate ? <p className="text-xs text-red-600">{vehicleFormErrors.registrationDate}</p> : null}
    </div>

    <div className="space-y-1">
      <input
        value={vehicleForm.engineNumber}
        onChange={(e)=>handleFieldChange("engineNumber",e.target.value)}
        placeholder="Engine Number"
        className={`w-full rounded border px-3 py-2 ${vehicleFormErrors.engineNumber ? "border-red-400" : ""}`}
      />
      {vehicleFormErrors.engineNumber ? <p className="text-xs text-red-600">{vehicleFormErrors.engineNumber}</p> : null}
    </div>

    <div className="space-y-1">
      <select
        value={vehicleForm.vehicleType}
        onChange={(e)=>handleFieldChange("vehicleType",e.target.value)}
        className={`w-full rounded border px-3 py-2 ${vehicleFormErrors.vehicleType ? "border-red-400" : ""}`}
      >
        <option value="">Choose Vehicle Type</option>
        {vehicleTypeOptions.map((opt)=>(
          <option key={opt.id} value={opt.id}>{opt.label}</option>
        ))}
      </select>
      {vehicleFormErrors.vehicleType ? <p className="text-xs text-red-600">{vehicleFormErrors.vehicleType}</p> : null}
    </div>

    <div className="space-y-1">
      <input
        value={vehicleForm.ownerName}
        onChange={(e)=>handleFieldChange("ownerName",e.target.value)}
        placeholder="Owner Name"
        className={`w-full rounded border px-3 py-2 ${vehicleFormErrors.ownerName ? "border-red-400" : ""}`}
      />
      {vehicleFormErrors.ownerName ? <p className="text-xs text-red-600">{vehicleFormErrors.ownerName}</p> : null}
    </div>

    <div className="space-y-1">
      <input
        value={vehicleForm.ownerContactNumber}
        onChange={(e)=>handleFieldChange("ownerContactNumber",e.target.value)}
        placeholder="Owner Contact Number"
        className={`w-full rounded border px-3 py-2 ${vehicleFormErrors.ownerContactNumber ? "border-red-400" : ""}`}
      />
      {vehicleFormErrors.ownerContactNumber ? <p className="text-xs text-red-600">{vehicleFormErrors.ownerContactNumber}</p> : null}
    </div>

    <div className="space-y-1">
      <select
        value={vehicleForm.country}
        onChange={(e)=>handleFieldChange("country",e.target.value)}
        className={`w-full rounded border px-3 py-2 ${vehicleFormErrors.country ? "border-red-400" : ""}`}
      >
        <option value="">Choose Country</option>
        {countryOptions.map((opt)=>(
          <option key={opt.id} value={opt.id}>{opt.label}</option>
        ))}
      </select>
      {vehicleFormErrors.country ? <p className="text-xs text-red-600">{vehicleFormErrors.country}</p> : null}
    </div>

    <div className="space-y-1">
      <select
        value={vehicleForm.state}
        onChange={(e)=>handleFieldChange("state",e.target.value)}
        className={`w-full rounded border px-3 py-2 ${vehicleFormErrors.state ? "border-red-400" : ""}`}
      >
        <option value="">Choose State</option>
        {stateOptions.map((opt)=>(
          <option key={opt.id} value={opt.id}>{opt.label}</option>
        ))}
      </select>
      {vehicleFormErrors.state ? <p className="text-xs text-red-600">{vehicleFormErrors.state}</p> : null}
    </div>

    <div className="space-y-1">
      <select
        value={vehicleForm.city}
        onChange={(e)=>handleFieldChange("city",e.target.value)}
        className={`w-full rounded border px-3 py-2 ${vehicleFormErrors.city ? "border-red-400" : ""}`}
      >
        <option value="">Choose City</option>
        {cityOptions.map((opt)=>(
          <option key={opt.id} value={opt.id}>{opt.label}</option>
        ))}
      </select>
      {vehicleFormErrors.city ? <p className="text-xs text-red-600">{vehicleFormErrors.city}</p> : null}
    </div>
  </div>

  <div className="flex justify-between">
    <button
      type="button"
      onClick={()=>{
        setIsAddMode(false);
        setIsVehicleListOpen(true);
        setVehicleFormErrors({});
      }}
      className="rounded bg-slate-200 px-4 py-2"
    >
      Back
    </button>

    <button
      type="button"
      onClick={handleSaveVehicle}
      disabled={saving || !vendorId || !selectedBranchId}
      className="rounded bg-violet-500 px-6 py-2 text-white"
    >
      {saving ? "Saving..." : editingVehicleId ? "Update Vehicle" : "Save Vehicle"}
    </button>
  </div>
</div>
)}

<div className="flex justify-between">

<button onClick={onBack} className="bg-gray-300 px-4 py-2 rounded">
Back
</button>

<button onClick={onNext} className="bg-violet-500 text-white px-6 py-2 rounded">
Skip & Continue
</button>

</div>

</div>

);

};