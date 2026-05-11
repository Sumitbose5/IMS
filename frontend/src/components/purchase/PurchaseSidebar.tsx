import { useEffect, useState } from 'react';
import { Clipboard } from 'lucide-react';

type Props = { purchaseId?: string | null };

const PurchaseSidebar: React.FC<Props> = ({ purchaseId }) => {
  const [details, setDetails] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!purchaseId) {
      setDetails(null);
      return;
    }

    const fetchDetails = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_BASE_URL}/utils/purchases/${purchaseId}`);
        if (!res.ok) return;
        const data = await res.json();
        setDetails(data);
      } catch (e) {
        console.error(e);
      }
    };

    fetchDetails();
  }, [purchaseId]);

  if (!purchaseId) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">
        <p className="text-sm text-gray-500">Select a purchase to view details</p>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">Loading...</div>
    );
  }

  const { purchase, supplier, items } = details;

  const truncateId = (id?: string) => (id ? id.slice(0, 4) : '-');

  const handleCopy = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error('Copy failed', e);
    }
  };

  return (
    <aside className="bg-white rounded-xl shadow-lg p-6 sticky top-24 w-full">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-2xl font-extrabold text-slate-900">Purchase Details</p>
          <p className="text-sm text-slate-600 mt-1 font-semibold">{supplier?.name ?? purchase.supplierId}</p>
          <p className="text-xs text-gray-600">{formatDate(purchase.purchaseDate)}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-500 px-2 py-1 bg-slate-50 rounded">{truncateId(purchase.id)}</span>
          <button onClick={() => handleCopy(purchase.id)} className="text-gray-400 hover:text-gray-700 p-2 rounded-md bg-white border border-gray-100 cursor-pointer">
            <Clipboard size={16} />
          </button>
          {copied && <span className="text-xs text-green-600">Copied</span>}
        </div>
      </div>

      <div className="rounded-xl border border-slate-100 overflow-hidden">
        <div className="divide-y">
          {items.map((it: any) => (
            <div key={it.id} className="flex items-center justify-between p-4 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {it.product?.image ? (
                  <img src={it.product.image} alt={it.product?.name} className="h-12 w-12 rounded-md object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded-md bg-slate-100 flex items-center justify-center text-slate-400">#</div>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-800 truncate">{it.product?.name ?? it.productId}</div>
                  <div className="text-xs text-gray-500 truncate">{it.product?.sku ? `SKU: ${it.product.sku}` : ''}</div>
                  <div className="text-xs text-gray-500">{it.quantity} × ₹{Number(it.costPrice)}</div>
                </div>
              </div>
              <div className="text-sm font-semibold text-slate-800">₹{Number(it.totalPrice)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 bg-white">
        <div className="rounded-lg border border-slate-100 p-4">
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
            <div>Subtotal</div>
            <div className="text-right">₹{Number(purchase.subtotal ?? 0)}</div>
            <div>Discount</div>
            <div className="text-right">- ₹{Number(purchase.discount ?? 0)}</div>
            <div>CGST</div>
            <div className="text-right">₹{Number(purchase.cgst ?? 0)}</div>
            <div>SGST</div>
            <div className="text-right">₹{Number(purchase.sgst ?? 0)}</div>
            <div>IGST</div>
            <div className="text-right">₹{Number(purchase.igst ?? 0)}</div>
            <div>Shipping</div>
            <div className="text-right">₹{Number(purchase.shippingCharges ?? 0)}</div>
            <div>Other</div>
            <div className="text-right">₹{Number(purchase.otherCharges ?? 0)}</div>
          </div>

          <div className="mt-3 border-t pt-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500">Total Amount</div>
                <div className="text-xl font-extrabold text-black">₹{Number(purchase.totalAmount)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">Payment</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${purchase.paymentStatus === 'completed' ? 'bg-emerald-100 text-emerald-700' : purchase.paymentStatus === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}>
                    {purchase.paymentStatus?.toString() ?? 'pending'}
                  </span>
                  <span className="text-sm text-gray-700">{(purchase.paymentMethod || '').replace('_', ' ')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default PurchaseSidebar;

function formatDate(d: string | number | Date) {
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '-';
    return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/ /g, ' ');
  } catch {
    return '-';
  }
}