import type { Dispatch, SetStateAction } from "react";
import { QuotationWalletTopUpActions } from "../QuotationWalletTopUpActions";

type QuotationWalletInsufficientPanelProps = {
  visible: boolean;
  agentId: number;
  confirmRequiredAmount: number;
  walletBalance?: string | null;
  walletBalanceAmount: number;
  walletShortfallAmount: number;
  formatCurrency: (value: number) => string;
  amount: string;
  setAmount: Dispatch<SetStateAction<string>>;
  remark: string;
  setRemark: Dispatch<SetStateAction<string>>;
  submitting: boolean;
  onSubmit: () => void | Promise<void>;
  onRefresh: (agentId: number) => void | Promise<unknown>;
};

/** Owns the insufficient-wallet warning and top-up controls in quotation confirmation. */
export function QuotationWalletInsufficientPanel({
  visible,
  agentId,
  confirmRequiredAmount,
  walletBalance,
  walletBalanceAmount,
  walletShortfallAmount,
  formatCurrency,
  amount,
  setAmount,
  remark,
  setRemark,
  submitting,
  onSubmit,
  onRefresh,
}: QuotationWalletInsufficientPanelProps) {
  if (!visible) return null;
  return (
    <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4">
      <div>
        <h3 className="font-semibold text-red-800">Agent wallet balance is insufficient</h3>
        <p className="mt-1 text-xs text-red-700">Required: {formatCurrency(confirmRequiredAmount)} · Current Wallet: {walletBalance || formatCurrency(walletBalanceAmount || 0)} · Shortfall: {formatCurrency(walletShortfallAmount)}</p>
      </div>
      <QuotationWalletTopUpActions amount={amount} setAmount={setAmount} remark={remark} setRemark={setRemark} submitting={submitting} agentId={agentId} onSubmit={onSubmit} onRefresh={onRefresh} />
    </div>
  );
}

export default QuotationWalletInsufficientPanel;
