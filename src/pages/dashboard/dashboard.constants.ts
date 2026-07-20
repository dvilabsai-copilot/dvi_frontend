export type ConfirmedDashboardTab = "overall" | "upcoming" | "ongoing" | "cancellation";

export const confirmedDashboardTabs: { key: ConfirmedDashboardTab; label: string }[] = [
  { key: "overall", label: "Overall" },
  { key: "upcoming", label: "Upcoming" },
  { key: "ongoing", label: "Ongoing" },
  { key: "cancellation", label: "Cancellation" },
];

export type LiveVehicleStatusTab = "onRoute" | "upcoming" | "idle" | "inService";

export const liveVehicleStatusTabs: { key: LiveVehicleStatusTab; label: string }[] = [
  { key: "onRoute", label: "On Route Vehicle" },
  { key: "upcoming", label: "Upcoming Vehicle" },
  { key: "idle", label: "Idle Vehicle" },
  { key: "inService", label: "In Service Vehicle" },
];

