import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useHouseboatPreference } from "./useHouseboatPreference";

vi.mock("@/services/GlobalSettingsService", () => ({
  getGlobalSettings: async () => ({
    houseboat_only_cities: [{ id: 1, name: "Alleppey", stateName: "Kerala" }],
  }),
}));

function RouteEditor() {
  const [routes, setRoutes] = useState([{ id: 1, next: "Kochi", preferHouseboats: false }]);
  const preference = useHouseboatPreference(setRoutes, true);
  const [route] = routes;
  const city = preference.cityFor(route);
  return (
    <>
      <button onClick={() => {
        const destination = "Alappuzha, Kerala, India";
        setRoutes([{ ...route, next: destination }]);
        void preference.promptForDestination(route, destination, true);
      }}>
        Choose Alappuzha
      </button>
      {city && (
        <button role="switch" aria-label="Prefer houseboats"
          aria-checked={route.preferHouseboats} onClick={() => preference.promptForToggle(route, city)} />
      )}
      {preference.dialog}
    </>
  );
}

describe("route houseboat preference", () => {
  it("confirms the initial choice and protects the saved switch state on cancel", async () => {
    render(<RouteEditor />);
    expect(screen.queryByRole("switch")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Choose Alappuzha" }));
    await screen.findByRole("alertdialog", { name: "Would you like to stay on a houseboat in Alleppey?" });
    fireEvent.click(screen.getByRole("button", { name: "Choose houseboat" }));
    const toggle = screen.getByRole("switch", { name: "Prefer houseboats" });
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
});
