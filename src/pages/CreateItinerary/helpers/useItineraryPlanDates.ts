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
  const [hoveredToDate, setHoveredToDate] = useState<Date | undefined>();
  const [isSelectingDeparture, setIsSelectingDeparture] = useState(false);

  const tripStartDateObj = parseDDMMYYYY(tripStartDate);
  const tripEndDateObj = parseDDMMYYYY(tripEndDate);

  const previewRange = useMemo(() => {
    if (!tripStartDateObj) return undefined;
    if (tripEndDateObj) return { from: tripStartDateObj, to: tripEndDateObj };
    if (hoveredToDate) {
      return hoveredToDate < tripStartDateObj
        ? { from: tripStartDateObj, to: tripStartDateObj }
        : { from: tripStartDateObj, to: hoveredToDate };
    }
    return { from: tripStartDateObj, to: tripStartDateObj };
  }, [tripStartDateObj, tripEndDateObj, hoveredToDate]);

  const previewToDate = tripEndDateObj || hoveredToDate || tripStartDateObj;
  const previewNoOfDays = useMemo(() => {
    if (!tripStartDateObj || !previewToDate) return 1;
    const from = previewToDate >= tripStartDateObj ? tripStartDateObj : previewToDate;
    const to = previewToDate >= tripStartDateObj ? previewToDate : tripStartDateObj;
    return Math.max(1, differenceInCalendarDays(to, from) + 1);
  }, [tripStartDateObj, previewToDate]);
  const previewNoOfNights = Math.max(0, previewNoOfDays - 1);

  const previewArrivalDateLabel = tripStartDateObj
    ? formatDDMMYYYY(tripStartDateObj)
    : "DD/MM/YYYY";
  const previewDepartureDateLabel = tripEndDateObj
    ? formatDDMMYYYY(tripEndDateObj)
    : hoveredToDate && tripStartDateObj && hoveredToDate >= tripStartDateObj
      ? formatDDMMYYYY(hoveredToDate)
      : tripStartDateObj
        ? "Select end date"
        : "DD/MM/YYYY";

  const handleTripDayClick = (day: Date, disabled?: boolean) => {
    if (disabled) return;
    const clickedDate = formatDDMMYYYY(day);

    if (!tripStartDateObj || tripEndDateObj || !isSelectingDeparture || day < tripStartDateObj) {
      setTripStartDate(clickedDate);
      setTripEndDate("");
      setHoveredToDate(undefined);
      setIsSelectingDeparture(true);
      return;
    }

    setTripEndDate(clickedDate);
    setHoveredToDate(undefined);
    setIsSelectingDeparture(false);
    setIsTripDatesOpen(false);
  };

  const handleTripDatesOpenChange = (open: boolean) => {
    setIsTripDatesOpen(open);
    if (!open) {
      setHoveredToDate(undefined);
      setIsSelectingDeparture(false);
      return;
    }
    setIsSelectingDeparture(Boolean(tripStartDateObj && !tripEndDateObj));
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
