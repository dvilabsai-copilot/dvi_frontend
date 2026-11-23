import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as apiClient from "@/lib/api";
import SupplierVoucherPage from "../pages/SupplierVoucherPage";

const openVoucher = (hash = "#token=fixture.token") => render(
  <MemoryRouter initialEntries={[{ pathname: "/supplier-voucher", hash }]}>
    <SupplierVoucherPage />
  </MemoryRouter>,
);

describe("Supplier voucher page", () => {
  afterEach(() => vi.restoreAllMocks());

  it("opens a confirmed provider voucher without offering confirmation", async () => {
    const api = vi.spyOn(apiClient, "api").mockResolvedValue({
      kind: "hotel", reference: "FIX-42", supplierName: "Provider Hotel", status: "confirmed", canConfirm: false,
    });
    openVoucher();
    expect(await screen.findByRole("heading", { name: "Provider Hotel" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Confirm Book" })).toBeNull();
    expect(api).toHaveBeenCalledExactlyOnceWith("/supplier-vouchers/open", expect.objectContaining({
      method: "POST", auth: false, body: { token: "fixture.token" },
    }));
  });

  it.each(["hotel", "vehicle"] as const)("offers pending %s confirmation through the signed endpoint", async (kind) => {
    const api = vi.spyOn(apiClient, "api").mockResolvedValueOnce({
      kind, reference: "FIX-42", supplierName: "Fixture supplier", status: "pending", canConfirm: true,
    }).mockResolvedValueOnce({ confirmed: true });
    const user = userEvent.setup();
    openVoucher();
    const confirm = await screen.findByRole("button", { name: "Confirm Book" });
    expect(api).toHaveBeenCalledTimes(1);
    await user.type(screen.getByLabelText("Reservation number"), "TEST-42");
    await user.type(screen.getByLabelText("Confirmed by"), "Supplier Desk");
    await user.type(screen.getByLabelText("Phone"), "9876543210");
    if (kind === "hotel") await user.type(screen.getByLabelText("Hotel email"), "hotel@example.com");
    await user.click(confirm);
    expect(await screen.findByText("Your confirmation was saved.")).toBeVisible();
    expect(api).toHaveBeenLastCalledWith("/supplier-vouchers/confirm", expect.objectContaining({
      method: "POST", auth: false, body: {
        token: "fixture.token", confirmedBy: "Supplier Desk", phone: "9876543210", reservationNo: "TEST-42",
        ...(kind === "hotel" ? { email: "hotel@example.com", remarks: "" } : {}),
      },
    }));
    expect(confirm).not.toBeInTheDocument();
  });

  it("shows an unavailable link without exposing a confirmation action", async () => {
    vi.spyOn(apiClient, "api").mockRejectedValue(new Error("Expired"));
    openVoucher();
    expect(await screen.findByRole("alert")).toHaveTextContent("This voucher link is unavailable.");
    expect(screen.queryByRole("button", { name: "Confirm Book" })).toBeNull();
  });
});
