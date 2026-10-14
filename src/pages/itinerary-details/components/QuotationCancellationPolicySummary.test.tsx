// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuotationCancellationPolicySummary } from "./QuotationCancellationPolicySummary";

describe("QuotationCancellationPolicySummary", () => {
  it("shows the selected hotel's policy before the card is expanded", () => {
    render(<QuotationCancellationPolicySummary items={["Free cancellation until 2026-12-05"]} />);

    expect(screen.getByText("Cancellation Policy (1)")).toBeInTheDocument();
    expect(screen.getByText("Free cancellation until 2026-12-05")).toBeInTheDocument();
  });

  it("shows an explicit fallback when no policy was returned", () => {
    render(<QuotationCancellationPolicySummary items={[]} />);

    expect(screen.getByText("Cancellation Policy (0)")).toBeInTheDocument();
    expect(screen.getByText("No cancellation policy available")).toBeInTheDocument();
  });
});
