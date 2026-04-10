import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { walletService, type WalletPageData } from "@/api/walletService";
import { getToken } from "@/lib/api";
import { Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
      Number(tx?.transactionType ?? tx?.transaction_type) === 1;

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

function TypeBadge({ value }: { value: "Credit" | "Debit" }) {
  return (
    <span
      className={`inline-flex min-w-[78px] items-center justify-center rounded-md px-3 py-1 text-sm font-medium ${
        value === "Credit" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
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
    <Card className="border border-[#eedcf6] shadow-sm">
      <div className="space-y-6 p-6">
        <h2 className="text-[22px] font-semibold text-[#4a4a68]">{title}</h2>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 text-[18px] text-[#6d6d86]">
            <span>Show</span>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-base" value={pageSize} disabled>
              <option value={10}>10</option>
            </select>
            <span>entries</span>
          </div>

          <div className="flex items-center gap-3 text-[18px] text-[#6d6d86]">
            <label htmlFor="wallet-search">Search:</label>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                id="wallet-search"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full min-w-[220px] pl-9 md:w-[280px]"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-[#f6f2fa]">
              <TableRow>
                <TableHead>Transaction Date</TableHead>
                <TableHead>Transaction Amount</TableHead>
                <TableHead>Transaction Type</TableHead>
                {showTransactionId && <TableHead>Transaction ID</TableHead>}
                <TableHead>Remark</TableHead>
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
                    <TableCell>{formatDate(row.transactionDate)}</TableCell>
                    <TableCell>{formatCurrency(row.transactionAmount)}</TableCell>
                    <TableCell><TypeBadge value={row.transactionType} /></TableCell>
                    {showTransactionId && <TableCell>{row.transactionId || "--"}</TableCell>}
                    <TableCell>{row.remark}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page === 1}
            >
              Previous
            </Button>

            <Button
              variant="outline"
              size="sm"
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
  const [walletData, setWalletData] = useState<WalletPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cashSearch, setCashSearch] = useState("");
  const [couponSearch, setCouponSearch] = useState("");

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const agentId = getAgentId();
        if (!agentId) throw new Error("Agent ID not found");
        const data = await walletService.getWallet(Number(agentId));
        setWalletData(data);
      } catch (error) {
        console.error("Wallet error:", error);
        toast.error("Failed to load wallet");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const cashHistory = useMemo(() => normalizeRows(walletData?.cashTransactions || [], "cash"), [walletData]);
  const couponHistory = useMemo(() => normalizeRows(walletData?.couponTransactions || [], "coupon"), [walletData]);

  const cashWalletTotal = walletData?.summary.cashWalletBalance ?? 0;
  const couponWalletTotal = walletData?.summary.couponWalletBalance ?? 0;

  if (loading) return <div className="p-8 text-center">Loading wallet history...</div>;
  if (!walletData) return <div className="p-8 text-center text-red-500">Failed to load wallet data.</div>;

  return (
    <div className="space-y-6 p-6">

      <div className="flex justify-end">
        <Button disabled>+ Add Cash Wallet</Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <p>Coupon Wallet</p>
          <p className="text-xl font-bold">{formatCurrency(couponWalletTotal)}</p>
        </Card>
        <Card className="p-6">
          <p>Cash Wallet</p>
          <p className="text-xl font-bold">{formatCurrency(cashWalletTotal)}</p>
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

    </div>
  );
};

export default WalletHistory;