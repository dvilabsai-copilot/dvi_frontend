import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Download } from 'lucide-react';
import { ItineraryService } from '@/services/itinerary';
import { useToast } from '@/components/ui/use-toast';
import { HotelList } from './HotelList';
import { ConfirmedItineraryCancellationResults } from './ConfirmedItineraryCancellationResults';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface HotelDetail {
  checkInDate: string;
  hotelName: string;
  location: string;
  roomType: string;
  nights: number;
  totalCost: number;
  cancellationPolicy?: string;
}

interface ConfirmedGuideSlotDetail {
  confirmedGuideSlotCostId: number;
  guideSlotCostDetailsId: number;
  routeGuideId: number;
  itineraryRouteId: number;
  itineraryRouteDate: string | null;
  guideId: number;
  guideType: number;
  guideSlot: number;
  guideSlotLabel: string;
  guideSlotCost: number;
  cancellationStatus: number;
  cancellationDefectType: number;
}

interface ConfirmedGuideAssignmentDetail {
  routeGuideId: number;
  itineraryRouteId: number;
  itineraryRouteDate: string | null;
  guideId: number;
  guideName: string;
  guideType: number;
  guideCost: number;
  guideLanguageIds: number[];
  guideLanguageLabels: string[];
  guideSlotIds: number[];
  guideSlotLabels: string[];
  cancellationStatus: number;
  slots: ConfirmedGuideSlotDetail[];
}

interface ConfirmedItineraryDetail {
  id: string;
  quoteId: string;
  agent: string;
  primaryCustomer: string;
  arrivalLocation: string;
  departureLocation: string;
  startDate: string;
  endDate: string;
  nights: number;
  days: number;
  adults: number;
  children: number;
  infants: number;
  guide: boolean;
  entryTicket: boolean;
  rooms: number;
  hotels: HotelDetail[];
  totalCost: number;
  createdDate: string;
  status: 'confirmed' | 'cancelled';
  routes_with_hotels?: any[]; // Debug field from backend
  plan?: {
    itinerary_plan_ID: number;
    confirmed_itinerary_plan_ID: number;
  };
  guideAssignments?: ConfirmedGuideAssignmentDetail[];
}

interface ConfirmedItineraryDetailsProps {
  confirmedPlanId?: number;
}

