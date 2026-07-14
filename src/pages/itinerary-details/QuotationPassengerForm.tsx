import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import type { AdditionalPassenger, GuestDetails } from "../itinerary-details/hooks/useQuotationState";

type PassengerLabel = "adult" | "child" | "infant";
type PassengerField = "title" | "name" | "age" | "nationality";
const ALLOWED_TITLES = ["Mr", "Ms", "Mrs"] as const;

type QuotationPassengerFormProps = {
  guestDetails: GuestDetails;
  setGuestDetails: Dispatch<SetStateAction<GuestDetails>>;
  formErrors: Record<string, string>;
  setFormErrors: Dispatch<SetStateAction<Record<string, string>>>;
  requiresDetailedPassengerFlow: boolean;
  additionalAdults: AdditionalPassenger[];
  setAdditionalAdults: Dispatch<SetStateAction<AdditionalPassenger[]>>;
  additionalChildren: AdditionalPassenger[];
  setAdditionalChildren: Dispatch<SetStateAction<AdditionalPassenger[]>>;
  additionalInfants: AdditionalPassenger[];
  setAdditionalInfants: Dispatch<SetStateAction<AdditionalPassenger[]>>;
  defaultPassenger: (title: string) => AdditionalPassenger;
  getPassengerFieldError: (label: PassengerLabel, index: number, field: PassengerField) => string | undefined;
};

