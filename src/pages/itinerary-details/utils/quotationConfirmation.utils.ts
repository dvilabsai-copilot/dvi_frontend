interface ConfirmationGuestDetails {
  salutation: string;
  name: string;
  contactNo: string;
  age: string | number;
  alternativeContactNo: string;
  emailId: string;
  arrivalDateTime: string;
  arrivalPlace: string;
  arrivalFlightDetails: string;
  departureDateTime: string;
  departurePlace: string;
  departureFlightDetails: string;
}

interface ConfirmationPassenger {
  name: string;
  age: string | number;
}

interface QuotationConfirmationPayloadOptions {
  planId: number | string;
  agentId: number | string;
  guestDetails: ConfirmationGuestDetails;
  additionalAdults: ConfirmationPassenger[];
  additionalChildren: ConfirmationPassenger[];
  additionalInfants: ConfirmationPassenger[];
  requiresDetailedPassengerFlow: boolean;
  priceConfirmationType: string;
  primaryGuest: Record<string, unknown>;
  endUserIp?: string;
  requiresHotelBookingFlow: boolean;
  selectedGroupType: string;
  hotelBookings: readonly Record<string, unknown>[];
  selectedHotelRouteIds: number[];
  externalStayRouteIds: number[];
}

/** Builds the final confirmation request without owning any validation or API side effects. */
export const buildQuotationConfirmationPayload = ({
  planId,
  agentId,
  guestDetails,
  additionalAdults,
  additionalChildren,
  additionalInfants,
  requiresDetailedPassengerFlow,
  priceConfirmationType,
  primaryGuest,
  endUserIp,
  requiresHotelBookingFlow,
  selectedGroupType,
  hotelBookings,
  selectedHotelRouteIds,
  externalStayRouteIds,
}: QuotationConfirmationPayloadOptions): Record<string, unknown> => {
  const payload: Record<string, unknown> = {
    itinerary_plan_ID: planId,
    agent: agentId,
    primary_guest_salutation: guestDetails.salutation,
    primary_guest_name: guestDetails.name,
    primary_guest_contact_no: guestDetails.contactNo,
    primary_guest_age: guestDetails.age,
    primary_guest_alternative_contact_no: guestDetails.alternativeContactNo,
    primary_guest_email_id: guestDetails.emailId,
    adult_name: requiresDetailedPassengerFlow ? additionalAdults.map((adult) => adult.name) : [],
    adult_age: requiresDetailedPassengerFlow ? additionalAdults.map((adult) => adult.age) : [],
    child_name: requiresDetailedPassengerFlow ? additionalChildren.map((child) => child.name) : [],
    child_age: requiresDetailedPassengerFlow ? additionalChildren.map((child) => child.age) : [],
    infant_name: requiresDetailedPassengerFlow ? additionalInfants.map((infant) => infant.name) : [],
    infant_age: requiresDetailedPassengerFlow ? additionalInfants.map((infant) => infant.age) : [],
    arrival_date_time: guestDetails.arrivalDateTime,
    arrival_place: guestDetails.arrivalPlace,
    arrival_flight_details: guestDetails.arrivalFlightDetails,
    departure_date_time: guestDetails.departureDateTime,
    departure_place: guestDetails.departurePlace,
    departure_flight_details: guestDetails.departureFlightDetails,
    price_confirmation_type: priceConfirmationType,
    primaryGuest,
    endUserIp,
  };

  if (requiresHotelBookingFlow) {
    payload.hotel_group_type = selectedGroupType;
    payload.hotel_bookings = hotelBookings;
    payload.selected_hotel_route_ids = selectedHotelRouteIds;
    payload.external_stay_route_ids = externalStayRouteIds;
  }

  return payload;
};
