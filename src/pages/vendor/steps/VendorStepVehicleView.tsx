/* eslint-disable @typescript-eslint/no-explicit-any */
export function VendorStepVehicleView({ context }: { context: Record<string, any> }) {
  const { DatePickerField, branches, chassisNumber, cityOptions, countryOptions, deleteVehicleId, earlyMorningCharges, editingVehicleId, engineNumber, eveningCharges, extraKmCharge, filteredRows, getVehicleTypeLabel, handleCloseVehicleList, handleCopy, handleCsvExport, handleDeleteVehicle, handleEditVehicle, handleExcelExport, handleFieldChange, handleOpenAddVehicle, handlePdfExport, handleSaveVehicle, handleSaveVehicleDocument, handleToggleVehicleStatus, handleVehicleDocumentsChange, insuranceContactNumber, insurancePolicyNumber, isAddMode, isUploadModalOpen, isVehicleListOpen, items, loading, ownerContactNumber, ownerEmailId, ownerPincode, registrationNumber, rtoCode, saving, search, selectedBranch, selectedBranchId, setDeleteVehicleId, setIsAddMode, setIsUploadModalOpen, setIsVehicleListOpen, setSearch, setSelectedBranchId, setUploadDocumentFile, setUploadDocumentType, setVehicleDocuments, setVehicleForm, setVehicleFormErrors, stateOptions, statusUpdatingId, uploadDocumentType, vehicleDocuments, vehicleForm, vehicleFormErrors, vehicleTypeOptions, vehicleVideoUrl } = context;
  const { vendorId, onBack, onNext } = context;
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
            {"\u{1F698}"} {branch.vehicleCount}
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
              {"\u270E"}
            </button>

           <button
  type="button"
  onClick={()=>setDeleteVehicleId(row.id)}
  className="text-[22px] text-red-400 leading-none"
>
  {"\u{1F5D1}"}
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
  <label className="text-sm text-slate-600">
    Vehicle Origin
  </label>

  <input
    value={vehicleForm.vehicleOrigin}
    onChange={(e) => {
      handleFieldChange("vehicleOrigin", e.target.value);

      // The old stored-location ID belongs to the previous origin.
      // Clear it so backend resolves the newly entered origin.
      setVehicleForm((prev) => ({
        ...prev,
        vehicleOrigin: e.target.value,
        vehicleLocationId: "",
      }));
    }}
    placeholder="e.g. Bangalore, International Airport"
    className={`w-full rounded border px-3 py-2 ${
      vehicleFormErrors.vehicleOrigin ? "border-red-400" : ""
    }`}
  />

  {vehicleFormErrors.vehicleOrigin ? (
    <p className="text-xs text-red-600">
      {vehicleFormErrors.vehicleOrigin}
    </p>
  ) : null}
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
       <span className="text-xl text-pink-500">{"\u2606"}</span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>

    <h3 className="text-[18px] font-semibold text-pink-600">
      Upload
    </h3>

    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      {vehicleDocuments.length === 0 ? (
        <>
          <div className="mb-4 text-[72px] leading-none text-slate-100">
            {"\u21E7"}
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
  onClick={() => void handleSaveVehicle(false)}
  disabled={saving || !vendorId || !selectedBranchId}
  className="rounded bg-violet-500 px-6 py-2 text-white disabled:opacity-60"
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
      {"\u{1F5D1}"}
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

<button
  type="button"
  onClick={() => {
    if (isAddMode) {
      void handleSaveVehicle(true);
      return;
    }

    onNext();
  }}
  disabled={saving}
  className="bg-violet-500 text-white px-6 py-2 rounded disabled:opacity-60"
>
  {saving
    ? "Saving..."
    : editingVehicleId
      ? "Update & Continue"
      : isAddMode
        ? "Save & Continue"
        : "Skip & Continue"}
</button>

</div>

</div>

);

}
