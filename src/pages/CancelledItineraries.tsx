import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ItineraryService } from '@/services/itinerary';
import { toast } from 'sonner';

// Utility function to format dates
function formatDate(dateString: string | null | undefined) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

interface CancelledItinerary {
  cancelled_itinerary_ID: number;
  itinerary_plan_ID: number;
  booking_quote_id: string;
  agent_name: string;
  cancelled_date: string;
  cancelled_reason: string;
  refund_amount: number;
  refund_status: number;
}

export const CancelledItineraries: React.FC = () => {
  const [itineraries, setItineraries] = useState<CancelledItinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [filteredRecords, setFilteredRecords] = useState(0);

 // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchItineraries = async () => {
    setLoading(true);
    try {
      const start = (currentPage - 1) * pageSize;

      const response = await ItineraryService.getCancelledItineraries({
        draw: currentPage,
        start,
        length: pageSize,
      });

      setItineraries(response.data);
      setTotalRecords(response.recordsTotal);
      setFilteredRecords(response.recordsFiltered);
    } catch (error: any) {
 console.error('Failed to fetch cancelled itineraries', error);
      toast.error('Failed to load cancelled itineraries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItineraries();
  }, [currentPage, pageSize]);

  const totalPages = Math.ceil(filteredRecords / pageSize);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#4a4260]">Cancelled Itineraries</h1>
      </div>

      <Card className="border-[#e5d9f2]">
        <CardContent className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-sm text-[#6c6c6c]">Loading...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>S.NO</TableHead>
                      <TableHead>BOOKING/QUOTE ID</TableHead>
                      <TableHead>AGENT NAME</TableHead>
                      <TableHead>CANCELLED DATE</TableHead>
                      <TableHead>REASON</TableHead>
                      <TableHead>REFUND AMOUNT</TableHead>
                      <TableHead>STATUS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itineraries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <p className="text-sm text-[#6c6c6c]">No cancelled itineraries found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      itineraries.map((itinerary, index) => (
                        <TableRow key={itinerary.cancelled_itinerary_ID}>
                          <TableCell>{(currentPage - 1) * pageSize + index + 1}</TableCell>
                          <TableCell className="font-medium text-[#d546ab]">
                            {itinerary.booking_quote_id}
                          </TableCell>
                          <TableCell>{itinerary.agent_name}</TableCell>
                          <TableCell>{formatDate(itinerary.cancelled_date)}</TableCell>
                          <TableCell className="max-w-xs truncate" title={itinerary.cancelled_reason}>
                            {itinerary.cancelled_reason}
                          </TableCell>
                          <TableCell>₹{itinerary.refund_amount.toLocaleString()}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              itinerary.refund_status === 1
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {itinerary.refund_status === 1 ? 'Refunded' : 'Pending'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

 {/* Pagination */}
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-[#6c6c6c]">
                  Showing {(currentPage - 1) * pageSize + 1} to{' '}
                  {Math.min(currentPage * pageSize, filteredRecords)} of {filteredRecords} entries
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => (
                      <Button
                        key={i}
                        size="sm"
                        variant={currentPage === i + 1 ? 'default' : 'outline'}
                        className={currentPage === i + 1 ? 'bg-[#d546ab] hover:bg-[#c03d9f] text-white' : ''}
                        onClick={() => setCurrentPage(i + 1)}
                      >
                        {i + 1}
                      </Button>
                    ))}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
