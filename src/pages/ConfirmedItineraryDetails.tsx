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

      {/* Cancellation Success Dialog */}
      {cancellationResult && (
        <Dialog open={!!cancellationResult} onOpenChange={(open) => {
          if (!open) {
            setCancellationResult(null);
            setShowCancellationDialog(false);
            resetCancellationState();
            fetchItineraryDetails();
          }
        }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-green-600 text-lg">✓ Cancellation Successful</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Cancellation Reference */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="text-xs text-green-600 font-semibold">Cancellation Reference</div>
                <div className="text-2xl font-bold text-green-700 mt-1">{cancellationResult.cancellation_reference}</div>
              </div>

              {/* Refund Amount */}
              {cancellationResult.refund_amount > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-xs text-blue-600 font-semibold">Refund Amount</div>
                  <div className="text-2xl font-bold text-blue-700 mt-1">₹{cancellationResult.refund_amount.toLocaleString('en-IN')}</div>
                </div>
              )}

              {/* Cancellation Details Breakdown */}
              {cancellationResult.cancellation_details && (
                <div className="border rounded-lg p-4 space-y-2">
                  <div className="text-sm font-semibold text-gray-700 mb-3">Cancellation Breakdown</div>
                  {cancellationResult.cancellation_details.hotspots_cancelled > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Hotspots Cancelled:</span>
                      <span className="font-semibold text-gray-800">{cancellationResult.cancellation_details.hotspots_cancelled}</span>
                    </div>
                  )}
                  {cancellationResult.cancellation_details.hotels_cancelled > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Hotels Cancelled:</span>
                      <span className="font-semibold text-gray-800">{cancellationResult.cancellation_details.hotels_cancelled}</span>
                    </div>
                  )}
                  {cancellationResult.cancellation_details.vehicles_cancelled > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Vehicles Cancelled:</span>
                      <span className="font-semibold text-gray-800">{cancellationResult.cancellation_details.vehicles_cancelled}</span>
                    </div>
                  )}
                  {cancellationResult.cancellation_details.guides_cancelled > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Guides Cancelled:</span>
                      <span className="font-semibold text-gray-800">{cancellationResult.cancellation_details.guides_cancelled}</span>
                    </div>
                  )}
                  {cancellationResult.cancellation_details.activities_cancelled > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Activities Cancelled:</span>
                      <span className="font-semibold text-gray-800">{cancellationResult.cancellation_details.activities_cancelled}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Cancelled On */}
              <div className="text-xs text-gray-500 text-center pt-2">
                Cancelled on: {new Date(cancellationResult.cancelled_on).toLocaleString('en-IN')}
              </div>
            </div>

            <DialogFooter>
              <Button
                className="bg-[#d546ab] hover:bg-[#c03d9f] text-white w-full"
                onClick={() => {
                  setCancellationResult(null);
                  setShowCancellationDialog(false);
                  resetCancellationState();
                  fetchItineraryDetails();
                }}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      </div>
    </div>
  );
};

export default ConfirmedItineraryDetails;
