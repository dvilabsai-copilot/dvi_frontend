import type { ComponentProps } from "react";
import { AddActivityDialog } from "./AddActivityDialog";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";
import { GuideAssignmentDialog } from "./GuideAssignmentDialog";

type DeleteDialogProps = ComponentProps<typeof DeleteConfirmationDialog>;

type Props = {
  hotspotDelete: DeleteDialogProps;
  activity: ComponentProps<typeof AddActivityDialog>;
  activityDelete: DeleteDialogProps;
  guide: ComponentProps<typeof GuideAssignmentDialog>;
  guideDelete: DeleteDialogProps;
};

export function ItineraryActivityGuideDialogs({
  hotspotDelete,
  activity,
  activityDelete,
  guide,
  guideDelete,
}: Props) {
  return (
    <>
      <DeleteConfirmationDialog {...hotspotDelete} />
      <AddActivityDialog {...activity} />
      <DeleteConfirmationDialog {...activityDelete} />
      <GuideAssignmentDialog {...guide} />
      <DeleteConfirmationDialog {...guideDelete} />
    </>
  );
}

