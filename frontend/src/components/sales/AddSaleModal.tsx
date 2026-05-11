import React, { useEffect, useState } from 'react';
import { Calculator, CreditCard, PackageSearch, Plus, ReceiptText, Save, Search, ShoppingCart, Trash2, UserRound, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type Product = any;

type Props = { isOpen: boolean; onClose: () => void; onSaved?: () => void; saleId?: string | null };

const money = (value: number) => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const AddSaleModal: React.FC<Props> = ({ isOpen, onClose, onSaved, saleId }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSale, setLoadingSale] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  // keep numeric inputs as strings so user can clear them (avoid forced 0)
  const [cgst, setCgst] = useState<string>('');
  const [sgst, setSgst] = useState<string>('');
  const [extraCharges, setExtraCharges] = useState<string>('');
  const [discount, setDiscount] = useState<string>('');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash'|'upi'|'credit_card'|'debit_card'>('cash');
  const [paymentStatus, setPaymentStatus] = useState<'pending'|'completed'|'failed'>('pending');
  const [saleDate, setSaleDate] = useState<string>(new Date().toISOString().slice(0,10));
  const userDetails = useAuth();
  const isEditing = Boolean(saleId);

  const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:3000';

  const computeSubtotal = () => cart.reduce((s, c) => s + (Number(c.sellingPrice) * Number(c.quantity || 0)), 0);
  const computeTotal = () => {
    const sub = computeSubtotal();
    const cg = Number(cgst || 0);
    const sg = Number(sgst || 0);
    const ex = Number(extraCharges || 0);
    const disc = Number(discount || 0);
    return Number((sub + cg + sg + ex - disc).toFixed(2));
  };

  const resetForm = () => {
    setQuery('');
    setResults([]);
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setCgst('');
    setSgst('');
    setExtraCharges('');
    setDiscount('');
    setPaidAmount('');
    setPaymentMethod('cash');
    setPaymentStatus('pending');
    setSaleDate(new Date().toISOString().slice(0,10));
  };

  useEffect(() => {
    if (!isOpen) return;

    resetForm();

    if (!saleId) return;

    const fetchSaleForEdit = async () => {
      setLoadingSale(true);
      try {
        const res = await fetch(`${BASE_URL}/sales/${saleId}`);
        if (!res.ok) throw new Error('Failed to load sale');
        const data = await res.json();
        const sale = data.sale || {};
        const saleItems = data.items || [];

        setCustomerName(sale.customerName || '');
        setCustomerPhone(sale.customerPhone || '');
        setCgst(sale.cgst ? String(Number(sale.cgst)) : '');
        setSgst(sale.sgst ? String(Number(sale.sgst)) : '');
        setExtraCharges(sale.extraCharges ? String(Number(sale.extraCharges)) : '');
        setDiscount(sale.discount ? String(Number(sale.discount)) : '');
        setPaidAmount(sale.paid_amount ? String(Number(sale.paid_amount)) : '');
        setPaymentMethod((sale.paymentMethod || 'cash') as any);
        setPaymentStatus((sale.paymentStatus || 'pending') as any);
        setSaleDate(sale.sale_date ? new Date(sale.sale_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
        setCart(saleItems.map((item: any) => ({
          productId: item.productId,
          name: item.product?.name || item.productId,
          quantity: String(item.quantity || 1),
          originalQuantity: Number(item.quantity || 0),
          sellingPrice: Number(item.sellingPrice || 0),
          inventory: item.product?.inventory || { quantity: 0 }
        })));
      } catch (e) {
        console.error(e);
        alert('Failed to load sale for editing');
        onClose();
      } finally {
        setLoadingSale(false);
      }
    };

    fetchSaleForEdit();
  }, [isOpen, saleId]);

  const search = async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/product/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) return;
      const data = await res.json();
      setResults(data.products || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => { if (query.length > 0) search(query); }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const addToCart = (p: Product) => {
    setCart(prev => {
      const existing = prev.find(x => x.productId === p.id);
  if (existing) return prev.map(x => x.productId === p.id ? { ...x, quantity: String(Number(x.quantity || 0) + 1) } : x);
  return [...prev, { productId: p.id, name: p.name, quantity: '1', originalQuantity: 0, sellingPrice: Number(p.costPrice || 0), inventory: p.inventory }];
    });
  };

  const updateQty = (productId: string, qty: string) => {
    setCart(prev => prev.map(x => x.productId === productId ? { ...x, quantity: qty } : x));
  };

  const removeFromCart = (productId: string) => setCart(prev => prev.filter(x => x.productId !== productId));

  const save = async () => {
  if (cart.length === 0) return;
  if (saving) return; // prevent duplicate submits
    // client-side validation: ensure quantities are available
    for (const c of cart) {
      const available = Number(c.inventory?.quantity || 0) + Number(c.originalQuantity || 0);
      if (c.inventory && c.inventory.quantity !== undefined && Number(c.quantity || 0) > available) {
        alert(`Insufficient stock for ${c.name}. Available: ${available}`);
        return;
      }
      if (Number(c.quantity || 0) <= 0) {
        alert(`Quantity must be at least 1 for ${c.name}`);
        return;
      }
    }
    const payload = {
      items: cart.map(c => ({ productId: c.productId, quantity: Number(c.quantity), sellingPrice: c.sellingPrice })),
      userId: userDetails?.user?.userId || userDetails?.user?.id || null,
      customerName: customerName || 'Walk-in',
      customerPhone: customerPhone || null,
      cgst: Number(cgst || 0),
      sgst: Number(sgst || 0),
      extraCharges: Number(extraCharges || 0),
      discount: Number(discount || 0),
      paid_amount: Number(paidAmount || 0),
      due_amount: Number(Math.max(0, computeTotal() - Number(paidAmount || 0))).toFixed(2),
      paymentMethod: paymentMethod,
      paymentStatus: Math.max(0, computeTotal() - Number(paidAmount || 0)) > 0 ? 'pending' : paymentStatus,
      sale_date: saleDate
    };

    console.log("Payload : ", payload);

    setSaving(true);
    try {
      const url = isEditing ? `${BASE_URL}/sales/${saleId}` : `${BASE_URL}/sales/create`;
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || `Failed to ${isEditing ? 'update' : 'create'} sale`);
      }
      onSaved && onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Failed to save sale');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 py-6 md:py-10">
  <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" onClick={() => { if (!saving) onClose(); }} />
      <div className="relative w-full max-w-6xl overflow-hidden rounded-[14px] border border-white/80 bg-white shadow-2xl shadow-slate-950/25" style={{ maxHeight: '88vh' }}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/80 px-6 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3125c4] text-white shadow-lg shadow-[#3125c4]/20">
              <ReceiptText size={23} strokeWidth={2.4} />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-slate-900">{isEditing ? 'Edit Sale' : 'New Sale'}</h3>
              <p className="text-sm font-medium text-slate-500">{isEditing ? 'Update products, quantities and payment details.' : 'Search products, review cart items and capture payment details.'}</p>
            </div>
          </div>
          <button disabled={saving} onClick={() => { if (!saving) onClose(); }} className={`flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-slate-500 transition-colors hover:border-slate-200 hover:bg-white hover:text-slate-800 ${saving ? 'opacity-50 cursor-not-allowed' : ''}`} aria-label="close">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto bg-[#f8f9fc]" style={{ maxHeight: 'calc(88vh - 148px)' }}>
          {loadingSale ? (
            <div className="flex min-h-[420px] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#3125c4]" />
                <p className="mt-3 text-sm font-semibold text-slate-500">Loading sale...</p>
              </div>
            </div>
          ) : (
          <div className="grid grid-cols-1 gap-5 p-5 md:p-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-5">
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-[#3125c4]">
                    <PackageSearch size={18} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800">Product Search</h4>
                    <p className="text-xs font-medium text-slate-500">Add products by name, SKU or barcode.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 focus-within:border-[#3125c4]/50 focus-within:bg-white focus-within:ring-4 focus-within:ring-[#3125c4]/10">
                  <Search className="h-5 w-5 shrink-0 text-slate-400" />
                  <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products by name, SKU or barcode" className="w-full bg-transparent text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none" />
                </div>

                <div className="mt-4 max-h-90 overflow-y-auto rounded-2xl border border-slate-200 bg-white">
                  {loading && <div className="px-4 py-8 text-center text-sm font-semibold text-slate-500">Searching...</div>}
                  {!loading && results.length === 0 && (
                    <div className="px-4 py-10 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
                        <Search size={22} />
                      </div>
                      <p className="font-black text-slate-700">No products found</p>
                      <p className="mt-1 text-sm text-slate-500">Start typing to search available inventory.</p>
                    </div>
                  )}
                  {results.map(p => (
                    <div key={p.id} className="flex flex-col gap-3 border-b border-slate-100 p-4 last:border-b-0 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-black text-slate-800">{p.name}</div>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                          <span>{p.sku || 'No SKU'}</span>
                          <span className="text-slate-300">|</span>
                          <span>{p.category?.name || 'Uncategorized'}</span>
                          <span className="text-slate-300">|</span>
                          <span className={(p.inventory?.quantity ?? 0) > 0 ? 'text-emerald-600' : 'text-red-600'}>{p.inventory?.quantity ?? 0} in stock</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 sm:justify-end">
                        <div className="text-right">
                          <div className="text-[11px] font-black uppercase tracking-wide text-slate-400">Price</div>
                          <div className="font-black text-slate-900">₹{money(Number(p.costPrice))}</div>
                        </div>
                        <button onClick={() => addToCart(p)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3125c4] text-white shadow-lg shadow-[#3125c4]/20 transition hover:bg-[#281fa3]" aria-label={`Add ${p.name} to cart`}>
                          <Plus size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <ShoppingCart size={18} />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800">Cart</h4>
                      <p className="text-xs font-medium text-slate-500">{cart.length} item{cart.length === 1 ? '' : 's'} ready for billing.</p>
                    </div>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">Subtotal ₹{money(computeSubtotal())}</div>
                </div>

                {cart.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400">
                      <ShoppingCart size={22} />
                    </div>
                    <p className="font-black text-slate-700">No items in cart</p>
                    <p className="mt-1 text-sm text-slate-500">Search and add products to start this sale.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    {cart.map(c => {
                      const available = Number(c.inventory?.quantity ?? 0) + Number(c.originalQuantity || 0);
                      const lineTotal = Number(c.sellingPrice) * Number(c.quantity);

                      return (
                        <div key={c.productId} className="grid grid-cols-1 gap-3 border-b border-slate-100 bg-white p-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_120px_110px_44px] md:items-center">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-black text-slate-800">{c.name}</div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">₹{money(c.sellingPrice)} each · {available} available</div>
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-400 md:hidden">Quantity</label>
                            <input type="number" value={c.quantity} min={1} max={available || 9999} onChange={e => updateQty(c.productId, e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none transition focus:border-[#3125c4]/50 focus:ring-4 focus:ring-[#3125c4]/10" />
                          </div>
                          <div className="font-black text-slate-900 md:text-right">₹{money(lineTotal)}</div>
                          <button onClick={() => removeFromCart(c.productId)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 transition-colors hover:bg-red-100" aria-label={`Remove ${c.name}`}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            <div className="space-y-5">
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                    <UserRound size={18} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800">Customer</h4>
                    <p className="text-xs font-medium text-slate-500">Optional details for receipts and follow-up.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Customer Name</label>
                    <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Walk-in customer" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#3125c4]/50 focus:ring-4 focus:ring-[#3125c4]/10" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Phone</label>
                    <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Optional phone number" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#3125c4]/50 focus:ring-4 focus:ring-[#3125c4]/10" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Sale Date</label>
                    <input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#3125c4]/50 focus:ring-4 focus:ring-[#3125c4]/10" />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <CreditCard size={18} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800">Payment</h4>
                    <p className="text-xs font-medium text-slate-500">Method, status and received amount.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Method</label>
                    <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#3125c4]/50 focus:ring-4 focus:ring-[#3125c4]/10">
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="credit_card">Credit Card</option>
                      <option value="debit_card">Debit Card</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Status</label>
                    <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value as any)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#3125c4]/50 focus:ring-4 focus:ring-[#3125c4]/10">
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Paid Amount</label>
                    <input type="number" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} placeholder="0.00" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#3125c4]/50 focus:ring-4 focus:ring-[#3125c4]/10" />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-[#3125c4]">
                    <Calculator size={18} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800">Charges</h4>
                    <p className="text-xs font-medium text-slate-500">Taxes, adjustments and total due.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">CGST</label>
                    <input type="number" value={cgst} onChange={e => setCgst(e.target.value)} placeholder="0" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-[#3125c4]/50 focus:ring-4 focus:ring-[#3125c4]/10" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">SGST</label>
                    <input type="number" value={sgst} onChange={e => setSgst(e.target.value)} placeholder="0" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-[#3125c4]/50 focus:ring-4 focus:ring-[#3125c4]/10" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Other</label>
                    <input type="number" value={extraCharges} onChange={e => setExtraCharges(e.target.value)} placeholder="0" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-[#3125c4]/50 focus:ring-4 focus:ring-[#3125c4]/10" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Discount</label>
                    <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-[#3125c4]/50 focus:ring-4 focus:ring-[#3125c4]/10" />
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between text-sm font-bold text-slate-500">
                    <span>Subtotal</span>
                    <span className="text-slate-800">₹{money(computeSubtotal())}</span>
                  </div>
                  <div className="mt-3 flex items-end justify-between border-t border-slate-200 pt-3">
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-wide text-slate-400">Total</div>
                      <div className="text-2xl font-black text-slate-900">₹{money(computeTotal())}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] font-black uppercase tracking-wide text-slate-400">Due</div>
                      <div className="text-lg font-black text-red-600">₹{money(Math.max(0, computeTotal() - Number(paidAmount)))}</div>
                    </div>
                  </div>
                </div>

                <button onClick={save} disabled={cart.length === 0 || saving} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#3125c4] px-5 py-3 font-black text-white shadow-lg shadow-[#3125c4]/20 transition hover:bg-[#281fa3] disabled:cursor-not-allowed disabled:opacity-60">
                  {saving ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={17} />
                      {isEditing ? 'Update Sale' : 'Save Sale'}
                    </>
                  )}
                </button>
              </section>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddSaleModal;
