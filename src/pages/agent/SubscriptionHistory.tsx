import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AgentAPI } from "@/services/agentService";
import { paymentService } from "@/services/paymentService";
import { useRazorpayCheckout } from "@/hooks/useRazorpayCheckout";
import { getToken } from "@/lib/api";
import { DashboardService } from "@/services/dashboard";

type PaymentStatus = "Free" | "Paid" | "Pending" | "Failed";

interface Subscription {
  id: number;
  planName: string;
  amount: number;
  startDate: string;
  endDate: string;
  transactionId: string;
  paymentStatus: PaymentStatus;
}

function parseJwt(token: string) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

function getAgentId() {
  const token = getToken();
  const user = token ? parseJwt(token) : null;
  return Number(user?.agentId || user?.id || user?.agent_ID || 0);
}

const formatDate = (date: string) => {
  if (!date) return "--";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatAmount = (amount: number) => {
  return `₹ ${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export default function SubscriptionHistory() {
  const navigate = useNavigate();
  const { openCheckout } = useRazorpayCheckout();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isPaying, setIsPaying] = useState(false);
  const [activePlanId, setActivePlanId] = useState<number | null>(null);

  const loadSubscriptions = async () => {
    const agentId = getAgentId();
    if (!agentId) {
      throw new Error("Agent id not found");
    }

    const rows = await AgentAPI.getSubscriptions(agentId);
    const normalized: Subscription[] = rows.map((s) => ({
      id: Number(s.id),
      planName: s.subscriptionTitle || "Free",
      amount: Number(s.amount || 0),
      startDate: s.validityStart,
      endDate: s.validityEnd,
      transactionId: s.transactionId || "--",
      paymentStatus: (s.paymentStatus as PaymentStatus) || "Free",
    }));

    setSubscriptions(normalized);

    try {
      const stats = await DashboardService.getStats();
      const planId = Number((stats as any)?.planId || 0);
      setActivePlanId(planId > 0 ? planId : null);
    } catch {
      setActivePlanId(null);
    }
  };

  useEffect(() => {
    loadSubscriptions().catch((error) => {
      console.error(error);
      toast.error("Unable to load subscription history");
    });
  }, []);

  const filteredSubscriptions = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    if (!search) return subscriptions;

    return subscriptions.filter((sub) => {
      return (
        sub.planName.toLowerCase().includes(search) ||
        sub.transactionId.toLowerCase().includes(search) ||
        sub.paymentStatus.toLowerCase().includes(search) ||
        sub.amount.toString().includes(search)
      );
    });
  }, [subscriptions, searchTerm]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredSubscriptions.length / entriesPerPage)
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, entriesPerPage]);

  const paginatedSubscriptions = useMemo(() => {
    const startIndex = (currentPage - 1) * entriesPerPage;
    const endIndex = startIndex + entriesPerPage;
    return filteredSubscriptions.slice(startIndex, endIndex);
  }, [filteredSubscriptions, currentPage, entriesPerPage]);

  const startEntry =
    filteredSubscriptions.length === 0
      ? 0
      : (currentPage - 1) * entriesPerPage + 1;

  const endEntry = Math.min(
    currentPage * entriesPerPage,
    filteredSubscriptions.length
  );

  const onRenewLatest = async () => {
    if (!activePlanId) {
      toast.error("No subscription found for renewal");
      return;
    }

    try {
      setIsPaying(true);
      const order = await paymentService.createSubscriptionRenewalOrder(activePlanId);

      await openCheckout({
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        orderId: order.orderId,
        name: "DVI Holidays",
        description: "Subscription Renewal",
        onSuccess: async (response) => {
          await paymentService.confirmSubscriptionRenewal(response);
          await loadSubscriptions();
          navigate(`/payments/success?flow=subscription_renewal&orderId=${encodeURIComponent(order.orderId)}`);
        },
        onFailure: (error) => {
          console.error(error);
          toast.error("Subscription confirmation failed");
        },
        onDismiss: () => {
          toast.error("Payment cancelled");
        },
      });
    } catch (error) {
      console.error(error);
      toast.error("Unable to start subscription renewal");
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="w-full p-4 md:p-8">
      <div className="mb-4 flex justify-end">
        <Button onClick={onRenewLatest} disabled={isPaying || subscriptions.length === 0}>
          {isPaying ? "Processing..." : "Renew Subscription"}
        </Button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="p-5 md:p-8">
          <h2 className="mb-6 text-[24px] font-medium text-slate-700">
            List of Subscription History
          </h2>

          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3 text-base text-gray-600">
              <span>Show</span>
              <select
                value={entriesPerPage}
                onChange={(e) => setEntriesPerPage(Number(e.target.value))}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500"
              >
                {[10, 25, 50].map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
              <span>entries</span>
            </div>

            <div className="flex items-center gap-3">
              <label
                htmlFor="subscription-search"
                className="text-base text-gray-600"
              >
                Search:
              </label>
              <input
                id="subscription-search"
                type="text"
                placeholder="Search here..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full min-w-[220px] rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-violet-500 md:w-[280px]"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full border-collapse table-auto">
              <thead className="bg-slate-50">
                <tr>
                  <th className="w-[70px] whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-wide text-gray-600">
                    S.NO
                  </th>
                  <th className="min-w-[220px] px-4 py-4 text-left text-sm font-semibold uppercase tracking-wide text-gray-600">
                    Subscription Title
                  </th>
                  <th className="w-[140px] whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-wide text-gray-600">
                    Amount
                  </th>
                  <th className="w-[180px] whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-wide text-gray-600">
                    Validity Start Date
                  </th>
                  <th className="w-[180px] whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-wide text-gray-600">
                    Validity End Date
                  </th>
                  <th className="min-w-[180px] px-4 py-4 text-left text-sm font-semibold uppercase tracking-wide text-gray-600">
                    Transaction ID
                  </th>
                  <th className="w-[150px] whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-wide text-gray-600">
                    Payment Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {paginatedSubscriptions.length > 0 ? (
                  paginatedSubscriptions.map((sub, index) => (
                    <tr
                      key={`${sub.id}-${index}`}
                      className="border-t border-gray-200 hover:bg-gray-50"
                    >
                      <td className="px-4 py-4 text-base text-gray-700">
                        {(currentPage - 1) * entriesPerPage + index + 1}
                      </td>
                      <td className="px-4 py-4 text-base text-gray-700">
                        {sub.planName}
                      </td>
                      <td className="px-4 py-4 text-base text-gray-700">
                        {formatAmount(sub.amount)}
                      </td>
                      <td className="px-4 py-4 text-base text-gray-700">
                        {formatDate(sub.startDate)}
                      </td>
                      <td className="px-4 py-4 text-base text-gray-700">
                        {formatDate(sub.endDate)}
                      </td>
                      <td className="break-words px-4 py-4 text-base text-gray-700">
                        {sub.transactionId}
                      </td>
                      <td className="px-4 py-4 text-base text-gray-700">
                        <span
                          className={`inline-flex min-w-[68px] justify-center rounded-md px-3 py-1 text-sm font-medium ${
                            sub.paymentStatus === "Paid"
                              ? "bg-green-100 text-green-700"
                              : sub.paymentStatus === "Pending"
                                ? "bg-orange-100 text-orange-600"
                                : sub.paymentStatus === "Failed"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {sub.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-base text-gray-500"
                    >
                      No subscription history found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-gray-600">
              Showing {startEntry} to {endEntry} of {filteredSubscriptions.length} entries
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="rounded-lg bg-gray-100 px-5 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              <button
                type="button"
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
              >
                {currentPage}
              </button>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="rounded-lg bg-gray-100 px-5 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
