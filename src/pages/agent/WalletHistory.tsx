import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { walletService, type WalletPageData } from "@/api/walletService";
import { getToken } from "@/lib/api";
import { Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { paymentService } from "@/services/paymentService";
import { useRazorpayCheckout } from "@/hooks/useRazorpayCheckout";
import { useNavigate } from "react-router-dom";

// Helper functions
function parseJwt(token: string) {
  try { return JSON.parse(atob(token.split(".")[1])); } catch { return null; }
}

function getAgentId() {
  const token = getToken();
  const user = token ? parseJwt(token) : null;
  return user?.agentId || user?.id || user?.agent_ID;
}

type WalletRow = {
  id: string;
  transactionDate: string;
  transactionAmount: number;
  transactionType: "Credit" | "Debit";
  transactionId?: string;
  remark: string;
};

function normalizeRows(rows: any[], type: "cash" | "coupon"): WalletRow[] {
  return (rows || []).map((tx: any, index: number): WalletRow => {
    const isCredit =
      String(tx?.transactionType ?? tx?.transaction_type ?? "").toLowerCase() === "credit" ||
      Number(tx?.transactionType ?? tx?.transaction_type) === 1 ||
      Number(tx?.transactionType ?? tx?.transaction_type) === 0;

    return {
      id: String(tx?.id ?? tx?.cash_wallet_ID ?? tx?.coupon_wallet_ID ?? index + 1),
      transactionDate: String(tx?.transactionDate ?? tx?.transaction_date ?? ""),
      transactionAmount: Number(tx?.transactionAmount ?? tx?.transaction_amount ?? 0),
      transactionType: isCredit ? "Credit" : "Debit",
      transactionId: type === "cash" ? String(tx?.transaction_id ?? tx?.transactionId ?? "--") : undefined,
      remark: String(tx?.remark ?? tx?.remarks ?? "N/A"),
    };
  });
}

function formatCurrency(amount: number) {
  return `₹ ${Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value?: string) {
  if (!value) return "--";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function TypeBadge({ value }: { value: "Credit" | "Debit" }) {
  return (
    <span
      className={`inline-flex min-w-[78px] items-center justify-center rounded-md px-3 py-1 text-sm font-medium ${
        value === "Credit"
          ? "bg-[#dcfce7] text-[#16a34a]"
          : "bg-[#fee2e2] text-[#ef4444]"
      }`}
    >
      {value}
    </span>
  );
}

// WalletTable component

function WalletTable({
  title,
  rows,
  search,
  onSearchChange,
  showTransactionId = false,
}: {
  title: string;
  rows: WalletRow[];
  search: string;
  onSearchChange: (value: string) => void;
  showTransactionId?: boolean;
}) {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row.transactionDate, row.transactionAmount, row.transactionType, row.transactionId, row.remark]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  const paginatedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { 
    setPage(1); 
  }, [search, rows]);

  return (
    <Card className="border border-[#eadff6] bg-white shadow-[0_10px_30px_rgba(137,88,166,0.06)]">
      <div className="space-y-6 p-6">
        <h2 className="text-[22px] font-semibold text-[#514a66]">{title}</h2>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 text-[18px] text-[#706882]">
            <span>Show</span>
            <select className="h-10 rounded-md border border-[#dccdf0] bg-white px-3 text-base text-[#514a66]" value={pageSize} disabled>
              <option value={10}>10</option>
            </select>
            <span>entries</span>
          </div>

          <div className="flex items-center gap-3 text-[18px] text-[#706882]">
            <label htmlFor="wallet-search">Search:</label>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a88bc7]" />

              <Input
                id="wallet-search"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full min-w-[220px] border-[#dccdf0] bg-white pl-9 text-[#514a66] shadow-sm md:w-[280px]"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-[#f8f3fc]">
              <TableRow>
                <TableHead className="text-[#6b647f]">Transaction Date</TableHead>
                <TableHead className="text-[#6b647f]">Transaction Amount</TableHead>
                <TableHead className="text-[#6b647f]">Transaction Type</TableHead>
                {showTransactionId && <TableHead className="text-[#6b647f]">Transaction ID</TableHead>}
                <TableHead className="text-[#6b647f]">Remark</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {paginatedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showTransactionId ? 5 : 4} className="py-10 text-center">
                    No transactions found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-[#4f4b63]">{formatDate(row.transactionDate)}</TableCell>
                    <TableCell className="text-[#4f4b63]">{formatCurrency(row.transactionAmount)}</TableCell>
                    <TableCell><TypeBadge value={row.transactionType} /></TableCell>
                    {showTransactionId && <TableCell className="text-[#4f4b63]">{row.transactionId || "--"}</TableCell>}
                    <TableCell className="text-[#4f4b63]">{row.remark}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-[#8e88a1]">
            Page {page} of {totalPages}
          </p>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-[#eadff6] bg-[#f6effb] text-[#6f5a88] hover:bg-[#efe4f8] hover:text-[#5d3b8d]"
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page === 1}
            >
              Previous
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="border-[#eadff6] bg-[#f6effb] text-[#6f5a88] hover:bg-[#efe4f8] hover:text-[#5d3b8d]"
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>

      </div>
    </Card>
  );
}

// ===== WalletHistory Page =====
const WalletHistory = () => {
  const navigate = useNavigate();
  const [walletData, setWalletData] = useState<WalletPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cashSearch, setCashSearch] = useState("");
  const [couponSearch, setCouponSearch] = useState("");
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { openCheckout } = useRazorpayCheckout();

  const fetchHistory = async () => {
    const agentId = getAgentId();
    if (!agentId) throw new Error("Agent ID not found");
    const data = await walletService.getWallet(Number(agentId));
    setWalletData(data);
  };

  useEffect(() => {
    const load = async () => {
      try {
        await fetchHistory();
      } catch (error) {
        console.error("Wallet error:", error);
        toast.error("Failed to load wallet");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const onTopUp = async () => {
    const amount = Number(topUpAmount);
    if (!amount || amount < 1) {
      toast.error("Enter a valid top-up amount");
      return;
    }

    try {
      setSubmitting(true);
      const order = await withTimeout(
        paymentService.createWalletTopupOrder(amount),
        20000,
        "Create order request timed out. Please try again.",
      );

      await openCheckout({
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        orderId: order.orderId,
        name: "DVI Holidays",
        description: "Cash Wallet Top Up",
        onSuccess: async (response) => {
          await withTimeout(
            paymentService.confirmWalletTopup(response),
            20000,
            "Payment confirmation timed out. Please refresh and check wallet history.",
          );
          await fetchHistory();
          setTopUpOpen(false);
          setTopUpAmount("");
          navigate(`/payments/success?flow=wallet_topup&orderId=${encodeURIComponent(order.orderId)}`);
        },
        onFailure: (error) => {
          console.error(error);
          toast.error("Payment verification failed");
        },
        onDismiss: () => {
          toast.error("Payment cancelled");
        },
      });
    } catch (error) {
      console.error(error);
      toast.error("Unable to start wallet top-up");
    } finally {
      setSubmitting(false);
    }
  };

  const cashHistory = useMemo(() => normalizeRows(walletData?.cashTransactions || [], "cash"), [walletData]);
  const couponHistory = useMemo(() => normalizeRows(walletData?.couponTransactions || [], "coupon"), [walletData]);

  const cashWalletTotal = walletData?.summary.cashWalletBalance ?? 0;
  const couponWalletTotal = walletData?.summary.couponWalletBalance ?? 0;

  if (loading) return <div className="p-8 text-center">Loading wallet history...</div>;
  if (!walletData) return <div className="p-8 text-center text-red-500">Failed to load wallet data.</div>;

  return (
    <div className="space-y-6 bg-[#fbf8fe] p-6">

      <div className="flex justify-end">
        <Button
          onClick={() => setTopUpOpen(true)}
          className="bg-gradient-to-r from-[#d64ab7] to-[#8b5cf6] text-white shadow-md hover:opacity-95"
        >
          + Add Cash Wallet
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-[#eddff6] bg-white p-6 shadow-[0_10px_30px_rgba(137,88,166,0.06)]">
          <p className="text-[#8a6c9f]">Coupon Wallet</p>
          <p className="text-2xl font-bold text-[#4f4766]">{formatCurrency(couponWalletTotal)}</p>
        </Card>
        <Card className="border border-[#dbeedc] bg-white p-6 shadow-[0_10px_30px_rgba(137,88,166,0.06)]">
          <p className="text-[#6e8676]">Cash Wallet</p>
          <p className="text-2xl font-bold text-[#4f4766]">{formatCurrency(cashWalletTotal)}</p>
        </Card>
      </div>

      <WalletTable
        title="Cash Wallet History"
        rows={cashHistory}
        search={cashSearch}
        onSearchChange={setCashSearch}
        showTransactionId
      />

      <WalletTable
        title="Coupon Wallet History"
        rows={couponHistory}
        search={couponSearch}
        onSearchChange={setCouponSearch}
      />

      <Dialog open={topUpOpen} onOpenChange={setTopUpOpen}>
        <DialogContent className="border-[#eadff6] bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#4f4766]">Add Cash Wallet</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cash-topup-amount" className="text-[#4f4766]">Amount (INR)</Label>
            <Input
              id="cash-topup-amount"
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(e.target.value)}
              type="number"
              min="1"
              step="0.01"
              placeholder="Enter amount"
              className="border-[#dccdf0]"
            />
            <p className="text-sm text-[#8e88a1]">
              Gateway fees/tax can vary by payment method and will be shown by Razorpay at checkout.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTopUpOpen(false)}
              className="border-[#eadff6] bg-[#f6effb] text-[#6f5a88] hover:bg-[#efe4f8] hover:text-[#5d3b8d]"
            >
              Cancel
            </Button>
            <Button onClick={onTopUp} disabled={submitting} className="bg-gradient-to-r from-[#d64ab7] to-[#8b5cf6] text-white hover:opacity-95">
              {submitting ? "Processing..." : "Pay Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default WalletHistory;
