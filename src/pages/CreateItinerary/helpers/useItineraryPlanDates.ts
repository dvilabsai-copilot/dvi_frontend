import { useMemo, useState } from "react";
import { differenceInCalendarDays } from "date-fns";
import {
  formatDDMMYYYY,
  parseDDMMYYYY,
} from "./itineraryPlanBlock.utils";

type UseItineraryPlanDatesArgs = {
  tripStartDate: string;
  tripEndDate: string;
  setTripStartDate: (value: string) => void;
  setTripEndDate: (value: string) => void;
};

export function useItineraryPlanDates({
  tripStartDate,
  tripEndDate,
  setTripStartDate,
  setTripEndDate,
}: UseItineraryPlanDatesArgs) {
  const [isTripDatesOpen, setIsTripDatesOpen] = useState(false);
  const [hoveredToDate, setHoveredToDate] =
    useState<Date | undefined>();

  const tripStartDateObj = parseDDMMYYYY(tripStartDate);
  const tripEndDateObj = parseDDMMYYYY(tripEndDate);

  // Do not keep a separate selection-phase state.
  // The actual selected dates are the source of truth.
  const isSelectingDeparture = Boolean(
    tripStartDateObj && !tripEndDateObj,
  );

  const previewRange = useMemo(() => {
    if (!tripStartDateObj) return undefined;

    if (tripEndDateObj) {
      return {
        from: tripStartDateObj,
        to: tripEndDateObj,
      };
    }

    if (
      hoveredToDate &&
      hoveredToDate >= tripStartDateObj
    ) {
      return {
        from: tripStartDateObj,
        to: hoveredToDate,
      };
    }

    return {
      from: tripStartDateObj,
      to: tripStartDateObj,
    };
  }, [
    tripStartDateObj,
    tripEndDateObj,
    hoveredToDate,
  ]);

  const previewToDate =
    tripEndDateObj ||
    (
      hoveredToDate &&
      tripStartDateObj &&
      hoveredToDate >= tripStartDateObj
        ? hoveredToDate
        : undefined
    ) ||
    tripStartDateObj;

  const previewNoOfDays = useMemo(() => {
    if (!tripStartDateObj || !previewToDate) {
      return 1;
    }

    const from =
      previewToDate >= tripStartDateObj
        ? tripStartDateObj
        : previewToDate;

    const to =
      previewToDate >= tripStartDateObj
        ? previewToDate
        : tripStartDateObj;

    return Math.max(
      1,
      differenceInCalendarDays(to, from) + 1,
    );
  }, [tripStartDateObj, previewToDate]);

  const previewNoOfNights = Math.max(
    0,
    previewNoOfDays - 1,
  );

  const previewArrivalDateLabel =
    tripStartDateObj
      ? formatDDMMYYYY(tripStartDateObj)
      : "DD/MM/YYYY";

  const previewDepartureDateLabel =
    tripEndDateObj
      ? formatDDMMYYYY(tripEndDateObj)
      : hoveredToDate &&
          tripStartDateObj &&
          hoveredToDate >= tripStartDateObj
        ? formatDDMMYYYY(hoveredToDate)
        : tripStartDateObj
          ? "Select end date"
          : "DD/MM/YYYY";

  const handleTripDayClick = (
    day: Date,
    disabled?: boolean,
  ) => {
    if (disabled) {
      return;
    }

    const clickedDay = new Date(day);
    clickedDay.setHours(0, 0, 0, 0);

    const clickedDate =
      formatDDMMYYYY(clickedDay);

    const normalizedStart =
      tripStartDateObj
        ? new Date(tripStartDateObj)
        : null;

    if (normalizedStart) {
      normalizedStart.setHours(0, 0, 0, 0);
    }

    // -------------------------------------------------
    // FIRST CLICK
    // No arrival selected yet.
    // -------------------------------------------------
    if (!normalizedStart) {
      setTripStartDate(clickedDate);
      setTripEndDate("");
      setHoveredToDate(undefined);
      return;
    }

    // -------------------------------------------------
    // COMPLETE RANGE ALREADY EXISTS
    // Clicking a date starts a fresh range.
    // -------------------------------------------------
    if (tripEndDateObj) {
      setTripStartDate(clickedDate);
      setTripEndDate("");
      setHoveredToDate(undefined);
      return;
    }

    // -------------------------------------------------
    // ARRIVAL EXISTS, DEPARTURE DOES NOT
    //
    // Clicking before arrival resets arrival.
    // Clicking same/later date selects departure.
    // -------------------------------------------------
    if (clickedDay < normalizedStart) {
      setTripStartDate(clickedDate);
      setTripEndDate("");
      setHoveredToDate(undefined);
      return;
    }

    // This is the valid departure date.
    setTripEndDate(clickedDate);
    setHoveredToDate(undefined);

    // Close only after both dates are selected.
    setIsTripDatesOpen(false);
  };

  const handleTripDatesOpenChange = (
    open: boolean,
  ) => {
    setIsTripDatesOpen(open);

    if (!open) {
      setHoveredToDate(undefined);
    }
  };

  const disablePastAndToday = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const candidate = new Date(date);
    candidate.setHours(0, 0, 0, 0);

    return candidate <= today;
  };

  return {
    isTripDatesOpen,
    setIsTripDatesOpen,
    hoveredToDate,
    setHoveredToDate,
    isSelectingDeparture,
    tripStartDateObj,
    tripEndDateObj,
    previewRange,
    previewNoOfDays,
    previewNoOfNights,
    previewArrivalDateLabel,
    previewDepartureDateLabel,
    handleTripDayClick,
    handleTripDatesOpenChange,
    disablePastAndToday,
  };
}