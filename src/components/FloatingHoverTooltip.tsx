import React from "react";

type FloatingHoverTooltipProps = {
  left: number;
  top: number;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

/** Shared fixed-position hover card used by vehicle-origin and price tooltips. */
export const FloatingHoverTooltip: React.FC<FloatingHoverTooltipProps> = ({
  left,
  top,
  children,
  className = "w-80",
  style,
}) => (
  <div
    className={`fixed z-[9999] rounded-lg border-2 border-gray-300 bg-white p-4 text-sm shadow-2xl ${className}`}
    style={{
      left: `${left}px`,
      top: `${top}px`,
      pointerEvents: "none",
      ...style,
    }}
  >
    {children}
  </div>
);

export const getFloatingTooltipPosition = (
  clientX: number,
  clientY: number,
  tooltipWidth = 320,
  tooltipHeight = 150,
) => {
  const padding = 12;
  const offset = 14;

  let left = clientX + offset;
  let top = clientY + offset;

  if (left + tooltipWidth + padding > window.innerWidth) {
    left = clientX - tooltipWidth - offset;
  }

  if (top + tooltipHeight + padding > window.innerHeight) {
    top = clientY - tooltipHeight - offset;
  }

  return {
    left: Math.max(padding, left),
    top: Math.max(padding, top),
  };
};
