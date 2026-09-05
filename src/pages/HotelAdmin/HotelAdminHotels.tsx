import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  HotelAdminAPI,
  setHotelAdminSelectedHotelId,
  type HotelAdminHotel,
} from "@/services/hotelAdminService";

const PAGE_SIZE = 25;

function isActive(
  status: HotelAdminHotel["status"],
) {
  return (
    status === 1 ||
    status === true ||
    String(status) === "1"
  );
}

function hotelLocation(
  hotel: HotelAdminHotel,
) {
  return [
    hotel.hotel_city,
    hotel.hotel_state,
  ]
    .filter(Boolean)
    .join(", ") || "-";
}

export default function HotelAdminHotels() {
  const navigate = useNavigate();

  const [items, setItems] =
    useState<HotelAdminHotel[]>([]);

  const [searchInput, setSearchInput] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [total, setTotal] =
    useState(0);

  const [totalPages, setTotalPages] =
    useState(0);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchInput]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const result =
        await HotelAdminAPI.hotels({
          page,
          limit: PAGE_SIZE,
          search,
        });

      setItems(
        Array.isArray(result.items)
          ? result.items
          : [],
      );

      setTotal(
        Number(
          result.pagination?.total ?? 0,
        ),
      );

      setTotalPages(
        Number(
          result.pagination?.totalPages ?? 0,
        ),
      );
    } catch (err) {
      setItems([]);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load hotels.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void load();
  }, [load]);

  function manageHotel(
    hotel: HotelAdminHotel,
  ) {
    setHotelAdminSelectedHotelId(
      hotel.hotel_id,
    );

    navigate(
      `/hotel-admin/hotel-details?hotelId=${hotel.hotel_id}`,
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Hotels
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Manage hotels assigned to your Hotel Admin account.
          </p>
        </div>

        <div className="text-sm text-muted-foreground">
          {total.toLocaleString()} assigned hotel
          {total === 1 ? "" : "s"}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={searchInput}
              onChange={(event) =>
                setSearchInput(
                  event.target.value,
                )
              }
              placeholder="Search hotel name, code, city or state..."
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="border-b border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-5 py-3">
                  Hotel
                </th>

                <th className="px-5 py-3">
                  Code
                </th>

                <th className="px-5 py-3">
                  Location
                </th>

                <th className="px-5 py-3">
                  Contact
                </th>

                <th className="px-5 py-3">
                  Status
                </th>

                <th className="px-5 py-3 text-right">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {!loading &&
              items.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-muted-foreground"
                  >
                    No assigned hotels found.
                  </td>
                </tr>
              ) : null}

              {items.map((hotel) => {
                const active =
                  isActive(hotel.status);

                return (
                  <tr key={hotel.hotel_id}>
                    <td className="px-5 py-4">
                      <div className="font-medium">
                        {hotel.hotel_name ||
                          `Hotel #${hotel.hotel_id}`}
                      </div>

                      <div className="mt-1 text-xs text-muted-foreground">
                        ID: {hotel.hotel_id}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {hotel.hotel_code || "-"}
                    </td>

                    <td className="px-5 py-4">
                      {hotelLocation(hotel)}
                    </td>

                    <td className="px-5 py-4">
                      <div>
                        {hotel.hotel_email || "-"}
                      </div>

                      {hotel.hotel_mobile ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {hotel.hotel_mobile}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={
                          active
                            ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
                            : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                        }
                      >
                        {active
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          manageHotel(hotel)
                        }
                      >
                        Manage
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Page {totalPages === 0 ? 0 : page}
            {" of "}
            {totalPages.toLocaleString()}
            {" · "}
            {total.toLocaleString()} total
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                loading ||
                page <= 1
              }
              onClick={() =>
                setPage((current) =>
                  Math.max(
                    1,
                    current - 1,
                  ),
                )
              }
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                loading ||
                totalPages === 0 ||
                page >= totalPages
              }
              onClick={() =>
                setPage((current) =>
                  current + 1,
                )
              }
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}