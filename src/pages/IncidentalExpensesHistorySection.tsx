import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ItineraryService } from '@/services/itinerary';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type IncidentalExpenseHistoryItem = {
  confirmed_itinerary_incidental_expenses_history_ID: number;
  route_date?: string | null;
  payment_date?: string | null;
  component_type_label?: string | null;
  component_name?: string | null;
  item_name?: string | null;
  amount?: number | string | null;
  incidental_amount?: number | string | null;
  reason?: string | null;
};

type IncidentalExpensesHistorySectionProps = {
  itineraryPlanId: number;
  refreshToken?: number;
};

const formatCurrency = (value: number) =>
  Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatMoney = (value: number) => `\u20B9 ${formatCurrency(value)}`;

const formatDateOnly = (value?: string | null) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const IncidentalExpensesHistorySection: React.FC<IncidentalExpensesHistorySectionProps> = ({
  itineraryPlanId,
  refreshToken,
}) => {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<IncidentalExpenseHistoryItem[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [historyPage, setHistoryPage] = useState(1);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const historyData = await ItineraryService.getIncidentalHistory(itineraryPlanId);
      setHistory(Array.isArray(historyData) ? historyData : []);
    } catch (error) {
      console.error('Error fetching incidental history:', error);
      toast.error('Failed to load incidental expenses history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!itineraryPlanId) return;
    setHistorySearch('');
    setHistoryPageSize(10);
    setHistoryPage(1);
    void fetchHistory();
  }, [itineraryPlanId, refreshToken]);

  const filteredHistory = useMemo(() => {
    const query = historySearch.trim().toLowerCase();
    if (!query) return history;

    return history.filter((item) => {
      const values = [
        item.route_date,
        item.payment_date,
        item.component_type_label,
        item.component_name,
        item.item_name,
        item.reason,
        item.amount,
        item.incidental_amount,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return values.includes(query);
    });
  }, [history, historySearch]);

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / historyPageSize));

  useEffect(() => {
    setHistoryPage((current) => Math.min(Math.max(current, 1), totalPages));
  }, [totalPages]);

  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * historyPageSize;
    return filteredHistory.slice(start, start + historyPageSize);
  }, [filteredHistory, historyPage, historyPageSize]);

  const startEntry = filteredHistory.length === 0 ? 0 : (historyPage - 1) * historyPageSize + 1;
  const endEntry = filteredHistory.length === 0 ? 0 : Math.min(historyPage * historyPageSize, filteredHistory.length);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this incidental expense entry?')) {
      return;
    }

    try {
      await ItineraryService.deleteIncidentalHistory(id);
      toast.success('Record deleted successfully');
      await fetchHistory();
    } catch (error: any) {
      console.error('Error deleting record:', error);
      toast.error(error?.message || 'Failed to delete record');
    }
  };

  return (
    <Card className="border-none shadow-none bg-white">
      <CardContent className="pt-2 px-0">
        <div className="overflow-hidden rounded-[28px] border border-[#eadff3] bg-white">
          <div className="border-b border-[#eadff3] px-5 py-4">
            <h2 className="text-lg font-semibold text-[#433953]">List of Incidental Expenses</h2>
            <p className="mt-1 text-sm text-[#6f677c]">
              Every added expense is logged here against its source component, with current balance context from the backend.
            </p>

            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-[#6f677c]">Show</span>
                <Select
                  value={String(historyPageSize)}
                  onValueChange={(value) => {
                    setHistoryPageSize(Number(value));
                    setHistoryPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-[84px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50, 100].map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-[#6f677c]">entries</span>
              </div>

              <div className="flex items-center gap-3">
                <Label htmlFor="incidental-search" className="text-sm text-[#6f677c]">
                  Search:
                </Label>
                <Input
                  id="incidental-search"
                  value={historySearch}
                  onChange={(e) => {
                    setHistorySearch(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="h-9 w-[220px]"
                  placeholder="Search"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-[#d546ab]" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1120px] text-sm">
                  <thead className="bg-[#faf6ff] text-[#4d4560]">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">S.No</th>
                      <th className="px-4 py-3 text-center font-semibold">Action</th>
                      <th className="px-4 py-3 text-left font-semibold">Route Date</th>
                      <th className="px-4 py-3 text-left font-semibold">Component</th>
                      <th className="px-4 py-3 text-left font-semibold">Name</th>
                      <th className="px-4 py-3 text-right font-semibold">Amount</th>
                      <th className="px-4 py-3 text-left font-semibold">Payment Date</th>
                      <th className="px-4 py-3 text-left font-semibold">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-[#7d748b]">
                          No data available in table
                        </td>
                      </tr>
                    ) : (
                      paginatedHistory.map((item, index) => (
                        <tr
                          key={item.confirmed_itinerary_incidental_expenses_history_ID}
                          className="border-t border-[#f1e8fb] align-top"
                        >
                          <td className="px-4 py-4 text-[#4d4560]">{startEntry + index}</td>
                          <td className="px-4 py-4 text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-[#dc3545] text-[#dc3545] hover:bg-[#dc3545] hover:text-white"
                              onClick={() => void handleDelete(Number(item.confirmed_itinerary_incidental_expenses_history_ID))}
                            >
                              <Trash2 className="mr-1 h-4 w-4" />
                              Delete
                            </Button>
                          </td>
                          <td className="px-4 py-4 text-[#4d4560]">{formatDateOnly(item.route_date)}</td>
                          <td className="px-4 py-4 text-[#4d4560]">{item.component_type_label || '--'}</td>
                          <td className="px-4 py-4 text-[#4d4560]">{item.component_name || item.item_name || '--'}</td>
                          <td className="px-4 py-4 text-right font-medium text-[#4d4560]">
                            {formatMoney(Number(item.incidental_amount ?? item.amount ?? 0))}
                          </td>
                          <td className="px-4 py-4 text-[#4d4560]">{formatDateOnly(item.payment_date)}</td>
                          <td className="px-4 py-4 text-[#4d4560]">{item.reason || '--'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 px-5 py-4 text-sm text-[#7d748b] lg:flex-row lg:items-center lg:justify-between">
                <div>
                  Showing {startEntry} to {endEntry} of {filteredHistory.length} entries
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={historyPage <= 1}
                    onClick={() => setHistoryPage((current) => Math.max(current - 1, 1))}
                  >
                    Previous
                  </Button>
                  <span className="min-w-[44px] rounded-md bg-[#7c3aed] px-3 py-2 text-center font-semibold text-white">
                    {historyPage}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={historyPage >= totalPages}
                    onClick={() => setHistoryPage((current) => Math.min(current + 1, totalPages))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default IncidentalExpensesHistorySection;
