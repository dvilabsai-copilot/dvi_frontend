// FILE: src/App.tsx

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
  Outlet,
} from "react-router-dom";
import DynamicMeta from "@/components/DynamicMeta";
import { getToken } from "@/lib/api";

import { MainLayout } from "./layouts/MainLayout";
import Dashboard from "./pages/Dashboard";
import { CreateItinerary } from "./pages/CreateItinerary/CreateItinerary";
import { LatestItinerary } from "./pages/LatestItinerary";
import { ConfirmedItineraries } from "./pages/ConfirmedItineraries";
import { CancelledItineraries } from "./pages/CancelledItineraries";
import { AccountsManager } from "./pages/accounts/AccountsManager";
import "./App.css";
import NotFound from "./pages/NotFound";
import { AccountsLedger } from "./pages/accounts/AccountsLedger";
import Hotels from "./pages/Hotels";
import Login from "./pages/Login";
import HotelForm from "./pages/hotel-form/HotelForm";
import { DailyMomentTracker } from "./pages/daily-moment-tracker/DailyMomentTracker";
import DailyMomentDayView from "./pages/daily-moment-tracker/DailyMomentDayView";
import VendorsPage from "./pages/vendor/VendorsPage";
import VendorFormPage from "./pages/vendor/VendorFormPage";
import DriversPage from "./pages/drivers/DriversPage";
import DriverFormPage from "./pages/drivers/DriverFormPage";
import VehicleAvailabilityPage from "./pages/vehicle-availability/VehicleAvailabilityPage";
import { ItineraryDetailsRouter } from "./pages/ItineraryDetailsRouter";
import HotspotList from "./pages/hotspot/HotspotList";
import HotspotForm from "./pages/hotspot/HotspotForm";
import HotspotPreview from "./pages/hotspot/HotspotPreview";
import ParkingChargeBulkImport from "./pages/hotspot/ParkingChargeBulkImport";
import HotspotDistanceCacheList from "./pages/hotspot/HotspotDistanceCacheList";
import HotspotDistanceCacheForm from "./pages/hotspot/HotspotDistanceCacheForm";
import ActivityForm from "./pages/activity/ActivityForm";
import ActivityListPage from "./pages/activity/ActivityListPage";
import GuideListPage from "./pages/guide/GuideListPage";
import GuideFormPage from "./pages/guide/GuideFormPage";
import GuidePreview from "./pages/guide/GuidePreview";
import ActivityPreviewPage from "./pages/activity/ActivityPreviewPage";
import LocationsPage from "./pages/locations/LocationsPage";
import LocationsPreviewPage from "./pages/locations/LocationsPreviewPage";
import StaffListPage from "./pages/staff/StaffListPage";
import StaffFormPage from "./pages/staff/StaffFormPage";
import StaffPreviewPage from "./pages/staff/StaffPreviewPage";
import AgentListPage from "./pages/agent/AgentListPage";
import AgentFormPage from "./pages/agent/AgentFormPage";
import AgentPreviewPage from "./pages/agent/AgentPreviewPage";
import Profile from "./pages/agent/Profile";
import WalletHistory from "./pages/agent/WalletHistory";
import SubscriptionHistory from "./pages/agent/SubscriptionHistory";

import PricebookExportPage from "./pages/pricebook-export/PricebookExportPage";
import { GlobalSettingsPage } from "./pages/Settings/GlobalSettings";
import { CitiesPage } from "./pages/Settings/cities/Citiespage";
import { HotelCategoryPage } from "./pages/Settings/HotelCategory";
import { GstSettingsPage } from "./pages/Settings/GstSettings/GstSettings";
import { InbuiltAmenitiesPage } from "./pages/Settings/InbuiltAmenities/InbuiltAmenities";
import { VehicleTypePage } from "./pages/Settings/VehicleType/VehicleType";
import { LanguagePage } from "./pages/Settings/Language/Language";
import { RolePermissionFormPage } from "./pages/Settings/RolePermission/RolePermissionFormPage";
import { RolePermissionListPage } from "./pages/Settings/RolePermission/RolePermissionListPage";
import { AgentSubscriptionPlanFormPage } from "./pages/Settings/agent-subscription-plan/AgentSubscriptionPlanFormPage";
import { AgentSubscriptionPlanListPage } from "./pages/Settings/agent-subscription-plan/AgentSubscriptionPlanListPage";
import { AgentSubscriptionPlanPreviewPage } from "./pages/Settings/agent-subscription-plan/AgentSubscriptionPlanPreviewPage";

const RoomsRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/hotels/${id}/edit?tab=rooms`} replace />;
};

const AmenitiesRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/hotels/${id}/edit?tab=amenities`} replace />;
};

const PriceBookRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/hotels/${id}/edit?tab=pricebook`} replace />;
};

const ReviewsRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/hotels/${id}/edit?tab=reviews`} replace />;
};

const PreviewRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/hotels/${id}/edit?tab=preview`} replace />;
};

const RequireAuth = () => {
  const token = getToken();
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />

      <BrowserRouter>
        <DynamicMeta />

        <Routes>

          <Route path="/login" element={<Login />} />

          <Route element={<RequireAuth />}>

            <Route path="/" element={<MainLayout><Dashboard /></MainLayout>} />

            <Route path="/create-itinerary" element={<MainLayout><CreateItinerary /></MainLayout>} />

            <Route path="/latest-itinerary" element={<MainLayout><LatestItinerary /></MainLayout>} />

            <Route path="/confirmed-itinerary" element={<MainLayout><ConfirmedItineraries /></MainLayout>} />

            <Route path="/cancelled-itinerary" element={<MainLayout><CancelledItineraries /></MainLayout>} />

            <Route path="/accounts-manager" element={<MainLayout><AccountsManager /></MainLayout>} />

            <Route path="/accounts-ledger" element={<MainLayout><AccountsLedger /></MainLayout>} />

            <Route path="/hotels" element={<MainLayout><Hotels /></MainLayout>} />

            <Route path="/profile" element={<MainLayout><Profile /></MainLayout>} />

            <Route path="/wallet-history" element={<MainLayout><WalletHistory /></MainLayout>} />

            {/* NEW ROUTE ADDED */}
            <Route
              path="/subscription-history"
              element={
                <MainLayout>
                  <SubscriptionHistory />
                </MainLayout>
              }
            />

            <Route path="/settings/subscription-plan" element={<MainLayout><AgentSubscriptionPlanListPage /></MainLayout>} />

          </Route>

          <Route path="*" element={<NotFound />} />

        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;