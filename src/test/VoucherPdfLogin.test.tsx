import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import PdfPreviewPage from "../pages/PdfPreviewPage";
import { ItineraryService } from "@/services/itinerary";

function LoginDestination() {
  const location = useLocation();
  return <p>{location.state?.returnTo}</p>;
}

afterEach(() => vi.restoreAllMocks());

it("returns a voucher preview to React login when the session has expired", async () => {
  const pdf = vi.spyOn(ItineraryService, "fetchPdfDocument")
    .mockRejectedValue(new Error("Session expired. Please login again."));
  render(
    <MemoryRouter initialEntries={["/pdf-preview/voucher/42"]}>
      <Routes>
        <Route path="/pdf-preview/voucher/:id" element={<PdfPreviewPage />} />
        <Route path="/login" element={<LoginDestination />} />
      </Routes>
    </MemoryRouter>,
  );
  expect(await screen.findByText("/pdf-preview/voucher/42")).toBeVisible();
  expect(pdf).toHaveBeenCalledExactlyOnceWith("itineraries/42/voucher-pdf", "voucher-details-42.pdf", {
    auth: true, redirectOnUnauthorized: false,
  });
});
