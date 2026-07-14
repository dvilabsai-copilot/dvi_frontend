type HotspotListStateProps = {
  loading: boolean;
  searchQuery: string;
  hasVisibleHotspots: boolean;
};

export function HotspotListState({
  loading,
  searchQuery,
  hasVisibleHotspots,
}: HotspotListStateProps) {
  if (loading) {
    return <p className="text-sm text-[#6c6c6c] text-center py-8">Loading available hotspots...</p>;
  }

  if (!hasVisibleHotspots) {
    return (
      <p className="text-sm text-[#6c6c6c] text-center py-8">
        {searchQuery ? "No hotspots match your search" : "No hotspots available for this location"}
      </p>
    );
  }

  return null;
}

