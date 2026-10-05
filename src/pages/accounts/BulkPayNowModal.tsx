import {
  useMemo,
  useState,
} from "react";

import {
  Button,
} from "@/components/ui/button";

import {
  postBulkPayment,
  type AccountsRow,
  type PaymentModeOption,
} from "@/services/accountsManagerApi";


type Props = {
  rows: AccountsRow[];
  paymentModes:
    PaymentModeOption[];

  onClose: () => void;
  onSuccess: () => void;
};


const formatINR = (
  value: number,
) =>
  new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    },
  ).format(
    Number(value || 0),
  );


const supplierName = (
  row: AccountsRow,
) =>
  String(
    row.vendorName ||
      row.hotelName ||
      "-",
  ).trim() || "-";


export function BulkPayNowModal({
  rows,
  paymentModes,
  onClose,
  onSuccess,
}: Props) {
  const [
    modeOfPaymentId,
    setModeOfPaymentId,
  ] = useState<
    number | undefined
  >();

  const [
    utrNumber,
    setUtrNumber,
  ] = useState("");

  const [
    processedBy,
    setProcessedBy,
  ] = useState("");

  const [
    screenshotFile,
    setScreenshotFile,
  ] = useState<File | null>(
    null,
  );

  const [
    screenshotFileName,
    setScreenshotFileName,
  ] = useState("");

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );


  const totalAmount =
    useMemo(
      () =>
        rows.reduce(
          (
            total,
            row,
          ) =>
            total +
            Number(
              row.payable || 0,
            ),
          0,
        ),
      [rows],
    );


  const vendor =
    rows.length > 0
      ? supplierName(
          rows[0],
        )
      : "-";


  const handleSubmit =
    async (
      event:
        React.FormEvent,
    ) => {
      event.preventDefault();

      if (
        rows.length === 0
      ) {
        return;
      }

      setSubmitting(true);
      setError(null);

      try {
        await postBulkPayment(
          {
            payments:
              rows.map(
                (row) => ({
                  componentType:
                    row.componentType as Exclude<
                      AccountsRow["componentType"],
                      "all"
                    >,

                  accountsItineraryDetailsId:
                    Number(
                      row.headerId,
                    ),

                  componentDetailId:
                    Number(
                      row.id,
                    ),

                  routeDate:
                    row.routeDate,

                  amount:
                    Number(
                      row.payable ||
                        0,
                    ),
                }),
              ),

            modeOfPaymentId,

            utrNumber:
              utrNumber.trim() ||
              undefined,

            processedBy:
              processedBy.trim() ||
              undefined,

            paymentScreenshot:
              screenshotFile ||
              undefined,
          },
        );

        onSuccess();
      } catch (
        cause: any
      ) {
        setError(
          cause?.message ||
            "Bulk payment failed.",
        );
      } finally {
        setSubmitting(false);
      }
    };


  return (
    <div
      className="
        fixed inset-0 z-50
        overflow-y-auto
        bg-black/40
        p-4
      "
    >
      <div
        className="
          relative mx-auto my-6
          w-full max-w-3xl
          rounded-2xl
          bg-white
          shadow-2xl
        "
      >
        <button
          type="button"
          onClick={onClose}
          disabled={
            submitting
          }
          className="
            absolute
            right-4 top-3
            z-20
            text-xl
            text-gray-400
            hover:text-gray-600
          "
        >
          ×
        </button>


        <div
          className="
            max-h-[90vh]
            overflow-y-auto
            px-5 py-6
            md:px-8
          "
        >
          <h2
            className="
              text-center
              text-xl
              font-semibold
              text-[#4a4260]
            "
          >
            Add Payment
          </h2>


          <div
            className="
              mt-2
              text-center
              text-xs
              text-[#8a7da5]
            "
          >
            Vendor:{" "}
            <span
              className="
                font-semibold
                text-[#4a4260]
              "
            >
              {vendor}
            </span>

            <span
              className="mx-2"
            >
              |
            </span>

            {rows.length} payment
            task
            {rows.length === 1
              ? ""
              : "s"}{" "}
            selected
          </div>


          {/* ============================================
              SELECTED TASKS CONFIRMATION TABLE
          ============================================ */}
          <div
            className="
              mt-5
              overflow-hidden
              rounded-lg
              border
              border-[#e4ddf3]
            "
          >
            <div
              className="
                max-h-[220px]
                overflow-auto
              "
            >
              <table
                className="
                  w-full
                  min-w-[600px]
                  text-left
                  text-xs
                "
              >
                <thead
                  className="
                    sticky top-0
                    z-10
                    bg-[#f8f6fc]
                    text-[#7a6c96]
                  "
                >
                  <tr>
                    <th
                      className="
                        px-3 py-3
                        font-semibold
                      "
                    >
                      Booking
                    </th>

                    <th
                      className="
                        px-3 py-3
                        font-semibold
                      "
                    >
                      Component
                    </th>

                    <th
                      className="
                        px-3 py-3
                        font-semibold
                      "
                    >
                      Vendor
                    </th>

                    <th
                      className="
                        px-3 py-3
                        font-semibold
                      "
                    >
                      Travel Date
                    </th>

                    <th
                      className="
                        px-3 py-3
                        text-right
                        font-semibold
                      "
                    >
                      Balance
                    </th>
                  </tr>
                </thead>


                <tbody>
                  {rows.map(
                    (
                      row,
                      index,
                    ) => (
                      <tr
                        key={`${row.componentType}-${row.headerId}-${row.id}-${index}`}
                        className="
                          border-t
                          border-[#eee9f6]
                        "
                      >
                        <td
                          className="
                            px-3 py-3
                          "
                        >
                          {
                            row.quoteId
                          }
                        </td>

                        <td
                          className="
                            px-3 py-3
                            capitalize
                          "
                        >
                          {
                            row.componentType
                          }
                        </td>

                        <td
                          className="
                            px-3 py-3
                          "
                        >
                          {supplierName(
                            row,
                          )}
                        </td>

                        <td
                          className="
                            px-3 py-3
                          "
                        >
                          {row.routeDate ||
                            row.startDate ||
                            "-"}
                        </td>

                        <td
                          className="
                            px-3 py-3
                            text-right
                            font-semibold
                          "
                        >
                          {formatINR(
                            Number(
                              row.payable ||
                                0,
                            ),
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>


            <div
              className="
                flex items-center
                justify-between
                border-t
                border-[#e4ddf3]
                bg-[#faf8fd]
                px-4 py-3
              "
            >
              <span
                className="
                  text-xs
                  font-medium
                  text-[#7a6c96]
                "
              >
                Total Payment
              </span>

              <span
                className="
                  font-bold
                  text-[#4a4260]
                "
              >
                {formatINR(
                  totalAmount,
                )}
              </span>
            </div>
          </div>


          <form
            onSubmit={
              handleSubmit
            }
            className="
              mt-5
              space-y-4
            "
          >
            <div
              className="space-y-1"
            >
              <label
                className="
                  block
                  text-sm
                  font-medium
                  text-[#4a4260]
                "
              >
                Processed By
                <span
                  className="
                    text-pink-500
                  "
                >
                  {" "}*
                </span>
              </label>

              <input
                value={
                  processedBy
                }
                onChange={(
                  event,
                ) =>
                  setProcessedBy(
                    event.target
                      .value,
                  )
                }
                placeholder="Processed By"
                className="
                  h-10 w-full
                  rounded-md
                  border
                  border-[#e4ddf3]
                  px-3
                  text-sm
                "
              />
            </div>


            <div
              className="space-y-1"
            >
              <label
                className="
                  block
                  text-sm
                  font-medium
                  text-[#4a4260]
                "
              >
                Payment Amount
              </label>

              <input
                value={
                  totalAmount
                }
                readOnly
                className="
                  h-10 w-full
                  rounded-md
                  border
                  border-[#e4ddf3]
                  bg-[#f8f9fb]
                  px-3
                  text-sm
                  font-semibold
                "
              />

              <p
                className="
                  text-[11px]
                  text-[#8a7da5]
                "
              >
                Bulk payment pays
                the full remaining
                balance of every
                selected task.
              </p>
            </div>


            <div
              className="space-y-1"
            >
              <label
                className="
                  block
                  text-sm
                  font-medium
                  text-[#4a4260]
                "
              >
                Mode of Payment
                <span
                  className="
                    text-pink-500
                  "
                >
                  {" "}*
                </span>
              </label>

              <select
                value={
                  modeOfPaymentId ??
                  ""
                }
                onChange={(
                  event,
                ) =>
                  setModeOfPaymentId(
                    event.target
                      .value
                      ? Number(
                          event
                            .target
                            .value,
                        )
                      : undefined,
                  )
                }
                className="
                  h-10 w-full
                  rounded-md
                  border
                  border-[#e4ddf3]
                  bg-white
                  px-3
                  text-sm
                "
              >
                <option value="">
                  Select Payment
                  Method
                </option>

                {paymentModes.map(
                  (mode) => (
                    <option
                      key={
                        mode.id
                      }
                      value={
                        mode.id
                      }
                    >
                      {
                        mode.label
                      }
                    </option>
                  ),
                )}
              </select>
            </div>


            <div
              className="space-y-1"
            >
              <label
                className="
                  block
                  text-sm
                  font-medium
                  text-[#4a4260]
                "
              >
                UTR / Reference
                Number
                <span
                  className="
                    text-pink-500
                  "
                >
                  {" "}*
                </span>
              </label>

              <input
                value={
                  utrNumber
                }
                onChange={(
                  event,
                ) =>
                  setUtrNumber(
                    event.target
                      .value,
                  )
                }
                placeholder="UTR / Reference Number"
                className="
                  h-10 w-full
                  rounded-md
                  border
                  border-[#e4ddf3]
                  px-3
                  text-sm
                "
              />
            </div>


            <div
              className="space-y-1"
            >
              <label
                className="
                  block
                  text-sm
                  font-medium
                  text-[#4a4260]
                "
              >
                Payment Screenshot
              </label>

              <label
                className="
                  flex h-10
                  cursor-pointer
                  items-center
                  justify-between
                  rounded-md
                  border
                  border-dashed
                  border-[#e4ddf3]
                  bg-[#faf7ff]
                  px-3
                  text-xs
                  text-[#8a7da5]
                "
              >
                <span>
                  {screenshotFileName ||
                    "Choose File"}
                </span>

                <span
                  className="
                    rounded-full
                    bg-white
                    px-3 py-1
                    text-[11px]
                    font-medium
                    text-[#f057b8]
                    shadow-sm
                  "
                >
                  Browse
                </span>

                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(
                    event,
                  ) => {
                    const file =
                      event
                        .target
                        .files?.[0];

                    setScreenshotFile(
                      file ??
                        null,
                    );

                    setScreenshotFileName(
                      file
                        ? file.name
                        : "",
                    );
                  }}
                />
              </label>
            </div>


            {error && (
              <p
                className="
                  whitespace-pre-wrap
                  rounded-md
                  bg-red-50
                  p-3
                  text-xs
                  text-red-600
                "
              >
                {error}
              </p>
            )}


            <div
              className="
                flex items-center
                justify-end
                gap-3
                pt-2
              "
            >
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={
                  submitting
                }
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={
                  submitting ||
                  totalAmount <= 0 ||
                  !modeOfPaymentId ||
                  !processedBy.trim() ||
                  !utrNumber.trim()
                }
                className="
                  bg-[#245bea]
                  hover:bg-[#1749c5]
                "
              >
                {submitting
                  ? "Saving..."
                  : `Pay ${formatINR(
                      totalAmount,
                    )}`}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}