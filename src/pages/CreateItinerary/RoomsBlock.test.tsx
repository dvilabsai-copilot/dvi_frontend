// @vitest-environment jsdom
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { RoomsBlock } from "./RoomsBlock";
import {
  areRoomTemplatesEqual,
  cloneRoomFromTemplate,
  cloneRoomTemplate,
  getRoomOccupancyValidationError,
  INITIAL_ROOM_TEMPLATE,
  roomToTemplate,
  type RoomRow,
  type RoomTemplate,
  useRoomsAndTravellers,
} from "./helpers/useRoomsAndTravellers";

const makeRoom = (id: number, template: RoomTemplate = INITIAL_ROOM_TEMPLATE): RoomRow => ({
  id,
  roomCount: id,
  ...cloneRoomTemplate(template),
});

function RoomsHarness({
  initialRooms = [makeRoom(1)],
  initialDefaultRoomTemplate = INITIAL_ROOM_TEMPLATE,
}: {
  initialRooms?: RoomRow[];
  initialDefaultRoomTemplate?: RoomTemplate;
}) {
  const [rooms, setRooms] = useState(initialRooms);
  const [defaultRoomTemplate, setDefaultRoomTemplate] = useState<RoomTemplate>(() => cloneRoomTemplate(initialDefaultRoomTemplate));
  return <RoomsBlock itineraryPreference="hotel" rooms={rooms} setRooms={setRooms} addRoom={() => undefined} removeRoom={() => undefined} defaultRoomTemplate={defaultRoomTemplate} setDefaultRoomTemplate={setDefaultRoomTemplate} />;
}

