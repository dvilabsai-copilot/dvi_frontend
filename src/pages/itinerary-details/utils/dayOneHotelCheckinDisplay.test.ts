
import { describe, expect, it } from "vitest";
import type { ItineraryDay } from "../itinerary-details.types";
import { getDayOneHotelCheckinDisplay } from "./dayOneHotelCheckinDisplay";

type TestDay = Pick<
  ItineraryDay,
  "dayNumber" | "startTime" | "segments"
>;

const makeDay = (
  startTime: string,
  travelRange: string,
  checkinTime: string | null,
): TestDay => ({
  dayNumber: 1,
  startTime,
  segments: [
    {
      type: "travel",
      from: "Airport",
      to: "Hotel",
      timeRange: travelRange,
      distance: "20 KM",
      duration: "2 Hours",
    },
    {
      type: "checkin",
      hotelName: "Test Hotel",
      hotelAddress: "",
      time: checkinTime,
    },
  ],
});

describe("SCRUM-447 Day 1 hotel check-in display", () => {
  it("handles 11 PM arrival and 3 AM check-in", () => {
    const day = makeDay(
      "11:00 PM",
      "12:00 AM - 03:00 AM",
      "03:00 AM",
    );

    expect(getDayOneHotelCheckinDisplay(day)).toEqual({
      time: "03:00 AM",
      nextDay: true,
    });
  });

  it("handles 7 PM arrival without an 8 PM cutoff", () => {
    const day = makeDay(
      "07:00 PM",
      "09:00 PM - 03:00 AM",
      "03:00 AM",
    );

    expect(getDayOneHotelCheckinDisplay(day)).toEqual({
      time: "03:00 AM",
      nextDay: true,
    });
  });

  it("does not mark a normal daytime check-in as next day", () => {
    const day = makeDay(
      "08:00 AM",
      "09:00 AM - 11:00 AM",
      "11:00 AM",
    );

    expect(getDayOneHotelCheckinDisplay(day)).toEqual({
      time: "11:00 AM",
      nextDay: false,
    });
  });

  it("handles arrival at exactly midnight", () => {
    const day = makeDay(
      "11:00 PM",
      "11:30 PM - 12:00 AM",
      "12:00 AM",
    );

    expect(getDayOneHotelCheckinDisplay(day)).toEqual({
      time: "12:00 AM",
      nextDay: true,
    });
  });

  it("does not display a missing check-in", () => {
    const day = makeDay(
      "11:00 PM",
      "12:00 AM - 03:00 AM",
      "03:00 AM",
    );

    day.segments = day.segments.filter(
      (segment) => segment.type !== "checkin",
    );

    expect(getDayOneHotelCheckinDisplay(day)).toBeNull();
  });

  it("does not display an invalid check-in time", () => {
    const day = makeDay(
      "11:00 PM",
      "12:00 AM - 03:00 AM",
      "invalid",
    );

    expect(getDayOneHotelCheckinDisplay(day)).toBeNull();
  });

  it("does not claim next day for inconsistent travel times", () => {
    const day = makeDay(
      "11:00 PM",
      "07:00 PM - 08:00 PM",
      "08:00 PM",
    );

    expect(getDayOneHotelCheckinDisplay(day)).toEqual({
      time: "08:00 PM",
      nextDay: false,
    });
  });

  it("selects the terminal check-in when multiple exist", () => {
    const day = makeDay(
      "11:00 PM",
      "12:00 AM - 03:00 AM",
      "03:00 AM",
    );

    day.segments.unshift({
      type: "checkin",
      hotelName: "Intermediate Hotel",
      hotelAddress: "",
      time: "10:00 PM",
    });

    expect(getDayOneHotelCheckinDisplay(day)).toEqual({
      time: "03:00 AM",
      nextDay: true,
    });
  });

  it("does not display check-in information on Day 2", () => {
    const day = makeDay(
      "11:00 PM",
      "12:00 AM - 03:00 AM",
      "03:00 AM",
    );

    day.dayNumber = 2;

    expect(getDayOneHotelCheckinDisplay(day)).toBeNull();
  });

  it("does not use a nonterminal hotel check-in", () => {
    const day = makeDay(
      "11:00 PM",
      "12:00 AM - 03:00 AM",
      "03:00 AM",
    );

    day.segments.push({
      type: "return",
      title: "Return",
      time: "04:00 AM",
    });

    expect(getDayOneHotelCheckinDisplay(day)).toBeNull();
  });
});
