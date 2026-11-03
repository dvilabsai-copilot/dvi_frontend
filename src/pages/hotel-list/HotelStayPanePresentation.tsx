import type { ReactNode } from "react";
import { createPortal } from "react-dom";

type HotelStayPanePresentationProps = {
  /** When true, render the existing pane in the dialog's table body. */
  inDialog: boolean;
  dialogTableBody: HTMLTableSectionElement | null;
  children: ReactNode;
};

/** Moves the one existing expanded table row into the popup without cloning its UI or state. */
export function HotelStayPanePresentation({
  inDialog,
  dialogTableBody,
  children,
}: HotelStayPanePresentationProps) {
  if (!inDialog) return children;
  if (!dialogTableBody) return null;
  return createPortal(children, dialogTableBody);
}
