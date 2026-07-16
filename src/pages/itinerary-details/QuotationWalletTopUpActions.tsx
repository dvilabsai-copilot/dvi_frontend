import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";

type QuotationWalletTopUpActionsProps = {
  amount: string;
  setAmount: Dispatch<SetStateAction<string>>;
  remark: string;
  setRemark: Dispatch<SetStateAction<string>>;
  submitting: boolean;
  agentId?: number;
  onSubmit: () => void | Promise<void>;
  onRefresh: (agentId: number) => void | Promise<unknown>;
};

export function QuotationWalletTopUpActions({
  amount,
  setAmount,
  remark,
  setRemark,
  submitting,
  agentId,
  onSubmit,
  onRefresh,
}: QuotationWalletTopUpActionsProps) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-[#4a4260] mb-1 block">Add Cash Amount</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Enter amount"
            className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-[#4a4260] mb-1 block">Remark</label>
          <input
            type="text"
            value={remark}
            onChange={(event) => setRemark(event.target.value)}
            placeholder="Wallet top-up remark"
            className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onSubmit} disabled={submitting} className="bg-[#d546ab] hover:bg-[#be3f97]">
          {submitting ? "Adding Cash..." : "Add Cash Wallet & Continue"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void (agentId && onRefresh(agentId))}
          disabled={submitting}
          className="border-[#d546ab] text-[#d546ab]"
        >
          Refresh Wallet
        </Button>
      </div>
    </>
  );
}
