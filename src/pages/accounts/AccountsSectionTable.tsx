import { Button } from "@/components/ui/button";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AccountsRow } from "@/services/accountsManagerApi";
import { formatINR, SectionKey, toNumber } from "./accountsManagerUtils";

export function AccountsSectionTable({
  type,
  label,
  rowsForType,
  onOpenPayNow,
}: {
  type: SectionKey;
  label: string;
  rowsForType: AccountsRow[];
  onOpenPayNow: (row: AccountsRow) => void;
}) {

    if (!rowsForType || rowsForType.length === 0) return null;

    // SPECIAL: HOTEL COMPONENT – MATCH PHP HEADERS
    if (type === "hotel") {
      return (
        <>
          <TableHeader>
            <TableRow className="bg-[#fbf2ff]">
              {/* 1–4 */}
              <TableHead className="text-xs text-[#4a4260]">
                QUOTE ID
              </TableHead>
              <TableHead className="text-xs text-[#4a4260]">
                ACTION
              </TableHead>
              <TableHead className="text-xs text-[#4a4260]">
                HOTEL NAME
              </TableHead>
              <TableHead className="text-xs text-[#4a4260] text-right">
                AMOUNT
              </TableHead>

              {/* 5–11 */}
              <TableHead className="text-xs text-[#4a4260] text-right">
                PAYOUT
              </TableHead>
              <TableHead className="text-xs text-[#4a4260] text-right">
                PAYABLE
              </TableHead>
              <TableHead className="text-xs text-[#4a4260] text-right">
                RECEIVABLE FROM AGENT
              </TableHead>
              <TableHead className="text-xs text-[#4a4260] text-right">
                INHAND AMOUNT
              </TableHead>
              <TableHead className="text-xs text-[#4a4260] text-right">
                MARGIN AMOUNT
              </TableHead>
              <TableHead className="text-xs text-[#4a4260] text-right">
                TAX
              </TableHead>
              <TableHead className="text-xs text-[#4a4260]">
                DATE
              </TableHead>

              {/* 12–15 */}
              <TableHead className="text-xs text-[#4a4260]">
                GUEST
              </TableHead>
              <TableHead className="text-xs text-[#4a4260] text-right">
                ROOM COUNT
              </TableHead>
              <TableHead className="text-xs text-[#4a4260]">
                ARRIVAL START DATE
              </TableHead>
              <TableHead className="text-xs text-[#4a4260]">
                DESTINATION END DATE
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rowsForType.map((row, index) => {
              const r = row;

              const receivableFromAgentAmount =
                toNumber(
                  r.receivableFromAgentAmount ?? r.agentReceivable ?? 0,
                );
              const receivableFromAgentName =
                r.receivableFromAgentName ?? r.agent ?? "";
              const inhandAmount = toNumber(r.inhandAmount ?? 0);
              const marginAmount = toNumber(r.marginAmount ?? 0);
              const taxAmount = toNumber(r.taxAmount ?? 0);
              const date =
                r.routeDate || r.transactionDate || r.date || "";
              const guest = r.guestName ?? r.guest ?? "";
              const roomCount = r.roomCount ?? 0;
              const arrivalStart =
                r.arrivalStart ??
                r.arrivalStartDate ??
                r.startDate ??
                "";
              const destinationEnd =
                r.destinationEnd ??
                r.destinationEndDate ??
                r.endDate ??
                "";

              const amount = toNumber(r.amount);
              const payout = toNumber(r.payout);
              const payable = toNumber(r.payable);
              const status: string = r.status ?? "";

              return (
                <TableRow
                  key={`hotel-${index}`}
                  className="hover:bg-[#fff7ff]"
                >
                  {/* 1. QUOTE ID */}
                  <TableCell className="text-sm text-[#7b6b99]">
                    {r.quoteId}
                  </TableCell>

                  {/* 2. ACTION */}
                  <TableCell>
                    <Button
                      className="h-7 bg-[#f6ecff] hover:bg-[#f6ecff] text-[#7c2f9a] px-4 rounded-md text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => handleOpenPayNow(row)}
                      disabled={status !== "due" || payable <= 0}
                    >
                      {status === "paid" ? "Paid" : "Pay Now"}
                    </Button>
                  </TableCell>

                  {/* 3. HOTEL NAME */}
                  <TableCell className="text-sm text-[#4a4260]">
                    {r.hotelName}
                  </TableCell>

                  {/* 4. AMOUNT */}
                  <TableCell className="text-sm text-right text-[#4a4260]">
                    {formatINR(amount)}
                  </TableCell>

                  {/* 5. PAYOUT */}
                  <TableCell className="text-sm text-right text-[#4a4260]">
                    {formatINR(payout)}
                  </TableCell>

                  {/* 6. PAYABLE */}
                  <TableCell className="text-sm text-right text-[#4a4260]">
                    {formatINR(payable)}
                  </TableCell>

                  {/* 7. RECEIVABLE FROM AGENT (amount + name stacked like PHP) */}
                  <TableCell className="text-sm text-right text-[#4a4260]">
                    <div>{formatINR(receivableFromAgentAmount)}</div>
                    <div className="text-xs text-[#7b6b99]">
                      {receivableFromAgentName || "-"}
                    </div>
                  </TableCell>

                  {/* 8. INHAND AMOUNT */}
                  <TableCell className="text-sm text-right text-[#4a4260]">
                    {formatINR(inhandAmount)}
                  </TableCell>

                  {/* 9. MARGIN AMOUNT */}
                  <TableCell className="text-sm text-right text-[#4a4260]">
                    {formatINR(marginAmount)}
                  </TableCell>

                  {/* 10. TAX */}
                  <TableCell className="text-sm text-right text-[#4a4260]">
                    {formatINR(taxAmount)}
                  </TableCell>

                  {/* 11. DATE */}
                  <TableCell className="text-sm text-[#4a4260]">
                    {date || "-"}
                  </TableCell>

                  {/* 12. GUEST */}
                  <TableCell className="text-sm text-[#4a4260]">
                    {guest || "-"}
                  </TableCell>

                  {/* 13. ROOM COUNT */}
                  <TableCell className="text-sm text-right text-[#4a4260]">
                    {roomCount || "-"}
                  </TableCell>

                  {/* 14. ARRIVAL START DATE */}
                  <TableCell className="text-sm text-[#4a4260]">
                    {arrivalStart || "-"}
                  </TableCell>

                  {/* 15. DESTINATION END DATE */}
                  <TableCell className="text-sm text-[#4a4260]">
                    {destinationEnd || "-"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </>
      );
    }

    // GENERIC LAYOUT FOR OTHER COMPONENTS (guide / hotspot / activity / vehicle / flight)
    return (
      <>
        <TableHeader>
          <TableRow className="bg-[#fbf2ff]">
            <TableHead className="text-xs text-[#4a4260]">
              QUOTE ID
            </TableHead>
            <TableHead className="text-xs text-[#4a4260]">
              ACTION
            </TableHead>
            <TableHead className="text-xs text-[#4a4260]">
              COMPONENT
            </TableHead>
            <TableHead className="text-xs text-[#4a4260]">
              {label} NAME
            </TableHead>
            <TableHead className="text-xs text-[#4a4260]">
              AGENT
            </TableHead>
            <TableHead className="text-xs text-[#4a4260]">
              START DATE
            </TableHead>
            <TableHead className="text-xs text-[#4a4260]">
              END DATE
            </TableHead>
            <TableHead className="text-xs text-[#4a4260]">
              ROUTE DATE
            </TableHead>
            <TableHead className="text-xs text-[#4a4260] text-right">
              AMOUNT
            </TableHead>
            <TableHead className="text-xs text-[#4a4260] text-right">
              PAYOUT
            </TableHead>
            <TableHead className="text-xs text-[#4a4260] text-right">
              PAYABLE
            </TableHead>
            <TableHead className="text-xs text-[#4a4260] text-right">
              ID
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {rowsForType.map((row, index) => {
            const r = row;

            const isVehicle = r.componentType === "vehicle";
            const extraId = isVehicle
              ? r.vehicleId ?? r.vendorId ?? r.headerId
              : r.vendorId ?? r.headerId;

            const amount = toNumber(r.amount);
            const payout = toNumber(r.payout);
            const payable = toNumber(r.payable);
            const status: string = r.status ?? "";

            return (
              <TableRow
                key={`${type}-${index}`}
                className="hover:bg-[#fff7ff]"
              >
                <TableCell className="text-sm text-[#7b6b99]">
                  {r.quoteId}
                </TableCell>

                <TableCell>
                  <Button
                    className="h-7 bg-[#f6ecff] hover:bg-[#f6ecff] text-[#7c2f9a] px-4 rounded-md text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => handleOpenPayNow(row)}
                    disabled={status !== "due" || payable <= 0}
                  >
                    {status === "paid" ? "Paid" : "Pay Now"}
                  </Button>
                </TableCell>

                <TableCell className="text-sm text-[#4a4260] capitalize">
                  {r.componentType}
                </TableCell>

                <TableCell className="text-sm text-[#4a4260]">
                  {r.hotelName}
                </TableCell>

                <TableCell className="text-sm text-[#4a4260]">
                  {r.agent || "-"}
                </TableCell>

                <TableCell className="text-sm text-[#4a4260]">
                  {r.startDate || "-"}
                </TableCell>

                <TableCell className="text-sm text-[#4a4260]">
                  {r.endDate || "-"}
                </TableCell>

                <TableCell className="text-sm text-[#4a4260]">
                  {r.routeDate || "-"}
                </TableCell>

                <TableCell className="text-sm text-right text-[#4a4260]">
                  {formatINR(amount)}
                </TableCell>
                <TableCell className="text-sm text-right text-[#4a4260]">
                  {formatINR(payout)}
                </TableCell>
                <TableCell className="text-sm text-right text-[#4a4260]">
                  {formatINR(payable)}
                </TableCell>
                <TableCell className="text-sm text-right text-[#4a4260]">
                  {extraId ?? "-"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </>
    );
}

