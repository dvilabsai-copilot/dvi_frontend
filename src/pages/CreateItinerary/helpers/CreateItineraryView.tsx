/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import { DefaultRoutesSuggestions } from "@/components/DefaultRoutesSuggestions";
import { ArrivalHotelDecisionModal } from "@/components/hotels/ArrivalHotelDecisionModal";
import { SaveRouteConfirmDialog } from "./SaveRouteConfirmDialog";
import { ItineraryPlanBlock } from "../ItineraryPlanBlock";
import { RouteDetailsBlock } from "../RouteDetailsBlock";
import { VehicleBlock } from "../VehicleBlock";
import { ViaRouteDialog } from "../ViaRouteDialog";
import { calculateDaysBetweenDates } from "./createItinerary.utils";
import { splitViaString } from "./itineraryUtils";

export const CreateItineraryView = ({ context }: { context: Record<string, any> }) => {
  const {
    agents, agentId, setAgentId, isAgentLogin, loggedInAgentId, locations,
    arrivalLocation, setArrivalLocation, departureLocation, setDepartureLocation,
    itineraryTypes, itineraryTypeSelect, setItineraryTypeSelect,
    itineraryPreference, setItineraryPreference, travelTypes, arrivalType, setArrivalType,
    departureType, setDepartureType, entryTicketOptions, entryTicketRequired,
    setEntryTicketRequired, budget, setBudget, rooms, setRooms, addRoom, removeRoom,
    guideOptions, guideRequired, setGuideRequired, nationalities, nationality, setNationality,
    foodPreferences, foodPreference, setFoodPreference, mealPlanOptions, mealPlanCode,
    setMealPlanCode, tripStartDate, setTripStartDate, tripEndDate, setTripEndDate,
    startTime, setStartTime, endTime, setEndTime, hotelCategoryOptions, hotelFacilityOptions,
    specialInstructions, setSpecialInstructions, validationErrors, selectedHotelCategoryIds,
    setSelectedHotelCategoryIds, selectedHotelFacilityIds, setSelectedHotelFacilityIds,
    noOfNights, noOfDays, isDefaultItineraryTypeSelected, activeDefaultRouteIndex,
    setSuggestedDefaultRoutes, setActiveDefaultRouteIndex, setRouteDetails, routeDetails,
    openViaRoutes, deleteDay, refreshRouteDistance, deleteRouteDay, addDay,
    vehicleTypes, vehicles, setVehicles, selectedVehicleIds, addVehicle, removeVehicle,
    handleSaveClick, isSaving, showRouteConfirm, saveProgressPercent, estimatedSaveMs,
    pendingPayload, activeSaveType, TRANSPORT_LOADING_MESSAGES, transportLoadingMessageIndex,
    handleConfirmClose, handleSaveWithType, arrivalPolicyModal, setArrivalPolicyModal,
    isResolvingArrivalPolicy, getArrivalPolicyDecisionKey, runArrivalPolicyGate,
    setLastArrivalPolicyDecisionKey, applyArrivalPolicyDecision, setPendingPayload,
    continueToRouteConfirmation, viaDialogOpen, handleViaDialogOpenChange, viaRoutes,
    viaRoutesLoading, activeViaRouteRow, activeViaRouteIds, handleViaDialogSubmit,
  } = context;

  return (
    <div className="p-4 space-y-4">
     <ItineraryPlanBlock
  agents={agents}
        agentId={agentId}
        setAgentId={setAgentId}
        isAgentLocked={Boolean(isAgentLogin && loggedInAgentId)}
        locations={locations}
        arrivalLocation={arrivalLocation}
        setArrivalLocation={setArrivalLocation}
        departureLocation={departureLocation}
        setDepartureLocation={setDepartureLocation}
        itineraryTypes={itineraryTypes}
        itineraryTypeSelect={itineraryTypeSelect}
        setItineraryTypeSelect={setItineraryTypeSelect}
        itineraryPreference={itineraryPreference}
        setItineraryPreference={setItineraryPreference}
        travelTypes={travelTypes}
        arrivalType={arrivalType}
        setArrivalType={setArrivalType}
        departureType={departureType}
        setDepartureType={setDepartureType}
        entryTicketOptions={entryTicketOptions}
        entryTicketRequired={entryTicketRequired}
        setEntryTicketRequired={setEntryTicketRequired}
        budget={budget}
        setBudget={setBudget}
        rooms={rooms}
        setRooms={setRooms}
        addRoom={addRoom}
        removeRoom={removeRoom}
        guideOptions={guideOptions}
        guideRequired={guideRequired}
        setGuideRequired={setGuideRequired}
        nationalities={nationalities}
        nationality={nationality}
        setNationality={setNationality}
        foodPreferences={foodPreferences}
        foodPreference={foodPreference}
        setFoodPreference={setFoodPreference}
        mealPlanOptions={mealPlanOptions}
        mealPlanCode={mealPlanCode}
        setMealPlanCode={setMealPlanCode}
        tripStartDate={tripStartDate}
        setTripStartDate={setTripStartDate}
        tripEndDate={tripEndDate}
        setTripEndDate={setTripEndDate}
        startTime={startTime}
        setStartTime={setStartTime}
        endTime={endTime}
        setEndTime={setEndTime}
        hotelCategoryOptions={hotelCategoryOptions}
        hotelFacilityOptions={hotelFacilityOptions}
        specialInstructions={specialInstructions}
        setSpecialInstructions={setSpecialInstructions}
        validationErrors={validationErrors}
        selectedHotelCategoryIds={selectedHotelCategoryIds}
        setSelectedHotelCategoryIds={setSelectedHotelCategoryIds}
        selectedHotelFacilityIds={selectedHotelFacilityIds}
        setSelectedHotelFacilityIds={setSelectedHotelFacilityIds}
        noOfNights={noOfNights}
        noOfDays={noOfDays}
      />

      <div
        data-field="firstRouteSource"
        className={
          validationErrors.firstRouteSource || validationErrors.firstRouteNext
            ? "border border-red-500 rounded-md p-2"
            : ""
        }
      >
       {/* Show suggested/default routes if itinerary type is Default/Suggested Routes */}
{itineraryTypeSelect && isDefaultItineraryTypeSelected() ? (
          <DefaultRoutesSuggestions
  arrivalLocation={arrivalLocation}
  departureLocation={departureLocation}
  noOfDays={calculateDaysBetweenDates(tripStartDate, tripEndDate)}
  startDate={tripStartDate}
  endDate={tripEndDate}
  activeRouteIndex={activeDefaultRouteIndex}
  onRoutesLoaded={(routes) => {
    setSuggestedDefaultRoutes(routes);
    setActiveDefaultRouteIndex(0);
  }}
  onRouteSelect={(route, index) => {
    setActiveDefaultRouteIndex(index);
  }}
            onNoRoutesFound={() => {
              const customizeType = itineraryTypes.find((t) => t.label === "Customize");
              if (customizeType) {
                setItineraryTypeSelect(customizeType.id);
              }
            }}
            locations={locations}
            routeDetails={routeDetails}
            setRouteDetails={setRouteDetails}
            onOpenViaRoutes={openViaRoutes}
            onDeleteDay={deleteDay}
          />
        ) : (
<RouteDetailsBlock
  locations={locations}
  routeDetails={routeDetails}
  setRouteDetails={setRouteDetails}
  onOpenViaRoutes={openViaRoutes}
  onRefreshRouteDistance={refreshRouteDistance}
  departureLocation={departureLocation}
  hideIntercityKm={true}
  onDeleteDay={deleteDay}
  onDeleteRouteDay={deleteRouteDay}
  addDay={addDay}
/>
        )}
        {validationErrors.firstRouteSource && (
          <p className="mt-1 text-xs text-red-500">{validationErrors.firstRouteSource}</p>
        )}
        {validationErrors.firstRouteNext && (
          <p className="mt-1 text-xs text-red-500">{validationErrors.firstRouteNext}</p>
        )}
      </div>

      <div
        data-field="vehicleType"


        className={validationErrors.vehicleType ? "border border-red-500 rounded-md p-2" : ""}
      >
        <VehicleBlock
          vehicleTypes={vehicleTypes}
          vehicles={vehicles}
          setVehicles={setVehicles}
          selectedVehicleIds={selectedVehicleIds}
          addVehicle={addVehicle}
          removeVehicle={removeVehicle}
          itineraryPreference={itineraryPreference}
        />
        {validationErrors.vehicleType && (
          <p className="mt-1 text-xs text-red-500">{validationErrors.vehicleType}</p>
        )}
      </div>

      <div className="flex justify-center pt-4">
        <Button
          onClick={handleSaveClick}
          disabled={isSaving}
          className="min-w-[220px] rounded-full bg-gradient-to-r from-[#ff5aa5] to-[#7b3fe4] py-2 text-base font-semibold text-white shadow-md hover:opacity-90 disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Save & Continue"}
        </Button>
      </div>

      <SaveRouteConfirmDialog
        open={showRouteConfirm}
        isSaving={isSaving}
        progressPercent={saveProgressPercent}
        estimatedSeconds={Math.round((estimatedSaveMs || 0) / 1000)}
        dayCount={Math.max(1, Number(pendingPayload?.plan?.no_of_days ?? noOfDays ?? 1))}
                saveType={activeSaveType}
        transportLoadingMessage={
          TRANSPORT_LOADING_MESSAGES[
            transportLoadingMessageIndex % TRANSPORT_LOADING_MESSAGES.length
          ]
        }
        onClose={handleConfirmClose}
        onSaveSameRoute={() => handleSaveWithType("itineary_basic_info")}
        onOptimizeRoute={() => handleSaveWithType("itineary_basic_info_with_optimized_route")}
      />

      <ArrivalHotelDecisionModal
        open={arrivalPolicyModal.open}
        onOpenChange={(open) => {
          if (!open) {
            setArrivalPolicyModal({
              open: false,
              arrivalDate: "",
              previousDayDate: "",
              request: null,
            });
          }
        }}
        arrivalDate={arrivalPolicyModal.arrivalDate}
        previousDayDate={arrivalPolicyModal.previousDayDate}
        isLoading={isResolvingArrivalPolicy}
        onConfirmPreviousDayBilling={async () => {
          if (!arrivalPolicyModal.request) return;
          const decisionKey = getArrivalPolicyDecisionKey(arrivalPolicyModal.request);
          const canProceed = await runArrivalPolicyGate({
            ...arrivalPolicyModal.request,
            previousDayBillingDecisionProvided: true,
            previousDayBillingConfirmed: true,
          });
          if (!canProceed) return;

          if (decisionKey) {
            setLastArrivalPolicyDecisionKey(decisionKey);
          }

          applyArrivalPolicyDecision({
            previousDayBillingDecisionProvided: true,
            previousDayBillingConfirmed: true,
          });

          setPendingPayload((prev: any) => prev ? {
            ...prev,
            previousDayBillingDecisionProvided: true,
            previousDayBillingConfirmed: true,
          } : prev);

          setArrivalPolicyModal({
            open: false,
            arrivalDate: "",
            previousDayDate: "",
            request: null,
          });
          continueToRouteConfirmation();
        }}
        onDeclinePreviousDayBilling={async () => {
          if (!arrivalPolicyModal.request) return;
          const decisionKey = getArrivalPolicyDecisionKey(arrivalPolicyModal.request);
          const canProceed = await runArrivalPolicyGate({
            ...arrivalPolicyModal.request,
            previousDayBillingDecisionProvided: true,
            previousDayBillingConfirmed: false,
          });
          if (!canProceed) return;

          if (decisionKey) {
            setLastArrivalPolicyDecisionKey(decisionKey);
          }

          applyArrivalPolicyDecision({
            previousDayBillingDecisionProvided: true,
            previousDayBillingConfirmed: false,
          });

          setPendingPayload((prev: any) => prev ? {
            ...prev,
            previousDayBillingDecisionProvided: true,
            previousDayBillingConfirmed: false,
          } : prev);

          setArrivalPolicyModal({
            open: false,
            arrivalDate: "",
            previousDayDate: "",
            request: null,
          });
          continueToRouteConfirmation();
        }}
      />

      <ViaRouteDialog
        open={viaDialogOpen}
        onOpenChange={handleViaDialogOpenChange}
        routes={viaRoutes}
        loading={viaRoutesLoading}
        activeRoute={
          activeViaRouteRow
            ? {
                day: activeViaRouteRow.day,
                date: activeViaRouteRow.date,
                source: activeViaRouteRow.source,
                next: activeViaRouteRow.next,
                initialSelected: splitViaString(activeViaRouteRow.via),
              }
            : null
        }
        initialIds={activeViaRouteIds}
        maxRoutes={2}
        onSubmit={handleViaDialogSubmit}
      />

    </div>
  );
};
