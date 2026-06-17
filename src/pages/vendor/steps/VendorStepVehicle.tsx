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
countryId?:number;
stateId?:number;
cityId?:number;
location?:string;
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
ownerEmailId:string;
ownerAddress:string;
ownerPincode:string;
country:string;
state:string;
city:string;
vehicleOrigin:string;
chassisNumber:string;
extraKmCharge:string;
earlyMorningCharges:string;
eveningCharges:string;
vehicleVideoUrl:string;
insurancePolicyNumber:string;
insuranceContactNumber:string;
rtoCode:string;
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
  fromYear = 1950,
  toYear = 9075,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  hasError?: boolean;
  fromYear?: number;
  toYear?: number;
}) {
  const selected = toPickerDate(value);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`rounded border px-3 py-2 text-left flex items-center justify-between ${
            hasError ? "border-red-400" : ""
          }`}
        >
          <span className={selected ? "text-slate-900" : "text-slate-400"}>
            {selected ? format(selected, "dd-MM-yyyy") : placeholder}
          </span>
          <CalendarIcon className="h-4 w-4 text-violet-600" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-2" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected || new Date()}
          captionLayout="dropdown"
          fromYear={fromYear}
          toYear={toYear}
          classNames={{
            caption_dropdowns: "flex items-center justify-center gap-2",
            dropdown:
              "h-9 rounded-md border border-slate-200 bg-white px-2 text-sm font-medium text-slate-700 outline-none cursor-pointer",
            dropdown_month: "rounded-md",
            dropdown_year: "rounded-md",
            vhidden: "hidden",
            caption_label: "hidden",
            nav: "flex items-center",
            nav_button:
              "h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
          }}
          onSelect={(date) => {
            if (!date) return;
            onChange(toYmd(date));
          }}
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
const [deleteVehicleId,setDeleteVehicleId]=useState<number|null>(null);

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
vehicleOrigin:"",
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
vehicleLocationId:"",
};

const [vehicleForm,setVehicleForm]=useState(emptyVehicleForm);
const [vehicleDocuments,setVehicleDocuments]=useState<File[]>([]);
const [isUploadModalOpen,setIsUploadModalOpen]=useState(false);
const [uploadDocumentType,setUploadDocumentType]=useState("");
const [uploadDocumentFile,setUploadDocumentFile]=useState<File|null>(null);

useEffect(()=>{
if(!selectedBranch || !isAddMode || editingVehicleId) return;

setVehicleForm(prev=>({
...prev,
country:selectedBranch.countryId ? String(selectedBranch.countryId) : prev.country,
state:selectedBranch.stateId ? String(selectedBranch.stateId) : prev.state,
city:selectedBranch.cityId ? String(selectedBranch.cityId) : prev.city,
vehicleOrigin:prev.vehicleOrigin || String(selectedBranch.location || selectedBranch.name || ""),
}));
},[selectedBranch,isAddMode,editingVehicleId]);

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

const isOnlyNumbers=(value:string)=>{
return /^[0-9]+$/.test(String(value || "").trim());
};

const isValidIndianMobile=(value:string)=>{
return /^[6-9][0-9]{9}$/.test(String(value || "").trim());
};

const isValidEmail=(value:string)=>{
const trimmed=String(value || "").trim();

if(!trimmed) return true;

return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed);
};

const isValidIndianPincode=(value:string)=>{
return /^[1-9][0-9]{5}$/.test(String(value || "").trim());
};

const isValidChassisNumber=(value:string)=>{
return /^[A-Z0-9]{17}$/.test(String(value || "").trim().toUpperCase());
};

const isValidInsurancePolicyNumber=(value:string)=>{
return /^[A-Z0-9/-]{6,30}$/.test(String(value || "").trim().toUpperCase());
};

const isValidRtoCode=(value:string)=>{
return /^[A-Z]{2}[0-9]{2}$/.test(String(value || "").trim().toUpperCase());
};

const isValidAmount=(value:string)=>{
const trimmed=String(value || "").trim();

if(!trimmed) return true;

return /^\d+(\.\d{1,2})?$/.test(trimmed);
};

const isValidUrl=(value:string)=>{
const trimmed=String(value || "").trim();

if(!trimmed) return true;

try{
new URL(trimmed);
return true;
}catch{
return false;
}
};