export const ConfirmedItineraryDetails: React.FC<ConfirmedItineraryDetailsProps> = ({ confirmedPlanId: propConfirmedPlanId }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Use prop if provided (from router - this is the confirmed_itinerary_plan_ID)
  // Otherwise use URL param directly if it's a number
  // ⚠️ IMPORTANT: When coming from router, propConfirmedPlanId is the confirmed_itinerary_plan_ID (numeric)
  //              NOT the quote ID like "DVI2026011"
  const confirmedPlanId = propConfirmedPlanId;
  
  console.log('🟢 ConfirmedItineraryDetails MOUNTED');
  console.log('   propConfirmedPlanId (from router):', propConfirmedPlanId);
  console.log('   id from URL:', id);
  console.log('   confirmedPlanId (used for API call):', confirmedPlanId);
  console.log('   API endpoint: GET /itineraries/confirmed/', confirmedPlanId);

  const [itinerary, setItinerary] = useState<ConfirmedItineraryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCancellationDialog, setShowCancellationDialog] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  
  // Cancellation options
  const [cancellationOptions, setCancellationOptions] = useState({
    selectAll: false,
    modifyHotspot: false,
    modifyHotel: false,
    modifyVehicle: false,
    modifyGuide: false,
    modifyActivity: false,
  });
  
  // Cancellation result
  const [cancellationResult, setCancellationResult] = useState<any | null>(null);
  const [selectedGuideAssignment, setSelectedGuideAssignment] = useState<ConfirmedGuideAssignmentDetail | null>(null);
  const [selectedGuideSlot, setSelectedGuideSlot] = useState<ConfirmedGuideSlotDetail | null>(null);
  const [showGuideCancellationDialog, setShowGuideCancellationDialog] = useState(false);
  const [guideCancellationReason, setGuideCancellationReason] = useState('');
  const [guideDefectType, setGuideDefectType] = useState<'dvi' | 'guest'>('dvi');
  const [guideCancellationPercentage, setGuideCancellationPercentage] = useState(10);
  const [isCancellingGuideSlot, setIsCancellingGuideSlot] = useState(false);
  const [guideCancellationResult, setGuideCancellationResult] = useState<any | null>(null);

  useEffect(() => {
    fetchItineraryDetails();
  }, [confirmedPlanId]);

  const fetchItineraryDetails = async () => {
    if (!confirmedPlanId) {
      console.warn('No confirmedPlanId provided');
      return;
    }
    setLoading(true);
    try {
      console.log('🔍 Fetching confirmed itinerary details for planId:', confirmedPlanId);
      const response = await ItineraryService.getConfirmedItineraryDetails(confirmedPlanId.toString());
      console.log('✅ Response received:', response);
      console.log('   Hotels array:', response?.hotels);
      console.log('   Routes with hotels:', response?.routes_with_hotels);
      setItinerary(response);
    } catch (error: any) {
      console.error('Failed to fetch itinerary details', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to load itinerary details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancellation = async () => {
    if (!cancellationReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for cancellation',
        variant: 'destructive',
      });
      return;
    }

    const itineraryPlanId = Number(itinerary?.plan?.itinerary_plan_ID || 0);
    if (!itineraryPlanId) {
      toast({
        title: 'Error',
        description: 'Unable to resolve itinerary plan ID for cancellation',
        variant: 'destructive',
      });
      return;
    }

    setIsCancelling(true);
    try {
      const response = await ItineraryService.cancelItinerary({
        itinerary_plan_ID: itineraryPlanId,
        reason: cancellationReason,
        cancellation_percentage: 10,
        cancellation_options: {
          modify_hotspot: cancellationOptions.modifyHotspot,
          modify_hotel: cancellationOptions.modifyHotel,
          modify_vehicle: cancellationOptions.modifyVehicle,
          modify_guide: cancellationOptions.modifyGuide,
          modify_activity: cancellationOptions.modifyActivity,
        },
      });

      // Show result with detailed breakdown
      if (response.data) {
        setCancellationResult(response.data);
        toast({
          title: 'Success',
          description: `Itinerary cancelled successfully - Ref: ${response.data.cancellation_reference}`,
        });
      } else {
        toast({
          title: 'Success',
          description: 'Itinerary cancelled successfully',
        });
        setShowCancellationDialog(false);
        resetCancellationState();
        fetchItineraryDetails();
      }
    } catch (error: any) {
      console.error('Failed to cancel itinerary', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to cancel itinerary';
      
      if (error.response?.status === 409) {
        toast({
          title: 'Error',
          description: 'This itinerary is already cancelled',
          variant: 'destructive',
        });
      } else if (error.response?.status === 404) {
        toast({
          title: 'Error',
          description: 'Itinerary not found',
          variant: 'destructive',
        });
      } else if (error.response?.status === 400) {
        toast({
          title: 'Error',
          description: 'Missing required fields: reason is required',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setIsCancelling(false);
    }
  };

  const resetCancellationState = () => {
    setCancellationReason('');
    setCancellationOptions({
      selectAll: false,
      modifyHotspot: false,
      modifyHotel: false,
      modifyVehicle: false,
      modifyGuide: false,
      modifyActivity: false,
    });
    setCancellationResult(null);
  };

  const resetGuideCancellationState = () => {
    setSelectedGuideAssignment(null);
    setSelectedGuideSlot(null);
    setGuideCancellationReason('');
    setGuideDefectType('dvi');
    setGuideCancellationPercentage(10);
    setGuideCancellationResult(null);
    setShowGuideCancellationDialog(false);
  };

  const openGuideCancellationDialog = (
    assignment: ConfirmedGuideAssignmentDetail,
    slot: ConfirmedGuideSlotDetail,
  ) => {
    setSelectedGuideAssignment(assignment);
    setSelectedGuideSlot(slot);
    setGuideCancellationReason('');
    setGuideDefectType('dvi');
    setGuideCancellationPercentage(10);
    setShowGuideCancellationDialog(true);
  };

  const handleGuideSlotCancellation = async () => {
    if (!confirmedPlanId || !selectedGuideAssignment || !selectedGuideSlot) {
      toast({
        title: 'Error',
        description: 'Guide slot details are missing',
        variant: 'destructive',
      });
      return;
    }

    if (!guideCancellationReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for guide cancellation',
        variant: 'destructive',
      });
      return;
    }

    setIsCancellingGuideSlot(true);
    try {
      const response = await ItineraryService.cancelConfirmedGuideSlot(confirmedPlanId, {
        routeGuideId: selectedGuideAssignment.routeGuideId,
        guideSlotCostDetailsId: selectedGuideSlot.guideSlotCostDetailsId,
        itineraryRouteId: selectedGuideAssignment.itineraryRouteId,
        cancellationPercentage: guideCancellationPercentage,
        defectType: guideDefectType,
        reason: guideCancellationReason,
      });

      setGuideCancellationResult(response?.data || response);
      setShowGuideCancellationDialog(false);
      toast({
        title: 'Success',
        description: 'Guide slot cancelled successfully',
      });
      await fetchItineraryDetails();
    } catch (error: any) {
      console.error('Failed to cancel guide slot', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to cancel guide slot',
        variant: 'destructive',
      });
    } finally {
      setIsCancellingGuideSlot(false);
    }
  };

  const handleExportPDF = () => {
    if (!id) return;
    // Trigger PDF download/export
    window.location.href = `/api/confirmed-itinerary/${id}/export-pdf`;
  };

  if (loading) {
    return <div className="p-8 text-center">Loading itinerary details...</div>;
  }

  if (!itinerary) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Itinerary not found</p>
        <Button onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f5fc]">
      {/* ✅ FIXED HEADER - Stays visible on scroll */}
      <div className="sticky top-0 z-50 bg-white border-b border-[#e5d9f2] shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-[#d546ab] hover:text-[#c03d9f] font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to List
              </button>
              <div className="text-sm text-[#6c6c6c]">
                Booking: <span className="font-bold text-[#4a4260]">#{itinerary.quoteId}</span>
              </div>
            </div>
            
            {/* Action Buttons - Fixed Position */}
            <div className="flex flex-wrap gap-2 justify-end">
              <Button 
                onClick={handleExportPDF} 
                variant="outline" 
                className="border-[#d546ab] text-[#d546ab] hover:bg-[#fdf6ff] text-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Pluck Card
              </Button>
              <Button 
                onClick={handleExportPDF}
                variant="outline"
                className="border-[#28a745] text-[#28a745] hover:bg-[#f0f9f0] text-sm"
              >
                Voucher Details
              </Button>
              <Button 
                onClick={handleExportPDF}
                variant="outline"
                className="border-[#fd7e14] text-[#fd7e14] hover:bg-[#fff8f0] text-sm"
              >
                + Add Incidental Expenses
              </Button>
              <Button 
                onClick={handleExportPDF}
                variant="outline"
                className="border-[#dc3545] text-[#dc3545] hover:bg-[#fdf0f0] text-sm"
              >
                Modify Itinerary
              </Button>
              <Button 
                onClick={handleExportPDF}
                variant="outline"
                className="border-[#17a2b8] text-[#17a2b8] hover:bg-[#f0f7f9] text-sm"
              >
                Invoice Tax
              </Button>
              <Button 
                onClick={handleExportPDF}
                variant="outline"
                className="border-[#fd7e14] text-[#fd7e14] hover:bg-[#fff8f0] text-sm"
              >
                Invoice Performa
              </Button>
              {itinerary.status === 'confirmed' && (
                <Button
                  onClick={() => setShowCancellationDialog(true)}
                  variant="destructive"
                  className="text-sm bg-[#dc3545] hover:bg-[#c82333]"
                >
                  Cancel Itinerary
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6 pb-8">

      {/* Itinerary Header Card */}
      <Card className="border border-[#efdef8] rounded-lg bg-white shadow-none">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="text-sm text-gray-600">
                Booking ID: <span className="font-bold text-blue-600">#{itinerary.quoteId}</span>
              </div>
              <div className="text-sm text-gray-600 mt-2">
                {new Date(itinerary.startDate).toLocaleDateString('en-IN', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })} to {new Date(itinerary.endDate).toLocaleDateString('en-IN', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })} ({itinerary.nights}N, {itinerary.days}D)
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Primary Guest</div>
              <div className="font-bold text-lg">{itinerary.primaryCustomer}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-xs text-gray-500">Adults</div>
              <div className="font-bold text-lg">{itinerary.adults}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Children</div>
              <div className="font-bold text-lg">{itinerary.children}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Infants</div>
              <div className="font-bold text-lg">{itinerary.infants}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Rooms</div>
              <div className="font-bold text-lg">{itinerary.rooms}</div>
            </div>
          </div>
          <div className="pt-4 border-t">
            <div className="text-sm font-semibold text-gray-700 mb-2">Route</div>
            <div className="text-lg font-bold">
              {itinerary.arrivalLocation} → {itinerary.departureLocation}
            </div>
          </div>
          <div className="text-sm text-gray-600">
            <div>Agent: <span className="font-semibold">{itinerary.agent}</span></div>
            <div>Guide: <span className="font-semibold">{itinerary.guide ? 'Yes' : 'No'}</span></div>
            <div>Entry Ticket: <span className="font-semibold">{itinerary.entryTicket ? 'Yes' : 'No'}</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Hotel Details Section - ✅ Using HotelList component in read-only mode */}
      {itinerary.guideAssignments && itinerary.guideAssignments.length > 0 && (
        <Card className="border border-[#efdef8] rounded-lg bg-white shadow-none">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-[#4a4260]">
              GUIDE DETAILS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {itinerary.guideAssignments.map((assignment) => (
              <div
                key={assignment.routeGuideId}
                className="rounded-lg border border-[#eadcf7] bg-[#fcf9ff] p-4"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-base font-semibold text-[#4a4260]">
                      {assignment.guideName || 'Guide'}
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      Date: <span className="font-medium">{assignment.itineraryRouteDate || 'Whole itinerary'}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Language: <span className="font-medium">{assignment.guideLanguageLabels.join(', ') || 'NA'}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Slots: <span className="font-medium">{assignment.guideSlotLabels.join(', ') || 'Whole itinerary'}</span>
                    </div>
                  </div>
                  <div className="text-left md:text-right">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Guide Cost</div>
                    <div className="text-lg font-bold text-[#4a4260]">
                      ₹{Number(assignment.guideCost || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {assignment.slots.map((slot) => (
                    <div
                      key={`${assignment.routeGuideId}-${slot.guideSlotCostDetailsId}`}
                      className={`flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between ${
                        slot.cancellationStatus === 1
                          ? 'border-red-200 bg-red-50'
                          : 'border-[#eadcf7] bg-white'
                      }`}
                    >
                      <div>
                        <div className="font-medium text-[#4a4260]">{slot.guideSlotLabel}</div>
                        <div className="text-sm text-gray-600">
                          Service Amount: ₹{Number(slot.guideSlotCost || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {slot.itineraryRouteDate || assignment.itineraryRouteDate || 'Whole itinerary'}
                        </div>
                      </div>

                      {slot.cancellationStatus === 1 ? (
                        <div className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                          Cancelled
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          className="border-[#dc3545] text-[#dc3545] hover:bg-[#fff5f5]"
                          onClick={() => openGuideCancellationDialog(assignment, slot)}
                        >
                          Cancel Slot
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {itinerary.hotels && itinerary.hotels.length > 0 && (
        <Card className="border-none shadow-none bg-white">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-[#4a4260]">
              HOTEL LIST
            </CardTitle>
          </CardHeader>
          <CardContent>
            <HotelList
              hotels={itinerary.hotels as any}
              hotelTabs={[
                {
                  groupType: 1,
                  label: 'Selected Hotels',
                  totalAmount: itinerary.totalCost,
                }
              ]}
              hotelRatesVisible={true}
              quoteId={id!}
              planId={confirmedPlanId ?? 0}
              readOnly={true}
            />
          </CardContent>
        </Card>
      )}

      {/* Empty State - No Hotels */}
      {itinerary && (!itinerary.hotels || itinerary.hotels.length === 0) && (
        <Card className="border border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <p className="text-amber-800 font-medium">No hotels found for this confirmed itinerary</p>
                <p className="text-amber-600 text-sm mt-1">Debug: {JSON.stringify({
                  hotelsArray: itinerary.hotels,
                  hotelsLength: itinerary.hotels?.length,
                  routesWithHotels: itinerary.routes_with_hotels?.length
                })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Total Cost Card */}
      <Card className="border border-[#efdef8] rounded-lg bg-gradient-to-r from-[#f8f4ff] to-[#fff9f3] shadow-none">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div className="text-xl font-bold text-gray-800">Total Cost</div>
            <div className="text-3xl font-bold text-blue-600">
              ₹{itinerary.totalCost.toLocaleString('en-IN')}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cancellation Status */}
      {itinerary.status === 'cancelled' && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-center font-semibold">
          This itinerary has been cancelled
        </div>
      )}

      {/* Cancellation Dialog */}
      <Dialog open={showCancellationDialog} onOpenChange={setShowCancellationDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cancel Itinerary</DialogTitle>
            <DialogDescription>
              Select which components to cancel and provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Components to Cancel */}
            <div>
              <Label className="text-sm font-medium text-[#4a4260] mb-2 block">Components to Cancel</Label>
              <div className="space-y-2 border border-[#e5d9f2] rounded-lg p-3 bg-gray-50">
                {/* Select All */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="selectAll"
                    checked={cancellationOptions.selectAll}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setCancellationOptions({
                        selectAll: checked,
                        modifyHotspot: checked,
                        modifyHotel: checked,
                        modifyVehicle: checked,
                        modifyGuide: checked,
                        modifyActivity: checked,
                      });
                    }}
                    className="accent-[#d546ab] cursor-pointer w-4 h-4"
                  />
                  <Label htmlFor="selectAll" className="text-sm text-gray-700 cursor-pointer font-semibold">
                    Select All
                  </Label>
                </div>
                <div className="text-xs text-gray-500 mt-2 ml-6">Cancel:</div>
                
                {/* Modify Hotspot */}
                <div className="flex items-center space-x-2 ml-4">
                  <input
                    type="checkbox"
                    id="modifyHotspot"
                    checked={cancellationOptions.modifyHotspot}
                    onChange={(e) => {
                      setCancellationOptions({
                        ...cancellationOptions,
                        modifyHotspot: e.target.checked,
                        selectAll: false,
                      });
                    }}
                    className="accent-[#d546ab] cursor-pointer w-4 h-4"
                  />
                  <Label htmlFor="modifyHotspot" className="text-sm text-gray-700 cursor-pointer">
                    Hotspots
                  </Label>
                </div>

                {/* Modify Hotel */}
                <div className="flex items-center space-x-2 ml-4">
                  <input
                    type="checkbox"
                    id="modifyHotel"
                    checked={cancellationOptions.modifyHotel}
                    onChange={(e) => {
                      setCancellationOptions({
                        ...cancellationOptions,
                        modifyHotel: e.target.checked,
                        selectAll: false,
                      });
                    }}
                    className="accent-[#d546ab] cursor-pointer w-4 h-4"
                  />
                  <Label htmlFor="modifyHotel" className="text-sm text-gray-700 cursor-pointer">
                    Hotels
                  </Label>
                </div>

                {/* Modify Vehicle */}
                <div className="flex items-center space-x-2 ml-4">
                  <input
                    type="checkbox"
                    id="modifyVehicle"
                    checked={cancellationOptions.modifyVehicle}
                    onChange={(e) => {
                      setCancellationOptions({
                        ...cancellationOptions,
                        modifyVehicle: e.target.checked,
                        selectAll: false,
                      });
                    }}
                    className="accent-[#d546ab] cursor-pointer w-4 h-4"
                  />
                  <Label htmlFor="modifyVehicle" className="text-sm text-gray-700 cursor-pointer">
                    Vehicles
                  </Label>
                </div>

                {/* Modify Guide */}
                <div className="flex items-center space-x-2 ml-4">
                  <input
                    type="checkbox"
                    id="modifyGuide"
                    checked={cancellationOptions.modifyGuide}
                    onChange={(e) => {
                      setCancellationOptions({
                        ...cancellationOptions,
                        modifyGuide: e.target.checked,
                        selectAll: false,
                      });
                    }}
                    className="accent-[#d546ab] cursor-pointer w-4 h-4"
                  />
                  <Label htmlFor="modifyGuide" className="text-sm text-gray-700 cursor-pointer">
                    Guides
                  </Label>
                </div>

                {/* Modify Activity */}
                <div className="flex items-center space-x-2 ml-4">
                  <input
                    type="checkbox"
                    id="modifyActivity"
                    checked={cancellationOptions.modifyActivity}
                    onChange={(e) => {
                      setCancellationOptions({
                        ...cancellationOptions,
                        modifyActivity: e.target.checked,
                        selectAll: false,
                      });
                    }}
                    className="accent-[#d546ab] cursor-pointer w-4 h-4"
                  />
                  <Label htmlFor="modifyActivity" className="text-sm text-gray-700 cursor-pointer">
                    Activities
                  </Label>
                </div>
              </div>
            </div>

            {/* Reason for Cancellation */}
            <div>
              <Label htmlFor="cancellationReason" className="text-gray-700">
                Reason for Cancellation *
              </Label>
              <Textarea
                id="cancellationReason"
                placeholder="Enter the reason for cancellation..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="mt-2 min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCancellationDialog(false);
                resetCancellationState();
              }}
              disabled={isCancelling}
            >
              Keep It
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancellation}
              disabled={isCancelling || !cancellationReason.trim()}
            >
              {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showGuideCancellationDialog}
        onOpenChange={(open) => {
          setShowGuideCancellationDialog(open);
          if (!open && !isCancellingGuideSlot) {
            resetGuideCancellationState();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Guide Slot</DialogTitle>
            <DialogDescription>
              Review the guide slot amount and confirm the cancellation deduction.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-[#eadcf7] bg-[#fcf9ff] p-4">
              <div className="font-semibold text-[#4a4260]">
                {selectedGuideAssignment?.guideName || 'Guide'}
              </div>
              <div className="mt-1 text-sm text-gray-600">
                Slot: <span className="font-medium">{selectedGuideSlot?.guideSlotLabel || 'NA'}</span>
              </div>
              <div className="text-sm text-gray-600">
                Date: <span className="font-medium">{selectedGuideSlot?.itineraryRouteDate || selectedGuideAssignment?.itineraryRouteDate || 'Whole itinerary'}</span>
              </div>
              <div className="text-sm text-gray-600">
                Service Amount: <span className="font-medium">₹{Number(selectedGuideSlot?.guideSlotCost || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-[#4a4260]">Defect Type</Label>
              <select
                value={guideDefectType}
                onChange={(e) => setGuideDefectType(e.target.value as 'dvi' | 'guest')}
                className="mt-2 w-full rounded-lg border border-[#e5d9f2] px-3 py-2"
              >
                <option value="dvi">DVI</option>
                <option value="guest">Guest</option>
              </select>
            </div>

            <div>
              <Label className="text-sm font-medium text-[#4a4260]">Cancellation Percentage</Label>
              <input
                type="number"
                min={0}
                max={100}
                value={guideCancellationPercentage}
                onChange={(e) => setGuideCancellationPercentage(Math.max(0, Math.min(100, Number(e.target.value || 0))))}
                className="mt-2 w-full rounded-lg border border-[#e5d9f2] px-3 py-2"
              />
              <div className="mt-2 text-sm text-gray-600">
                Cancellation Charge: <span className="font-medium">₹{(((Number(selectedGuideSlot?.guideSlotCost || 0) * guideCancellationPercentage) / 100) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="text-sm text-gray-600">
                Refund Amount: <span className="font-medium">₹{Math.max(0, Number(selectedGuideSlot?.guideSlotCost || 0) - ((Number(selectedGuideSlot?.guideSlotCost || 0) * guideCancellationPercentage) / 100)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div>
              <Label htmlFor="guideCancellationReason" className="text-gray-700">
                Reason for Cancellation *
              </Label>
              <Textarea
                id="guideCancellationReason"
                placeholder="Enter the reason for guide slot cancellation..."
                value={guideCancellationReason}
                onChange={(e) => setGuideCancellationReason(e.target.value)}
                className="mt-2 min-h-[90px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => resetGuideCancellationState()}
              disabled={isCancellingGuideSlot}
            >
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={handleGuideSlotCancellation}
              disabled={isCancellingGuideSlot || !guideCancellationReason.trim()}
            >
              {isCancellingGuideSlot ? 'Cancelling...' : 'Confirm Slot Cancellation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmedItineraryCancellationResults
        guideResult={guideCancellationResult}
        itineraryResult={cancellationResult}
        selectedGuideSlotLabel={selectedGuideSlot?.guideSlotLabel}
        onCloseGuide={() => {
          setGuideCancellationResult(null);
          resetGuideCancellationState();
        }}
        onCloseItinerary={() => {
          setCancellationResult(null);
          setShowCancellationDialog(false);
          resetCancellationState();
          fetchItineraryDetails();
        }}
      />

      </div>
    </div>
  );
};

export default ConfirmedItineraryDetails;
