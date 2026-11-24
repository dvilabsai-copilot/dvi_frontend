import { describe, expect, it } from "vitest";
import { getFinanceLedgerTargets, matchesLedgerBooking, countFailedRequests, shouldShowFinanceRequestError } from "../pages/accounts/transporterLedgerLogic";

describe("Accounts Transporter Ledger finance lookup", () => {
  it("loads the full ledger once without a booking filter", () => {
    expect(getFinanceLedgerTargets("", [""], [{quoteId:"DVI01"}, {quoteId:"DVI02"}])).toEqual([""]);
  });
  it("searches both original and confirmed aliases and canonical finance IDs", () => {
    expect(getFinanceLedgerTargets("DVI2026105-R1", ["dvi2026105-r1", "DVI2026105"], [{quoteId:"DVI2026105"}]))
      .toEqual(["DVI2026105-R1", "DVI2026105"]);
  });
  it("does not match a blank ID or a shorter unrelated booking", () => {
    expect(matchesLedgerBooking("", "DVI2026105-R1", ["DVI2026105"])).toBe(false);
    expect(matchesLedgerBooking("DVI2026", "DVI2026105-R1", ["DVI2026105"])).toBe(false);
    expect(matchesLedgerBooking("DVI2026105", "DVI2026105-R1", ["DVI2026105"])).toBe(true);
    expect(matchesLedgerBooking("DVI2026105-R1", "DVI2026105", [])).toBe(true);
  });
  it("distinguishes finance API failure from genuine empty results", () => {
    const results = [
      {status: "fulfilled", value: []},
      {status: "rejected", reason: new Error("network")},
    ] as const;
    expect(countFailedRequests(results)).toBe(1);
    expect(shouldShowFinanceRequestError(1, 0)).toBe(true);
    expect(shouldShowFinanceRequestError(1, 3)).toBe(false);
    expect(shouldShowFinanceRequestError(0, 0)).toBe(false);
  });
});
