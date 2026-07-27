import { isVehicleAgentRole } from "@/services/vehicleAgentPolicy";
import type { AgentOption } from "@/services/accountsManagerApi";

export function getVisibleAgentOptions(
  agents: AgentOption[],
  itineraryPreference: "vehicle" | "hotel" | "both",
  isAgentLogin: boolean,
  loggedInAgentId: number | null,
): AgentOption[] {
  if (isAgentLogin && loggedInAgentId) {
    return agents.filter((agent) => Number(agent.id) === Number(loggedInAgentId));
  }

  if (itineraryPreference === "vehicle") {
    return agents;
  }

  return agents.filter((agent) => !isVehicleAgentRole(agent.roleID));
}
