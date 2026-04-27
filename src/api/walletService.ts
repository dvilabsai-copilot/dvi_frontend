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

export const walletService = {

  async getWallet(agentId: number): Promise<WalletPageData> {
    const headers = getAuthHeaders();

    const balanceRes = await axios.get(
      `${API_BASE_URL}/itineraries/wallet-balance/${agentId}`,
      { headers }
    );

    const txRes = await axios.get(
      `${API_BASE_URL}/api/v1/payments/wallet-history`,
      { headers }
    );

    const balanceData = balanceRes.data;
    const transactions = txRes.data;

    return {
      summary: {
        cashWalletBalance: Number(balanceData?.balance || 0),
        couponWalletBalance: 0,
        totalWalletAmount: Number(balanceData?.balance || 0),
      },

      // ✅ FULLY FIXED MAPPING FOR UI
      cashTransactions: Array.isArray(transactions)
        ? transactions.map((item: any) => ({
            id: String(item.cash_wallet_ID),

            transactionDate: formatDate(item.createdon),

            transactionAmount: Number(item.transaction_amount),

            // infer type from amount (backend has no transaction_type)
            transactionType:
              Number(item.transaction_amount) > 0 ? "Debit" : "Credit",

            transactionId: item.transaction_id || "--",

            remark: item.remarks || "",
          }))
        : [],

      couponTransactions: [],
    };
  },

  async addMoney(_amount: number): Promise<WalletPageData> {
    throw new Error("Add Money not implemented yet (requires Razorpay flow)");
  },

  async deleteTransaction(_id: string): Promise<WalletPageData> {
    throw new Error("Delete transaction not supported by backend");
  },

};