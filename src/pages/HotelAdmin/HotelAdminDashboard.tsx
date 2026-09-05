import {
  useEffect,
  useState,
} from "react";
import {
  BedDouble,
  Building2,
  CalendarCheck,
  Loader2,
  Users,
} from "lucide-react";

import {
  HotelAdminAPI,
  type HotelAdminContext,
  type HotelAdminDashboard as DashboardData,
} from "@/services/hotelAdminService";

type DashboardCard = {
  label: string;
  value: number;
  icon: typeof Building2;
};

export default function HotelAdminDashboard() {
  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null);

  const [context, setContext] =
    useState<HotelAdminContext | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const [dashboardResult, contextResult] =
          await Promise.all([
            HotelAdminAPI.dashboard(),
            HotelAdminAPI.me(),
          ]);

        if (cancelled) return;

        setDashboard(dashboardResult);
        setContext(contextResult);
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load Hotel Admin dashboard.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading dashboard...
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {error || "Dashboard data is unavailable."}
      </div>
    );
  }

  const cards: DashboardCard[] = [
    {
      label: "Hotels",
      value: dashboard.hotels,
      icon: Building2,
    },
    {
      label: "Hotel Users",
      value: dashboard.hotelUsers,
      icon: Users,
    },
    {
      label: "Rooms",
      value: dashboard.rooms,
      icon: BedDouble,
    },
    {
      label: "Active Bookings",
      value: dashboard.activeBookings,
      icon: CalendarCheck,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Hotel Administration
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Welcome
          {context?.user?.fullName
            ? `, ${context.user.fullName}`
            : ""}
          . Manage your assigned hotels using live DVI data.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="rounded-xl border bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {card.label}
                  </p>

                  <p className="mt-2 text-3xl font-bold tracking-tight">
                    {card.value.toLocaleString()}
                  </p>
                </div>

                <div className="rounded-xl bg-primary/10 p-3 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">
              Assigned Hotel Access
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Your account currently has access to{" "}
              <strong>
                {context?.assignedHotelCount?.toLocaleString() ?? 0}
              </strong>{" "}
              hotel
              {context?.assignedHotelCount === 1
                ? ""
                : "s"}.
            </p>
          </div>

          {context?.defaultHotel ? (
            <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm">
              <div className="text-xs uppercase text-muted-foreground">
                Default hotel
              </div>

              <div className="mt-1 font-semibold">
                {context.defaultHotel.hotel_name ||
                  `Hotel #${context.defaultHotel.hotel_id}`}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}