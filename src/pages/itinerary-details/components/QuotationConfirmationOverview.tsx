import type { Dispatch, SetStateAction } from "react";
import { QuotationAgentSummary } from "../QuotationAgentSummary";
import { QuotationRoomingPreview } from "../QuotationRoomingPreview";
import { QuotationPassengerNotice } from "../QuotationPassengerNotice";
import { QuotationPrebookLoadingNotice } from "../QuotationPrebookLoadingNotice";
import { QuotationWalletInsufficientPanel } from "./QuotationWalletInsufficientPanel";

type AgentInfo = { quotation_no: string; agent_name: string; agent_display_name?: string; agent_id?: number } | null;
type QuotationConfirmationOverviewProps = {
  agentInfo: AgentInfo;
  walletBalance: string;
  walletBalanceAmount: number | null;
  parseWalletAmount: (value: string) => number;
  confirmRequiredAmount: number;
  formatCurrency: (value: number) => string;
  shouldEnableWalletTopUpOnConfirm: boolean;
  showWalletTopUpPanel: boolean;
  walletShortfallAmount: number;
  walletTopUpAmount: string;
  setWalletTopUpAmount: Dispatch<SetStateAction<string>>;
  walletTopUpRemark: string;
  setWalletTopUpRemark: Dispatch<SetStateAction<string>>;
  isWalletTopUpSubmitting: boolean;
  handleWalletTopUpAndContinue: () => void | Promise<void>;
  refreshConfirmWalletBalance: (agentId: number) => void | Promise<unknown>;
  isWalletInsufficientForConfirm: boolean;
  requiresHotelBookingFlow: boolean;
  confirmRoomCount: number;
  confirmPassengerMix: string;
  confirmOccupancyPreview: Array<{ adults: number; children: number }>;
  requiresDetailedPassengerFlow: boolean;
  childrenCount: number;
  infantsCount: number;
  isOpeningConfirmQuotation: boolean;
  isPrebooking: boolean;
  prebookData: unknown;
};

/** Owns the summary, wallet, rooming, and loading notices at the top of quotation confirmation. */
export function QuotationConfirmationOverview({
  agentInfo,
  walletBalance,
  walletBalanceAmount,
  parseWalletAmount,
  confirmRequiredAmount,
  formatCurrency,
  shouldEnableWalletTopUpOnConfirm,
  showWalletTopUpPanel,
  walletShortfallAmount,
  walletTopUpAmount,
  setWalletTopUpAmount,
  walletTopUpRemark,
  setWalletTopUpRemark,
  isWalletTopUpSubmitting,
  handleWalletTopUpAndContinue,
  refreshConfirmWalletBalance,
  isWalletInsufficientForConfirm,
  requiresHotelBookingFlow,
  confirmRoomCount,
  confirmPassengerMix,
  confirmOccupancyPreview,
  requiresDetailedPassengerFlow,
  childrenCount,
  infantsCount,
  isOpeningConfirmQuotation,
  isPrebooking,
  prebookData,
}: QuotationConfirmationOverviewProps) {
  return (
    <>
      <QuotationAgentSummary agentInfo={agentInfo} walletBalance={walletBalance} walletBalanceAmount={walletBalanceAmount} parseWalletAmount={parseWalletAmount} confirmRequiredAmount={confirmRequiredAmount} formatCurrency={formatCurrency} />
      <QuotationWalletInsufficientPanel visible={shouldEnableWalletTopUpOnConfirm && showWalletTopUpPanel && Boolean(agentInfo)} agentId={Number(agentInfo?.agent_id || 0)} confirmRequiredAmount={confirmRequiredAmount} walletBalance={walletBalance} walletBalanceAmount={walletBalanceAmount || 0} walletShortfallAmount={walletShortfallAmount} formatCurrency={formatCurrency} amount={walletTopUpAmount} setAmount={setWalletTopUpAmount} remark={walletTopUpRemark} setRemark={setWalletTopUpRemark} submitting={isWalletTopUpSubmitting} onSubmit={handleWalletTopUpAndContinue} onRefresh={refreshConfirmWalletBalance} />
      {isWalletInsufficientForConfirm && !showWalletTopUpPanel && shouldEnableWalletTopUpOnConfirm && <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">Wallet balance is currently below required amount. Click Confirm Booking to auto-check and open top-up panel.</div>}
      <QuotationRoomingPreview visible={requiresHotelBookingFlow} roomCount={confirmRoomCount} passengerMix={confirmPassengerMix} occupancies={confirmOccupancyPreview} />
      <QuotationPassengerNotice visible={requiresDetailedPassengerFlow && (childrenCount > 0 || infantsCount > 0)} />
      <QuotationPrebookLoadingNotice visible={requiresHotelBookingFlow && (isOpeningConfirmQuotation || isPrebooking) && !prebookData} />
    </>
  );
}

export default QuotationConfirmationOverview;
