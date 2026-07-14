type QuotationAgentSummaryProps = {
  agentInfo: {
    quotation_no: string;
    agent_name: string;
    agent_display_name?: string;
  } | null;
  walletBalance: string;
  walletBalanceAmount: number | null;
  parseWalletAmount: (value: string) => number;
  confirmRequiredAmount: number;
  formatCurrency: (value: number) => string;
};

export function QuotationAgentSummary({
  agentInfo,
  walletBalance,
  walletBalanceAmount,
  parseWalletAmount,
  confirmRequiredAmount,
  formatCurrency,
}: QuotationAgentSummaryProps) {
  if (!agentInfo) return null;

  return (
    <div className="bg-[#f8f9fa] p-4 rounded-lg space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-[#6c6c6c]">Quotation No:</span>
        <span className="font-medium text-[#4a4260]">{agentInfo.quotation_no}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-[#6c6c6c]">Agent Name:</span>
        <span className="font-medium text-[#4a4260]">{agentInfo.agent_display_name || agentInfo.agent_name}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-[#6c6c6c]">Wallet Balance:</span>
        <span className={`font-medium ${(walletBalanceAmount ?? parseWalletAmount(walletBalance)) < 0 ? 'text-red-600' : 'text-green-600'}`}>
          {walletBalance}
        </span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-[#6c6c6c]">Amount Required:</span>
        <span className="font-medium text-[#4a4260]">{formatCurrency(confirmRequiredAmount)}</span>
      </div>
    </div>
  );
}

