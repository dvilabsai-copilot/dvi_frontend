/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import { DefaultRoutesSuggestions } from "@/components/DefaultRoutesSuggestions";
import { ArrivalHotelDecisionModal } from "@/components/hotels/ArrivalHotelDecisionModal";
import { SaveRouteConfirmDialog } from "./SaveRouteConfirmDialog";
import { ItineraryPlanBlock } from "../ItineraryPlanBlock";
import { RouteDetailsBlock } from "../RouteDetailsBlock";
import { VehicleBlock } from "../VehicleBlock";
import { ViaRouteDialog } from "../ViaRouteDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { calculateDaysBetweenDates } from "./createItinerary.utils";
import { splitViaString } from "./itineraryUtils";
import { SmartBookingPackages } from "./SmartBookingPackages";

export const CreateItineraryView = ({ context }: { context: Record<string, any> }) => {
  const {
    smartBookingImportedRoutes = [],
    pageMode, agents, agentId, setAgentId, isAgentLogin, isVehicleAgentLogin, loggedInAgentId, locations,
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
    requiresTransportEarlyArrivalPreference, transportEarlyArrivalOption,
    setTransportEarlyArrivalOption, transportEarlyArrivalHotelName,
    setTransportEarlyArrivalHotelName, transportEarlyArrivalRestMinutes,
    setTransportEarlyArrivalRestMinutes,
    noOfNights, noOfDays, isDefaultItineraryTypeSelected, activeDefaultRouteIndex,
    setSuggestedDefaultRoutes, setActiveDefaultRouteIndex, setRouteDetails, routeDetails,
    openViaRoutes, isViaRouteDisabled, deleteDay, refreshRouteDistance, deleteRouteDay, addDay,
    vehicleTypes, vehicles, setVehicles, selectedVehicleIds, addVehicle, removeVehicle,
    vehiclePaxValidationError,
    handleSaveClick, isSaving, showRouteConfirm, saveProgressPercent, estimatedSaveMs,
    saveErrorMessage,
    setSaveErrorMessage,
    pendingPayload, activeSaveType, FINAL_ITINERARY_LOADING_MESSAGES, transportLoadingMessageIndex,
    handleConfirmClose, handleSaveWithType, arrivalPolicyModal, setArrivalPolicyModal,
    isResolvingArrivalPolicy, getArrivalPolicyDecisionKey, runArrivalPolicyGate,
    setLastArrivalPolicyDecisionKey, applyArrivalPolicyDecision, setPendingPayload,
    continueToRouteConfirmation, viaDialogOpen, handleViaDialogOpenChange, viaRoutes,
    viaRoutesLoading, activeViaRouteRow, activeViaRouteIds, handleViaDialogSubmit,
  } = context;

  const allowedVehicleMatch = saveErrorMessage?.match(/Allowed vehicle types:\s*([\s\S]*)$/i);
  const allowedVehicleTypes = allowedVehicleMatch?.[1]
    ?.replace(/\.$/, '')
    .split(/,\s*/)
    .map((name: string) => name.trim())
    .filter(Boolean) || [];
const messageWithoutAllowedVehicles = allowedVehicleMatch && typeof allowedVehicleMatch.index === 'number'
  ? saveErrorMessage?.slice(0, allowedVehicleMatch.index).trim()
  : saveErrorMessage;

const vehicleValidationMessage =
  vehiclePaxValidationError || validationErrors.vehicleType;
  return (
    <div className="p-4 space-y-4">

      {pageMode !== "smart-booking" &&
        Array.isArray(
          smartBookingImportedRoutes,
        ) &&
        smartBookingImportedRoutes.length >
          0 && (
          <div
            data-smart-booking-imported-routes
            className="mb-5 rounded-2xl border border-[#dbe6f3] bg-[#f7fbff] p-4 shadow-sm"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-extrabold text-[#102a56]">
                  Selected Smart Routes (
                  {
                    smartBookingImportedRoutes.length
                  }
                  )
                </h2>

                <p className="text-xs text-[#60738e]">
                  Imported from Smart Booking.
                  Complete the itinerary details
                  below, then Save & Continue.
                </p>
              </div>

              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                Imported from Smart Booking
              </span>
            </div>

            <div className="space-y-2">
              {smartBookingImportedRoutes.map(
                (
                  item: any,
                  index: number,
                ) => (
                  <div
                    key={
                      item?.quoteId ||
                      index
                    }
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-[#dce6f2] bg-white p-3"
                  >
                    <div className={item?.image ? "h-14 w-20 overflow-hidden rounded-lg bg-slate-100" : "hidden"}>
                      {item?.image ? (
                        <img
                          src={
                            item.image
                          }
                          alt={
                            item?.title ||
                            `Route ${index + 1}`
                          }
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-extrabold text-[#102a56]">
                        Route{" "}{index + 1}
                      </div>

                      <div className="mt-0.5 break-words text-xs leading-5 text-[#60738e]">
                        {item?.routeLabel ||
                          ""}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-semibold text-[#60738e]">
                        {Math.max(
                          Number(
                            item?.displayDays ||
                              item?.noOfDays ||
                              (Array.isArray(item?.days)
                                ? item.days.length
                                : 1),
                          ) - 1,
                          0,
                        )}{" "}
                        Nights /{" "}
                        {Number(item?.displayDays || item?.noOfDays || (Array.isArray(item?.days) ? item.days.length : 0))}{" "}
                        Days
                      </div>

                      {Number(
                        item?.packageRate ||
                          0,
                      ) > 0 && (
                        <div className="mt-1 text-sm font-extrabold text-[#e40b2f]">
                          ₹
                          {Number(
                            item.packageRate,
                          ).toLocaleString(
                            "en-IN",
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        )}

     <ItineraryPlanBlock
  pageMode={pageMode}
  agents={agents}
        agentId={agentId}
        setAgentId={setAgentId}
        isAgentLocked={Boolean(isAgentLogin && loggedInAgentId)}
        isVehicleAgent={Boolean(isVehicleAgentLogin)}
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
        requiresTransportEarlyArrivalPreference={requiresTransportEarlyArrivalPreference}
        transportEarlyArrivalOption={transportEarlyArrivalOption}
        setTransportEarlyArrivalOption={setTransportEarlyArrivalOption}
        transportEarlyArrivalHotelName={transportEarlyArrivalHotelName}
        setTransportEarlyArrivalHotelName={setTransportEarlyArrivalHotelName}
        transportEarlyArrivalRestMinutes={transportEarlyArrivalRestMinutes}
        setTransportEarlyArrivalRestMinutes={setTransportEarlyArrivalRestMinutes}
        validationErrors={validationErrors}
        selectedHotelCategoryIds={selectedHotelCategoryIds}
        setSelectedHotelCategoryIds={setSelectedHotelCategoryIds}
        selectedHotelFacilityIds={selectedHotelFacilityIds}
        setSelectedHotelFacilityIds={setSelectedHotelFacilityIds}
        noOfNights={noOfNights}
        noOfDays={noOfDays}
      />

      {pageMode === "smart-booking" && (
        <SmartBookingPackages
          arrivalLocation={
            arrivalLocation
          }

          departureLocation={
            departureLocation
          }

          locations={locations}

          agentId={agentId}

          itineraryPreference={
            itineraryPreference
          }

          tripStartDate={
            tripStartDate
          }

          tripEndDate={
            tripEndDate
          }

          selectedHotelCategoryIds={
            selectedHotelCategoryIds
          }

          hotelCategoryOptions={
            hotelCategoryOptions
          }
        />
      )}

      {/* SMART BOOKING VIEW COMPACT START */}
      {pageMode !== "smart-booking" && (
        <>


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
  authoritativeRoutes={smartBookingImportedRoutes}
  onRoutesLoaded={(routes) => {
    if (smartBookingImportedRoutes.length === 0) {
      setSuggestedDefaultRoutes(routes.length > 0 ? [routes[0]] : []);
    }
    setActiveDefaultRouteIndex(0);
  }}
  onSelectedRoutesChange={(selectedRoutes) => {
    if (smartBookingImportedRoutes.length === 0) {
      setSuggestedDefaultRoutes(selectedRoutes);
    }
  }}
  onRouteSelect={(route, index) => {
    setActiveDefaultRouteIndex(index);
  }}
            onNoRoutesFound={() => {
              if (smartBookingImportedRoutes.length > 0) {
                return;
              }
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
  isViaRouteDisabled={isViaRouteDisabled}
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
  className={vehicleValidationMessage ? "border border-red-500 rounded-md p-2" : ""}
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
  {vehicleValidationMessage && (
    <p className="mt-1 text-xs text-red-500">{vehicleValidationMessage}</p>
  )}
</div>

      <div className="flex justify-center pt-1">
        <Button
          onClick={handleSaveClick}
          disabled={isSaving}
          className="min-w-[220px] rounded-full bg-gradient-to-r from-[#ff5aa5] to-[#7b3fe4] py-2 text-base font-semibold text-white shadow-md hover:opacity-90 disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Save & Continue"}
        </Button>
      </div>

      <Dialog
        open={Boolean(saveErrorMessage)}
        onOpenChange={(open) => {
          if (!open) setSaveErrorMessage(null);
        }}
      >
        <DialogContent className="max-w-xl border-red-200" onClose={() => setSaveErrorMessage(null)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-lg">!</span>
              Vehicle route restriction
          </DialogTitle>
          <DialogDescription>
              {saveErrorMessage && /This is a vehicle-type restriction|Changing the departure time will not remove this restriction/i.test(saveErrorMessage)
                ? "This itinerary cannot be saved because the selected vehicle is not permitted on this route."
                : saveErrorMessage && /This restriction applies to every vehicle/i.test(saveErrorMessage)
                  ? "This itinerary cannot be saved because every vehicle is restricted during this time window."
                  : "The requested timeline cannot be saved with the selected vehicle and departure time."}
            </DialogDescription>
          </DialogHeader>
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900">
            {messageWithoutAllowedVehicles}
          </div>
          {allowedVehicleTypes.length > 0 && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-sm font-semibold text-emerald-900">Allowed vehicle types</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {allowedVehicleTypes.map((vehicleType: string) => (
                  <span key={vehicleType} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-800 shadow-sm">
                    {vehicleType}
                  </span>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveErrorMessage(null)}>
              {saveErrorMessage && /This is a vehicle-type restriction|Changing the departure time will not remove this restriction/i.test(saveErrorMessage)
                ? "Choose another vehicle"
                : saveErrorMessage && /This restriction applies to every vehicle/i.test(saveErrorMessage)
                  ? "Change departure time or route"
                  : "Change vehicle or departure time"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SaveRouteConfirmDialog
        open={showRouteConfirm}
        suggestedRouteSelected={isDefaultItineraryTypeSelected()}
        isSaving={isSaving}
        progressPercent={saveProgressPercent}
        estimatedSeconds={Math.round((estimatedSaveMs || 0) / 1000)}
        dayCount={Math.max(1, Number(pendingPayload?.plan?.no_of_days ?? noOfDays ?? 1))}
                saveType={activeSaveType}
        transportLoadingMessage={
          FINAL_ITINERARY_LOADING_MESSAGES[
            transportLoadingMessageIndex % FINAL_ITINERARY_LOADING_MESSAGES.length
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
        </>
      )}
      {/* SMART BOOKING VIEW COMPACT END */}


    </div>
  );
};
