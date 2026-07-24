// FILE: src/types/exportPricebook.ts

export type VehiclePricebookRow = {
  vendorName: string;
  vendorBranch: string;
  vehicleType: string;
  month: string;
  year: string;
  costType: "Local" | "Outstation";
  localTimeLimit: string;
  outstationKmLimit: string;
  days: number[];
};

export type VehiclePricebookResponse = {
  count: number;
  rows: VehiclePricebookRow[];
};

export type ActivityPricebookRow = {
  activityPriceBookId: number;
  activityId: number;
  activityName: string;
  hotspotId: number;
  hotspotName: string;
  nationality: number;
  nationalityLabel: string;
  month: string;
  year: string;
  days: number[];
};

export type ActivityPricebookResponse = {
  count: number;
  rows: ActivityPricebookRow[];
};

export type TollPricebookRow = {
  id: number;
  sourceLocation: string;
  destinationLocation: string;
  vehicleTypeId: number;
  vehicleTypeTitle: string;
  tollCharge: number;
};

export type TollPricebookResponse = {
  count: number;
  rows: TollPricebookRow[];
};

export type ParkingPricebookRow = {
  id: string;
  hotspotId: string;
  hotspotName: string;
  hotspotLocation: string;
  vehicleTypeId: number;
  vehicleTypeName: string;
  parkingCharge: number;
};

export type ParkingPricebookResponse = {
  count: number;
  rows: ParkingPricebookRow[];
};

// ---------------- Query DTOs (frontend) ----------------

export type VehiclePricebookQuery = {
  vendorId?: number;
  vendorBranchId?: number;
  month?: string;
  year?: string;
};

export type HotelRoomExportQuery = {
  stateId: number;
  cityId: number;
 startDate: string; // YYYY-MM-DD
 endDate: string; // YYYY-MM-DD
};

export type HotelAmenityExportQuery = {
  stateId: number;
  cityId: number;
  month: string;
  year: string;
};

export type GuideExportQuery = {
  month: string;
  year: string;
};

export type HotspotExportQuery = {
  hotspotLocation: string;
};

export type ActivityQuery = {
  month: string;
  year: string;
};

export type TollQuery = {
  vehicleTypeId: number;
};

export type ParkingQuery = {
  vehicleTypeId?: number;
  hotspotLocation?: string;
};
