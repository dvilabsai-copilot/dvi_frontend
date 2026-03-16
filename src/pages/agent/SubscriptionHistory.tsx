import { useEffect, useMemo, useState } from "react";

type PaymentStatus = "Free" | "Paid";

interface Subscription {
  id: number;
  planName: string;
  amount: number;
  startDate: string;
  endDate: string;
  transactionId: string;
  paymentStatus: PaymentStatus;
}

const mockSubscriptions: Subscription[] = [
  {
    id: 1,
    planName: "start",
    amount: 0,
    startDate: "2026-02-10",
    endDate: "2027-02-10",
    transactionId: "--",
    paymentStatus: "Free",
  },
  {
    id: 2,
    planName: "Plan Validity Extension",
    amount: 0,
    startDate: "2024-12-20",
    endDate: "2025-12-20",
    transactionId: "--",
    paymentStatus: "Free",
  },
  {
    id: 3,
    planName: "Premium",
    amount: 1000,
    startDate: "2024-08-07",
    endDate: "2024-11-05",
    transactionId: "pay_Ohu2ZpMJbV3U2S",
    paymentStatus: "Paid",
  },
  {
    id: 4,
    planName: "Starter Plus",
    amount: 1500,
    startDate: "2025-01-10",
    endDate: "2025-04-10",
    transactionId: "pay_ABC123XYZ789",
    paymentStatus: "Paid",
  },
  {
    id: 5,
    planName: "Free Renewal",
    amount: 0,
    startDate: "2025-05-01",
    endDate: "2025-06-01",
    transactionId: "--",
    paymentStatus: "Free",
  },
];

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("en-GB", {
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
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setSubscriptions(mockSubscriptions);
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

  return (
    <div className="w-full p-4 md:p-8">
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
                      key={sub.id}
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
                              : "bg-orange-100 text-orange-600"
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