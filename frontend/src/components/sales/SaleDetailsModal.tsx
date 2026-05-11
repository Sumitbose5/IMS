import React, { useEffect, useState } from 'react';
import { X, CalendarDays, CreditCard, FileText, Download, Printer, Share2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type Props = { saleId?: string | null; isOpen: boolean; onClose: () => void };

const SaleDetailsModal: React.FC<Props> = ({ saleId, isOpen, onClose }) => {
  const [details, setDetails] = useState<any | null>(null);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    if (reportUrl) {
      URL.revokeObjectURL(reportUrl);
      setReportUrl(null);
    }
    setReportError(null);

    if (!isOpen || !saleId) {
      setDetails(null);
      return;
    }

    const fetchDetails = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_BASE_URL}/sales/${saleId}`);
        if (!res.ok) return;
        const data = await res.json();
        // expecting { sale, items }
        setDetails(data);
      } catch (e) {
        console.error(e);
      }
    };

    fetchDetails();
  }, [isOpen, saleId]);

  useEffect(() => {
    return () => {
      if (reportUrl) {
        URL.revokeObjectURL(reportUrl);
      }
    };
  }, [reportUrl]);

  if (!isOpen) return null;

  const sale = details?.sale;

  const generateReport = async () => {
    if (!saleId || reportLoading) return;

    setReportLoading(true);
    setReportError(null);

    try {
      const res = await fetch(`${import.meta.env.VITE_BASE_URL}/sales/${saleId}/report`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Failed to generate report');
      }

      const blob = await res.blob();

      if (reportUrl) {
        URL.revokeObjectURL(reportUrl);
      }

      setReportUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error(err);
      setReportError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setReportLoading(false);
    }
  };

  const downloadReport = () => {
    if (!reportUrl || !saleId) return;

    const link = document.createElement('a');
    link.href = reportUrl;
    link.download = `sale-${saleId.slice(0, 8)}-report.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const printReport = () => {
    const frame = document.getElementById('sale-report-preview') as HTMLIFrameElement | null;
    frame?.contentWindow?.focus();
    frame?.contentWindow?.print();
  };

  const shareReport = async () => {
    if (!reportUrl || !saleId) return;

    try {
      const response = await fetch(reportUrl);
      const blob = await response.blob();
      const file = new File([blob], `sale-${saleId.slice(0, 8)}-report.pdf`, { type: 'application/pdf' });
      const navigatorWithShare = navigator as Navigator & {
        canShare?: (data: { files?: File[] }) => boolean;
        share?: (data: { title?: string; text?: string; files?: File[] }) => Promise<void>;
      };

      if (navigatorWithShare.share && (!navigatorWithShare.canShare || navigatorWithShare.canShare({ files: [file] }))) {
        await navigatorWithShare.share({
          title: 'Sale Report',
          text: 'Universal Infotech sale report',
          files: [file]
        });
      } else {
        await navigator.clipboard.writeText(reportUrl);
        alert('Preview link copied to clipboard');
      }
    } catch (err) {
      console.error(err);
      alert('Unable to share report from this browser');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-6xl h-[88vh] overflow-hidden rounded-2xl bg-white shadow-lg border border-white/40">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-2xl font-bold">Sale Details</h2>
            <div className="mt-2 text-sm text-slate-500 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <CalendarDays size={14} />
                <span>{formatDate(sale?.sale_date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard size={14} />
                <span className="capitalize">{sale?.paymentMethod || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-slate-200 px-4 py-2 font-mono text-sm font-semibold text-slate-700">#{truncateId(sale?.id)}</div>
            <button
              onClick={generateReport}
              disabled={!saleId || reportLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#3125c4] px-4 py-2 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FileText size={16} />
              {reportLoading ? 'Generating...' : 'Generate Report'}
            </button>
            <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="h-[calc(88vh-88px)] overflow-y-auto p-6">
          {!saleId && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <h3 className="text-lg font-semibold">No Sale Selected</h3>
              <p className="mt-2 text-slate-500">Select a sale to view complete details.</p>
            </div>
          )}

          {saleId && !details && (
            <div className="rounded-xl bg-white p-8 text-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800 mx-auto" />
              <p className="mt-3 text-slate-500">Loading sale details...</p>
            </div>
          )}

          {details && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
              {reportError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 lg:col-span-2">
                  {reportError}
                </div>
              )}
              {reportUrl && (
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
                  <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="font-bold text-slate-900">Report Preview</h3>
                      <p className="text-sm text-slate-500">Review the generated PDF, then download, print or share.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={downloadReport} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                        <Download size={14} /> Download
                      </button>
                      <button onClick={printReport} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                        <Printer size={14} /> Print
                      </button>
                      <button onClick={shareReport} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                        <Share2 size={14} /> Share
                      </button>
                    </div>
                  </div>
                  <iframe
                    id="sale-report-preview"
                    src={reportUrl}
                    title="Sale report preview"
                    className="h-[520px] w-full bg-slate-100"
                  />
                </div>
              )}
              <div className="space-y-6">
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
                    <div>
                      <h3 className="text-lg font-bold">Items</h3>
                      <p className="text-sm text-slate-500">Products sold in this transaction</p>
                    </div>
                    <div className="text-sm text-slate-500">{details.items?.length || 0} items</div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {details.items.map((it: any) => (
                      <div key={it.id} className="flex items-center justify-between gap-3 p-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {it.product?.image ? (
                            <img src={it.product.image} alt={it.product?.name} className="h-12 w-12 rounded-md object-cover border" />
                          ) : (
                            <div className="h-12 w-12 rounded-md bg-slate-100 flex items-center justify-center">#</div>
                          )}

                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-900">{it.product?.name ?? it.productId}</div>
                            {it.product?.sku && <p className="text-xs text-slate-500">SKU: {it.product.sku}</p>}
                            <div className="mt-2 text-xs text-slate-500">Qty: {it.quantity} · ₹{Number(it.sellingPrice)}</div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs text-slate-400">Line Total</div>
                          <div className="font-bold text-slate-900">₹{Number(it.totalPrice ?? (it.sellingPrice * it.quantity)).toLocaleString('en-IN')}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h4 className="font-bold text-slate-900">Customer</h4>
                  <p className="mt-2 text-sm text-slate-700">{sale?.customerName || 'Walk-in'}</p>
                  {sale?.customerPhone && <p className="text-sm text-slate-500">{sale.customerPhone}</p>}
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h4 className="font-bold text-slate-900">Payment Summary</h4>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <SummaryRow label="Items Total" value={details.items?.reduce((s: number, it: any) => s + Number(it.totalPrice || 0), 0)} />
                    {/* <SummaryRow label="Subtotal" value={sale?.subtotal} /> */}
                    <SummaryRow label="CGST" value={sale?.cgst} />
                    <SummaryRow label="SGST" value={sale?.sgst} />
                    <SummaryRow label="Other Charges" value={sale?.extraCharges} />
                    <SummaryRow label="Discount" value={sale?.discount} negative />

                    <div className="border-t border-dashed border-slate-200 pt-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-500">Total Amount</p>
                          <h3 className="mt-1 text-2xl font-black">₹{Number(sale?.totalAmount).toLocaleString('en-IN')}</h3>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-500">Paid</p>
                          <p className="font-semibold">₹{Number(sale?.paid_amount || 0).toLocaleString('en-IN')}</p>
                          <p className="text-sm text-slate-500 mt-2">Due</p>
                          <p className="font-semibold text-red-600">₹{Number(sale?.due_amount || 0).toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h4 className="font-bold text-slate-900">Info</h4>
                  <div className="mt-3 text-sm text-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Payment Method</span>
                      <span className="font-semibold uppercase">{(sale?.paymentMethod || 'N/A').toString().replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Payment Status</span>
                      <span className="font-semibold capitalize">{sale?.paymentStatus || 'pending'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Sale Date</span>
                      <span className="font-semibold">{formatDate(sale?.sale_date)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SaleDetailsModal;

function SummaryRow({ label, value, negative = false }: { label: string; value: number; negative?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`font-semibold ${negative ? 'text-red-600' : 'text-slate-900'}`}>{negative ? '- ' : ''}₹{Number(value ?? 0)}</span>
    </div>
  );
}

function truncateId(id?: string) {
  if (!id) return '-';
  return String(id).slice(0, 8).toUpperCase();
}

function formatDate(d: string | number | Date) {
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '-';
    return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/([A-Za-z]+)/, (m) => m.toLowerCase());
  } catch {
    return '-';
  }
}