export function QuotationPassengerForm({
  guestDetails,
  setGuestDetails,
  formErrors,
  setFormErrors,
  requiresDetailedPassengerFlow,
  additionalAdults,
  setAdditionalAdults,
  additionalChildren,
  setAdditionalChildren,
  additionalInfants,
  setAdditionalInfants,
  defaultPassenger,
  getPassengerFieldError,
}: QuotationPassengerFormProps) {
  return (
<div className="space-y-3">
  <h3 className="font-semibold text-[#4a4260]">Primary Guest Details - Adult 1</h3>

  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
    <div className="sm:col-span-1">
      <label className="text-sm font-medium text-[#4a4260] mb-1 block">
        Salutation
      </label>
      <select
        className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
        value={guestDetails.salutation}
        onChange={(e) => setGuestDetails({ ...guestDetails, salutation: e.target.value })}
      >
        <option value="Mr">Mr</option>
        <option value="Ms">Ms</option>
        <option value="Mrs">Mrs</option>
        <option value="Miss">Miss</option>
        <option value="Mx">Mx</option>
        <option value="Dr">Dr</option>
      </select>
    </div>

    <div className="sm:col-span-2">
      <label className="text-sm font-medium text-[#4a4260] mb-1 block">
        Name <span className="text-red-500">*</span>
      </label>
      <input
        type="text"
        className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
        placeholder="Enter the Name"
        value={guestDetails.name}
        onChange={(e) => {
          setGuestDetails({ ...guestDetails, name: e.target.value });
          setFormErrors((prev) => {
            const next = { ...prev };
            delete next['primary-name'];
            return next;
          });
        }}
      />
      {formErrors['primary-name'] && <p className="text-[11px] text-red-600 mt-1">{formErrors['primary-name']}</p>}
    </div>

    <div className="sm:col-span-1">
      <label className="text-sm font-medium text-[#4a4260] mb-1 block">
        Age
      </label>
      <input
        type="text"
        className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
        placeholder="Enter the Age"
        value={guestDetails.age}
        onChange={(e) => setGuestDetails({ ...guestDetails, age: e.target.value })}
      />
      {formErrors['primary-age'] && <p className="text-[11px] text-red-600 mt-1">{formErrors['primary-age']}</p>}
    </div>
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div>
      <label className="text-sm font-medium text-[#4a4260] mb-1 block">
        Primary Contact No. <span className="text-red-500">*</span>
      </label>
      <input
        type="text"
        className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
        placeholder="Enter the Contact No"
        value={guestDetails.contactNo}
        onChange={(e) => {
          setGuestDetails({ ...guestDetails, contactNo: e.target.value });
          setFormErrors((prev) => {
            const next = { ...prev };
            delete next['primary-contactNo'];
            return next;
          });
        }}
      />
      {formErrors['primary-contactNo'] && <p className="text-[11px] text-red-600 mt-1">{formErrors['primary-contactNo']}</p>}
    </div>

    <div>
      <label className="text-sm font-medium text-[#4a4260] mb-1 block">
        Alternative Contact No.
      </label>
      <input
        type="text"
        className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
        placeholder="Enter the Alternative Contact No"
        value={guestDetails.alternativeContactNo}
        onChange={(e) => setGuestDetails({ ...guestDetails, alternativeContactNo: e.target.value })}
      />
    </div>
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
    <div>
      <label className="text-sm font-medium text-[#4a4260] mb-1 block">
        Nationality <span className="text-red-500">*</span>
        <span className="ml-1 text-[10px] text-[#8b43d1] font-normal">(locked from search)</span>
      </label>
      <input
        type="text"
        className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg bg-[#f9f7fc] text-[#4a4260] cursor-not-allowed"
        placeholder="IN"
        value={guestDetails.nationality}
        readOnly
        title="Nationality is locked from itinerary search and cannot be changed at booking time"
      />
      {formErrors['primary-nationality'] && <p className="text-[11px] text-red-600 mt-1">{formErrors['primary-nationality']}</p>}
    </div>
    <div>
      <label className="text-sm font-medium text-[#4a4260] mb-1 block">
        PAN (Optional)
      </label>
      <input
        type="text"
        className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
        placeholder="ABCDE1234F"
        value={guestDetails.panNo}
        onChange={(e) => setGuestDetails({ ...guestDetails, panNo: e.target.value.toUpperCase() })}
      />
    </div>
    <div>
      <label className="text-sm font-medium text-[#4a4260] mb-1 block">
        Passport No (Optional)
      </label>
      <input
        type="text"
        className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
        placeholder="Passport number"
        value={guestDetails.passportNo}
        onChange={(e) => setGuestDetails({ ...guestDetails, passportNo: e.target.value.toUpperCase() })}
      />
    </div>
  </div>

  <div>
    <label className="text-sm font-medium text-[#4a4260] mb-1 block">
      Email ID
    </label>
    <input
      type="email"
      className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
      placeholder="Enter the Email ID"
      value={guestDetails.emailId}
      onChange={(e) => setGuestDetails({ ...guestDetails, emailId: e.target.value })}
    />
  </div>

  {requiresDetailedPassengerFlow && (
    <>
  {/* Additional Adults */}
  <div className="space-y-3 pt-2">
    <div className="flex items-center justify-between">
      <h4 className="text-sm font-semibold text-[#4a4260]">Additional Adults</h4>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setAdditionalAdults([...additionalAdults, defaultPassenger('Mr')])}
        className="h-8 px-2 text-xs border-[#e5d9f2] text-[#8b43d1] hover:bg-[#f8f4ff]"
      >
        <Plus className="w-3 h-3 mr-1" /> Add Adult
      </Button>
    </div>
    {formErrors['count-adult'] && <p className="text-[11px] text-red-600">{formErrors['count-adult']}</p>}
    {additionalAdults.map((adult, index) => (
      <div key={index} className="space-y-2 rounded-lg border border-[#f0e6fb] p-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
          <div className="sm:col-span-2">
            <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Title</label>
            <select
              className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg"
              value={adult.title}
              onChange={(e) => {
                const next = [...additionalAdults];
                next[index].title = e.target.value;
                setAdditionalAdults(next);
              }}
            >
              {ALLOWED_TITLES.map((title) => (
                <option key={title} value={title}>{title}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-5">
            <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Adult {index + 2} Name</label>
            <input
              type="text"
              className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg"
              placeholder="Name"
              value={adult.name}
              onChange={(e) => {
                const next = [...additionalAdults];
                next[index].name = e.target.value;
                setAdditionalAdults(next);
              }}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Age</label>
            <input
              type="text"
              className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg"
              placeholder="Age"
              value={adult.age}
              onChange={(e) => {
                const next = [...additionalAdults];
                next[index].age = e.target.value;
                setAdditionalAdults(next);
              }}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Nationality</label>
            <input
              type="text"
              className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg bg-[#f9f7fc] text-[#4a4260] cursor-not-allowed"
              placeholder="IN"
              value={adult.nationality}
              readOnly
              title="Nationality is locked from itinerary search"
            />
          </div>
          <div className="sm:col-span-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAdditionalAdults(additionalAdults.filter((_, i) => i !== index))}
              className="h-9 w-full text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="text"
            className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg"
            placeholder="PAN (Optional)"
            value={adult.panNo}
            onChange={(e) => {
              const next = [...additionalAdults];
              next[index].panNo = e.target.value.toUpperCase();
              setAdditionalAdults(next);
            }}
          />
          <input
            type="text"
            className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg"
            placeholder="Passport No (Optional)"
            value={adult.passportNo}
            onChange={(e) => {
              const next = [...additionalAdults];
              next[index].passportNo = e.target.value.toUpperCase();
              setAdditionalAdults(next);
            }}
          />
        </div>
        {(getPassengerFieldError('adult', index, 'title') ||
          getPassengerFieldError('adult', index, 'name') ||
          getPassengerFieldError('adult', index, 'age') ||
          getPassengerFieldError('adult', index, 'nationality')) && (
          <p className="text-[11px] text-red-600">
            {getPassengerFieldError('adult', index, 'title') ||
              getPassengerFieldError('adult', index, 'name') ||
              getPassengerFieldError('adult', index, 'age') ||
              getPassengerFieldError('adult', index, 'nationality')}
          </p>
        )}
      </div>
    ))}
  </div>

  {/* Additional Children */}
  <div className="space-y-3 pt-2">
    <div className="flex items-center justify-between">
      <h4 className="text-sm font-semibold text-[#4a4260]">Children (5-12 years)</h4>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setAdditionalChildren([...additionalChildren, defaultPassenger('Ms')])}
        className="h-8 px-2 text-xs border-[#e5d9f2] text-[#8b43d1] hover:bg-[#f8f4ff]"
      >
        <Plus className="w-3 h-3 mr-1" /> Add Child
      </Button>
    </div>
    {formErrors['count-child'] && <p className="text-[11px] text-red-600">{formErrors['count-child']}</p>}
    {additionalChildren.map((child, index) => (
      <div key={index} className="space-y-2 rounded-lg border border-[#f0e6fb] p-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
          <div className="sm:col-span-2">
            <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Title</label>
            <select
              className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg"
              value={child.title}
              onChange={(e) => {
                const next = [...additionalChildren];
                next[index].title = e.target.value;
                setAdditionalChildren(next);
              }}
            >
              {ALLOWED_TITLES.map((title) => (
                <option key={title} value={title}>{title}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-5">
            <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Child {index + 1} Name</label>
            <input type="text" className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg" placeholder="Name" value={child.name} onChange={(e) => { const next = [...additionalChildren]; next[index].name = e.target.value; setAdditionalChildren(next); }} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Age</label>
            <input
              type="text"
              className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg bg-[#f9f7fc] text-[#6c6c6c]"
              placeholder="Age"
              value={child.age}
              readOnly
              title="Child age is locked from itinerary/search and cannot be changed at booking time"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Nationality</label>
            <input type="text" className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg bg-[#f9f7fc] text-[#4a4260] cursor-not-allowed" placeholder="IN" value={child.nationality} readOnly title="Nationality is locked from itinerary search" />
          </div>
          <div className="sm:col-span-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setAdditionalChildren(additionalChildren.filter((_, i) => i !== index))} className="h-9 w-full text-red-500 hover:text-red-700 hover:bg-red-50">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input type="text" className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg" placeholder="PAN (Optional)" value={child.panNo} onChange={(e) => { const next = [...additionalChildren]; next[index].panNo = e.target.value.toUpperCase(); setAdditionalChildren(next); }} />
          <input type="text" className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg" placeholder="Passport No (Optional)" value={child.passportNo} onChange={(e) => { const next = [...additionalChildren]; next[index].passportNo = e.target.value.toUpperCase(); setAdditionalChildren(next); }} />
        </div>
        {(getPassengerFieldError('child', index, 'title') ||
          getPassengerFieldError('child', index, 'name') ||
          getPassengerFieldError('child', index, 'age') ||
          getPassengerFieldError('child', index, 'nationality')) && (
          <p className="text-[11px] text-red-600">
            {getPassengerFieldError('child', index, 'title') ||
              getPassengerFieldError('child', index, 'name') ||
              getPassengerFieldError('child', index, 'age') ||
              getPassengerFieldError('child', index, 'nationality')}
          </p>
        )}
      </div>
    ))}
  </div>

  {/* Additional Infants */}
  <div className="space-y-3 pt-2">
    <div className="flex items-center justify-between">
      <h4 className="text-sm font-semibold text-[#4a4260]">Infants (Below 5 years)</h4>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setAdditionalInfants([...additionalInfants, defaultPassenger('Ms')])}
        className="h-8 px-2 text-xs border-[#e5d9f2] text-[#8b43d1] hover:bg-[#f8f4ff]"
      >
        <Plus className="w-3 h-3 mr-1" /> Add Infant
      </Button>
    </div>
    {formErrors['count-infant'] && <p className="text-[11px] text-red-600">{formErrors['count-infant']}</p>}
    {additionalInfants.map((infant, index) => (
      <div key={index} className="space-y-2 rounded-lg border border-[#f0e6fb] p-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
          <div className="sm:col-span-2">
            <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Title</label>
            <select
              className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg"
              value={infant.title}
              onChange={(e) => {
                const next = [...additionalInfants];
                next[index].title = e.target.value;
                setAdditionalInfants(next);
              }}
            >
              {ALLOWED_TITLES.map((title) => (
                <option key={title} value={title}>{title}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-5">
            <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Infant {index + 1} Name</label>
            <input type="text" className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg" placeholder="Name" value={infant.name} onChange={(e) => { const next = [...additionalInfants]; next[index].name = e.target.value; setAdditionalInfants(next); }} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Age</label>
            <input type="text" className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg bg-[#f9f7fc] text-[#6c6c6c]" placeholder="Age" value={infant.age} readOnly title="Infant age is locked from itinerary/search and cannot be changed at booking time" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-medium text-[#4a4260] mb-1 block">Nationality</label>
            <input type="text" className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg bg-[#f9f7fc] text-[#4a4260] cursor-not-allowed" placeholder="IN" value={infant.nationality} readOnly title="Nationality is locked from itinerary search" />
          </div>
          <div className="sm:col-span-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setAdditionalInfants(additionalInfants.filter((_, i) => i !== index))} className="h-9 w-full text-red-500 hover:text-red-700 hover:bg-red-50">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input type="text" className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg" placeholder="PAN (Optional)" value={infant.panNo} onChange={(e) => { const next = [...additionalInfants]; next[index].panNo = e.target.value.toUpperCase(); setAdditionalInfants(next); }} />
          <input type="text" className="w-full px-2 py-1.5 text-sm border border-[#e5d9f2] rounded-lg" placeholder="Passport No (Optional)" value={infant.passportNo} onChange={(e) => { const next = [...additionalInfants]; next[index].passportNo = e.target.value.toUpperCase(); setAdditionalInfants(next); }} />
        </div>
        {(getPassengerFieldError('infant', index, 'title') ||
          getPassengerFieldError('infant', index, 'name') ||
          getPassengerFieldError('infant', index, 'age') ||
          getPassengerFieldError('infant', index, 'nationality')) && (
          <p className="text-[11px] text-red-600">
            {getPassengerFieldError('infant', index, 'title') ||
              getPassengerFieldError('infant', index, 'name') ||
              getPassengerFieldError('infant', index, 'age') ||
              getPassengerFieldError('infant', index, 'nationality')}
          </p>
        )}
      </div>
    ))}
  </div>
    </>
  )}
</div>

  );
}
