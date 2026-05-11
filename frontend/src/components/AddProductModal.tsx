import React, { useState, useEffect } from 'react';
import { ImagePlus, Layers3, PackagePlus, Save, X } from 'lucide-react';

type Category = { id: string; name: string };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  categories?: Category[];
  onSuccess?: () => void;
  onCategoryAdded?: (cat: Category) => void;
};

const AddProductModal: React.FC<Props> = ({ isOpen, onClose, categories = [], onSuccess, onCategoryAdded }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [localCategories, setLocalCategories] = useState<Category[]>(categories || []);
  const [category, setCategory] = useState<string>(localCategories && localCategories[0] ? localCategories[0].id : '');
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [costPrice, setCostPrice] = useState('');
  const [initialQuantity, setInitialQuantity] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // reset on open
      setName('');
      setDescription('');
  setLocalCategories(categories || []);
  setCategory((categories && categories[0]) ? categories[0].id : '');
      setCostPrice('');
      setInitialQuantity('');
      setLowStockThreshold('');
      setImageFile(null);
      setError(null);
      setLoading(false);
    }
  }, [isOpen, categories]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0];
    if (f) setImageFile(f);
  };

  const createCategory = async () => {
    if (!newCategoryName.trim()) return setCatError('Name is required');
    setCatError(null);
    setCatLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_BASE_URL}/product/add-category`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() })
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to create category');
      }
      const data = await res.json();
      const created: Category = data.category || data;
      // update local categories and select the new one
      setLocalCategories(prev => [...prev, created]);
      setCategory(created.id);
      setNewCategoryName('');
      setAddingCategory(false);
      if (onCategoryAdded) onCategoryAdded(created);
    } catch (err: any) {
      setCatError(err?.message || 'Failed to create');
    } finally {
      setCatLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const form = new FormData();
      form.append('name', name);
      form.append('description', description);
  // send category id to backend
  form.append('categoryId', category);
      form.append('costPrice', costPrice);
      form.append('initialQuantity', initialQuantity);
      form.append('lowStockThreshold', lowStockThreshold);
      if (imageFile) form.append('image', imageFile);

      const res = await fetch(`${import.meta.env.VITE_BASE_URL}/product/add`, {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to add product');
      }

  // success - close modal and notify parent
  setLoading(false);
  onClose();
  if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err?.message || 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => !loading && onClose()} />

      <div className="relative bg-white rounded-[28px] shadow-2xl shadow-slate-950/20 w-full max-w-3xl mx-4 overflow-hidden border border-white/80">
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-2xl bg-[#3125c4] text-white flex items-center justify-center shadow-lg shadow-[#3125c4]/20">
              <PackagePlus size={21} strokeWidth={2.4} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Add Product</h3>
              <p className="text-sm text-slate-500 font-medium">Create an inventory item with stock and reorder details.</p>
            </div>
          </div>
          <button
            onClick={() => !loading && onClose()}
            className="h-10 w-10 flex items-center justify-center rounded-xl text-slate-500 hover:bg-white hover:text-slate-800 transition-colors border border-transparent hover:border-slate-200"
            aria-label="close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="max-h-[72vh] overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-5">
              <div className="space-y-5">
                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-8 w-8 rounded-xl bg-indigo-50 text-[#3125c4] flex items-center justify-center">
                      <Layers3 size={17} />
                    </div>
                    <h4 className="font-black text-slate-800">Product Details</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-[12px] font-black text-slate-500 uppercase tracking-wide mb-1.5">Name</label>
                      <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Wireless keyboard, SSD 512GB..." className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-800 font-semibold placeholder:text-slate-400 focus:ring-4 focus:ring-[#3125c4]/10 focus:border-[#3125c4]/50 outline-none transition" />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[12px] font-black text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
                      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional notes, model details, warranty info..." className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-700 placeholder:text-slate-400 focus:ring-4 focus:ring-[#3125c4]/10 focus:border-[#3125c4]/50 outline-none transition resize-none" rows={3} />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[12px] font-black text-slate-500 uppercase tracking-wide mb-1.5">Category</label>
                      <div className="flex gap-2 items-center">
                        <div className="relative w-full">
                          <button type="button" onClick={() => setCategoryOpen(v => !v)} className="w-full text-left bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-700 font-semibold focus:ring-4 focus:ring-[#3125c4]/10 focus:border-[#3125c4]/50 outline-none transition">
                            {localCategories.find(c => c.id === category)?.name || 'Select category'}
                          </button>

                          {categoryOpen && (
                            <div className="absolute z-40 mt-2 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-40 overflow-y-auto">
                              <div onClick={() => { setCategory(''); setCategoryOpen(false); }} className={`p-2 cursor-pointer hover:bg-slate-50 ${category === '' ? 'bg-slate-100' : ''}`}>Select category</div>
                              {localCategories.map(c => (
                                <div key={c.id} onClick={() => { setCategory(c.id); setCategoryOpen(false); }} className={`p-2 cursor-pointer hover:bg-slate-50 ${category === c.id ? 'bg-slate-100' : ''}`}>
                                  {c.name}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <button type="button" onClick={() => setAddingCategory(v => !v)} className="px-4 py-3 rounded-xl border border-slate-200 text-sm font-black bg-slate-50 text-slate-700 hover:bg-white transition-colors">Add</button>
                      </div>

                      {addingCategory && (
                        <div className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3">
                          <div className="flex gap-2">
                            <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Category name" className="flex-1 bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-slate-700 outline-none focus:ring-4 focus:ring-[#3125c4]/10" />
                            <button type="button" onClick={createCategory} disabled={catLoading} className="px-4 py-2 rounded-xl bg-[#3125c4] text-white font-bold disabled:opacity-60">{catLoading ? 'Saving...' : 'Save'}</button>
                          </div>
                          {catError && <p className="text-xs font-semibold text-red-600 mt-2">{catError}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h4 className="font-black text-slate-800 mb-4">Stock & Pricing</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[12px] font-black text-slate-500 uppercase tracking-wide mb-1.5">Cost Price</label>
                      <input required value={costPrice} onChange={(e) => setCostPrice(e.target.value)} type="number" min="0" step="0.01" placeholder="0.00" className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-800 font-semibold focus:ring-4 focus:ring-[#3125c4]/10 focus:border-[#3125c4]/50 outline-none transition" />
                    </div>

                    <div>
                      <label className="block text-[12px] font-black text-slate-500 uppercase tracking-wide mb-1.5">Initial Qty</label>
                      <input required value={initialQuantity} onChange={(e) => setInitialQuantity(e.target.value)} type="number" min="0" placeholder="0" className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-800 font-semibold focus:ring-4 focus:ring-[#3125c4]/10 focus:border-[#3125c4]/50 outline-none transition" />
                    </div>

                    <div>
                      <label className="block text-[12px] font-black text-slate-500 uppercase tracking-wide mb-1.5">Low Stock</label>
                      <input required value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} type="number" min="0" placeholder="5" className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-800 font-semibold focus:ring-4 focus:ring-[#3125c4]/10 focus:border-[#3125c4]/50 outline-none transition" />
                    </div>
                  </div>
                </section>
              </div>

              <aside className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 h-fit">
                <label className="block text-[12px] font-black text-slate-500 uppercase tracking-wide mb-2">Product Image</label>
                <label className="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white px-4 py-6 text-center hover:border-[#3125c4]/40 hover:bg-indigo-50/30 transition-colors">
                  <input onChange={handleFileChange} type="file" accept="image/*" className="sr-only" />
                  <div className="h-14 w-14 rounded-2xl bg-indigo-50 text-[#3125c4] flex items-center justify-center mb-3">
                    <ImagePlus size={24} strokeWidth={2.4} />
                  </div>
                  <p className="text-sm font-black text-slate-800">{imageFile ? imageFile.name : 'Upload image'}</p>
                  <p className="text-xs text-slate-500 mt-1">PNG, JPG or WEBP</p>
                </label>
              </aside>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 px-6 py-4 bg-white border-t border-slate-100">
            {error && <p className="text-sm text-red-600 mr-auto">{error}</p>}
            <button type="button" onClick={() => !loading && onClose()} className="px-5 py-3 rounded-xl bg-white border border-slate-200 text-slate-600 font-black hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#3125c4] text-white font-black shadow-lg shadow-[#3125c4]/20 disabled:opacity-60">
              <Save size={17} />
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProductModal;
