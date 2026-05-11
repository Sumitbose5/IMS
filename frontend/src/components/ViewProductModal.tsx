import React, { useEffect, useState } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  productId: string | null;
};

const ViewProductModal: React.FC<Props> = ({ isOpen, onClose, productId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<any>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (!productId) return;

    setLoading(true);
    setError(null);
    fetch(`${import.meta.env.VITE_BASE_URL}/product/${productId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load product');
        return res.json();
      })
      .then((data) => setProduct(data))
      .catch((err) => setError(err?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [isOpen, productId]);

  if (!isOpen) return null;

  const formatCurrency = (v: number) => `₹${v.toLocaleString()}`;

  const lowStock = product && product.inventory ? (product.inventory.quantity ?? 0) <= (product.inventory.lowStockThreshold ?? 0) : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => !loading && onClose()} />
      <div className="relative bg-white rounded-[28px] shadow-2xl w-full max-w-2xl mx-4 overflow-hidden border border-white/80">
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-100 bg-slate-50/70">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Product Details</h3>
            <p className="text-sm text-slate-500 font-medium">View product and inventory information.</p>
          </div>
          <button aria-label="Close" onClick={() => !loading && onClose()} className="h-10 w-10 flex items-center justify-center rounded-xl text-slate-500 hover:bg-white hover:text-slate-800 transition-colors border border-transparent hover:border-slate-200">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-28 w-28 bg-slate-100 rounded-lg animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-slate-100 rounded w-1/2 animate-pulse" />
                  <div className="h-4 bg-slate-100 rounded w-3/4 animate-pulse" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="h-12 bg-slate-100 rounded animate-pulse" />
                <div className="h-12 bg-slate-100 rounded animate-pulse" />
                <div className="h-12 bg-slate-100 rounded animate-pulse" />
                <div className="h-12 bg-slate-100 rounded animate-pulse" />
              </div>
            </div>
          ) : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : product ? (
            <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-6 items-start">
              <div className="flex items-center justify-center bg-slate-50 rounded-2xl p-4 border border-slate-100">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="max-h-40 object-contain rounded" />
                ) : (
                  <div className="text-slate-400"><ImageIcon size={48} /></div>
                )}
              </div>

              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-lg font-black mb-1">{product.name}</h4>
                    <p className="text-sm text-slate-600 mb-3">{product.description}</p>
                  </div>
                  {/* <div className="text-right">
                    <div className="text-xs text-slate-400 uppercase font-black">Cost Price</div>
                    <div className="font-bold text-lg">{formatCurrency(Number(product.costPrice || 0))}</div>
                  </div> */}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm text-slate-700 mt-4">
                  <div>
                    <div className="text-xs text-slate-400 uppercase font-black">Category</div>
                    <div className="font-bold">{product.category?.name || 'Uncategorized'}</div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400 uppercase font-black">Cost Price</div>
                    <div className="font-bold text-xl">{formatCurrency(Number(product.costPrice || 0))}</div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400 uppercase font-black">Stock</div>
                    <div className="flex items-center gap-2">
                      <div className={`font-bold ${lowStock ? 'text-rose-600' : 'text-slate-800'}`}>{product.inventory?.quantity ?? 0} units</div>
                      {lowStock && <div className="text-xs bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full">Low</div>}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400 uppercase font-black">Low Stock Threshold</div>
                    <div className="font-bold">{product.inventory?.lowStockThreshold ?? '-'}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>No data</div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t bg-white">
          <button onClick={() => !loading && onClose()} className="px-4 py-2 rounded-md bg-white border text-slate-600 hover:bg-slate-50 cursor-pointer">Close</button>
        </div>
      </div>
    </div>
  );
};

export default ViewProductModal;
