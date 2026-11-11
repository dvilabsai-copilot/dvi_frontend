import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HotelierContactDialog } from "@/pages/itinerary-details/components/HotelierContactDialog";
import { OTHER_HOTELIER_PHONE_OPTION, splitHotelierPhoneOptions } from "@/pages/itinerary-details/utils/hotelierContact.utils";

describe("HotelierContactDialog", () => {
  it("offers saved phone choices and an editable Other field in the shared hold dialog", () => {
    const onPhoneOptionChange = vi.fn();
    const dialogProps = {
      open: true,
      title: "Confirm hotelier contact",
      description: "Enter the contact used for the hold.",
      contactName: "Sandra Palace",
      onContactNameChange: vi.fn(),
      contactPhone: "9995959880",
      onContactPhoneChange: vi.fn(),
      phoneOptions: ["9995959880", "9995462666"],
      selectedPhoneOption: "9995959880",
      onPhoneOptionChange,
      confirmed: false,
      onConfirmedChange: vi.fn(),
      confirmationText: "I confirm the hotelier agreed.",
      cancelLabel: "Keep Hold",
      confirmLabel: "Confirm Removal",
      onClose: vi.fn(),
      onConfirm: vi.fn(),
    };
    const view = render(
      <HotelierContactDialog
        {...dialogProps}
      />,
    );

    const dialog = screen.getByRole("dialog");
    const phoneLabel = within(dialog).getByText("Hotelier phone number").parentElement!;
    const phoneSelect = within(phoneLabel).getByRole("combobox");
    expect(phoneSelect).toHaveValue("9995959880");
    expect(within(phoneSelect).getByRole("option", { name: "9995462666" })).toBeInTheDocument();

    fireEvent.change(phoneSelect, { target: { value: "__other__" } });
    expect(onPhoneOptionChange).toHaveBeenCalledWith("__other__");
    view.rerender(<HotelierContactDialog {...dialogProps} selectedPhoneOption={OTHER_HOTELIER_PHONE_OPTION} contactPhone="" />);
    const updatedDialog = screen.getByRole("dialog");
    const updatedPhoneLabel = within(updatedDialog).getByText("Hotelier phone number").parentElement!;
    expect(within(updatedPhoneLabel).getByPlaceholderText("Enter hotelier phone number")).toBeInTheDocument();
    expect(within(updatedDialog).getByText("I confirm the hotelier agreed.")).toBeInTheDocument();
  });

  it("splits and deduplicates saved phone numbers", () => {
    expect(splitHotelierPhoneOptions("111, 222", ["222", "333;444"], ""))
      .toEqual(["111", "222", "333", "444"]);
  });
});
