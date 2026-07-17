/* eslint-disable @typescript-eslint/no-explicit-any */
// FILE: src/pages/vendor/steps/VendorStepVehicle.tsx
import React,{useEffect,useMemo,useState} from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import {api} from "@/lib/api";
import { Calendar } from "@/components/ui/calendar";
import { VendorStepVehicleView } from "./VendorStepVehicleView";
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
useEffect(() => {
  if (!selectedBranch || !isAddMode || editingVehicleId) return;
  setVehicleForm((prev) => ({
    ...prev,
    country: selectedBranch.countryId
      ? String(selectedBranch.countryId)
      : prev.country,
    state: selectedBranch.stateId
      ? String(selectedBranch.stateId)
      : prev.state,
    city: selectedBranch.cityId
      ? String(selectedBranch.cityId)
      : prev.city,
    // Vehicle Origin is independent from Branch Location
    vehicleOrigin: prev.vehicleOrigin,
    vehicleLocationId: prev.vehicleLocationId,
  }));
}, [selectedBranch, isAddMode, editingVehicleId]);
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
  country: selectedBranch?.countryId
    ? String(selectedBranch.countryId)
    : "",
  state: selectedBranch?.stateId
    ? String(selectedBranch.stateId)
    : "",
  city: selectedBranch?.cityId
    ? String(selectedBranch.cityId)
    : "",
  vehicleOrigin: "",
  vehicleLocationId: "",
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
vehicleOrigin: String(
  v.vehicle_origin ||
  v.vehicle_orign ||
  ""
),
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
const handleSaveVehicle = async (
  continueToNextStep: boolean = false
) => {
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
vehicle_origin: String(vehicleForm.vehicleOrigin || "").trim(),
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
vehicle_location_id: vehicleForm.vehicleLocationId
  ? Number(vehicleForm.vehicleLocationId)
  : null,
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
  country: selectedBranch?.countryId
    ? String(selectedBranch.countryId)
    : "",
  state: selectedBranch?.stateId
    ? String(selectedBranch.stateId)
    : "",
  city: selectedBranch?.cityId
    ? String(selectedBranch.cityId)
    : "",
  vehicleOrigin: "",
  vehicleLocationId: "",
});
setVehicleDocuments([]);
setVehicleFormErrors({});
if (continueToNextStep) {
  onNext();
}
} catch (e: any) {
  console.error("Failed to save vehicle", e);
  alert(
    e?.message ||
    "Failed to save vehicle. Please check the entered details and try again."
  );
} finally {
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
  const vehicleViewContext = {
    DatePickerField,
    vendorId,
    onBack,
    onNext,
    branches,
    cityOptions,
    countryOptions,
    deleteVehicleId,
    editingVehicleId,
    filteredRows,
    getVehicleTypeLabel,
    handleCloseVehicleList,
    handleCopy,
    handleCsvExport,
    handleDeleteVehicle,
    handleEditVehicle,
    handleExcelExport,
    handleFieldChange,
    handleOpenAddVehicle,
    handlePdfExport,
    handleSaveVehicle,
    handleSaveVehicleDocument,
    handleToggleVehicleStatus,
    handleVehicleDocumentsChange,
    isAddMode,
    isUploadModalOpen,
    isVehicleListOpen,
    loading,
    saving,
    search,
    selectedBranch,
    selectedBranchId,
    setDeleteVehicleId,
    setIsAddMode,
    setIsUploadModalOpen,
    setIsVehicleListOpen,
    setSearch,
    setSelectedBranchId,
    setUploadDocumentFile,
    setUploadDocumentType,
    setVehicleDocuments,
    setVehicleForm,
    setVehicleFormErrors,
    stateOptions,
    statusUpdatingId,
    uploadDocumentType,
    vehicleDocuments,
    vehicleForm,
    vehicleFormErrors,
    vehicleTypeOptions,
  };
  return <VendorStepVehicleView context={vehicleViewContext} />;
};