const handleFieldChange=(
field:keyof typeof vehicleForm,
value:string
)=>{
setVehicleForm(prev=>({...prev,[field]:value}));

setVehicleFormErrors(prev=>{
const next={...prev};
const trimmedValue=String(value || "").trim();

if(field==="registrationNumber"){
  delete next.registrationNumber;
  return next;
}

if(field==="engineNumber"){
  delete next.engineNumber;
  return next;
}
if(field==="ownerContactNumber"){
  delete next.ownerContactNumber;
  return next;
}

if(field==="ownerEmailId"){
  delete next.ownerEmailId;
  return next;
}

if(field==="ownerPincode"){
  delete next.ownerPincode;
  return next;
}

if(field==="chassisNumber"){
  delete next.chassisNumber;
  return next;
}

if(field==="extraKmCharge"){
  delete next.extraKmCharge;
  return next;
}

if(field==="earlyMorningCharges"){
  delete next.earlyMorningCharges;
  return next;
}

if(field==="eveningCharges"){
  delete next.eveningCharges;
  return next;
}

if(field==="vehicleVideoUrl"){
  delete next.vehicleVideoUrl;
  return next;
}

if(field==="insurancePolicyNumber"){
  delete next.insurancePolicyNumber;
  return next;
}

if(field==="insuranceContactNumber"){
  delete next.insuranceContactNumber;
  return next;
}

if(field==="rtoCode"){
  delete next.rtoCode;
  return next;
}

delete next[field];
return next;
});
};

const handleVehicleDocumentsChange=(file:File|null)=>{
setUploadDocumentFile(file);
};

const handleSaveVehicleDocument=()=>{
if(!uploadDocumentType){
alert("Please choose document type.");
return;
}

if(!uploadDocumentFile){
alert("Please choose file.");
return;
}

setVehicleDocuments(prev=>[
...prev,
uploadDocumentFile,
]);

setUploadDocumentType("");
setUploadDocumentFile(null);
setIsUploadModalOpen(false);
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
setVehicleForm({
...emptyVehicleForm,
country:selectedBranch?.countryId ? String(selectedBranch.countryId) : "",
state:selectedBranch?.stateId ? String(selectedBranch.stateId) : "",
city:selectedBranch?.cityId ? String(selectedBranch.cityId) : "",
});
setVehicleDocuments([]);
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
,
countryId:Number(b.vendor_branch_country ?? b.country_id ?? b.countryId ?? 0) || undefined,
stateId:Number(b.vendor_branch_state ?? b.state_id ?? b.stateId ?? 0) || undefined,
cityId:Number(b.vendor_branch_city ?? b.city_id ?? b.cityId ?? 0) || undefined,
location:String(b.vendor_branch_location ?? b.branch_location ?? b.location ?? "")

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

id:Number(v.vehicle_id ?? v.id ?? v.vendor_vehicle_id ?? 0),

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

setEditingVehicleId(Number(v.vehicle_id ?? row.id ?? 0));

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
vehicleOrigin:String(v.vehicle_origin || v.vehicle_orign || ""),
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
vehicleLocationId:String(v.vehicle_location_id || ""),
});

setIsVehicleListOpen(false);
setIsAddMode(true);
setVehicleFormErrors({});

};

