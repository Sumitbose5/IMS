import React, { useEffect, useState } from 'react';
import { Save, X } from 'lucide-react';

type Category = { id: string; name: string };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  productId: string | null;
  onUpdated?: () => void;
  categories?: Category[];
};

const EditProductModal: React.FC<Props> = ({ isOpen, onClose, productId, onUpdated, categories = [] }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (!productId) return;

    // load product details
    setLoading(true);
    setError(null);
    fetch(`${import.meta.env.VITE_BASE_URL}/product/${productId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load product');
        return res.json();
      })
      .then((data) => {
        setName(data.name || '');
        setDescription(data.description || '');
        setCategoryId(data.category?.id || '');
        setCostPrice(String(data.costPrice ?? ''));
        setQuantity(String(data.inventory?.quantity ?? ''));
        setLowStockThreshold(String(data.inventory?.lowStockThreshold ?? ''));
        setImagePreview(data.image || null);
      })
      .catch((err) => setError(err?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [isOpen, productId]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0];
    if (f) {
      setImageFile(f);
      setImagePreview(URL.createObjectURL(f));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) return;
    setLoading(true);
    setError(null);

    try {
      const form = new FormData();
      form.append('name', name);
      form.append('description', description);
      form.append('categoryId', categoryId || '');
      form.append('costPrice', costPrice);
      form.append('quantity', quantity);
      form.append('lowStockThreshold', lowStockThreshold);
      if (imageFile) form.append('image', imageFile);

      const res = await fetch(`${import.meta.env.VITE_BASE_URL}/product/update/${productId}`, {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to update');
      }

      if (onUpdated) onUpdated();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => !loading && onClose()} />
      <div className="relative bg-white rounded-[28px] shadow-2xl w-full max-w-2xl mx-4 overflow-hidden border border-white/80">
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-100 bg-slate-50/70">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Edit Product</h3>
            <p className="text-sm text-slate-500 font-medium">Update product fields and inventory.</p>
          </div>
          <button aria-label="Close" onClick={() => !loading && onClose()} className="h-10 w-10 flex items-center justify-center rounded-xl text-slate-500 hover:bg-white hover:text-slate-800 transition-colors border border-transparent hover:border-slate-200">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {error && <div className="text-sm text-red-600 mb-3">{error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-xs font-black text-slate-500 uppercase mb-1">Name</label>
                <input id="name" required value={name} onChange={e => setName(e.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>

              <div>
                <label htmlFor="category" className="block text-xs font-black text-slate-500 uppercase mb-1">Category</label>
                <select id="category" value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  <option value="">Uncategorized</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="desc" className="block text-xs font-black text-slate-500 uppercase mb-1">Description</label>
                <textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" rows={3} />
              </div>

              <div>
                <label htmlFor="cost" className="block text-xs font-black text-slate-500 uppercase mb-1">Cost Price</label>
                <input id="cost" required type="number" min="0" step="0.01" value={costPrice} onChange={e => setCostPrice(e.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>

              <div>
                <label htmlFor="quantity" className="block text-xs font-black text-slate-500 uppercase mb-1">Quantity</label>
                <input id="quantity" type="number" min="0" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>

              <div>
                <label htmlFor="low" className="block text-xs font-black text-slate-500 uppercase mb-1">Low Stock Threshold</label>
                <input id="low" type="number" min="0" value={lowStockThreshold} onChange={e => setLowStockThreshold(e.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-black text-slate-500 uppercase mb-1">Image</label>
                <div className="flex gap-3 items-center">
                  <label className="cursor-pointer inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 bg-white hover:bg-slate-50">
                    <input type="file" accept="image/*" onChange={handleFileChange} className="sr-only" />
                    <span className="text-sm text-slate-700">Choose file</span>
                  </label>
                  <div className="h-16 w-24 bg-slate-50 rounded-md border border-slate-100 flex items-center justify-center">
                    {imagePreview ? <img src={imagePreview} alt="preview" className="h-full object-contain" /> : <span className="text-xs text-slate-400">No image</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 p-4 border-t bg-white">
            <button type="button" onClick={() => !loading && onClose()} className="px-4 py-2 rounded-md bg-white border text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-md bg-[#3125c4] text-white inline-flex items-center gap-2 disabled:opacity-60">
              <Save size={14} /> {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProductModal;
