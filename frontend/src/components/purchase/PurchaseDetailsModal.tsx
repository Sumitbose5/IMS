import React, { useEffect, useState } from 'react';
import {
  Clipboard,
  Check,
  X,
  CalendarDays,
  Truck,
  Phone,
} from 'lucide-react';

type Props = {
  purchaseId?: string | null;
  isOpen: boolean;
  onClose: () => void;
};

const PurchaseDetailsModal: React.FC<Props> = ({
  purchaseId,
  isOpen,
  onClose,
}) => {
  const [details, setDetails] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !purchaseId) {
      setDetails(null);
      return;
    }

    const fetchDetails = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_BASE_URL}/utils/purchases/${purchaseId}`
        );

        if (!res.ok) return;

        const data = await res.json();
        setDetails(data);
      } catch (e) {
        console.error(e);
      }
    };

    fetchDetails();
  }, [isOpen, purchaseId]);

  if (!isOpen) return null;

  const purchase = details?.purchase;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      {/* Modal */}
      <div className="relative w-full max-w-7xl h-[92vh] overflow-hidden rounded-3xl bg-white shadow-[0_20px_80px_rgba(0,0,0,0.25)] border border-white/40">
  {/* Header */}
  <div className="relative overflow-hidden border-b border-slate-200 bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-4">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,white,transparent_35%)]" />

          <div className="relative flex items-start justify-between gap-4">
            <div>
              {/* <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 backdrop-blur">
                <Package size={14} />
                Purchase Overview
              </div> */}

              <h2 className="mt-3 text-2xl font-bold tracking-tight text-white">
                Purchase Details
              </h2>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-300">
                <div className="flex items-center gap-2 rounded-xl bg-white/10 px-2 py-1 backdrop-blur text-sm">
                  <Truck size={15} />
                  <span>
                    {details?.supplier?.name ??
                      purchase?.supplierId ??
                      'Unknown Supplier'}
                  </span>
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-white/10 px-2 py-1 backdrop-blur text-sm">
                  <CalendarDays size={15} />
                  <span>{formatDate(purchase?.purchaseDate)}</span>
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-white/10 px-2 py-1 backdrop-blur text-sm">
                  <Phone size={15} />
                  <span>
                    {details?.supplier?.phone ??
                      'Unknown Phone'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white transition-all duration-200 hover:rotate-90 hover:bg-white/20"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="h-[calc(92vh-110px)] overflow-y-auto bg-linear-to-br from-slate-50 via-white to-slate-100">
          <div className="p-6">
            {!purchaseId && (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800">
                  No Purchase Selected
                </h3>
                <p className="mt-2 text-slate-500">
                  Select a purchase to view complete details.
                </p>
              </div>
            )}

            {purchaseId && !details && (
              <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
                  <p className="text-slate-500 font-medium">Loading purchase details...</p>
                </div>
              </div>
            )}

            {details && (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_420px]">
                {/* LEFT SIDE */}
                <div className="space-y-6">
                  {/* Purchase Info */}
                  <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">
                          Purchase Items
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Products included in this purchase
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 font-mono text-sm font-semibold text-slate-700">
                          #{truncateId(purchase?.id)}
                        </div>

                        <button
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(
                                purchase?.id
                              );

                              setCopied(true);

                              setTimeout(() => {
                                setCopied(false);
                              }, 1500);
                            } catch {}
                          }}
                          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:bg-slate-100"
                        >
                          {copied ? (
                            <>
                              <Check size={16} className="text-emerald-600" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Clipboard size={16} />
                              Copy ID
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="divide-y divide-slate-100">
                      {details.items.map((it: any) => (
                        <div key={it.id} className="group flex items-center justify-between gap-3 p-3 transition-all hover:bg-slate-50">
                          <div className="flex min-w-0 items-center gap-3">
                            {it.product?.image ? (
                              <div className="relative shrink-0">
                                <img src={it.product.image} alt={it.product?.name} className="h-12 w-12 rounded-md border border-slate-200 object-cover shadow-sm" />
                              </div>
                            ) : (
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-slate-100 text-sm font-bold text-slate-400">
                                #
                              </div>
                            )}

                            <div className="min-w-0">
                              <h4 className="truncate text-sm font-semibold text-slate-900">{it.product?.name ?? it.productId}</h4>

                              {it.product?.sku && <p className="mt-1 text-xs text-slate-500">SKU: {it.product.sku}</p>}

                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <div className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">Qty: {it.quantity}</div>
                                <div className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">Cost: ₹{Number(it.costPrice)}</div>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total</p>
                            <p className="mt-1 text-lg font-bold text-slate-900">₹{Number(it.totalPrice)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RIGHT SIDE */}
                <div className="space-y-6">
                  {/* Supplier (moved up and sticky) */}
                  {/* <div className="rounded-3xl border border-slate-200 bg-linear-to-br from-slate-900 to-slate-800 p-4 text-white shadow-xl top-6">
                    <p className="text-xs uppercase tracking-widest text-slate-400">Supplier</p>

                    <h3 className="mt-2 text-lg font-bold">
                      {details?.supplier?.name ?? purchase?.supplierId ?? 'Unknown Supplier'}
                    </h3>

                    {details?.supplier?.phone && <p className="mt-2 text-sm text-slate-300">{details.supplier.phone}</p>}
                    {details?.supplier?.address && <p className="mt-2 text-xs text-slate-400">{details.supplier.address}</p>}
                  </div> */}

                  {/* Summary */}
                  <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-slate-100 px-6 py-4">
                      <h3 className="text-lg font-bold text-slate-900">Payment Summary</h3>
                      <p className="mt-1 text-sm text-slate-500">Complete billing breakdown</p>
                    </div>

                    <div className="px-6 py-4">
                      {/* Top summary cards */}
                      <div className="mb-4 grid grid-cols-3 gap-3">
                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-xs text-slate-500">Total</p>
                          <div className="mt-1 text-lg font-black text-slate-900">{formatCurrency(Number(purchase?.totalAmount ?? 0))}</div>
                        </div>
                        <div className="rounded-lg bg-emerald-50 p-3">
                          <p className="text-xs text-emerald-600">Paid</p>
                          <div className="mt-1 text-lg font-black text-emerald-700">{formatCurrency(Number(purchase?.paid_amount ?? 0))}</div>
                        </div>
                        <div className="rounded-lg bg-red-50 p-3">
                          <p className="text-xs text-red-600">Due</p>
                          <div className="mt-1 text-lg font-black text-red-700">{formatCurrency(Number(purchase?.due_amount ?? 0))}</div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <SummaryRow label="Subtotal" value={Number(purchase?.subtotal ?? 0)} />
                        <SummaryRow label="Discount" value={Number(purchase?.discount ?? 0)} negative />
                        <SummaryRow label="CGST" value={Number(purchase?.cgst ?? 0)} />
                        <SummaryRow label="SGST" value={Number(purchase?.sgst ?? 0)} />
                        <SummaryRow label="IGST" value={Number(purchase?.igst ?? 0)} />
                        <SummaryRow label="Shipping" value={Number(purchase?.shippingCharges ?? 0)} />
                        <SummaryRow label="Other Charges" value={Number(purchase?.otherCharges ?? 0)} />
                      </div>
                    </div>
                  </div>

                  {/* Payment Status */}
                  <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-6 py-4">
                      <h3 className="text-lg font-bold text-slate-900">Payment Information</h3>
                    </div>

                    <div className="px-6 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <StatusBadge status={purchase?.paymentStatus} />
                            <div>
                              <div className="text-sm text-slate-500">Status</div>
                              <div className="font-bold text-slate-900 capitalize">{purchase?.paymentStatus ?? 'pending'}</div>
                            </div>
                          </div>

                          <div className="mt-4 text-sm text-slate-500">
                            <div className="mb-2">Method</div>
                            <div className="font-semibold text-slate-800 capitalize">{(purchase?.paymentMethod || 'N/A').replace('_', ' ')}</div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm text-slate-500">Purchase Date</div>
                          <div className="font-semibold text-slate-800">{formatDate(purchase?.purchaseDate)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseDetailsModal;

/* ---------------------------- Helper Components ---------------------------- */

function SummaryRow({
  label,
  value,
  negative = false,
}: {
  label: string;
  value: number;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-slate-500">{label}</span>

      <span
        className={`text-sm font-bold ${
          negative ? 'text-red-600' : 'text-slate-900'
        }`}
      >
        {negative ? '- ' : ''}₹{Number(value ?? 0)}
      </span>
    </div>
  );
}

function truncateId(id?: string) {
  if (!id) return '-';
  return id.slice(0, 8).toUpperCase();
}

function formatDate(d: string | number | Date) {
  try {
    const dt = new Date(d);

    if (isNaN(dt.getTime())) return '-';

    return dt.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}

function formatCurrency(value: number) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function StatusBadge({ status }: { status?: string | null }) {
  const s = (status || 'pending').toLowerCase();
  const cls = s === 'completed' ? 'bg-emerald-600' : s === 'failed' ? 'bg-red-600' : 'bg-amber-500';
  return <span className={`inline-block w-3 h-3 rounded-full ${cls} ring-1 ring-white/80`} aria-hidden />;
}
