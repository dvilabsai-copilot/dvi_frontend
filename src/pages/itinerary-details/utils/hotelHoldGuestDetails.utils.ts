type GuestDetails = {
  name?: unknown;
  contactNo?: unknown;
  emailId?: unknown;
  age?: unknown;
};

/** Guest details are persistable when they satisfy the guest-details endpoint contract. */
export const canPersistHotelHoldGuestDetails = (guest: GuestDetails): boolean => {
  const age = Number(String(guest.age ?? "").trim());
  return Boolean(
    String(guest.name || "").trim()
    && String(guest.contactNo || "").trim()
    && String(guest.emailId || "").trim()
    && Number.isFinite(age)
    && age > 0,
  );
};
