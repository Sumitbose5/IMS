import React, { useState, useEffect } from 'react';
import { Calculator, PackagePlus, Plus, ReceiptText, Save, Trash2, UserPlus, X } from 'lucide-react';
import AddProductInlineModal from './AddProductInlineModal';
import { useAuth } from '../../context/AuthContext';

type Category = { id: string; name: string };
type ProductRow = {
  name?: string;
  description?: string;
  categoryId?: string;
  productId?: string;
  quantity: number;
  costPrice: number;
  lowStockThreshold: number;
  totalPrice: number;
  imageFile?: File | null;
};

type Props = { isOpen: boolean; onClose: () => void; onSaved?: () => void; purchaseId?: string | null };

const initialFinancials = {
  subtotal: 0,
  discount: 0,
  cgst: 0,
  sgst: 0,
  igst: 0,
  shippingCharges: 0,
  otherCharges: 0,
  totalAmount: 0
};

const money = (value: number) => value.toLocaleString('en-IN', { maximumFractionDigits: 2 });

const AddPurchaseModal: React.FC<Props> = ({ isOpen, onClose, onSaved, purchaseId }) => {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [financials, setFinancials] = useState(initialFinancials);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'completed' | 'failed'>('pending');
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'upi' | 'bank_transfer' | 'cash'>('cash');
  const [paidAmount, setPaidAmount] = useState<number | string>(0);
  const [dueAmount, setDueAmount] = useState<number | string>(0);
  const [supplierForm, setSupplierForm] = useState({ name: '', phone: '', address: '' });
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  const [showCreateSupplier, setShowCreateSupplier] = useState(false);
  const [supplierError, setSupplierError] = useState<string | null>(null);
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:3000';

  const mergeFinancials = (changes: Partial<typeof financials>) => {
    setFinancials(prev => {
      const next = { ...prev, ...changes };
      return {
        ...next,
        totalAmount: Number((next.subtotal - next.discount + next.cgst + next.sgst + next.igst + next.shippingCharges + next.otherCharges).toFixed(2))
      };
    });
  };

  useEffect(() => {
    if (isOpen) {
      fetchSuppliers();
      fetchCategories();
      setSupplierId('');
      setShowCreateSupplier(false);
      setProducts([]);
      setFinancials(initialFinancials);
      setSupplierForm({ name: '', phone: '', address: '' });
      setPurchaseDate(new Date().toISOString().slice(0, 10));
      setError(null);
      setSaving(false);
    }
  }, [isOpen]);

  // load existing purchase when editing
  useEffect(() => {
    if (!isOpen || !purchaseId) return;
    (async () => {
      try {
        const res = await fetch(`${BASE_URL}/utils/purchases/${purchaseId}`);
        if (!res.ok) return;
        const data = await res.json();
        const p = data.purchase;
        setSupplierId(p.supplierId || '');
        setPurchaseDate(new Date(p.purchaseDate).toISOString().slice(0, 10));
        setFinancials({
          subtotal: Number(p.subtotal || 0),
          discount: Number(p.discount || 0),
          cgst: Number(p.cgst || 0),
          sgst: Number(p.sgst || 0),
          igst: Number(p.igst || 0),
          shippingCharges: Number(p.shippingCharges || 0),
          otherCharges: Number(p.otherCharges || 0),
          totalAmount: Number(p.totalAmount || 0)
        });
        setPaidAmount(Number(p.paid_amount || 0));
        setDueAmount(Number(p.due_amount || 0));
        // map items
        const items = (data.items || []).map((it: any) => ({
          name: it.product?.name || '',
          description: it.product?.description || '',
          categoryId: it.product?.categoryId || '',
          productId: it.productId || it.product?.id || null,
          quantity: Number(it.quantity || 0),
          costPrice: Number(it.costPrice || it.cost_price || 0),
          lowStockThreshold: it.product?.lowStockThreshold ?? 5,
          totalPrice: Number(it.totalPrice || it.total_price || 0)
        }));
        setProducts(items);
      } catch (e) {
        console.error('Failed to load purchase for edit', e);
      }
    })();
  }, [isOpen, purchaseId]);

  useEffect(() => {
    const subtotal = products.reduce((sum, p) => sum + p.totalPrice, 0);
    mergeFinancials({ subtotal });
  }, [products]);

  useEffect(() => {
    // keep due in sync: due = total - paid (when user edits paid)
    const paid = Number(paidAmount || 0);
    const total = Number(financials.totalAmount || 0);
    const calcDue = Number(Math.max(0, total - paid).toFixed(2));
    setDueAmount(calcDue);
    // auto-set payment status
    if (calcDue > 0) setPaymentStatus('pending');
    else if (paid >= total && total > 0) setPaymentStatus('completed');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paidAmount, financials.totalAmount]);

  const fetchSuppliers = async () => {
    const res = await fetch(`${BASE_URL}/utils/suppliers`);
    if (res.ok) setSuppliers(await res.json());
  };

  const fetchCategories = async () => {
    const res = await fetch(`${BASE_URL}/product/getall-categories`);
    if (res.ok) setCategories(await res.json());
  };

  const createSupplier = async () => {
    // validate inputs
    setSupplierError(null);
    if (!supplierForm.name?.trim()) {
      setSupplierError('Name is required');
      return;
    }
    const phoneClean = String(supplierForm.phone || '').trim();
    if (!/^[0-9]{10}$/.test(phoneClean)) {
      setSupplierError('Phone must be exactly 10 digits');
      return;
    }
    if (!supplierForm.address?.trim()) {
      setSupplierError('Address is required');
      return;
    }

    setCreatingSupplier(true);
    try {
      const res = await fetch(`${BASE_URL}/utils/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supplierForm)
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      // append and select new supplier
      setSuppliers(prev => [...prev, data]);
      setSupplierId(data?.id || '');
      setSupplierForm({ name: '', phone: '', address: '' });
      setShowCreateSupplier(false);
      setSupplierError(null);
    } catch (e) {
      console.error('Create supplier failed', e);
      setSupplierError('Failed to create supplier');
    } finally {
      setCreatingSupplier(false);
    }
  };

  const addProduct = (row: ProductRow) => {
    setProducts(prev => [...prev, row]);
  };

  const removeProduct = (index: number) => setProducts(prev => prev.filter((_, i) => i !== index));

  const savePurchase = async () => {
    if (!supplierId) return setError('Please select or create a supplier');
    if (products.length === 0) return setError('Please add at least one product');
    if (!user?.userId) return setError('Please sign in again before saving a purchase');

    setSaving(true);
    setError(null);
    // validations for paid/due
    const paid = Number(paidAmount || 0);
    const due = Number(dueAmount || 0);
    const total = Number(financials.totalAmount || 0);
    if (paid < 0 || due < 0) {
      setError('Paid and due amounts must be non-negative');
      setSaving(false);
      return;
    }
    if (paid > total) {
      setError('Paid amount cannot exceed total amount');
      setSaving(false);
      return;
    }
    if (due > total) {
      setError('Due amount cannot exceed total amount');
      setSaving(false);
      return;
    }
    if (Number((paid + due).toFixed(2)) > total) {
      setError('Sum of paid and due cannot exceed total amount');
      setSaving(false);
      return;
    }
    const payload: any = {
      supplierId,
      createdBy: user.userId,
      purchaseDate: new Date(purchaseDate).toISOString(),
      paymentStatus,
      paymentMethod,
  paid_amount: Number(paidAmount || 0),
  due_amount: Number(dueAmount || 0),
      subtotal: financials.subtotal,
      discount: financials.discount,
      cgst: financials.cgst,
      sgst: financials.sgst,
      igst: financials.igst,
      shippingCharges: financials.shippingCharges,
      otherCharges: financials.otherCharges,
      totalAmount: financials.totalAmount,
      items: products.map((p, index) => ({
        productId: p.productId || null,
        quantity: p.quantity,
        costPrice: p.costPrice,
        totalPrice: p.totalPrice,
        imageField: p.imageFile ? `items.${index}.image` : null,
        product: p.productId ? undefined : {
          name: p.name,
          description: p.description,
          categoryId: p.categoryId,
          costPrice: p.costPrice,
          initialQuantity: p.quantity,
          lowStockThreshold: p.lowStockThreshold
        }
      }))
    };

    const form = new FormData();
    form.append('payload', JSON.stringify(payload));
    products.forEach((p, index) => {
      if (p.imageFile) form.append(`items.${index}.image`, p.imageFile);
    });

    try {
      const url = purchaseId ? `${BASE_URL}/utils/purchases/${purchaseId}` : `${BASE_URL}/utils/purchases`;
      const method = purchaseId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to save purchase');
      }

      onSaved && onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save purchase');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 py-6 md:py-10">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" onClick={() => !saving && onClose()} />

      <div className="relative bg-white rounded-[14px] shadow-2xl shadow-slate-950/25 w-full max-w-5xl mx-4 overflow-hidden border border-white/80" style={{ maxHeight: '88vh' }}>
        <div className="flex items-start justify-between gap-4 px-6 py-5 bg-slate-50/80 border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 rounded-2xl bg-[#3125c4] text-white flex items-center justify-center shadow-lg shadow-[#3125c4]/20">
              <ReceiptText size={23} strokeWidth={2.4} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">New Purchase</h3>
              <p className="text-sm text-slate-500 font-medium">Record supplier details, purchased items and final charges.</p>
            </div>
          </div>
          <button onClick={() => !saving && onClose()} className="h-10 w-10 flex items-center justify-center rounded-xl text-slate-500 hover:bg-white hover:text-slate-800 transition-colors border border-transparent hover:border-slate-200" aria-label="close">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto bg-[#f8f9fc]" style={{ maxHeight: 'calc(86vh - 148px)' }}>
          <div className="p-5 md:p-6 space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-9 w-9 rounded-xl bg-indigo-50 text-[#3125c4] flex items-center justify-center">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h4 className="font-black text-slate-800">Supplier</h4>
                  <p className="text-xs text-slate-500 font-medium">Choose an existing supplier or create one inline.</p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-2 md:items-center">
                <select className="flex-1 border border-slate-200 rounded-xl px-4 py-3 bg-white text-sm font-semibold text-slate-700 focus:ring-4 focus:ring-[#3125c4]/10 focus:border-[#3125c4]/50 outline-none transition" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                  <option value="">-- select supplier --</option>
                  {suppliers.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.phone ? ` (${s.phone})` : ''}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 bg-white text-sm" />
                  <button onClick={() => { setSupplierForm({ name: '', phone: '', address: '' }); setShowCreateSupplier(true); }} className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-black text-slate-700 hover:bg-white transition-colors">
                    <Plus size={15} />
                    New
                  </button>
                </div>
              </div>
              {showCreateSupplier && (
                <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input placeholder="Supplier name" value={supplierForm.name} onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })} className="border border-slate-200 rounded-xl px-4 py-3 bg-white text-sm font-semibold outline-none focus:ring-4 focus:ring-[#3125c4]/10" />
                    <input placeholder="Phone" value={supplierForm.phone} onChange={e => setSupplierForm({ ...supplierForm, phone: e.target.value })} className="border border-slate-200 rounded-xl px-4 py-3 bg-white text-sm font-semibold outline-none focus:ring-4 focus:ring-[#3125c4]/10" maxLength={10} />
                    <input placeholder="Address" value={supplierForm.address} onChange={e => setSupplierForm({ ...supplierForm, address: e.target.value })} className="border border-slate-200 rounded-xl px-4 py-3 bg-white text-sm font-semibold outline-none focus:ring-4 focus:ring-[#3125c4]/10" />
                  </div>
                  {supplierError && <p className="text-sm text-red-600 mt-2">{supplierError}</p>}
                  <div className="flex justify-end mt-3 items-center gap-3">
                    <button onClick={() => { setShowCreateSupplier(false); setSupplierForm({ name: '', phone: '', address: '' }); setSupplierError(null); }} className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-black">Cancel</button>
                    <button onClick={createSupplier} className="px-4 py-2.5 rounded-xl bg-[#3125c4] text-white font-black shadow-lg shadow-[#3125c4]/15 disabled:opacity-60" disabled={creatingSupplier}>{creatingSupplier ? 'Saving...' : 'Create Supplier'}</button>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <PackagePlus size={18} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800">Products</h4>
                    <p className="text-xs text-slate-500 font-medium">{products.length} item{products.length === 1 ? '' : 's'} added to this purchase.</p>
                  </div>
                </div>
                <button onClick={() => setShowProductModal(true)} className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#3125c4] text-white text-sm font-black shadow-lg shadow-[#3125c4]/20">
                  <Plus size={16} />
                  Add Product
                </button>
              </div>

              <div className="mt-4">
                {products.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center">
                    <div className="mx-auto h-12 w-12 rounded-2xl bg-white text-slate-400 flex items-center justify-center border border-slate-200 mb-3">
                      <PackagePlus size={22} />
                    </div>
                    <p className="font-black text-slate-700">No products added yet</p>
                    <p className="text-sm text-slate-500 mt-1">Add products to calculate purchase totals automatically.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    {products.map((p, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border-b border-slate-100 last:border-b-0">
                        <div className="min-w-0">
                          <div className="font-black text-slate-800 truncate">{p.name}</div>
                          <div className="text-xs font-semibold text-slate-500 mt-1">{p.quantity} units @ ₹{p.costPrice} · Low stock at {p.lowStockThreshold}</div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3">
                          <div className="font-black text-slate-900">₹{money(p.totalPrice)}</div>
                          <button onClick={() => removeProduct(idx)} className="h-9 w-9 rounded-xl border border-red-100 bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-colors" aria-label="Delete product">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Calculator size={18} />
                </div>
                <div>
                  <h4 className="font-black text-slate-800">Financials</h4>
                  <p className="text-xs text-slate-500 font-medium">Taxes and charges are reflected in the total amount.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wide">Subtotal</label>
                  <input placeholder="Subtotal" value={financials.subtotal} readOnly className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 text-slate-500 font-bold" />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wide">Discount</label>
                  <input placeholder="Discount" value={financials.discount} onChange={e => mergeFinancials({ discount: Number(e.target.value) })} className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-3 bg-white font-semibold outline-none focus:ring-4 focus:ring-[#3125c4]/10 focus:border-[#3125c4]/50" />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wide">CGST</label>
                  <input placeholder="CGST" value={financials.cgst} onChange={e => mergeFinancials({ cgst: Number(e.target.value) })} className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-3 bg-white font-semibold outline-none focus:ring-4 focus:ring-[#3125c4]/10 focus:border-[#3125c4]/50" />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wide">SGST</label>
                  <input placeholder="SGST" value={financials.sgst} onChange={e => mergeFinancials({ sgst: Number(e.target.value) })} className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-3 bg-white font-semibold outline-none focus:ring-4 focus:ring-[#3125c4]/10 focus:border-[#3125c4]/50" />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wide">IGST</label>
                  <input placeholder="IGST" value={financials.igst} onChange={e => mergeFinancials({ igst: Number(e.target.value) })} className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-3 bg-white font-semibold outline-none focus:ring-4 focus:ring-[#3125c4]/10 focus:border-[#3125c4]/50" />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wide">Shipping</label>
                  <input placeholder="Shipping" value={financials.shippingCharges} onChange={e => mergeFinancials({ shippingCharges: Number(e.target.value) })} className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-3 bg-white font-semibold outline-none focus:ring-4 focus:ring-[#3125c4]/10 focus:border-[#3125c4]/50" />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wide">Other</label>
                  <input placeholder="Other" value={financials.otherCharges} onChange={e => mergeFinancials({ otherCharges: Number(e.target.value) })} className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-3 bg-white font-semibold outline-none focus:ring-4 focus:ring-[#3125c4]/10 focus:border-[#3125c4]/50" />
                </div>
                <div className="rounded-2xl bg-[#3125c4] text-white p-4 flex flex-col justify-center shadow-lg shadow-[#3125c4]/20">
                  <span className="text-[11px] font-black uppercase tracking-wide text-white/70">Total Amount</span>
                  <span className="text-2xl font-black mt-1">₹{money(financials.totalAmount)}</span>
                </div>
              </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wide">Payment Status</label>
                  <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value as any)} className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-3 bg-white font-semibold outline-none">
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wide">Payment Method</label>
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)} className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-3 bg-white font-semibold outline-none">
                    <option value="credit_card">Credit Card</option>
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wide">Paid Amount</label>
                  <input type="number" min={0} step="0.01" value={paidAmount} onChange={e => {
                    const val = e.target.value === '' ? '' : Number(e.target.value);
                    if (val === '' || (typeof val === 'number' && !isNaN(val))) {
                      // prevent paid > total
                      const total = Number(financials.totalAmount || 0);
                      if (val !== '' && Number(val) > total) return;
                      setPaidAmount(val);
                    }
                  }} placeholder="0.00" className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-3 bg-white font-semibold outline-none" />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wide">Due Amount</label>
                  <input type="number" min={0} step="0.01" value={dueAmount} onChange={e => {
                    const val = e.target.value === '' ? '' : Number(e.target.value);
                    if (val === '' || (typeof val === 'number' && !isNaN(val))) {
                      const total = Number(financials.totalAmount || 0);
                      if (val !== '' && Number(val) > total) return;
                      // if user sets due manually, adjust paid to keep total balance
                      if (val !== '') {
                        const paid = Number(Math.max(0, total - Number(val)).toFixed(2));
                        setPaidAmount(paid);
                      } else setPaidAmount('');
                      setDueAmount(val);
                    }
                  }} placeholder="0.00" className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-3 bg-white font-semibold outline-none" />
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 px-6 py-4 bg-white border-t border-slate-100">
          {error && <p className="text-sm font-semibold text-red-600 mr-auto">{error}</p>}
          <button onClick={onClose} disabled={saving} className="px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-600 font-black hover:bg-slate-50 transition-colors disabled:opacity-60">Cancel</button>
          <button onClick={savePurchase} disabled={saving} className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#3125c4] text-white font-black shadow-lg shadow-[#3125c4]/20 disabled:opacity-60">
            <Save size={17} />
            {saving ? 'Saving...' : 'Save Purchase'}
          </button>
        </div>

        <AddProductInlineModal
            key={String(showProductModal)}
            isOpen={showProductModal}
            onClose={() => setShowProductModal(false)}
          categories={categories}
          onCategoryAdded={(cat) => setCategories(prev => [...prev, cat])}
          onSave={(row) => { addProduct(row); setShowProductModal(false); }}
        />
      </div>
    </div>
  );
};

export default AddPurchaseModal;