describe("Default Room template", () => {
  it("enforces the three-bed rule for all adult and child-bed combinations", () => {
    const room = (adults: number, children: number, bedTypes: Array<"Without Bed" | "With Bed">): RoomRow =>
      makeRoom(1, {
        ...INITIAL_ROOM_TEMPLATE,
        adults,
        children,
        childrenDetails: bedTypes.map((bedType) => ({ age: 7, bedType })),
      });

    expect(getRoomOccupancyValidationError(room(2, 1, ["With Bed"]))).toBeNull();
    expect(getRoomOccupancyValidationError(room(2, 2, ["With Bed", "Without Bed"]))).toBeNull();
    expect(getRoomOccupancyValidationError(room(2, 2, ["With Bed", "With Bed"]))).toContain("maximum of 3 beds");
    expect(getRoomOccupancyValidationError(room(3, 1, ["With Bed"]))).toContain("maximum of 3 beds");
  });

  it("starts with the requested two-adult template", () => {
    expect(INITIAL_ROOM_TEMPLATE.adults).toBe(2);
    expect(INITIAL_ROOM_TEMPLATE.children).toBe(0);
    expect(INITIAL_ROOM_TEMPLATE.infants).toBe(0);
  });

  it("does not expose persistence identity fields", () => {
    expect(INITIAL_ROOM_TEMPLATE).not.toHaveProperty("id");
    expect(INITIAL_ROOM_TEMPLATE).not.toHaveProperty("roomCount");
  });

  it("creates an actual room with contiguous identity fields", () => {
    expect(cloneRoomFromTemplate(INITIAL_ROOM_TEMPLATE, 3, 4)).toMatchObject({ id: 3, roomCount: 4, adults: 2 });
  });

  it("deep-clones child details when creating a room", () => {
    const template = cloneRoomTemplate({ ...INITIAL_ROOM_TEMPLATE, children: 1, childrenDetails: [{ age: 7, bedType: "Without Bed", hotelApprovalAccepted: false }] });
    const room = cloneRoomFromTemplate(template, 1, 1);
    room.childrenDetails[0].age = 9;
    expect(template.childrenDetails[0].age).toBe(7);
  });

  it("deep-clones child details when cloning a template", () => {
    const template = { ...INITIAL_ROOM_TEMPLATE, children: 1, childrenDetails: [{ age: 8, bedType: "With Bed" as const }] };
    const clone = cloneRoomTemplate(template);
    clone.childrenDetails[0].age = 10;
    expect(template.childrenDetails[0].age).toBe(8);
  });

  it("recognizes an unchanged room as not customized", () => {
    expect(areRoomTemplatesEqual(makeRoom(1), INITIAL_ROOM_TEMPLATE)).toBe(true);
  });

  it("recognizes adult occupancy customization", () => {
    expect(areRoomTemplatesEqual({ ...makeRoom(1), adults: 3 }, INITIAL_ROOM_TEMPLATE)).toBe(false);
  });

  it("recognizes child bed customization", () => {
    const template = { ...INITIAL_ROOM_TEMPLATE, children: 1, childrenDetails: [{ age: 7, bedType: "Without Bed" as const }] };
    expect(areRoomTemplatesEqual({ ...makeRoom(1, template), childrenDetails: [{ age: 7, bedType: "With Bed" }] }, template)).toBe(false);
  });

  it("recognizes child age and approval customization", () => {
    const template = { ...INITIAL_ROOM_TEMPLATE, children: 1, childrenDetails: [{ age: 7, bedType: "Without Bed" as const, hotelApprovalAccepted: false }] };
    expect(areRoomTemplatesEqual({ ...makeRoom(1, template), childrenDetails: [{ age: 8, bedType: "Without Bed", hotelApprovalAccepted: false }] }, template)).toBe(false);
    expect(areRoomTemplatesEqual({ ...makeRoom(1, template), childrenDetails: [{ age: 7, bedType: "Without Bed", hotelApprovalAccepted: true }] }, template)).toBe(false);
  });

  it("derives a UI template from the first hydrated actual room", () => {
    const hydratedRoom = makeRoom(1, { ...INITIAL_ROOM_TEMPLATE, adults: 3 });
    const template = roomToTemplate(hydratedRoom);
    expect(template).toEqual(expect.objectContaining({ adults: 3 }));
    expect(template).not.toHaveProperty("id");
  });

  it("keeps the hook's initial actual room at two adults", () => {
    const { result } = renderHook(() => useRoomsAndTravellers());
    expect(result.current.rooms).toHaveLength(1);
    expect(result.current.rooms[0].adults).toBe(2);
  });

  it("keeps traveller payload construction scoped to actual rooms", () => {
    const { result } = renderHook(() => useRoomsAndTravellers());
    const payload = result.current.buildTravellers();
    expect(payload.travellerRows).toHaveLength(2);
    expect(payload.travellerRows.every((traveller) => traveller.room_id > 0)).toBe(true);
  });

  it("renders individual rooms collapsed while keeping Default Room visible", () => {
    render(<RoomsHarness />);
    expect(screen.getByText("Default Room")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Individual room editors" })).not.toBeInTheDocument();
  });

  it("preserves the legacy Booking Summary two-column layout", () => {
    render(<RoomsHarness />);
    expect(screen.getByText("Auto-updates as you modify rooms")).toBeInTheDocument();

    const summaryLayout = screen.getByText("Booking Summary").closest("div.grid");
    expect(summaryLayout).toHaveClass("gap-4", "xl:grid-cols-[minmax(0,1fr)_285px]");

    const metricsGrid = screen.getAllByText("Total Rooms")[0].closest("div.grid");
    expect(metricsGrid).toHaveClass("grid-cols-2", "xl:grid-cols-6");

    const totalPaxCard = screen.getByText("Total Pax").closest("div.w-full");
    expect(totalPaxCard).toHaveClass("rounded-xl", "bg-[#fff0fa]");
    expect(totalPaxCard?.parentElement).toHaveClass("flex", "items-end");
  });

  it("uses one accessible toggle for the individual room area", () => {
    render(<RoomsHarness />);
    const toggle = screen.getByRole("button", { name: /Edit Individual Rooms/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("region", { name: "Individual room editors" })).toBeInTheDocument();
  });

  it("shows a Default Room alert once instead of repeating it for template-managed rooms", () => {
    render(<RoomsHarness initialRooms={[makeRoom(1), makeRoom(2)]} />);
    fireEvent.click(screen.getByRole("button", { name: "Add child to Default" }));
    fireEvent.click(screen.getByRole("button", { name: "Add child to Default" }));

    expect(screen.getAllByText("Occupancy Alert")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /Edit Individual Rooms/i }));
    expect(screen.getAllByText("Occupancy Alert")).toHaveLength(1);
  });

  it("shows an occupancy alert only for a customized individual room", () => {
    const invalidRoomTemplate: RoomTemplate = {
      ...INITIAL_ROOM_TEMPLATE,
      children: 2,
      childrenDetails: [
        { age: 7, bedType: "Without Bed", hotelApprovalAccepted: false },
        { age: 8, bedType: "Without Bed", hotelApprovalAccepted: false },
      ],
    };
    render(<RoomsHarness initialRooms={[makeRoom(1, invalidRoomTemplate), makeRoom(2)]} />);
    fireEvent.click(screen.getByRole("button", { name: /Edit Individual Rooms/i }));

    expect(screen.getAllByText("Occupancy Alert")).toHaveLength(1);
    const roomOne = screen.getByText("#Room 1").closest("div.relative") as HTMLElement;
    expect(within(roomOne).getByText("Occupancy Alert")).toBeInTheDocument();
    const roomTwo = screen.getByText("#Room 2").closest("div.relative") as HTMLElement;
    expect(within(roomTwo).queryByText("Occupancy Alert")).not.toBeInTheDocument();
  });

  it("clones the current Default Room when Add Room increases the count", () => {
    render(<RoomsHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Add adult" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Room" }));
    fireEvent.click(screen.getByRole("button", { name: /Edit Individual Rooms/i }));
    const roomTwo = screen.getByText("#Room 2").closest("div.relative");
    expect(roomTwo).not.toBeNull();
    expect(within(roomTwo as HTMLElement).getByText("3")).toBeInTheDocument();
  });

  it("shows one confirmation for a Default Room change when actual rooms are customized", () => {
    render(<RoomsHarness initialRooms={[makeRoom(1), makeRoom(2)]} />);
    fireEvent.click(screen.getByRole("button", { name: /Edit Individual Rooms/i }));
    const roomOne = screen.getByText("#Room 1").closest("div.relative") as HTMLElement;
    fireEvent.click(within(roomOne).getByRole("button", { name: "Add adult" }));
    fireEvent.click(screen.getByRole("button", { name: /Close Rooms/i }));
    fireEvent.click(screen.getByRole("button", { name: "Add adult" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Apply Default Room changes?");
    expect(screen.getAllByRole("button", { name: "Cancel" })).toHaveLength(1);
  });

  it("blocks an individual-room adult change that would require a fourth bed", () => {
    const roomTemplate: RoomTemplate = {
      ...INITIAL_ROOM_TEMPLATE,
      children: 1,
      childrenDetails: [
        { age: 7, bedType: "With Bed", hotelApprovalAccepted: false },
      ],
    };
    render(<RoomsHarness initialRooms={[makeRoom(1, roomTemplate)]} />);
    fireEvent.click(screen.getByRole("button", { name: /Edit Individual Rooms/i }));
    const roomOne = screen.getByText("#Room 1").closest("div.relative") as HTMLElement;

    fireEvent.click(within(roomOne).getByRole("button", { name: "Add adult" }));

    expect(screen.getByRole("dialog")).toHaveTextContent("maximum of 3 beds");
    expect(within(roomOne).getByText("2")).toBeInTheDocument();
  });

  it("blocks selecting With Bed for a second child", () => {
    const roomTemplate: RoomTemplate = {
      ...INITIAL_ROOM_TEMPLATE,
      children: 2,
      childrenDetails: [
        { age: 7, bedType: "With Bed", hotelApprovalAccepted: false },
        { age: 8, bedType: "Without Bed", hotelApprovalAccepted: false },
      ],
    };
    render(<RoomsHarness initialRooms={[makeRoom(1, roomTemplate)]} />);
    fireEvent.click(screen.getByRole("button", { name: /Edit Individual Rooms/i }));
    const roomOne = screen.getByText("#Room 1").closest("div.relative") as HTMLElement;
    const secondChildBed = within(roomOne).getByRole("combobox", { name: "#Room 1 child 2 bed type" });

    fireEvent.change(secondChildBed, { target: { value: "With Bed" } });

    expect(screen.getByRole("dialog")).toHaveTextContent("maximum of 3 beds");
    expect(secondChildBed).toHaveValue("Without Bed");
  });

  it("shows the occupancy modal before the Default Room apply confirmation", () => {
    const defaultTemplate: RoomTemplate = {
      ...INITIAL_ROOM_TEMPLATE,
      children: 2,
      childrenDetails: [
        { age: 7, bedType: "With Bed", hotelApprovalAccepted: false },
        { age: 8, bedType: "Without Bed", hotelApprovalAccepted: false },
      ],
    };
    render(
      <RoomsHarness
        initialRooms={[makeRoom(1, defaultTemplate), makeRoom(2)]}
        initialDefaultRoomTemplate={defaultTemplate}
      />,
    );

    const secondChildBed = screen.getByRole("combobox", { name: "Default child 2 bed type" });
    fireEvent.change(secondChildBed, { target: { value: "With Bed" } });

    expect(screen.getByRole("dialog")).toHaveTextContent("maximum of 3 beds");
    expect(screen.queryByText("Apply Default Room changes?")).not.toBeInTheDocument();
    expect(secondChildBed).toHaveValue("Without Bed");
  });

  it("cancelling the confirmation preserves customized actual rooms", () => {
    render(<RoomsHarness initialRooms={[makeRoom(1), makeRoom(2)]} />);
    fireEvent.click(screen.getByRole("button", { name: /Edit Individual Rooms/i }));
    const roomOne = screen.getByText("#Room 1").closest("div.relative") as HTMLElement;
    fireEvent.click(within(roomOne).getByRole("button", { name: "Add adult" }));
    fireEvent.click(screen.getByRole("button", { name: /Close Rooms/i }));
    fireEvent.click(screen.getByRole("button", { name: "Add adult" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText(/1 individual room is customized/)).toBeInTheDocument();
  });

  it("applies the staged Default Room atomically to all actual rooms", () => {
    render(<RoomsHarness initialRooms={[makeRoom(1), makeRoom(2)]} />);
    fireEvent.click(screen.getByRole("button", { name: /Edit Individual Rooms/i }));
    const roomOne = screen.getByText("#Room 1").closest("div.relative") as HTMLElement;
    fireEvent.click(within(roomOne).getByRole("button", { name: "Add adult" }));
    fireEvent.click(screen.getByRole("button", { name: /Close Rooms/i }));
    fireEvent.click(screen.getByRole("button", { name: "Add adult" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply to all rooms" }));
    fireEvent.click(screen.getByRole("button", { name: /Edit Individual Rooms/i }));
    const roomTwo = screen.getByText("#Room 2").closest("div.relative") as HTMLElement;
    expect(within(roomTwo).getByText("3")).toBeInTheDocument();
  });
});
