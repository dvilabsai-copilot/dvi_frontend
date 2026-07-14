import type { Dispatch, SetStateAction } from "react";

type HotspotCityTab = {
  key: string;
  label: string;
  count: number;
};

type HotspotCityTabsProps = {
  visible: boolean;
  tabs: readonly HotspotCityTab[];
  activeTab: string;
  setActiveTab: Dispatch<SetStateAction<string>>;
};

export function HotspotCityTabs({
  visible,
  tabs,
  activeTab,
  setActiveTab,
}: HotspotCityTabsProps) {
  if (!visible || tabs.length === 0) return null;

  return (
    <div className="sticky top-0 z-10 bg-white pb-2">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                isActive
                  ? "bg-[#d546ab] text-white border-[#d546ab]"
                  : "bg-white text-[#6c6c6c] border-[#e5d7e3] hover:border-[#d546ab] hover:text-[#4a4260]"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          );
        })}
      </div>
    </div>
  );
}

