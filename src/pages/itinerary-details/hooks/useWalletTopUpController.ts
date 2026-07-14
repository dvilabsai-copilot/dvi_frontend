import { useCallback, type Dispatch, type SetStateAction } from "react";
import { AgentAPI } from "@/services/agentService";
import { toast } from "sonner";

interface WalletAgentInfo {
  agent_id?: number;
}

interface WalletTopUpControllerOptions {
  shouldEnableWalletTopUpOnConfirm: boolean;
  agentInfo: WalletAgentInfo | null;
  walletTopUpAmount: string;
  walletTopUpRemark: string;
  confirmRequiredAmount: number;
  setIsWalletTopUpSubmitting: Dispatch<SetStateAction<boolean>>;
  refreshConfirmWalletBalance: (agentId?: number) => Promise<number>;
  prepareWalletTopUpPanel: (currentBalance: number) => void;
  resetConfirmWalletTopUpPanel: () => void;
  handleConfirmQuotation: (options: { skipWalletCheck?: boolean }) => Promise<void>;
}

/** Owns cash-wallet top-up validation and continuation into quotation confirmation. */
export const useWalletTopUpController = ({
  shouldEnableWalletTopUpOnConfirm,
  agentInfo,
  walletTopUpAmount,
  walletTopUpRemark,
  confirmRequiredAmount,
  setIsWalletTopUpSubmitting,
  refreshConfirmWalletBalance,
  prepareWalletTopUpPanel,
  resetConfirmWalletTopUpPanel,
  handleConfirmQuotation,
}: WalletTopUpControllerOptions) => useCallback(async () => {
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
