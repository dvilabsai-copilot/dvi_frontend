import { useCallback, type Dispatch, type SetStateAction } from "react";
import { AgentAPI } from "@/services/agentService";
import { ItineraryService } from "@/services/itinerary";
import { toast } from "sonner";

interface WalletAgentInfo {
  agent_id?: number;
}

interface WalletTopUpControllerOptions {
  shouldEnableWalletTopUpOnConfirm: boolean;
  quoteId?: string;
  planId?: number;
  agentInfo: WalletAgentInfo | null;
  walletTopUpAmount: string;
  walletTopUpRemark: string;
  confirmRequiredAmount: number;
  setWalletBalance: Dispatch<SetStateAction<string>>;
  setWalletBalanceAmount: Dispatch<SetStateAction<number | null>>;
  setShowWalletTopUpPanel: Dispatch<SetStateAction<boolean>>;
  setWalletTopUpAmount: Dispatch<SetStateAction<string>>;
  setWalletTopUpRemark: Dispatch<SetStateAction<string>>;
  setWalletShortfallAmount: Dispatch<SetStateAction<number>>;
  getWalletAmountFromResponse: (response: unknown) => number;
  formatCurrency: (amount: number) => string;
  setIsWalletTopUpSubmitting: Dispatch<SetStateAction<boolean>>;
  handleConfirmQuotation: (options: { skipWalletCheck?: boolean }) => Promise<void>;
}

/** Owns cash-wallet top-up validation and continuation into quotation confirmation. */
export const useWalletTopUpController = ({
  shouldEnableWalletTopUpOnConfirm,
  quoteId,
  planId,
  agentInfo,
  walletTopUpAmount,
  walletTopUpRemark,
  confirmRequiredAmount,
  setWalletBalance,
  setWalletBalanceAmount,
  setShowWalletTopUpPanel,
  setWalletTopUpAmount,
  setWalletTopUpRemark,
  setWalletShortfallAmount,
  getWalletAmountFromResponse,
  formatCurrency,
  setIsWalletTopUpSubmitting,
  handleConfirmQuotation,
}: WalletTopUpControllerOptions) => {
  const refreshConfirmWalletBalance = useCallback(async (agentId?: number): Promise<number> => {
    if (!agentId) return 0;
    const walletData = await ItineraryService.checkWalletBalance(agentId);
    const amount = getWalletAmountFromResponse(walletData);
    const walletRecord = walletData as { formatted_balance?: string; formattedBalance?: string };
    setWalletBalance(walletRecord.formatted_balance || walletRecord.formattedBalance || formatCurrency(amount));
    setWalletBalanceAmount(amount);
    return amount;
  }, [formatCurrency, getWalletAmountFromResponse, setWalletBalance, setWalletBalanceAmount]);

  const resetConfirmWalletTopUpPanel = useCallback(() => {
    setShowWalletTopUpPanel(false);
    setWalletTopUpAmount("");
    setWalletTopUpRemark("");
    setWalletShortfallAmount(0);
  }, [setShowWalletTopUpPanel, setWalletShortfallAmount, setWalletTopUpAmount, setWalletTopUpRemark]);

  const prepareWalletTopUpPanel = useCallback((currentBalance: number) => {
    const shortfall = Math.max(confirmRequiredAmount - currentBalance, 0);
    const suggestedAmount = Math.ceil(shortfall);
    setWalletShortfallAmount(shortfall);
    setWalletTopUpAmount(String(suggestedAmount > 0 ? suggestedAmount : ""));
    setWalletTopUpRemark(`Cash wallet top-up before confirming quotation ${quoteId || planId || ""}`);
    setShowWalletTopUpPanel(true);
  }, [confirmRequiredAmount, planId, quoteId, setShowWalletTopUpPanel, setWalletShortfallAmount, setWalletTopUpAmount, setWalletTopUpRemark]);

  const handleWalletTopUpAndContinue = useCallback(async () => {
  if (!shouldEnableWalletTopUpOnConfirm || !agentInfo?.agent_id) {
    toast.error("Agent information is missing. Please reopen Confirm Quotation.");
    return;
  }

  const amount = Number(walletTopUpAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    toast.error("Please enter a valid cash amount greater than 0.");
    return;
  }
  if (!String(walletTopUpRemark || "").trim()) {
    toast.error("Please enter a remark for this wallet top-up.");
    return;
  }

  setIsWalletTopUpSubmitting(true);
  try {
    await AgentAPI.addCashWallet(agentInfo.agent_id, Number(amount.toFixed(2)), walletTopUpRemark.trim());
    toast.success("Cash wallet amount added successfully.");
    const latestWalletBalance = await refreshConfirmWalletBalance(agentInfo.agent_id);
    if (latestWalletBalance < confirmRequiredAmount) {
      prepareWalletTopUpPanel(latestWalletBalance);
      toast.error("Wallet is still insufficient. Please add the remaining shortfall.");
      return;
    }
    resetConfirmWalletTopUpPanel();
    await handleConfirmQuotation({ skipWalletCheck: true });
  } catch (error) {
    console.error("Failed to add cash wallet amount", error);
    toast.error(error?.message || "Failed to add cash wallet amount.");
  } finally {
    setIsWalletTopUpSubmitting(false);
  }
  }, [agentInfo, confirmRequiredAmount, handleConfirmQuotation, prepareWalletTopUpPanel, refreshConfirmWalletBalance, resetConfirmWalletTopUpPanel, setIsWalletTopUpSubmitting, shouldEnableWalletTopUpOnConfirm, walletTopUpAmount, walletTopUpRemark]);

  return { handleWalletTopUpAndContinue, prepareWalletTopUpPanel, refreshConfirmWalletBalance, resetConfirmWalletTopUpPanel };
};
