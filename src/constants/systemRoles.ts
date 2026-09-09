export const USER_ROLES = {
  ADMIN: 1,
  VENDOR: 2,
  STAFF: 3,
  AGENT: 4,
  GUIDE: 5,
  ACCOUNTS: 6,
  TRAVEL_EXPERT: 8,
  VEHICLE_AGENT: 9,
  HOTEL_ADMIN: 10,
} as const;

export type UserRoleId = (typeof USER_ROLES)[keyof typeof USER_ROLES];
