import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useHouseboatPreference } from "./useHouseboatPreference";

vi.mock("@/services/GlobalSettingsService", () => ({
  getGlobalSettings: async () => ({
    houseboat_only_cities: [{ id: 1, name: "Alleppey", stateName: "Kerala" }],
  }),
}));

function RouteEditor({ itineraryPreference }: { itineraryPreference: "both" | "hotel" | "vehicle" }) {
  const [routes, setRoutes] = useState([{ id: 1, day: 1, next: "Kochi", preferHouseboats: false }]);
  const preference = useHouseboatPreference(setRoutes, itineraryPreference);
  const [route] = routes;
  return (
    <>
      <button onClick={() => {
        const destination = "Alappuzha, Kerala, India";
        setRoutes([{ ...route, next: destination }]);
        void preference.promptForDestination(route, destination, true);
      }}>
        Choose Alappuzha
      </button>
      {preference.switchFor(route)}
      {preference.dialog}
    </>
  );
}

describe("route houseboat preference", () => {
  it.each(["both", "hotel"] as const)("confirms the initial choice and preserves the switch on cancel for %s trips", async (itineraryPreference) => {
    render(<RouteEditor itineraryPreference={itineraryPreference} />);
    expect(screen.queryByRole("switch")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Choose Alappuzha" }));
    await screen.findByRole("alertdialog", { name: "Would you like to stay on a houseboat in Alleppey?" });
    fireEvent.click(screen.getByRole("button", { name: "Choose houseboat" }));
    const toggle = screen.getByRole("switch", { name: "Prefer houseboats in Alleppey on day 1" });
    expect(toggle).toBeChecked();
    fireEvent.click(toggle);
    await screen.findByRole("alertdialog", { name: "Switch the automatic selection to a regular hotel in Alleppey?" });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(toggle).toBeChecked();
    fireEvent.click(toggle);
    fireEvent.click(await screen.findByRole("button", { name: "Switch to hotel" }));
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    fireEvent.click(await screen.findByRole("button", { name: "Switch to houseboat" }));
    expect(toggle).toBeChecked();
  });

  it("keeps houseboat preferences out of transport-only itineraries", () => {
    render(<RouteEditor itineraryPreference="vehicle" />);
    fireEvent.click(screen.getByRole("button", { name: "Choose Alappuzha" }));
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});
