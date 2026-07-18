/* eslint-disable @typescript-eslint/no-explicit-any */
import { Truck, ChevronRight, ChevronDown, MapPin, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardAdminOverview } from "./DashboardAdminOverview";

export function DashboardAdminView({ context }: { context: Record<string, any> }) {
  const { dashboardData, navigate, api, setApi, current, confirmedDashboardTabs, liveVehicleStatusTabs, confirmedItineraries, confirmedLoading, confirmedSearch, confirmedEntries, confirmedPage, confirmedTotal, confirmedActiveTab, agentWiseItineraries, agentWiseLoading, agentWiseSearch, agentWiseEntries, agentWisePage, agentWiseTotal, liveVehicleRows, liveVehicleLoading, liveVehicleSearch, liveVehicleEntries, liveVehiclePage, liveVehicleTotal, liveVehicleActiveTab, mostVisitedHotels, mostVisitedHotelsLoading, mostVisitedHotelsYear, starPerformerTab, openDailyMomentQuote, setConfirmedActiveTab, setConfirmedSearch, setConfirmedEntries, setConfirmedPage, setAgentWiseSearch, setAgentWiseEntries, setAgentWisePage, setLiveVehicleActiveTab, setLiveVehicleSearch, setLiveVehicleEntries, setLiveVehiclePage, setMostVisitedHotelsYear, setStarPerformerTab, setOpenDailyMomentQuote, keepCurrentScroll, adminData, confirmedTotalPages, confirmedStartEntry, confirmedEndEntry, agentWiseTotalPages, agentWiseStartEntry, agentWiseEndEntry, liveVehicleTotalPages, liveVehicleStartEntry, liveVehicleEndEntry, dailyMomentRows, toDashboardYmd, formatDashboardDate } = context;
return (
    <div className="p-8 space-y-6">
      <DashboardAdminOverview adminData={adminData} api={api} setApi={setApi} current={current} />
      {/* Daily Moment and Star Performers */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* Daily Moment */}
  <Card className="p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-bold">Daily Moment</h3>
      <input
        type="date"
        defaultValue={toDashboardYmd(new Date())}
        className="px-3 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>

    <div className="space-y-5">
    {dailyMomentRows.length > 0 ? (
  dailyMomentRows.map((moment, index) => (


<div key={index} className="space-y-3">
  <div
    onClick={() =>
      setOpenDailyMomentQuote((prev) =>
        prev === moment.quoteId ? null : moment.quoteId
      )
    }
    className="flex items-center gap-4 p-5 rounded-xl hover:bg-secondary/70 transition-all cursor-pointer"
  >
    <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
      <Truck className="h-6 w-6 text-muted-foreground" />
    </div>

    <div className="flex-1 min-w-0">
      <p className="text-xl font-medium text-primary">{moment.quoteId}</p>
      <p className="text-base text-muted-foreground">{moment.location}</p>
    </div>

    {openDailyMomentQuote === moment.quoteId ? (
      <ChevronDown className="h-6 w-6 text-muted-foreground" />
    ) : (
      <ChevronRight className="h-6 w-6 text-muted-foreground" />
    )}
  </div>

  {openDailyMomentQuote === moment.quoteId && (
    <div className="ml-16 space-y-5 border-l border-dashed border-gray-300 pl-6">
      <div className="flex gap-4">
        <CheckCircle2 className="mt-1 h-6 w-6 text-green-500" />
        <div>
          <p className="text-base font-semibold uppercase text-green-500">
            {confirmedItineraries.find((x) => x.booking_quote_id === moment.quoteId)
              ?.arrival_location || "-"}
          </p>
          <p className="text-base text-muted-foreground">
            {formatDashboardDate(
              confirmedItineraries.find((x) => x.booking_quote_id === moment.quoteId)
                ?.arrival_date || ""
            )}
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        <MapPin className="mt-1 h-6 w-6 text-primary" />
        <div>
          <p className="text-base font-semibold uppercase text-muted-foreground">
            {confirmedItineraries.find((x) => x.booking_quote_id === moment.quoteId)
              ?.departure_location || "-"}
          </p>
          <p className="text-base text-muted-foreground">
            {formatDashboardDate(
              confirmedItineraries.find((x) => x.booking_quote_id === moment.quoteId)
                ?.departure_date || ""
            )}
          </p>
        </div>
      </div>
    </div>
  )}
</div>
        ))
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          No itineraries for today
        </p>
      )}
        </div>

    <div className="pt-4 text-center">
      <button
        type="button"
        onClick={() => navigate("/daily-moment-tracker")}
        className="inline-flex items-center gap-2 text-lg font-medium text-primary hover:underline"
      >
        View All <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  </Card>

 {/* Star Performers */}
<Card className="p-8">
  <div className="mb-4">
    <h3 className="text-lg font-bold mb-1">Star Performers</h3>
    <p className="text-sm text-muted-foreground">
      Top-Rated Agents, Travel Expert, Guides and Vendors
    </p>
  </div>

 <div className="flex gap-2 mb-4 border-b border-border">
  {(["Agents", "Travel Expert", "Guides", "Vendors"] as const).map((tab) => (
    <button
      key={tab}
      type="button"
      onClick={() => setStarPerformerTab(tab)}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        starPerformerTab === tab
          ? "text-primary border-primary"
          : "text-muted-foreground border-transparent hover:text-foreground"
      }`}
    >
      {tab}
    </button>
  ))}
</div>
{starPerformerTab === "Agents" && adminData.starPerformer ? (
    <div className="flex items-center gap-4 p-4 bg-secondary rounded-lg">
      <div className="h-12 w-12 rounded-full bg-gradient-to-r from-primary to-pink-500 flex items-center justify-center flex-shrink-0">
        <span className="text-white font-medium">
          {adminData.starPerformer.name.charAt(0).toUpperCase()}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium">{adminData.starPerformer.name}</p>
        <p className="text-sm text-muted-foreground">
          {adminData.starPerformer.phone}
        </p>
      </div>

      <div className="flex items-center gap-1 text-green-600 font-medium">
                <span className="text-lg">{"\u25B2"}</span>
        <span>{adminData.starPerformer.performance}%</span>
      </div>
    </div>
  ) : (
    <p className="text-sm text-muted-foreground text-center py-4">
      No {starPerformerTab} performer data available
    </p>
  )}
</Card>
</div>

            {/* Confirmed Itinerary List */}
     <div id="confirmed-itinerary-list" className="space-y-4">
  <h2 className="text-2xl font-semibold text-slate-700">
    Confirmed Itinerary List
  </h2>

        <Card className="overflow-hidden border-none bg-white shadow-md">
          <div className="border-b border-gray-200">
  <div className="flex flex-wrap">
    {confirmedDashboardTabs.map((tab) => (
      <button
        key={tab.key}
        type="button"
 onClick={() => {
  setConfirmedActiveTab(tab.key);
  setConfirmedPage(1);

  window.setTimeout(() => {
    document
      .getElementById("confirmed-itinerary-list")
      ?.scrollIntoView({ behavior: "auto", block: "start" });
  }, 50);
}}
        className={`px-7 py-4 text-base font-medium border-b-2 transition-colors ${
          confirmedActiveTab === tab.key
            ? "text-pink-600 border-pink-600"
            : "text-gray-600 border-transparent hover:text-pink-600"
        }`}
      >
        {tab.label}
      </button>
    ))}
  </div>
</div>

          <div className="p-6">
            <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3 text-gray-600">
                <span>Show</span>
                <select
                  value={confirmedEntries}
                  onChange={(e) => {
                    setConfirmedEntries(Number(e.target.value));
                    setConfirmedPage(1);
                  }}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 outline-none focus:border-pink-500"
                >
                  {[5, 10, 25, 50].map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
                <span>entries</span>
              </div>

              <div className="flex items-center gap-3">
                <label htmlFor="confirmed-search" className="text-gray-600">
                  Search:
                </label>
                <Input
                  id="confirmed-search"
                  value={confirmedSearch}
                  onChange={(e) => {
                    setConfirmedSearch(e.target.value);
                    setConfirmedPage(1);
                  }}
                  className="w-full md:w-[280px]"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      S.NO
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      Quote ID
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      Source
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      Destination
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      Start Date
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
  End Date
</th>
<th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
  Guest Name
</th>
                  </tr>
                </thead>

                <tbody>
                  {confirmedLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        Loading confirmed itineraries...
                      </td>
                    </tr>
                  ) : confirmedItineraries.length > 0 ? (
                    confirmedItineraries.map((itinerary, index) => (
                      <tr
                    
  key={`${itinerary.itinerary_plan_ID}-${itinerary.booking_quote_id}`}
  className="border-b border-gray-100 hover:bg-slate-50"
>
  <td className="px-4 py-4 text-gray-700">
    {(confirmedPage - 1) * confirmedEntries + index + 1}
  </td>

  <td className="px-4 py-4">
    <Link
      to={`/itinerary-details/${encodeURIComponent(itinerary.booking_quote_id)}`}
      className="font-medium text-pink-600 hover:underline"
    >
      {itinerary.booking_quote_id}
    </Link>
  </td>

  <td className="px-4 py-4 text-gray-700">
    {itinerary.arrival_location || "-"}
  </td>

  <td className="px-4 py-4 text-gray-700">
    {itinerary.departure_location || "-"}
  </td>

  <td className="whitespace-nowrap px-4 py-4 text-gray-700">
    {formatDashboardDate(itinerary.arrival_date)}
  </td>

<td className="whitespace-nowrap px-4 py-4 text-gray-700">
  {formatDashboardDate(itinerary.departure_date)}
</td>

<td className="whitespace-nowrap px-4 py-4 text-gray-700">
  {itinerary.primary_customer_name || "-"}
</td>
</tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        No confirmed itineraries found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-gray-500">
                Showing {confirmedStartEntry} to {confirmedEndEntry} of {confirmedTotal} entries
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={confirmedPage <= 1}
                  onClick={() => setConfirmedPage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </Button>

                {Array.from({ length: Math.min(5, confirmedTotalPages) }, (_, index) => {
                  const pageNumber = index + 1;

                  return (
                    <Button
                      key={pageNumber}
                      type="button"
                      variant={confirmedPage === pageNumber ? "default" : "secondary"}
                      onClick={() => setConfirmedPage(pageNumber)}
                    >
                      {pageNumber}
                    </Button>
                  );
                })}

                {confirmedTotalPages > 5 && (
                  <>
                    <span className="px-2 text-gray-500">...</span>
                    <Button
                      type="button"
                      variant={confirmedPage === confirmedTotalPages ? "default" : "secondary"}
                      onClick={() => setConfirmedPage(confirmedTotalPages)}
                    >
                      {confirmedTotalPages}
                    </Button>
                  </>
                )}

                <Button
                  type="button"
                  variant="secondary"
                  disabled={confirmedPage >= confirmedTotalPages}
                  onClick={() =>
                    setConfirmedPage((prev) => Math.min(confirmedTotalPages, prev + 1))
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
                </Card>
      </div>

      {/* Agents wise Confirmed Itinerary */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-700">
          Agents wise Confirmed Itinerary
        </h2>

        <Card className="overflow-hidden border-none bg-white shadow-md">
          <div className="p-6">
            <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3 text-gray-600">
                <span>Show</span>

                <select
                  value={agentWiseEntries}
                  onChange={(e) => {
                    setAgentWiseEntries(Number(e.target.value));
                    setAgentWisePage(1);
                  }}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 outline-none focus:border-pink-500"
                >
                  {[5, 10, 25, 50].map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>

                <span>entries</span>
              </div>

              <div className="flex items-center gap-3">
                <label htmlFor="agent-wise-confirmed-search" className="text-gray-600">
                  Search:
                </label>

                <Input
                  id="agent-wise-confirmed-search"
                  value={agentWiseSearch}
                  onChange={(e) => {
                    setAgentWiseSearch(e.target.value);
                    setAgentWisePage(1);
                  }}
                  className="w-full md:w-[280px]"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      S.NO
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      Quote ID
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      Agent
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      Source
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      Destination
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      Start Date
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      End Date
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      Guest Name
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {agentWiseLoading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        Loading agents wise confirmed itineraries...
                      </td>
                    </tr>
                  ) : agentWiseItineraries.length > 0 ? (
                    agentWiseItineraries.map((itinerary, index) => (
                      <tr
                        key={`agent-wise-${itinerary.itinerary_plan_ID}-${itinerary.booking_quote_id}`}
                        className="border-b border-gray-100 hover:bg-slate-50"
                      >
                        <td className="px-4 py-4 text-gray-700">
                          {(agentWisePage - 1) * agentWiseEntries + index + 1}
                        </td>

                        <td className="px-4 py-4">
                          <Link
                            to={`/itinerary-details/${encodeURIComponent(itinerary.booking_quote_id)}`}
                            className="font-medium text-pink-600 hover:underline"
                          >
                            {itinerary.booking_quote_id}
                          </Link>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-gray-700">
                          {itinerary.agent_name || "-"}
                        </td>

                        <td className="px-4 py-4 text-gray-700">
                          {itinerary.arrival_location || "-"}
                        </td>

                        <td className="px-4 py-4 text-gray-700">
                          {itinerary.departure_location || "-"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-gray-700">
                          {formatDashboardDate(itinerary.arrival_date)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-gray-700">
                          {formatDashboardDate(itinerary.departure_date)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-gray-700">
                          {itinerary.primary_customer_name || "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        No agents wise confirmed itineraries found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-gray-500">
                Showing {agentWiseStartEntry} to {agentWiseEndEntry} of {agentWiseTotal} entries
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={agentWisePage <= 1}
                  onClick={() => setAgentWisePage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </Button>

                {Array.from({ length: Math.min(5, agentWiseTotalPages) }, (_, index) => {
                  const pageNumber = index + 1;

                  return (
                    <Button
                      key={pageNumber}
                      type="button"
                      variant={agentWisePage === pageNumber ? "default" : "secondary"}
                      onClick={() => setAgentWisePage(pageNumber)}
                    >
                      {pageNumber}
                    </Button>
                  );
                })}

                {agentWiseTotalPages > 5 && (
                  <>
                    <span className="px-2 text-gray-500">...</span>
                    <Button
                      type="button"
                      variant={agentWisePage === agentWiseTotalPages ? "default" : "secondary"}
                      onClick={() => setAgentWisePage(agentWiseTotalPages)}
                    >
                      {agentWiseTotalPages}
                    </Button>
                  </>
                )}

                <Button
                  type="button"
                  variant="secondary"
                  disabled={agentWisePage >= agentWiseTotalPages}
                  onClick={() =>
                    setAgentWisePage((prev) => Math.min(agentWiseTotalPages, prev + 1))
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

{/* Live Vehicle Status */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-700">
          Live Vehicle Status
        </h2>

        <Card className="overflow-hidden border-none bg-white shadow-md">
          <div className="border-b border-gray-200">
            <div className="flex flex-wrap">
              {liveVehicleStatusTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setLiveVehicleActiveTab(tab.key);
                    setLiveVehiclePage(1);
                  }}
                  className={`px-7 py-4 text-base font-medium border-b-2 transition-colors ${
                    liveVehicleActiveTab === tab.key
                      ? "text-pink-600 border-pink-600"
                      : "text-gray-600 border-transparent hover:text-pink-600"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3 text-gray-600">
                <span>Show</span>

                <select
                  value={liveVehicleEntries}
                  onChange={(e) => {
                    setLiveVehicleEntries(Number(e.target.value));
                    setLiveVehiclePage(1);
                  }}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 outline-none focus:border-pink-500"
                >
                  {[5, 10, 25, 50].map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>

                <span>entries</span>
              </div>

              <div className="flex items-center gap-3">
                <label htmlFor="live-vehicle-search" className="text-gray-600">
                  Search:
                </label>

                <Input
                  id="live-vehicle-search"
                  value={liveVehicleSearch}
                  onChange={(e) => {
                    setLiveVehicleSearch(e.target.value);
                    setLiveVehiclePage(1);
                  }}
                  className="w-full md:w-[280px]"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1250px] border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      S.NO
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      Booking ID
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      Start Date
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      End Date
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      Vendor
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      Branch
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      Vehicle
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      Driver
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      Driver No
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {liveVehicleLoading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                        Loading live vehicle status...
                      </td>
                    </tr>
                  ) : liveVehicleRows.length > 0 ? (
                    liveVehicleRows.map((row, index) => (
                      <tr
                        key={`${liveVehicleActiveTab}-${row.booking_id}-${index}`}
                        className="border-b border-gray-100 hover:bg-slate-50"
                      >
                        <td className="px-4 py-4 text-gray-700">
                          {(liveVehiclePage - 1) * liveVehicleEntries + index + 1}
                        </td>

                        <td className="px-4 py-4">
                          {row.booking_id && row.booking_id !== "-" ? (
                            <Link
                              to={`/itinerary-details/${encodeURIComponent(row.booking_id)}`}
                              className="font-medium text-pink-600 hover:underline"
                            >
                              {row.booking_id}
                            </Link>
                          ) : (
                            <span className="text-gray-700">-</span>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-gray-700">
                          {formatDashboardDate(row.start_date)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-gray-700">
                          {formatDashboardDate(row.end_date)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-gray-700">
                          {row.vendor_name || "-"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-gray-700">
                          {row.branch_name || "-"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-gray-700">
                          {row.vehicle_name || "-"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-gray-700">
                          {row.driver_name || "-"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-gray-700">
                          {row.driver_no || "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                        No data available in table
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-gray-500">
                Showing {liveVehicleStartEntry} to {liveVehicleEndEntry} of {liveVehicleTotal} entries
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={liveVehiclePage <= 1}
                  onClick={() => setLiveVehiclePage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </Button>

                {Array.from({ length: Math.min(5, liveVehicleTotalPages) }, (_, index) => {
                  const pageNumber = index + 1;

                  return (
                    <Button
                      key={pageNumber}
                      type="button"
                      variant={liveVehiclePage === pageNumber ? "default" : "secondary"}
                      onClick={() => setLiveVehiclePage(pageNumber)}
                    >
                      {pageNumber}
                    </Button>
                  );
                })}

                {liveVehicleTotalPages > 5 && (
                  <>
                    <span className="px-2 text-gray-500">...</span>
                    <Button
                      type="button"
                      variant={liveVehiclePage === liveVehicleTotalPages ? "default" : "secondary"}
                      onClick={() => setLiveVehiclePage(liveVehicleTotalPages)}
                    >
                      {liveVehicleTotalPages}
                    </Button>
                  </>
                )}

                <Button
                  type="button"
                  variant="secondary"
                  disabled={liveVehiclePage >= liveVehicleTotalPages}
                  onClick={() =>
                    setLiveVehiclePage((prev) => Math.min(liveVehicleTotalPages, prev + 1))
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
                </Card>
      </div>

      {/* Most Visited Hotels */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <Card className="border-none bg-white p-7 shadow-md">
    <div className="mb-11 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-xl font-semibold leading-tight text-slate-700">
          Most Visited Hotels
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Top 5 Picks by Visitors
        </p>
      </div>

      <Input
        type="number"
        value={mostVisitedHotelsYear}
        onChange={(e) => {
          const value = Number(e.target.value);
          if (Number.isFinite(value)) {
            setMostVisitedHotelsYear(value);
          }
        }}
        className="h-12 w-full rounded-lg border-gray-200 text-base sm:w-[220px]"
      />
    </div>

    <div className="space-y-6">
      {mostVisitedHotelsLoading ? (
        <p className="py-12 text-center text-gray-500">
          Loading most visited hotels...
        </p>
      ) : mostVisitedHotels.length > 0 ? (
        mostVisitedHotels.map((hotel, index) => {
          const percentage = Math.max(
            0,
            Math.min(100, Number(hotel.visit_percentage || 0))
          );

          return (
<div
  key={`${hotel.hotel_name}-${hotel.hotel_location}-${index}`}
  className="grid grid-cols-[42px_minmax(0,1fr)_minmax(120px,180px)_42px] items-center gap-4"
>
              <div className="flex h-10 w-10 items-center justify-center rounded-md text-3xl leading-none">
                ðŸ¨
              </div>

              <div className="min-w-0">
                <p
                  className={`truncate text-base font-semibold uppercase text-slate-600 ${
                    index === 0 && (!hotel.hotel_name || hotel.hotel_name === "-")
                      ? "opacity-0"
                      : ""
                  }`}
                >
                  {hotel.hotel_name || "-"}
                </p>
                <p
                  className={`truncate text-sm text-gray-400 ${
                    index === 0 && (!hotel.hotel_location || hotel.hotel_location === "-")
                      ? "opacity-0"
                      : ""
                  }`}
                >
                  {hotel.hotel_location || "-"}
                </p>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
  <div
    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
    style={{ width: `${percentage}%` }}
  />
</div>

              <p className="text-right text-base text-gray-400">
                {percentage}%
              </p>
            </div>
          );
        })
      ) : (
        <p className="py-12 text-center text-gray-500">
          No hotel visit data available
        </p>
      )}
    </div>
  </Card>
</div>
</div>
  );
}
