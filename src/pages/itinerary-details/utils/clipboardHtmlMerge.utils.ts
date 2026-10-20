export const extractHotelSectionFromHtml = (html: string): string => {
  if (!html) return '';
  const hotelHeadingMatch = html.match(/Recommended Hotel(?:s)?\s*-/i);
  if (!hotelHeadingMatch || hotelHeadingMatch.index === undefined) return '';
  const hotelSectionStart = html.lastIndexOf('<table', hotelHeadingMatch.index);
  if (hotelSectionStart === -1) return '';
  const vehicleHeadingMatch = html.match(/Vehicle Details/i);
  if (!vehicleHeadingMatch || vehicleHeadingMatch.index === undefined) return '';
  const vehicleSectionStart = html.lastIndexOf('<table', vehicleHeadingMatch.index);
  if (vehicleSectionStart === -1 || vehicleSectionStart <= hotelSectionStart) return '';
  return html.slice(hotelSectionStart, vehicleSectionStart);
};

export const mergeClipboardWithRenderedHotels = (backendHtml: string, renderedHotelsHtml: string): string => {
  if (!backendHtml || !renderedHotelsHtml) return backendHtml;
  const vehicleHeadingMatch = backendHtml.match(/Vehicle Details/i);
  if (!vehicleHeadingMatch || vehicleHeadingMatch.index === undefined) return backendHtml;
  const vehicleStart = backendHtml.lastIndexOf('<table', vehicleHeadingMatch.index);
  if (vehicleStart === -1) return backendHtml;
  const hotelHeadingMatch = backendHtml.match(/Recommended Hotel(?:s)?\s*-/i);
  if (!hotelHeadingMatch || hotelHeadingMatch.index === undefined) {
    return `${backendHtml.slice(0, vehicleStart)}${renderedHotelsHtml}${backendHtml.slice(vehicleStart)}`;
  }
  const hotelStart = backendHtml.lastIndexOf('<table', hotelHeadingMatch.index);
  if (hotelStart === -1 || vehicleStart <= hotelStart) {
    return `${backendHtml.slice(0, vehicleStart)}${renderedHotelsHtml}${backendHtml.slice(vehicleStart)}`;
  }
  return `${backendHtml.slice(0, hotelStart)}${renderedHotelsHtml}${backendHtml.slice(vehicleStart)}`;
};

export const mergeClipboardWithRenderedCost = (backendHtml: string, renderedCostHtml: string): string => {
  if (!backendHtml || !renderedCostHtml) return backendHtml;
  const hotspotHeadingMatch = backendHtml.match(/Hotspot Details/i);
  if (!hotspotHeadingMatch || hotspotHeadingMatch.index === undefined) return backendHtml;
  const hotspotStart = backendHtml.lastIndexOf('<table', hotspotHeadingMatch.index);
  if (hotspotStart === -1) return backendHtml;
  const anchorIndex = Math.max(
    backendHtml.lastIndexOf('Total Round Off', hotspotStart),
    backendHtml.lastIndexOf('Net Payable To', hotspotStart),
    backendHtml.lastIndexOf('Total Amount', hotspotStart),
  );
  if (anchorIndex === -1) {
    return `${backendHtml.slice(0, hotspotStart)}${renderedCostHtml}${backendHtml.slice(hotspotStart)}`;
  }
  const costStart = backendHtml.lastIndexOf('<table', anchorIndex);
  if (costStart === -1 || costStart >= hotspotStart) {
    return `${backendHtml.slice(0, hotspotStart)}${renderedCostHtml}${backendHtml.slice(hotspotStart)}`;
  }
  return `${backendHtml.slice(0, costStart)}${renderedCostHtml}${backendHtml.slice(hotspotStart)}`;
};

export const mergeClipboardWithB2BRecommendedPackages = (
  backendHtml: string,
  renderedPackageSectionsHtml: string,
): string => {
  if (!backendHtml || !renderedPackageSectionsHtml) return backendHtml;

  const hotspotHeadingMatch = backendHtml.match(/Hotspot Details/i);
  const termsHeadingMatch = backendHtml.match(/Terms\s*(?:&amp;|&)?\s*Condition/i);

  // Hotel Only may not have Hotspot Details.
  // Preserve the Terms & Condition section as the fallback boundary.
  const endingHeadingIndex =
    hotspotHeadingMatch?.index !== undefined
      ? hotspotHeadingMatch.index
      : termsHeadingMatch?.index !== undefined
        ? termsHeadingMatch.index
        : -1;

  if (endingHeadingIndex === -1) {
    return backendHtml;
  }

  const endingSectionStart = backendHtml.lastIndexOf(
    "<table",
    endingHeadingIndex,
  );

  if (endingSectionStart === -1) {
    return backendHtml;
  }

  const recommendedHeadingMatch = backendHtml.match(
    /Recommended Hotel(?:s)?\s*-/i,
  );
  const vehicleHeadingMatch = backendHtml.match(/Vehicle Details/i);

  const middleHeadingIndexes = [
    recommendedHeadingMatch?.index,
    vehicleHeadingMatch?.index,
  ].filter(
    (index): index is number =>
      index !== undefined && index < endingSectionStart,
  );

  if (middleHeadingIndexes.length === 0) {
    return `${backendHtml.slice(0, endingSectionStart)}${renderedPackageSectionsHtml}${backendHtml.slice(endingSectionStart)}`;
  }

  const firstMiddleHeadingIndex = Math.min(
    ...middleHeadingIndexes,
  );

  const middleStart = backendHtml.lastIndexOf(
    "<table",
    firstMiddleHeadingIndex,
  );

  if (middleStart === -1 || middleStart >= endingSectionStart) {
    return `${backendHtml.slice(0, endingSectionStart)}${renderedPackageSectionsHtml}${backendHtml.slice(endingSectionStart)}`;
  }

  return `${backendHtml.slice(0, middleStart)}${renderedPackageSectionsHtml}${backendHtml.slice(endingSectionStart)}`;
};
