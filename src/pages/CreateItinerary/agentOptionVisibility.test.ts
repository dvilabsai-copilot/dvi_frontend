import { describe, expect, it } from "vitest";
import { getVisibleAgentOptions } from "./agentOptionVisibility";

describe("getVisibleAgentOptions", () => {
  const vehicleAgent = { id: 305, name: "Vehicle Agent", roleID: 9 };
  const regularAgent = { id: 401, name: "Regular Agent", roleID: 4 };
  const agents = [vehicleAgent, regularAgent];

  it("hides vehicle agents for hotel and combined itineraries", () => {
    expect(getVisibleAgentOptions(agents, "hotel", false, null)).toEqual([regularAgent]);
    expect(getVisibleAgentOptions(agents, "both", false, null)).toEqual([regularAgent]);
  });

  it("shows vehicle agents for vehicle-only itineraries", () => {
    expect(getVisibleAgentOptions(agents, "vehicle", false, null)).toEqual(agents);
  });

  it("keeps a logged-in agent scoped to its own account", () => {
    expect(getVisibleAgentOptions(agents, "vehicle", true, 305)).toEqual([vehicleAgent]);
  });
});
