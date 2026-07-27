import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ItineraryService } from "@/services/itinerary";
import { ItineraryDetailsRouter } from "@/pages/ItineraryDetailsRouter";

vi.mock("@/pages/ItineraryDetails", async () => {
  const React = await import("react");
  const { useParams } = await import("react-router-dom");
  const { ItineraryService: service } = await import("@/services/itinerary");

  return {
    ItineraryDetails: () => {
      const { id } = useParams<{ id: string }>();
      React.useEffect(() => {
        if (id) void service.getDetails(id);
      }, [id]);
      return <div data-testid="normal-itinerary-page">{id}</div>;
    },
  };
});

describe("routed itinerary details flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("routes the normal page directly and performs exactly one details request", async () => {
    const getDetails = vi.spyOn(ItineraryService, "getDetails").mockResolvedValue(
      { quoteId: "DVI-ROUTED" } as unknown as Awaited<ReturnType<typeof ItineraryService.getDetails>>,
    );

    render(
      <MemoryRouter initialEntries={["/itinerary-details/DVI-ROUTED"]}>
        <Routes>
          <Route path="/itinerary-details/:id" element={<ItineraryDetailsRouter />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(getDetails).toHaveBeenCalledTimes(1));
    expect(getDetails).toHaveBeenCalledWith("DVI-ROUTED");
  });
});
