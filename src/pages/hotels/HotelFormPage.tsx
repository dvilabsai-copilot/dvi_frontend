// src/pages/hotels/HotelFormPage.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { getHotel, createHotel, updateHotel, Hotel } from "@/services/hotels";
import { HotelBasicInfoTab } from "./HotelBasicInfoTab";
import { HotelRoomsTab } from "./HotelRoomsTab";
import { HotelAmenitiesTab } from "./HotelAmenitiesTab";
import { HotelPriceBookTab } from "./HotelPriceBookTab";
import { HotelReviewTab } from "./HotelReviewTab";
import { HotelPreviewTab } from "./HotelPreviewTab";

type HotelBasicInfoFormData = Partial<Hotel> & {
  id?: number | string;
  name?: string;
  place?: string;
  status?: string;
  mobile?: string[];
  email?: string[];
  category?: string;
  powerBackup?: string;
  country?: string;
  state?: string;
  city?: string;
  pincode?: string;
  hotelCode?: string;
  hotelMarginPercent?: number;
  hotelMarginGstType?: string;
  hotelMarginGstPercent?: string;
  latitude?: string;
  longitude?: string;
  hotspotStatus?: string;
  address?: string;
};

type TabId = 1 | 2 | 3 | 4 | 5 | 6;

const TABS = [
  { id: 1 as TabId, label: "Basic Info" },
  { id: 2 as TabId, label: "Rooms" },
  { id: 3 as TabId, label: "Amenities" },
  { id: 4 as TabId, label: "Price Book" },
  { id: 5 as TabId, label: "Review & Feedback" },
  { id: 6 as TabId, label: "Preview" }
];

export const HotelFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = id !== "new";
  
  const [activeTab, setActiveTab] = useState<TabId>(1);
  const [hotelId, setHotelId] = useState<number | null>(
  isEditMode && id ? Number(id) : null
);
  const [hotelData, setHotelData] = useState<HotelBasicInfoFormData>({});
  const [loading, setLoading] = useState(false);

  // In edit mode, all tabs enabled. In create mode, only Tab 1 until saved
  const tabsEnabled = isEditMode || hotelId !== null;


  useEffect(() => {
  if (isEditMode && id) {
    const loadHotel = async () => {
      setLoading(true);

      try {
        const hotel = await getHotel(Number(id) as any);

        if (hotel) {
          const normalizedHotel = hotel as unknown as HotelBasicInfoFormData;

          setHotelData(normalizedHotel);
          setHotelId(Number(normalizedHotel.id || id));
        }
      } catch (error) {
        console.error("Error loading hotel:", error);
      } finally {
        setLoading(false);
      }
    };

    loadHotel();
  }
}, [id, isEditMode]);

const handleBasicInfoSave = async (data: HotelBasicInfoFormData) => {
  setLoading(true);

  try {
    if (hotelId) {
      await updateHotel(hotelId as any, data as any);

      setHotelData({
        ...hotelData,
        ...data,
        id: String(hotelId),
      });
    } else {
      const newHotel = await createHotel(data as any);

      const normalizedHotel = newHotel as unknown as HotelBasicInfoFormData & {
        id?: number | string;
      };

      const nextHotelId = Number(normalizedHotel.id);

      if (!nextHotelId) {
        throw new Error("Hotel created but hotel id missing");
      }

      setHotelId(nextHotelId);
      setHotelData(normalizedHotel);

      navigate(`/hotels/${nextHotelId}/edit`, { replace: true });
    }

    setActiveTab(2);
  } catch (error) {
    console.error("Error saving hotel:", error);
  } finally {
    setLoading(false);
  }
};
  const canNavigateToTab = (tabId: TabId) => {
    if (tabId === 1) return true;
    return tabsEnabled;
  };

  if (loading && isEditMode && !Number(hotelData.id || hotelId || 0)) {
    return (
      <div className="p-8">
        <div className="text-center">Loading hotel data...</div>
      </div>
    );
  }

  return (
    <div className="w-full bg-background">
      <div className="p-4 sm:p-6 lg:p-8 w-full">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm mb-6">
          <Link to="/" className="text-primary hover:underline">Dashboard</Link>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <Link to="/hotels" className="text-primary hover:underline">Hotel</Link>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            {isEditMode ? "Edit Hotel" : "Add Hotel"}
          </span>
        </div>

        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">
            {isEditMode ? `Edit Hotel » ${hotelData.name || ""}` : "Add Hotel"}
          </h1>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-6 overflow-x-auto">
          <div className="flex items-center gap-2 p-4 min-w-max">
            {TABS.map((tab, index) => {
              const isActive = activeTab === tab.id;
              const isEnabled = canNavigateToTab(tab.id);
              
              return (
                <button
                  key={tab.id}
                  onClick={() => isEnabled && setActiveTab(tab.id)}
                  disabled={!isEnabled}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
                    ${isActive 
                      ? "bg-primary text-white" 
                      : isEnabled 
                        ? "bg-gray-100 text-gray-700 hover:bg-gray-200" 
                        : "bg-gray-50 text-gray-400 cursor-not-allowed"
                    }
                  `}
                >
                  <span className={`
                    flex items-center justify-center w-6 h-6 rounded text-xs font-bold
                    ${isActive ? "bg-white text-primary" : "bg-transparent"}
                  `}>
                    {tab.id}
                  </span>
                  <span>{tab.label}</span>
                  {index < TABS.length - 1 && (
                    <ChevronRight className="w-4 h-4 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Progress Bar */}
          <div className="h-1 bg-gray-200">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(activeTab / TABS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 lg:p-8">
          {activeTab === 1 && (
            <HotelBasicInfoTab 
              initialData={hotelData}
              onSave={handleBasicInfoSave}
              loading={loading}
              onBack={() => navigate("/hotels")}
            />
          )}
          {activeTab === 2 && (
            <HotelRoomsTab 
              hotelId={hotelId}
              onNext={() => setActiveTab(3)}
            />
          )}
          {activeTab === 3 && (
            <HotelAmenitiesTab 
              hotelId={hotelId}
              onNext={() => setActiveTab(4)}
            />
          )}
          {activeTab === 4 && (
            <HotelPriceBookTab 
              hotelId={hotelId}
              onNext={() => setActiveTab(5)}
            />
          )}
          {activeTab === 5 && (
            <HotelReviewTab 
              hotelId={hotelId}
              onNext={() => setActiveTab(6)}
            />
          )}
          {activeTab === 6 && (
            <HotelPreviewTab 
              hotelId={hotelId}
              onFinish={() => navigate("/hotels")}
            />
          )}
        </div>
      </div>
    </div>
  );
};
