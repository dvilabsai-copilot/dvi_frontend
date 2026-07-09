import axios from "axios";
import { API_BASE_URL, getToken } from "@/lib/api";

export type WalletTransactionType = "Credit" | "Debit";

export interface WalletTransaction {
  id: string;
  transactionDate: string;
  transactionAmount: number;
  transactionType: WalletTransactionType;
  transactionId?: string;
  remark: string;
}

export interface WalletSummary {
  cashWalletBalance: number;
  couponWalletBalance: number;
  totalWalletAmount: number;
}

export interface WalletPageData {
  summary: WalletSummary;
  cashTransactions: WalletTransaction[];
  couponTransactions: WalletTransaction[];
}



function getAuthHeaders() {
  const token = getToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeTransactionType(value: any, amount: number): WalletTransactionType {
  const raw = String(value ?? "").trim().toLowerCase();
  const numeric = Number(value);

  if (raw === "credit" || numeric === 1) return "Credit";
  if (raw === "debit" || numeric === 2) return "Debit";
  if (numeric === 0) return "Credit";

  return amount >= 0 ? "Credit" : "Debit";
}

export const walletService = {

  async getWallet(agentId: number): Promise<WalletPageData> {
    const headers = getAuthHeaders();

    const [balanceRes, agentRes, cashTxRes, couponTxRes] = await Promise.all([
      axios.get(`${API_BASE_URL}/itineraries/wallet-balance/${agentId}`, { headers }),
      axios.get(`${API_BASE_URL}/agents/${agentId}`, { headers }),
      axios.get(`${API_BASE_URL}/agents/${agentId}/wallet/cash`, { headers }),
      axios.get(`${API_BASE_URL}/agents/${agentId}/wallet/coupon`, { headers }),
    ]);

    const balanceData = balanceRes.data;
    const agentData = agentRes.data;
    const cashRows = Array.isArray(cashTxRes.data?.data)
      ? cashTxRes.data.data
      : Array.isArray(cashTxRes.data)
      ? cashTxRes.data
      : [];
    const couponRows = Array.isArray(couponTxRes.data?.data)
      ? couponTxRes.data.data
      : Array.isArray(couponTxRes.data)
      ? couponTxRes.data
      : [];

    const cashTransactions = cashRows.map((item: any) => ({
      id: String(item.cash_wallet_ID ?? item.id ?? item.wallet_id ?? item.transaction_id ?? ""),
      transactionDate: formatDate(item.createdon ?? item.transaction_date),
      transactionAmount: Number(item.transaction_amount ?? item.amount ?? 0),
      transactionType: normalizeTransactionType(
        item.transaction_type ?? item.transactionType ?? item.type,
        Number(item.transaction_amount ?? item.amount ?? 0),
      ),
      transactionId: item.transaction_id || "--",
      remark: item.remarks || item.remark || "",
    }));

    const couponTransactions = couponRows.map((item: any) => ({
      id: String(item.coupon_wallet_ID ?? item.id ?? item.wallet_id ?? item.transaction_id ?? ""),
      transactionDate: formatDate(item.createdon ?? item.transaction_date),
      transactionAmount: Number(item.transaction_amount ?? item.amount ?? 0),
      transactionType: normalizeTransactionType(
        item.transaction_type ?? item.transactionType ?? item.type,
        Number(item.transaction_amount ?? item.amount ?? 0),
      ),
      remark: item.remarks || item.remark || "",
    }));

    const liveCashBalance = Number(
      agentData?.total_cash_wallet ?? agentData?.totalCashWallet ?? balanceData?.balance ?? 0,
    );
    const liveCouponBalance = Number(
      agentData?.total_coupon_wallet ?? agentData?.totalCouponWallet ?? 0,
    );

    const derivedCashBalance = cashTransactions.reduce(
      (sum: number, item: WalletTransaction) =>
        sum + (item.transactionType === "Credit" ? item.transactionAmount : -item.transactionAmount),
      0,
    );

    const derivedCouponBalance = couponTransactions.reduce(
      (sum: number, item: WalletTransaction) =>
        sum + (item.transactionType === "Credit" ? item.transactionAmount : -item.transactionAmount),
      0,
    );

    return {
      summary: {
        cashWalletBalance: liveCashBalance > 0 ? liveCashBalance : derivedCashBalance,
        couponWalletBalance: liveCouponBalance > 0 ? liveCouponBalance : derivedCouponBalance,
        totalWalletAmount:
          (liveCashBalance > 0 ? liveCashBalance : derivedCashBalance) +
          (liveCouponBalance > 0 ? liveCouponBalance : derivedCouponBalance),
      },

      cashTransactions,
      couponTransactions,
    };
  },

  async addMoney(_amount: number): Promise<WalletPageData> {
    throw new Error("Add Money not implemented yet (requires Razorpay flow)");
  },

  async deleteTransaction(_id: string): Promise<WalletPageData> {
    throw new Error("Delete transaction not supported by backend");
  },

};
