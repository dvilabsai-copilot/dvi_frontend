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
import DriverViewPage from "./pages/drivers/DriverViewPage";
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
import PaymentSuccess from "./pages/PaymentSuccess";
import DownloadPackages from "./pages/agent/DownloadPackages";

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

// ── Deep-link helpers: /hotels/:id/<tab> → /hotels/:id/edit?tab=<tab> ──
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

/**
 * Auth guard: blocks all protected routes when no token is present.
 */
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

      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <DynamicMeta />

        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* All routes below require auth */}
          <Route element={<RequireAuth />}>
            <Route
              path="/"
              element={
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              }
            />

            <Route
              path="/create-itinerary"
              element={
                <MainLayout>
                  <CreateItinerary />
                </MainLayout>
              }
            />
            <Route
                  path="/download-packages"
                  element={
                    <MainLayout>
                      <DownloadPackages />
                    </MainLayout>
                  }
                />
            <Route
              path="/latest-itinerary"
              element={
                <MainLayout>
                  <LatestItinerary />
                </MainLayout>
              }
            />
            <Route
              path="/confirmed-itinerary"
              element={
                <MainLayout>
                  <ConfirmedItineraries />
                </MainLayout>
              }
            />
            <Route
              path="/confirmed-itinerary/:id"
              element={
                <MainLayout>
                  <ItineraryDetailsRouter />
                </MainLayout>
              }
            />
            <Route
              path="/cancelled-itinerary"
              element={
                <MainLayout>
                  <CancelledItineraries />
                </MainLayout>
              }
            />
            <Route
              path="/itinerary-details/:id"
              element={
                <MainLayout>
                  <ItineraryDetailsRouter />
                </MainLayout>
              }
            />

            <Route
              path="/accounts-manager"
              element={
                <MainLayout>
                  <AccountsManager />
                </MainLayout>
              }
            />
            <Route
              path="/accounts-ledger"
              element={
                <MainLayout>
                  <AccountsLedger />
                </MainLayout>
              }
            />

            {/* Daily Moment */}
            <Route
              path="/daily-moment-tracker"
              element={
                <MainLayout>
                  <DailyMomentTracker />
                </MainLayout>
              }
            />
            <Route
              path="/daily-moment"
              element={
                <MainLayout>
                  <DailyMomentTracker />
                </MainLayout>
              }
            />
            <Route
              path="/daily-moment/day-view/:planId/:routeId"
              element={
                <MainLayout>
                  <DailyMomentDayView />
                </MainLayout>
              }
            />

            {/* Hotels */}
            <Route
              path="/hotels"
              element={
                <MainLayout>
                  <Hotels />
                </MainLayout>
              }
            />
            <Route
              path="/hotels/new"
              element={
                <MainLayout>
                  <HotelForm />
                </MainLayout>
              }
            />
            <Route
              path="/hotels/:id/edit"
              element={
                <MainLayout>
                  <HotelForm />
                </MainLayout>
              }
            />
            <Route
              path="/hotels/:id"
              element={
                <MainLayout>
                  <HotelForm />
                </MainLayout>
              }
            />
            <Route path="/hotels/:id/rooms" element={<RoomsRedirect />} />
            <Route path="/hotels/:id/amenities" element={<AmenitiesRedirect />} />
            <Route path="/hotels/:id/pricebook" element={<PriceBookRedirect />} />
            <Route path="/hotels/:id/reviews" element={<ReviewsRedirect />} />
            <Route path="/hotels/:id/preview" element={<PreviewRedirect />} />

            {/* Vendor */}
            <Route
              path="/vendor"
              element={
                <MainLayout>
                  <VendorsPage />
                </MainLayout>
              }
            />
            <Route
              path="/vendor/new"
              element={
                <MainLayout>
                  <VendorFormPage />
                </MainLayout>
              }
            />
            <Route
              path="/vendor/:id"
              element={
                <MainLayout>
                  <VendorFormPage />
                </MainLayout>
              }
            />
            <Route
              path="/vendor/:id/edit"
              element={
                <MainLayout>
                  <VendorFormPage />
                </MainLayout>
              }
            />

            {/* Drivers */}
            <Route
              path="/drivers"
              element={
                <MainLayout>
                  <DriversPage />
                </MainLayout>
              }
            />
            <Route
              path="/driver"
              element={
                <MainLayout>
                  <DriversPage />
                </MainLayout>
              }
            />
            <Route
              path="/drivers/new"
              element={
                <MainLayout>
                  <DriverFormPage />
                </MainLayout>
              }
            />
            <Route
              path="/driver/new"
              element={
                <MainLayout>
                  <DriverFormPage />
                </MainLayout>
              }
            />
            <Route
              path="/drivers/create"
              element={
                <MainLayout>
                  <DriverFormPage />
                </MainLayout>
              }
            />
            <Route
              path="/driver/create"
              element={
                <MainLayout>
                  <DriverFormPage />
                </MainLayout>
              }
            />
            <Route
              path="/drivers/:id/edit"
              element={
                <MainLayout>
                  <DriverFormPage />
                </MainLayout>
              }
            />
            <Route
              path="/driver/:id/edit"
              element={
                <MainLayout>
                  <DriverFormPage />
                </MainLayout>
              }
            />
            <Route
              path="/drivers/:id"
              element={
                <MainLayout>
                  <DriverViewPage />
                </MainLayout>
              }
            />
            <Route
              path="/driver/:id"
              element={
                <MainLayout>
                  <DriverViewPage />
                </MainLayout>
              }
            />

            {/* Vehicle Availability */}
            <Route
              path="/vehicle-availability"
              element={
                <MainLayout>
                  <VehicleAvailabilityPage />
                </MainLayout>
              }
            />

            {/* Hotspots */}
            <Route
              path="/hotspots"
              element={
                <MainLayout>
                  <HotspotList />
                </MainLayout>
              }
            />
            <Route
              path="/hotspots/new"
              element={
                <MainLayout>
                  <HotspotForm />
                </MainLayout>
              }
            />
            <Route
              path="/hotspots/:id/edit"
              element={
                <MainLayout>
                  <HotspotForm />
                </MainLayout>
              }
            />
            <Route
              path="/hotspots/:id/preview"
              element={
                <MainLayout>
                  <HotspotPreview />
                </MainLayout>
              }
            />

            {/* Hotspot Distance Cache */}
            <Route
              path="/hotspot-distance-cache"
              element={
                <MainLayout>
                  <HotspotDistanceCacheList />
                </MainLayout>
              }
            />
            <Route
              path="/hotspot-distance-cache/new"
              element={
                <MainLayout>
                  <HotspotDistanceCacheForm />
                </MainLayout>
              }
            />
            <Route
              path="/hotspot-distance-cache/:id/edit"
              element={
                <MainLayout>
                  <HotspotDistanceCacheForm />
                </MainLayout>
              }
            />

            {/* Activities */}
            <Route
              path="/activities"
              element={
                <MainLayout>
                  <ActivityListPage />
                </MainLayout>
              }
            />
            <Route
              path="/activities/new"
              element={
                <MainLayout>
                  <ActivityForm />
                </MainLayout>
              }
            />
            <Route
              path="/activities/:id/edit"
              element={
                <MainLayout>
                  <ActivityForm />
                </MainLayout>
              }
            />
            <Route
              path="/activities/:id/preview"
              element={
                <MainLayout>
                  <ActivityPreviewPage />
                </MainLayout>
              }
            />

            <Route path="/wallet" element={<MainLayout><WalletHistory /></MainLayout>} />
            <Route path="/wallet-history" element={<MainLayout><WalletHistory /></MainLayout>} />
            {/* Staff */}
            <Route
              path="/staff"
              element={
                <MainLayout>
                  <StaffListPage />
                </MainLayout>
              }
            />
            <Route
              path="/staff/new"
              element={
                <MainLayout>
                  <StaffFormPage />
                </MainLayout>
              }
            />
            <Route
              path="/staff/:id/edit"
              element={
                <MainLayout>
                  <StaffFormPage />
                </MainLayout>
              }
            />
            <Route
              path="/staff/:id/preview"
              element={
                <MainLayout>
                  <StaffPreviewPage />
                </MainLayout>
              }
            />

            {/* Agent */}
            <Route
              path="/agent"
              element={
                <MainLayout>
                  <AgentListPage />
                </MainLayout>
              }
            />
            <Route
              path="/agent/:id/preview/"
              element={
                <MainLayout>
                  <AgentPreviewPage />
                </MainLayout>
              }
            />
            <Route
              path="/agent/:id/edit"
              element={
                <MainLayout>
                  <AgentFormPage />
                </MainLayout>
              }
            />
            <Route
              path="/profile"
              element={
                <MainLayout>
                  <Profile />
                </MainLayout>
              }
            />
            <Route
              path="/wallet-history"
              element={
                <MainLayout>
                  <WalletHistory />
                </MainLayout>
              }
            />
            <Route
              path="/subscription-history"
              element={
                <MainLayout>
                  <SubscriptionHistory />
                </MainLayout>
              }
            />
            <Route
              path="/payments/success"
              element={
                <MainLayout>
                  <PaymentSuccess />
                </MainLayout>
              }
            />

            {/* Guide */}
            <Route
              path="/guide"
              element={
                <MainLayout>
                  <GuideListPage />
                </MainLayout>
              }
            />
            <Route
              path="/guide/new"
              element={
                <MainLayout>
                  <GuideFormPage />
                </MainLayout>
              }
            />
            <Route
              path="/guide/:id/edit"
              element={
                <MainLayout>
                  <GuideFormPage />
                </MainLayout>
              }
            />
            <Route
              path="/guide/:id/preview"
              element={
                <MainLayout>
                  <GuidePreview />
                </MainLayout>
              }
            />

            {/* Parking Charge Bulk Import */}
            <Route
              path="/parking-charge-bulk-import"
              element={
                <MainLayout>
                  <ParkingChargeBulkImport />
                </MainLayout>
              }
            />

            {/* Locations */}
            <Route
              path="/locations"
              element={
                <MainLayout>
                  <LocationsPage />
                </MainLayout>
              }
            />

            {/* Locations Preview */}
            <Route
              path="/locations/:id/preview"
              element={
                <MainLayout>
                  <LocationsPreviewPage />
                </MainLayout>
              }
            />

            {/* Pricebook Export */}
            <Route
              path="/pricebook-export"
              element={
                <MainLayout>
                  <PricebookExportPage />
                </MainLayout>
              }
            />

            {/* Settings */}
            <Route
              path="/settings/global"
              element={
                <MainLayout>
                  <GlobalSettingsPage />
                </MainLayout>
              }
            />
            <Route
              path="/settings/cities"
              element={
                <MainLayout>
                  <CitiesPage />
                </MainLayout>
              }
            />
            <Route
              path="/settings/hotel-category"
              element={
                <MainLayout>
                  <HotelCategoryPage />
                </MainLayout>
              }
            />
            <Route
              path="/settings/gst"
              element={
                <MainLayout>
                  <GstSettingsPage />
                </MainLayout>
              }
            />
            <Route
              path="/settings/amenities"
              element={
                <MainLayout>
                  <InbuiltAmenitiesPage />
                </MainLayout>
              }
            />
            <Route
              path="/settings/vehicle-type"
              element={
                <MainLayout>
                  <VehicleTypePage />
                </MainLayout>
              }
            />
            <Route
              path="/settings/language"
              element={
                <MainLayout>
                  <LanguagePage />
                </MainLayout>
              }
            />

            {/* Role Permission */}
            <Route
              path="/settings/role-permission"
              element={
                <MainLayout>
                  <RolePermissionListPage />
                </MainLayout>
              }
            />
            <Route
              path="/role-permission/new"
              element={
                <MainLayout>
                  <RolePermissionFormPage />
                </MainLayout>
              }
            />
            <Route
              path="/role-permission/:id/edit"
              element={
                <MainLayout>
                  <RolePermissionFormPage />
                </MainLayout>
              }
            />
          </Route>
          { /* Agent Subscription Plan */}
          <Route
              path="/settings/subscription-plan"
              element={
                <MainLayout>
                  <AgentSubscriptionPlanListPage />
                </MainLayout>
              }
            />
            <Route
              path="/agent-subscription-plan/new"
              element={
                <MainLayout>  
                  <AgentSubscriptionPlanFormPage />
                </MainLayout>
              } 
            />
            <Route
              path="/agent-subscription-plan/:id/edit"
              element={
                <MainLayout>
                  <AgentSubscriptionPlanFormPage />
                </MainLayout>
              }
            />
            <Route
              path="/agent-subscription-plan/:id/preview"
              element={
                <MainLayout>
                  <AgentSubscriptionPlanPreviewPage />
                </MainLayout>
              }
            />

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