const handleSaveVehicle=async()=>{

if(!vendorId){
alert("Vendor id missing. Please save Basic Info first.");
return;
}

if(!selectedBranchId){
alert("Please select a branch before saving vehicle.");
return;
}

const errors:VehicleFormErrors={};

const registrationNumber=String(vehicleForm.registrationNumber ?? "").trim();

if(!String(vehicleForm.registrationDate ?? "").trim()){
errors.registrationDate="Registration date is required.";
}

const engineNumber=String(vehicleForm.engineNumber ?? "").trim();

if(!String(vehicleForm.vehicleType ?? "").trim()){
errors.vehicleType="Vehicle type is required.";
}

if(!String(vehicleForm.ownerName ?? "").trim()){
errors.ownerName="Owner name is required.";
}

const ownerContactNumber=String(vehicleForm.ownerContactNumber ?? "").trim();

const ownerEmailId=String(vehicleForm.ownerEmailId ?? "").trim();

if(!String(vehicleForm.ownerAddress ?? "").trim()){
errors.ownerAddress="Owner address is required.";
}

const ownerPincode=String(vehicleForm.ownerPincode ?? "").trim();

if(!String(vehicleForm.country ?? "").trim()){
errors.country="Country is required.";
}

if(!String(vehicleForm.state ?? "").trim()){
errors.state="State is required.";
}

if(!String(vehicleForm.city ?? "").trim()){
errors.city="City is required.";
}

if(!String(vehicleForm.vehicleOrigin ?? "").trim() && !String(vehicleForm.vehicleLocationId ?? "").trim()){
errors.vehicleOrigin="Vehicle origin is required.";
}


const chassisNumber=String(vehicleForm.chassisNumber ?? "").trim();

const extraKmCharge=String(vehicleForm.extraKmCharge ?? "").trim();

const earlyMorningCharges=String(vehicleForm.earlyMorningCharges ?? "").trim();

const eveningCharges=String(vehicleForm.eveningCharges ?? "").trim();

const vehicleVideoUrl=String(vehicleForm.vehicleVideoUrl ?? "").trim();

const insurancePolicyNumber=String(vehicleForm.insurancePolicyNumber ?? "").trim();

const insuranceContactNumber=String(vehicleForm.insuranceContactNumber ?? "").trim();

const rtoCode=String(vehicleForm.rtoCode ?? "").trim().toUpperCase();

if(Object.keys(errors).length>0){
setVehicleFormErrors(errors);
alert("Please fix highlighted errors.");
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
vehicle_origin:vehicleForm.vehicleOrigin,
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
vehicle_location_id:vehicleForm.vehicleLocationId ? Number(vehicleForm.vehicleLocationId) : null,
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
setVehicleForm({
...emptyVehicleForm,
country:selectedBranch?.countryId ? String(selectedBranch.countryId) : "",
state:selectedBranch?.stateId ? String(selectedBranch.stateId) : "",
city:selectedBranch?.cityId ? String(selectedBranch.cityId) : "",
vehicleOrigin:selectedBranch?.location || selectedBranch?.name || "",
});
setVehicleDocuments([]);
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

const handleDeleteVehicle=async(rowId:number|null)=>{
if(!rowId){
alert("Invalid vehicle id");
return;
}

setSaving(true);

try{
await api(`/vendors/vehicles/${rowId}`,{
method:"DELETE",
});

setVehicleRows(prev=>prev.filter(row=>row.id!==rowId));
setDeleteVehicleId(null);

await fetchVehicles();

}catch(e){
console.error("Failed to delete vehicle",e);
alert("Vehicle delete failed");
}finally{
setSaving(false);
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
  isVehicleListOpen ? (
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
type="button"
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
  onClick={()=>setDeleteVehicleId(row.id)}
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
) : null
) : (
<div className="rounded-xl border border-slate-200 p-6 space-y-4">
  <h3 className="text-lg font-semibold text-slate-800">
    {editingVehicleId ? "Edit Vehicle" : "Add Vehicle"}
  </h3>

  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

    <div className="space-y-1">
      <label className="text-sm text-slate-600">Registration Number</label>
      <input
        value={vehicleForm.registrationNumber}
        onChange={(e)=>handleFieldChange("registrationNumber",e.target.value)}
        placeholder="Registration Number"
        className={`w-full rounded border px-3 py-2 ${vehicleFormErrors.registrationNumber ? "border-red-400" : ""}`}
      />
      {vehicleFormErrors.registrationNumber ? <p className="text-xs text-red-600">{vehicleFormErrors.registrationNumber}</p> : null}
    </div>

    <div className="space-y-1">
      <label className="text-sm text-slate-600">Registration Date</label>
      <DatePickerField
        value={vehicleForm.registrationDate}
        onChange={(value)=>handleFieldChange("registrationDate",value)}
        placeholder="Registration Date"
        hasError={Boolean(vehicleFormErrors.registrationDate)}
      />
      {vehicleFormErrors.registrationDate ? <p className="text-xs text-red-600">{vehicleFormErrors.registrationDate}</p> : null}
    </div>

    <div className="space-y-1">
      <label className="text-sm text-slate-600">Engine Number</label>
      <input
        value={vehicleForm.engineNumber}
        onChange={(e)=>handleFieldChange("engineNumber",e.target.value)}
        placeholder="Engine Number"
        className={`w-full rounded border px-3 py-2 ${vehicleFormErrors.engineNumber ? "border-red-400" : ""}`}
      />
      {vehicleFormErrors.engineNumber ? <p className="text-xs text-red-600">{vehicleFormErrors.engineNumber}</p> : null}
    </div>

    <div className="space-y-1">
      <label className="text-sm text-slate-600">Vehicle Expiry Date</label>
     <DatePickerField
  value={vehicleForm.vehicleExpiryDate}
  onChange={(value)=>handleFieldChange("vehicleExpiryDate",value)}
  placeholder="Vehicle Expiry Date"
  fromYear={2020}
  toYear={9075}
/>
    </div>

    <div className="space-y-1">
      <label className="text-sm text-slate-600">Vehicle Type</label>
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
      <label className="text-sm text-slate-600">Owner Name</label>
      <input
        value={vehicleForm.ownerName}
        onChange={(e)=>handleFieldChange("ownerName",e.target.value)}
        placeholder="Owner Name"
        className={`w-full rounded border px-3 py-2 ${vehicleFormErrors.ownerName ? "border-red-400" : ""}`}
      />
      {vehicleFormErrors.ownerName ? <p className="text-xs text-red-600">{vehicleFormErrors.ownerName}</p> : null}
    </div>

<div className="space-y-1">
  <label className="text-sm text-slate-600">Owner Contact Number</label>
  <input
    value={vehicleForm.ownerContactNumber}
    onChange={(e)=>handleFieldChange("ownerContactNumber",e.target.value)}
    placeholder="Owner Contact Number"
    className="w-full rounded border px-3 py-2"
  />
</div>

   <div className="space-y-1">
  <label className="text-sm text-slate-600">Owner Email ID</label>
  <input
    value={vehicleForm.ownerEmailId}
    onChange={(e)=>handleFieldChange("ownerEmailId",e.target.value)}
    placeholder="Owner Email ID"
    className="w-full rounded border px-3 py-2"
  />
</div>

   <div className="space-y-1 md:col-span-2">
  <label className="text-sm text-slate-600">Owner Address</label>
  <input
    value={vehicleForm.ownerAddress}
    onChange={(e)=>handleFieldChange("ownerAddress",e.target.value)}
    placeholder="Owner Address"
    className={`w-full rounded border px-3 py-2 ${
      vehicleFormErrors.ownerAddress ? "border-red-400" : ""
    }`}
  />
  {vehicleFormErrors.ownerAddress ? (
    <p className="text-xs text-red-600">{vehicleFormErrors.ownerAddress}</p>
  ) : null}
</div>
  <div className="space-y-1">
  <label className="text-sm text-slate-600">Owner Pincode</label>
  <input
    value={vehicleForm.ownerPincode}
    onChange={(e)=>handleFieldChange("ownerPincode",e.target.value)}
    placeholder="Owner Pincode"
    className="w-full rounded border px-3 py-2"
  />
</div>

    <div className="space-y-1">
      <label className="text-sm text-slate-600">Country</label>
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
      <label className="text-sm text-slate-600">State</label>
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
      <label className="text-sm text-slate-600">City</label>
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

    <div className="space-y-1 md:col-span-2">
      <label className="text-sm text-slate-600">Vehicle Origin</label>
      <input
        value={vehicleForm.vehicleOrigin}
        onChange={(e)=>handleFieldChange("vehicleOrigin",e.target.value)}
        placeholder="e.g. Bangalore, International Airport"
        className={`w-full rounded border px-3 py-2 ${vehicleFormErrors.vehicleOrigin ? "border-red-400" : ""}`}
      />
      {vehicleFormErrors.vehicleOrigin ? <p className="text-xs text-red-600">{vehicleFormErrors.vehicleOrigin}</p> : null}
    </div>

  <div className="space-y-1">
  <label className="text-sm text-slate-600">Chassis Number</label>
  <input
    value={vehicleForm.chassisNumber}
    onChange={(e)=>handleFieldChange("chassisNumber",e.target.value)}
    placeholder="Chassis Number"
    className="w-full rounded border px-3 py-2"
  />
</div>

    <div className="space-y-1">
      <label className="text-sm text-slate-600">Fuel Type</label>
      <select
        value={vehicleForm.fuelType}
        onChange={(e)=>handleFieldChange("fuelType",e.target.value)}
        className="w-full rounded border px-3 py-2"
      >
        <option value="">Choose Fuel Type</option>
        <option value="1">Petrol</option>
        <option value="2">Diesel</option>
        <option value="3">CNG</option>
        <option value="4">Electric</option>
        <option value="5">Hybrid</option>
      </select>
    </div>

<div className="space-y-1">
  <label className="text-sm text-slate-600">Extra KM Charge</label>
  <input
    value={vehicleForm.extraKmCharge}
    onChange={(e)=>handleFieldChange("extraKmCharge",e.target.value)}
    placeholder="Extra KM Charge"
    className="w-full rounded border px-3 py-2"
  />
</div>

<div className="space-y-1">
  <label className="text-sm text-slate-600">Early Morning Charges</label>
  <input
    value={vehicleForm.earlyMorningCharges}
    onChange={(e)=>handleFieldChange("earlyMorningCharges",e.target.value)}
    placeholder="Early Morning Charges"
    className="w-full rounded border px-3 py-2"
  />
</div>

<div className="space-y-1">
  <label className="text-sm text-slate-600">Evening Charges</label>
  <input
    value={vehicleForm.eveningCharges}
    onChange={(e)=>handleFieldChange("eveningCharges",e.target.value)}
    placeholder="Evening Charges"
    className="w-full rounded border px-3 py-2"
  />
</div>


<div className="space-y-1 md:col-span-2">
  <label className="text-sm text-slate-600">Vehicle Video URL</label>
  <input
    value={vehicleForm.vehicleVideoUrl}
    onChange={(e)=>handleFieldChange("vehicleVideoUrl",e.target.value)}
    placeholder="Vehicle Video URL"
    className="w-full rounded border px-3 py-2"
  />
</div>
<div className="space-y-1">
  <label className="text-sm text-slate-600">Insurance Policy Number</label>
  <input
    value={vehicleForm.insurancePolicyNumber}
    onChange={(e)=>handleFieldChange("insurancePolicyNumber",e.target.value)}
    placeholder="Insurance Policy Number"
    className="w-full rounded border px-3 py-2"
  />
</div>

    <div className="space-y-1">
      <label className="text-sm text-slate-600">Insurance Start Date</label>
      <DatePickerField
        value={vehicleForm.insuranceStartDate}
        onChange={(value)=>handleFieldChange("insuranceStartDate",value)}
        placeholder="Insurance Start Date"
      />
    </div>

    <div className="space-y-1">
      <label className="text-sm text-slate-600">Insurance End Date</label>
      <DatePickerField
        value={vehicleForm.insuranceEndDate}
        onChange={(value)=>handleFieldChange("insuranceEndDate",value)}
        placeholder="Insurance End Date"
      />
    </div>

 <div className="space-y-1">
  <label className="text-sm text-slate-600">Insurance Contact Number</label>
  <input
    value={vehicleForm.insuranceContactNumber}
    onChange={(e)=>handleFieldChange("insuranceContactNumber",e.target.value)}
    placeholder="Insurance Contact Number"
    className="w-full rounded border px-3 py-2"
  />
</div>

   <div className="space-y-1">
  <label className="text-sm text-slate-600">RTO Code</label>
  <input
    value={vehicleForm.rtoCode}
    onChange={(e)=>handleFieldChange("rtoCode",e.target.value)}
    placeholder="RTO Code"
    className="w-full rounded border px-3 py-2"
  />
</div>
  </div>

  <div className="space-y-4 pt-4">
    <div className="flex items-center gap-4">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="text-xl text-pink-500">☆</span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>

    <h3 className="text-[18px] font-semibold text-pink-600">
      Upload
    </h3>

    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      {vehicleDocuments.length === 0 ? (
        <>
          <div className="mb-4 text-[72px] leading-none text-slate-100">
            ⇧
          </div>

          <p className="mb-4 text-[18px] font-medium text-slate-600">
            No Documents Found
          </p>

          <button
  type="button"
  onClick={()=>setIsUploadModalOpen(true)}
  className="rounded-md bg-gradient-to-r from-violet-500 to-pink-500 px-5 py-3 text-sm font-semibold text-white"
>
  + Upload File
</button>

        </>
      ) : (
        <div className="w-full max-w-xl space-y-3">
          <p className="text-[18px] font-medium text-slate-600">
            Uploaded Documents
          </p>

          {vehicleDocuments.map((file,index)=>(
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-left"
            >
              <span className="truncate text-sm text-slate-700">
                {file.name}
              </span>

              <button
                type="button"
                onClick={()=>{
                  setVehicleDocuments(prev=>prev.filter((_,i)=>i!==index));
                }}
                className="text-sm font-semibold text-red-500"
              >
                Remove
              </button>
            </div>
          ))}

          <button
  type="button"
  onClick={()=>setIsUploadModalOpen(true)}
  className="inline-block rounded-md bg-gradient-to-r from-violet-500 to-pink-500 px-5 py-3 text-sm font-semibold text-white"
>
  + Upload More
</button>
        </div>
      )}
    </div>
  </div>

{isUploadModalOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div className="w-[520px] rounded-lg bg-white px-14 py-12 shadow-xl">
      <h2 className="mb-7 text-center text-[24px] font-semibold text-slate-900">
        Document Upload
      </h2>

      <div className="mb-6 space-y-2">
        <label className="text-sm text-slate-600">
          Document Type <span className="text-red-500">*</span>
        </label>

        <select
          value={uploadDocumentType}
          onChange={(e)=>setUploadDocumentType(e.target.value)}
          className="w-full rounded border border-slate-200 px-4 py-3 text-slate-600"
        >
          <option value="">Choose Type</option>
          <option value="RC Book">RC Book</option>
          <option value="Insurance">Insurance</option>
          <option value="Permit">Permit</option>
          <option value="Fitness Certificate">Fitness Certificate</option>
          <option value="Pollution Certificate">Pollution Certificate</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div className="mb-8 space-y-2">
        <label className="text-sm text-slate-600">
          Upload Document <span className="text-red-500">*</span>
        </label>

        <input
          type="file"
          onChange={(e)=>handleVehicleDocumentsChange(e.target.files?.[0] ?? null)}
          className="w-full rounded border border-slate-200 px-3 py-2"
        />
      </div>

      <div className="flex justify-center gap-2">
        <button
          type="button"
          onClick={()=>{
            setIsUploadModalOpen(false);
            setUploadDocumentType("");
            setUploadDocumentFile(null);
          }}
          className="rounded border border-violet-600 px-7 py-2 font-semibold text-violet-700"
        >
          Close
        </button>

        <button
          type="button"
          onClick={handleSaveVehicleDocument}
          className="rounded bg-gradient-to-r from-violet-500 to-pink-500 px-7 py-2 font-semibold text-white"
        >
          Save
        </button>
      </div>
    </div>
  </div>
)}

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

{deleteVehicleId !== null && (
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
  <div className="w-[380px] rounded-xl bg-white px-7 py-6 text-center shadow-xl">
    <div className="mb-4 text-[42px] text-slate-500">
      🗑
    </div>

    <h2 className="text-[22px] font-semibold text-slate-700">
      Are you sure?
    </h2>

    <p className="mt-3 text-[15px] text-slate-500">
      Do you really want to delete this vehicle?
    </p>

    <p className="text-[15px] text-slate-500">
      This process cannot be undone.
    </p>

    <div className="mt-6 flex justify-center gap-3">
      <button
        type="button"
        disabled={saving}
        onClick={()=>setDeleteVehicleId(null)}
        className="rounded bg-slate-200 px-5 py-2 text-slate-700"
      >
        Close
      </button>

      <button
        type="button"
        disabled={saving}
        onClick={()=>handleDeleteVehicle(deleteVehicleId)}
        className="rounded bg-red-500 px-5 py-2 text-white hover:bg-red-600 disabled:opacity-60"
      >
        {saving ? "Deleting..." : "Delete"}
      </button>
    </div>
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
