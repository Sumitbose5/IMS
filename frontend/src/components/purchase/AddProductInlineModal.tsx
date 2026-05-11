import React, { useState, useEffect } from 'react';
import { ImagePlus, PackagePlus, Save, X } from 'lucide-react';

type Category = { id: string; name: string };

type ProductRow = {
  id?: string;
  productId?: string;
  name?: string;
  description?: string;
  categoryId?: string;
  lowStockThreshold: number;
  imageFile?: File | null;
  quantity: number;
  costPrice: number;
  totalPrice: number;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (row: ProductRow) => void;
  categories: Category[];
  onCategoryAdded?: (cat: Category) => void;
  initial?: Partial<ProductRow>;
};

const AddProductInlineModal: React.FC<Props> = ({ isOpen, onClose, onSave, categories, onCategoryAdded, initial }) => {
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId || categories[0]?.id || '');
  // store as string so the input can be cleared by the user, default to '1'
  const [quantity, setQuantity] = useState<string>(initial?.quantity !== undefined ? String(initial.quantity) : '1');
  // store as string so the input can be cleared by the user (''), but default to '0'
  const [costPrice, setCostPrice] = useState<string>(initial?.costPrice !== undefined ? String(initial.costPrice) : '0');
  // store as string so the input can be cleared by the user, default to '5'
  const [lowStockThreshold, setLowStockThreshold] = useState<string>(initial?.lowStockThreshold !== undefined ? String(initial.lowStockThreshold) : '5');
  const [imageFile, setImageFile] = useState<File | null>(initial?.imageFile || null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [catLoading, setCatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useExisting, setUseExisting] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initial?.name || '');
      setDescription(initial?.description || '');
      setCategoryId(initial?.categoryId || '');
  setQuantity(initial?.quantity !== undefined ? String(initial.quantity) : '1');
  setCostPrice(initial?.costPrice !== undefined ? String(initial.costPrice) : '0');
  setLowStockThreshold(initial?.lowStockThreshold !== undefined ? String(initial.lowStockThreshold) : '5');
      setImageFile(initial?.imageFile || null);
      setAddingCategory(false);
      setNewCategoryName('');
      setError(null);
  setUseExisting(false);
  setSearchQuery('');
  setSearchResults([]);
  setSelectedProduct(null);
    }
  }, [isOpen, initial]);

  useEffect(() => {
    if (isOpen && !categoryId && categories[0]?.id) {
      setCategoryId(categories[0].id);
    }
  }, [isOpen, categoryId, categories]);

  if (!isOpen) return null;

  // costPrice, quantity and lowStockThreshold are strings while editing. Convert to numbers for calculations.
  const numericCost = Number(costPrice || 0);
  const numericQuantity = Number(quantity || 0);
  const numericLowStock = Number(lowStockThreshold || 0);
  const totalPrice = numericQuantity * numericCost;

  const createCategory = async () => {
    if (!newCategoryName.trim()) {
      setError('Category name is required');
      return;
    }

    setError(null);
    setCatLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_BASE_URL}/product/add-category`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Failed to create category');
      }

      const data = await res.json();
      const created = data.category || data;
      setCategoryId(created.id);
      setNewCategoryName('');
      setAddingCategory(false);
      onCategoryAdded?.(created);
    } catch (err: any) {
      setError(err?.message || 'Failed to create category');
    } finally {
      setCatLoading(false);
    }
  };

  // search existing products
  useEffect(() => {
    let active = true;
    if (!isOpen || !useExisting) return;
    const fetchProducts = async () => {
      setSearchLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.set('q', searchQuery);
        if (categoryId) params.set('categoryId', categoryId);
        const res = await fetch(`${import.meta.env.VITE_BASE_URL}/product/search?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to search products');
        const data = await res.json();
        if (!active) return;
        setSearchResults(data.products || []);
      } catch (err) {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    };

    // small debounce
    const t = setTimeout(() => { fetchProducts(); }, 250);
    return () => { active = false; clearTimeout(t); };
  }, [searchQuery, categoryId, useExisting, isOpen]);

  const save = () => {
    if (useExisting && selectedProduct) {
      if (numericQuantity < 1) {
        setError('Quantity must be at least 1');
        return;
      }
      const numericCost = Number(costPrice || 0);
      if (Number.isNaN(numericCost) || numericCost < 0) {
        setError('Cost price cannot be negative');
        return;
      }
      onSave({
        productId: selectedProduct.id,
        name: selectedProduct.name,
        categoryId: selectedProduct.category?.id || selectedProduct.categoryId,
        quantity: numericQuantity,
        costPrice: numericCost,
        totalPrice: numericQuantity * numericCost,
        lowStockThreshold: selectedProduct.inventory?.lowStockThreshold ?? 5
      });
      return;
    }
  if (!name.trim()) {
      setError('Product name is required');
      return;
    }
    if (!categoryId) {
      setError('Category is required');
      return;
    }
    if (numericQuantity < 1) {
      setError('Quantity must be at least 1');
      return;
    }

    const numericCost = Number(costPrice || 0);
    if (Number.isNaN(numericCost) || numericCost < 0) {
      setError('Cost price cannot be negative');
      return;
    }
    if (!Number.isInteger(numericCost)) {
      setError('Cost price must be an integer');
      return;
    }

    if (numericLowStock < 0) {
      setError('Low stock threshold cannot be negative');
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim(),
      categoryId,
      quantity: numericQuantity,
      costPrice: numericCost,
      lowStockThreshold: numericLowStock,
      imageFile,
      totalPrice: numericQuantity * numericCost,
    });
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-[14px] shadow-2xl shadow-slate-950/25 w-full max-w-3xl overflow-hidden border border-white/80">
        <div className="flex items-start justify-between gap-4 px-6 py-5 bg-slate-50/80 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-[#3125c4] text-white flex items-center justify-center shadow-lg shadow-[#3125c4]/20">
              <PackagePlus size={21} />
            </div>
            <div>
              <h4 className="font-black text-xl text-slate-900 tracking-tight">Add Product</h4>
              <p className="text-sm text-slate-500 font-medium">Add a new product to this purchase order.</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="close" className="h-10 w-10 flex items-center justify-center rounded-xl text-slate-500 hover:bg-white hover:text-slate-800 transition-colors border border-transparent hover:border-slate-200"><X size={18} /></button>
        </div>

        <div className="max-h-[72vh] overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-5">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setUseExisting(false)} className={`px-3 py-2 rounded-lg ${!useExisting ? 'bg-[#3125c4] text-white' : 'bg-slate-50 text-slate-700'} font-semibold`}>Create new</button>
                <button type="button" onClick={() => setUseExisting(true)} className={`px-3 py-2 rounded-lg ${useExisting ? 'bg-[#3125c4] text-white' : 'bg-slate-50 text-slate-700'} font-semibold`}>Use existing</button>
              </div>

              {useExisting ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[12px] font-black text-slate-500 uppercase tracking-wide mb-1.5">Search product</label>
                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by name, SKU or barcode" className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-800 font-semibold" />
                  </div>

                  <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-lg p-2">
                    {searchLoading && <p className="text-sm text-slate-500">Searching...</p>}
                    {!searchLoading && searchResults.length === 0 && <p className="text-sm text-slate-500">No results</p>}
                    {!searchLoading && searchResults.map((p) => (
                      <div key={p.id} onClick={() => { setSelectedProduct(p); setName(p.name || ''); setCategoryId(p.category?.id || p.categoryId || ''); setCostPrice(String(p.costPrice ?? 0)); }} className={`p-2 rounded-lg cursor-pointer hover:bg-slate-50 ${selectedProduct?.id === p.id ? 'bg-slate-100 border border-slate-200' : ''}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold">{p.name}</div>
                            <div className="text-xs text-slate-500">SKU: {p.sku || '-'} • Qty: {p.inventory?.quantity ?? '-'}</div>
                          </div>
                          <div className="text-sm font-black">₹{(p.costPrice ?? 0).toLocaleString('en-IN')}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedProduct && (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <div className="font-black">Selected: {selectedProduct.name}</div>
                      <div className="text-sm text-slate-600">Current stock: {selectedProduct.inventory?.quantity ?? 0}</div>
                    </div>
                  )}
                </div>
              ) : null}
              {!useExisting && (
                <>
                  <div>
                    <label className="block text-[12px] font-black text-slate-500 uppercase tracking-wide mb-1.5">Name</label>
                    <input className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-800 font-semibold placeholder:text-slate-400 focus:ring-4 focus:ring-[#3125c4]/10 focus:border-[#3125c4]/50 outline-none transition" placeholder="Product name" value={name} onChange={e => setName(e.target.value)} />
                  </div>

                  <div>
                    <label className="block text-[12px] font-black text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Optional product details" className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-700 placeholder:text-slate-400 focus:ring-4 focus:ring-[#3125c4]/10 focus:border-[#3125c4]/50 outline-none transition resize-none" />
                  </div>
                </>
              )}

              <div>
                <label className="block text-[12px] font-black text-slate-500 uppercase tracking-wide mb-1.5">Category</label>
                <div className="flex gap-2 items-center">
                              {/* custom dropdown to allow fixed height + scrollable options */}
                              <div className="relative w-full">
                                <button type="button" onClick={() => setCategoryOpen(v => !v)} className="w-full text-left bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-700 font-semibold focus:ring-4 focus:ring-[#3125c4]/10 focus:border-[#3125c4]/50 outline-none transition">
                                  {categories.find(c => c.id === categoryId)?.name || 'Select category'}
                                </button>

                                {categoryOpen && (
                                  <div className="absolute z-40 mt-2 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-40 overflow-y-auto">
                                    <div onClick={() => { setCategoryId(''); setCategoryOpen(false); }} className={`p-2 cursor-pointer hover:bg-slate-50 ${categoryId === '' ? 'bg-slate-100' : ''}`}>Select category</div>
                                    {categories.map(c => (
                                      <div key={c.id} onClick={() => { setCategoryId(c.id); setCategoryOpen(false); }} className={`p-2 cursor-pointer hover:bg-slate-50 ${categoryId === c.id ? 'bg-slate-100' : ''}`}>
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
                      <input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Category name" className="flex-1 bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-slate-700 outline-none focus:ring-4 focus:ring-[#3125c4]/10" />
                      <button type="button" onClick={createCategory} disabled={catLoading} className="px-4 py-2 rounded-xl bg-[#3125c4] text-white font-bold disabled:opacity-60">{catLoading ? 'Saving...' : 'Save'}</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12px] font-black text-slate-500 uppercase tracking-wide mb-1.5">Cost Price</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={costPrice}
                    onChange={e => {
                      const v = e.target.value;
                      // allow clearing the field
                      if (v === '') {
                        setCostPrice('');
                        return;
                      }
                      // remove any non-digit characters to enforce integer input
                      const cleaned = v.replace(/[^0-9]/g, '');
                      setCostPrice(cleaned);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-800 font-semibold focus:ring-4 focus:ring-[#3125c4]/10 focus:border-[#3125c4]/50 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-black text-slate-500 uppercase tracking-wide mb-1.5">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={e => {
                      const v = e.target.value;
                      if (v === '') {
                        setQuantity('');
                        return;
                      }
                      const cleaned = v.replace(/[^0-9]/g, '');
                      setQuantity(cleaned);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-800 font-semibold focus:ring-4 focus:ring-[#3125c4]/10 focus:border-[#3125c4]/50 outline-none transition"
                  />
                </div>

                {!useExisting && (
                  <div>
                    <label className="block text-[12px] font-black text-slate-500 uppercase tracking-wide mb-1.5">Low Stock</label>
                    <input
                      type="number"
                      min={0}
                      value={lowStockThreshold}
                      onChange={e => {
                        const v = e.target.value;
                        if (v === '') {
                          setLowStockThreshold('');
                          return;
                        }
                        const cleaned = v.replace(/[^0-9]/g, '');
                        setLowStockThreshold(cleaned);
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-800 font-semibold focus:ring-4 focus:ring-[#3125c4]/10 focus:border-[#3125c4]/50 outline-none transition"
                    />
                  </div>
                )}
              </div>
            </div>

            <aside className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 h-fit">
            {!useExisting && (
              <>
                <label className="block text-[12px] font-black text-slate-500 uppercase tracking-wide mb-2">Image</label>
                <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white px-4 py-5 text-center hover:border-[#3125c4]/40 hover:bg-indigo-50/30 transition-colors">
                  <input onChange={e => setImageFile(e.target.files?.[0] || null)} type="file" accept="image/*" className="sr-only" />
                  <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-[#3125c4] flex items-center justify-center mb-3">
                      <ImagePlus size={22} />
                </div>
                <p className="text-sm font-black text-slate-800">{imageFile ? imageFile.name : 'Upload image'}</p>
                <p className="text-xs text-slate-500 mt-1">PNG, JPG or WEBP</p>
              </label>
                </>)}
              <div className="mt-4 rounded-2xl bg-[#3125c4] p-4 text-white">
                <p className="text-[11px] font-black uppercase tracking-wide text-white/70">Line Total</p>
                <p className="text-2xl font-black mt-1">₹{totalPrice.toLocaleString('en-IN')}</p>
              </div>
            </aside>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 px-6 py-4 bg-white border-t border-slate-100">
          {error && <p className="text-sm font-semibold text-red-600 mr-auto">{error}</p>}
          <button onClick={onClose} className="px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-600 font-black hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={save} className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#3125c4] text-white font-black shadow-lg shadow-[#3125c4]/20">
            <Save size={17} />
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddProductInlineModal;
