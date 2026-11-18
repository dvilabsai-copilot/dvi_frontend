/* DVI_ACCOUNTS_DASHBOARD_ROLE6_20261118
 * Accounts-only dashboard. All figures come from the current dashboard API.
 * Due rows come from the existing Accounts Manager API, never demo data.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  CheckCircle,
  ChevronRight,
  Clock,
  FileText,
  RefreshCw,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchAccountsList, type AccountsRow } from "@/services/accountsManagerApi";
import type { AccountsDashboardStats } from "@/services/dashboard";
import { getAuthenticatedUser } from "@/services/accessControl";

const numeric = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const inr = (value: unknown): string =>
  "\u20B9" + numeric(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const actions = [
  { title: "Accounts Overview", detail: "Financial overview", path: "/accounts-overview" },
  { title: "Search Booking", detail: "Find a booking", path: "/accounts-search-booking" },
  { title: "Invoices", detail: "Review invoices", path: "/accounts-invoices" },
  { title: "Vendor Bills", detail: "Check vendor bills", path: "/accounts-vendor-bills" },
  { title: "Payments", detail: "View payment records", path: "/accounts-payments" },
  { title: "Ledgers & Reports", detail: "Open account ledger", path: "/accounts-ledgers" },
] as const;

export function AccountsDashboardPanel({ data }: { data: AccountsDashboardStats }) {
  // Use the signed-in Accounts identity, never a fixed display name.
  const accountSession = getAuthenticatedUser();
  const accountsLoginName =
    [accountSession?.fullName, accountSession?.name]
      .map((value) => String(value ?? "").trim())
      .find(Boolean) ||
    String(accountSession?.email ?? "").split("@")[0].trim() ||
    "Accounts User";
  const [dueRows, setDueRows] = useState<AccountsRow[]>([]);
  const [dueLoading, setDueLoading] = useState(false);
  const [dueError, setDueError] = useState("");

  const loadDueEntries = useCallback(async () => {
    setDueLoading(true);
    setDueError("");
    try {
      const response = await fetchAccountsList({ status: "due" });
      if (!Array.isArray(response)) {
        throw new Error("The Accounts API returned an unexpected response.");
      }
      // Show the first six matching entries in the order supplied by the API.
      setDueRows(response.filter((row) => row.status === "due").slice(0, 6));
    } catch (error) {
      setDueRows([]);
      setDueError(error instanceof Error ? error.message : "Unable to load due entries.");
    } finally {
      setDueLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDueEntries();
  }, [loadDueEntries]);

  const payable = numeric(data.totalPayable);
  const paid = numeric(data.totalPaid);
  const balance = numeric(data.totalBalance);
  const payoutCount = numeric(data.pendingPayouts);
  const coverage = payable > 0 ? (paid / payable) * 100 : 0;
  const progress = Math.min(100, Math.max(0, coverage));
  const coverageText = Number.isFinite(coverage)
    ? `${coverage.toLocaleString("en-IN", { maximumFractionDigits: 1 })}%`
    : "0%";

  const kpis = useMemo(() => [
    {
      label: "Total Payable",
      value: inr(payable),
      Icon: Wallet,
      card: "border-sky-100 bg-gradient-to-br from-sky-50 to-cyan-50",
      icon: "text-blue-600",
      amount: "text-blue-700",
    },
    {
      label: "Total Paid",
      value: inr(paid),
      Icon: CheckCircle,
      card: "border-emerald-100 bg-gradient-to-br from-green-50 to-emerald-50",
      icon: "text-emerald-600",
      amount: "text-emerald-700",
    },
    {
      label: "Total Balance",
      value: inr(balance),
      Icon: TrendingDown,
      card: "border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50",
      icon: "text-orange-600",
      amount: "text-orange-700",
    },
    {
      label: "Pending Payouts",
      value: payoutCount.toLocaleString("en-IN"),
      Icon: Clock,
      card: "border-fuchsia-100 bg-gradient-to-br from-purple-50 to-pink-50",
      icon: "text-purple-600",
      amount: "text-purple-700",
    },
  ], [payable, paid, balance, payoutCount]);

  return (
    <main data-accounts-dashboard="role-6" className="mx-auto w-full max-w-[1600px] space-y-5 px-3 py-6 sm:px-5 lg:px-7">
      <section className="flex flex-col gap-3 rounded-2xl border border-violet-100 bg-gradient-to-r from-white via-violet-50/60 to-pink-50/40 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">Accounts & Finance</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Welcome back, {accountsLoginName}</h1>
          <p className="mt-1 text-sm text-slate-600">Your financial overview and daily payment workspace.</p>
        </div>
        <Button asChild className="h-10 shrink-0 rounded-xl bg-violet-700 hover:bg-violet-800">
          <Link to="/accounts-overview">Open Accounts & Finance <ArrowUpRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </section>

      <section aria-label="Accounts financial summary" className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, Icon, card, icon, amount }) => (
          <Card key={label} className={`min-w-0 overflow-hidden rounded-2xl border p-5 shadow-sm ${card}`}>
            <div className="flex min-w-0 items-center justify-between gap-2">
              <p className="min-w-0 text-sm font-medium text-slate-600">{label}</p>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                <Icon className={`h-5 w-5 ${icon}`} />
              </div>
            </div>
            <p
              className={`mt-3 min-w-0 break-words text-[clamp(1.05rem,1.75vw,1.5rem)] font-bold leading-tight tracking-tight tabular-nums [overflow-wrap:anywhere] ${amount}`}
              title={value}
            >
              {value}
            </p>
            <p className="mt-2 text-xs text-slate-500">Current dashboard total</p>
          </Card>
        ))}
      </section>

      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card className="min-w-0 rounded-2xl border p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Payment position</h2>
              <p className="mt-1 text-sm text-slate-500">Total paid compared with total payable</p>
            </div>
            <Wallet className="h-5 w-5 shrink-0 text-violet-600" />
          </div>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-2">
            <span className="text-sm font-medium text-slate-600">Paid / Payable</span>
            <span className="text-2xl font-bold tabular-nums text-violet-700">{payable > 0 ? coverageText : "N/A"}</span>
          </div>
          <div
            role="progressbar"
            aria-label="Paid as a percentage of payable"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            className="mt-3 h-3 overflow-hidden rounded-full bg-violet-100"
          >
            <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-emerald-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-5 grid min-w-0 grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
            <div className="min-w-0">
              <p className="text-slate-500">Total payable</p>
              <p className="mt-1 break-words font-semibold tabular-nums text-slate-900 [overflow-wrap:anywhere]" title={inr(payable)}>{inr(payable)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-slate-500">Total paid</p>
              <p className="mt-1 break-words font-semibold tabular-nums text-slate-900 [overflow-wrap:anywhere]" title={inr(paid)}>{inr(paid)}</p>
            </div>
          </div>
          {payable > 0 && paid > payable && (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Paid is greater than payable in the current summary. Check the ledger if these values need reconciliation.
            </p>
          )}
          <p className="mt-3 text-xs text-slate-500">Figures are provided by the existing dashboard API.</p>
        </Card>

        <Card className="min-w-0 rounded-2xl border p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Quick access</h2>
              <p className="mt-1 text-sm text-slate-500">Open existing Accounts & Finance screens</p>
            </div>
            <ArrowUpRight className="h-5 w-5 shrink-0 text-violet-600" />
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {actions.map(({ title, detail, path }) => (
              <Link
                key={path}
                to={path}
                className="group flex min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-violet-200 hover:bg-violet-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-600"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-800">{title}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{detail}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-violet-600" />
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <Card className="min-w-0 overflow-hidden rounded-2xl border shadow-sm">
        <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="rounded-lg bg-orange-50 p-2 text-orange-600"><FileText className="h-5 w-5" /></span>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Due account entries</h2>
              <p className="text-xs text-slate-500">Showing up to six due entries returned by Accounts Manager</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void loadDueEntries()} disabled={dueLoading}>
              <RefreshCw className={`mr-1 h-4 w-4 ${dueLoading ? "animate-spin" : ""}`} />Refresh
            </Button>
            <Button variant="outline" size="sm" asChild><Link to="/accounts-manager">View all <ChevronRight className="ml-1 h-4 w-4" /></Link></Button>
          </div>
        </div>
        {dueLoading && dueRows.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-500" role="status">Loading due account entries...</p>
        ) : dueError ? (
          <div className="px-6 py-8 text-center" role="alert">
            <p className="text-sm text-amber-700">The due-entry list could not be loaded: {dueError}</p>
            <p className="mt-2 text-xs text-slate-500">Your summary cards and existing Accounts pages remain available.</p>
          </div>
        ) : dueRows.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-500">No due account entries were returned.</p>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[690px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-semibold">Booking / Quote</th>
                  <th className="px-4 py-3 font-semibold">Agent</th>
                  <th className="px-4 py-3 font-semibold">Service</th>
                  <th className="px-4 py-3 text-right font-semibold">Payable</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dueRows.map((row, index) => (
                  <tr key={`${row.componentType}-${row.id}-${index}`} className="hover:bg-slate-50/70">
                    <td className="px-6 py-4 font-medium text-slate-900">{row.quoteId || "-"}</td>
                    <td className="max-w-[180px] truncate px-4 py-4 text-slate-700" title={row.agent}>{row.agent || "-"}</td>
                    <td className="px-4 py-4 capitalize text-slate-700">{row.componentType || "-"}</td>
                    <td className="px-4 py-4 text-right font-semibold tabular-nums text-slate-900">{inr(row.payable)}</td>
                    <td className="px-4 py-4"><span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700">Due</span></td>
                    <td className="px-5 py-4 text-right">
                      <Link className="font-semibold text-violet-700 hover:underline" to={`/accounts-manager${row.quoteId ? `?quoteId=${encodeURIComponent(row.quoteId)}` : ""}`}>
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </main>
  );
}