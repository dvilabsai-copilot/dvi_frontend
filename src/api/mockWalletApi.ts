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

const MOCK_DELAY = 700;

let mockWalletStore: WalletPageData = {
  summary: {
    cashWalletBalance: 2863811.0,
    couponWalletBalance: 10000.0,
    totalWalletAmount: 2873811.0,
  },

  cashTransactions: [
    {
      id: "cash-1",
      transactionDate: "01 Apr 2025",
      transactionAmount: 34085.6,
      transactionType: "Debit",
      transactionId: "--",
      remark: "Agent Confirmed the Order",
    },
    {
      id: "cash-2",
      transactionDate: "01 Dec 2025",
      transactionAmount: 83786.7,
      transactionType: "Debit",
      transactionId: "--",
      remark: "Agent Confirmed the Order",
    },
    {
      id: "cash-3",
      transactionDate: "01 Jan 2026",
      transactionAmount: 40160.3,
      transactionType: "Debit",
      transactionId: "--",
      remark: "Agent Confirmed the Order",
    },
    {
      id: "cash-4",
      transactionDate: "01 Nov 2025",
      transactionAmount: 43860.9,
      transactionType: "Debit",
      transactionId: "--",
      remark: "Agent Confirmed the Order",
    },
    {
      id: "cash-5",
      transactionDate: "01 Oct 2025",
      transactionAmount: 99450.4,
      transactionType: "Debit",
      transactionId: "--",
      remark: "Agent Confirmed the Order",
    },
    {
      id: "cash-6",
      transactionDate: "02 Dec 2025",
      transactionAmount: 109473.0,
      transactionType: "Debit",
      transactionId: "--",
      remark: "Agent Confirmed the Order",
    },
    {
      id: "cash-7",
      transactionDate: "02 Dec 2025",
      transactionAmount: 44572.8,
      transactionType: "Debit",
      transactionId: "--",
      remark: "Agent Confirmed the Order",
    },
    {
      id: "cash-8",
      transactionDate: "02 Dec 2025",
      transactionAmount: 159010.0,
      transactionType: "Debit",
      transactionId: "--",
      remark: "Agent Confirmed the Order",
    },
    {
      id: "cash-9",
      transactionDate: "03 Dec 2025",
      transactionAmount: 193059.0,
      transactionType: "Debit",
      transactionId: "--",
      remark: "Agent Confirmed the Order",
    },
    {
      id: "cash-10",
      transactionDate: "03 Jan 2026",
      transactionAmount: 74281.8,
      transactionType: "Debit",
      transactionId: "--",
      remark: "Agent Confirmed the Order",
    },
  ],

  couponTransactions: [
    {
      id: "coupon-1",
      transactionDate: "07 Aug 2024",
      transactionAmount: 10000.0,
      transactionType: "Credit",
      remark: "Agent Paid Subscription Joining Bonus",
    },
    {
      id: "coupon-2",
      transactionDate: "12 Feb 2026",
      transactionAmount: 0.0,
      transactionType: "Debit",
      remark: "Coupon discount Rs: 0 paid for the Itinerary",
    },
  ],
};

function wait<T>(value: T, delay: number = MOCK_DELAY): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(value), delay);
  });
}

function cloneWalletPageData(data: WalletPageData): WalletPageData {
  return {
    summary: { ...data.summary },
    cashTransactions: data.cashTransactions.map((item) => ({ ...item })),
    couponTransactions: data.couponTransactions.map((item) => ({ ...item })),
  };
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}

function generateTransactionId(): string {
  return `pay_mock_${Date.now()}`;
}

export const mockWalletApi = {
  async getWallet(): Promise<WalletPageData> {
    return wait(cloneWalletPageData(mockWalletStore));
  },

  async addMoney(amount: number): Promise<WalletPageData> {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    const newTransaction: WalletTransaction = {
      id: generateId("cash"),
      transactionDate: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      transactionAmount: amount,
      transactionType: "Credit",
      transactionId: generateTransactionId(),
      remark: "Self Top Up",
    };

    mockWalletStore = {
      ...mockWalletStore,
      summary: {
        ...mockWalletStore.summary,
        cashWalletBalance: mockWalletStore.summary.cashWalletBalance + amount,
        totalWalletAmount: mockWalletStore.summary.totalWalletAmount + amount,
      },
      cashTransactions: [newTransaction, ...mockWalletStore.cashTransactions],
    };

    return wait(cloneWalletPageData(mockWalletStore));
  },

  async deleteTransaction(id: string): Promise<WalletPageData> {
    const cashItem = mockWalletStore.cashTransactions.find((item) => item.id === id);

    if (cashItem) {
      const updatedCashTransactions = mockWalletStore.cashTransactions.filter(
        (item) => item.id !== id
      );

      const amountChange =
        cashItem.transactionType === "Credit"
          ? -cashItem.transactionAmount
          : cashItem.transactionAmount;

      mockWalletStore = {
        ...mockWalletStore,
        summary: {
          ...mockWalletStore.summary,
          cashWalletBalance: mockWalletStore.summary.cashWalletBalance + amountChange,
          totalWalletAmount: mockWalletStore.summary.totalWalletAmount + amountChange,
        },
        cashTransactions: updatedCashTransactions,
      };

      return wait(cloneWalletPageData(mockWalletStore));
    }

    const couponItem = mockWalletStore.couponTransactions.find((item) => item.id === id);

    if (couponItem) {
      const updatedCouponTransactions = mockWalletStore.couponTransactions.filter(
        (item) => item.id !== id
      );

      const amountChange =
        couponItem.transactionType === "Credit"
          ? -couponItem.transactionAmount
          : couponItem.transactionAmount;

      mockWalletStore = {
        ...mockWalletStore,
        summary: {
          ...mockWalletStore.summary,
          couponWalletBalance:
            mockWalletStore.summary.couponWalletBalance + amountChange,
          totalWalletAmount: mockWalletStore.summary.totalWalletAmount + amountChange,
        },
        couponTransactions: updatedCouponTransactions,
      };

      return wait(cloneWalletPageData(mockWalletStore));
    }

    throw new Error("Transaction not found");
  },
};