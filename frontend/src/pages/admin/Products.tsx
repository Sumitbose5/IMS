// src/pages/admin/Products.tsx
import { Package, AlertTriangle, XCircle, Grid, List, ChevronLeft, ChevronRight, Eye, Plus, ChartBarStacked, Image as ImageIcon, Search, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import AddProductModal from '../../components/AddProductModal';
import EditProductModal from '../../components/EditProductModal';
import ViewProductModal from '../../components/ViewProductModal';

type Category = { id: string; name: string };
type ProductItem = {
  id: string;
  name: string;
  description?: string;
  categoryId?: string;
  sku?: string | null;
  image?: string | null;
  barcode?: string | null;
  costPrice?: string | number;
  isArchived?: boolean;
  createdAt?: string;
  updatedAt?: string;
  category?: Category | null;
  inventory?: { id: string; productId: string; quantity: number; lowStockThreshold: number; updatedAt?: string } | null;
};

type ProductsPageResponse = {
  totalProducts: number;
  totalCategories: number;
  lowStock: number;
  outOfStock: number;
  categories: Category[];
  products: ProductItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};

const PAGE_SIZE = 12;

const fetchProductsPage = async ({
  page,
  search,
  categoryId,
  stockStatus,
  priceRange,
  sortBy,
}: {
  page: number;
  search: string;
  categoryId: string;
  stockStatus: string;
  priceRange: string;
  sortBy: string;
}) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
    search,
    categoryId,
    stockStatus,
    priceRange,
    sortBy,
  });

  const res = await fetch(`${import.meta.env.VITE_BASE_URL}/product/get-page-data?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load products');
  return res.json() as Promise<ProductsPageResponse>;
};

const pageWindow = (currentPage: number, totalPages: number) => {
  const start = Math.max(1, currentPage - 1);
  const end = Math.min(totalPages, start + 2);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};

export default function Products() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [stockStatus, setStockStatus] = useState('all');
  const [priceRange, setPriceRange] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [imageErrorIds, setImageErrorIds] = useState<Set<string>>(new Set());
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [viewingProductId, setViewingProductId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedCategoryId, stockStatus, priceRange, sortBy]);

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['products-page', page, debouncedSearch, selectedCategoryId, stockStatus, priceRange, sortBy],
    queryFn: () => fetchProductsPage({ page, search: debouncedSearch, categoryId: selectedCategoryId, stockStatus, priceRange, sortBy }),
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (data?.categories) setCategories(data.categories);
  }, [data?.categories]);

  const productsData = data?.products ?? [];
  const metrics = {
    totalProducts: data?.totalProducts ?? 0,
    totalCategories: data?.totalCategories ?? 0,
    lowStock: data?.lowStock ?? 0,
    outOfStock: data?.outOfStock ?? 0,
  };
  const pagination = data?.pagination ?? { page, limit: PAGE_SIZE, totalItems: 0, totalPages: 1, hasNextPage: false, hasPrevPage: false };
  const pages = useMemo(() => pageWindow(pagination.page, pagination.totalPages), [pagination.page, pagination.totalPages]);
  const showingFrom = pagination.totalItems === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const showingTo = Math.min(pagination.page * pagination.limit, pagination.totalItems);

  const handleImageError = (productId: string) => {
    setImageErrorIds(prev => {
      const next = new Set(prev);
      next.add(productId);
      return next;
    });
  };

  const refreshPageData = async () => {
    await queryClient.invalidateQueries({ queryKey: ['products-page'] });
  };

  const handleCategoryAdded = (cat: Category) => {
    setCategories(prev => prev.find(p => p.id === cat.id) ? prev : [...prev, cat]);
  };

  return (
    <div className="bg-[#f8f9fc] text-slate-900 antialiased min-h-screen font-['Inter',sans-serif]">
      <main className="min-h-screen">
        <div className="p-6 md:p-12 max-w-360 mx-auto">
            <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-[28px] md:text-3xl font-black tracking-tight text-slate-800 mb-1">Products Inventory</h2>
              <p className="text-slate-500 font-medium">Manage, search and monitor all inventory items.</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={refreshPageData} disabled={isFetching} className={`flex items-center gap-2 px-4 py-2 bg-white text-[#3125c4] font-semibold rounded-lg border border-slate-200 shadow-sm text-sm ${isFetching ? 'opacity-60 pointer-events-none' : ''}`} title="Refresh products">
                <RefreshCw className="w-4 h-4" />
                {isFetching ? 'Refreshing...' : 'Refresh'}
              </button>

              <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-[#3125c4] text-white font-semibold rounded-lg shadow-lg whitespace-nowrap cursor-pointer">
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
            {[
              { title: 'Total Products', value: metrics.totalProducts, icon: <Package size={22} strokeWidth={2.5} />, bg: 'bg-indigo-50', text: 'text-indigo-500', border: 'border-indigo-100/50' },
              { title: 'Total Categories', value: metrics.totalCategories, icon: <ChartBarStacked size={22} strokeWidth={2.5} />, bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100/50' },
              { title: 'Low Stock', value: metrics.lowStock, icon: <AlertTriangle size={22} strokeWidth={2.5} />, bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100/50' },
              { title: 'Out of Stock', value: metrics.outOfStock, icon: <XCircle size={22} strokeWidth={2.5} />, bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100/50' }
            ].map((m, i) => (
              <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100/50 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">{m.title}</p>
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight">{isLoading ? <span className="bg-slate-100 animate-pulse inline-block w-20 h-6 rounded-lg" /> : m.value}</h3>
                </div>
                <div className={`w-12 h-12 rounded-2xl ${m.bg} border ${m.border} flex items-center justify-center ${m.text} shadow-sm`}>
                  {m.icon}
                </div>
              </div>
            ))}
          </div>

          <div className="mb-8 bg-white border border-slate-100 rounded-3xl shadow-sm p-4 md:p-5">
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(260px,1fr)_auto] gap-4 items-center">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} strokeWidth={2.5} />
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Search products by name, SKU, barcode or category"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl text-sm font-semibold py-3 pl-11 pr-4 placeholder:text-slate-400 focus:ring-4 focus:ring-[#3125c4]/10 focus:border-[#3125c4]/40 outline-none transition"
                />
              </div>

              <div className="flex items-center gap-3 justify-start xl:justify-end">
                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                  <button className="p-1.5 rounded-lg bg-indigo-50 text-[#3125c4]" aria-label="Grid view">
                    <Grid size={18} strokeWidth={2.5} />
                  </button>
                  <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition-colors" aria-label="List view">
                    <List size={18} strokeWidth={2.5} />
                  </button>
                </div>
                <select value={sortBy} onChange={event => setSortBy(event.target.value)} className="bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-[13px] font-bold py-2.5 pl-4 pr-10 focus:ring-2 focus:ring-[#3125c4]/20 outline-none shadow-sm appearance-none cursor-pointer">
                  <option value="newest">Sort: Newest</option>
                  <option value="price-low-high">Price: Low to High</option>
                  <option value="price-high-low">Price: High to Low</option>
                  <option value="stock-high-low">Stock: High to Low</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <select value={selectedCategoryId} onChange={event => setSelectedCategoryId(event.target.value)} className="bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-[13px] font-bold py-2.5 pl-4 pr-10 focus:ring-2 focus:ring-[#3125c4]/20 outline-none shadow-sm appearance-none cursor-pointer">
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
              <select value={stockStatus} onChange={event => setStockStatus(event.target.value)} className="bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-[13px] font-bold py-2.5 pl-4 pr-10 focus:ring-2 focus:ring-[#3125c4]/20 outline-none shadow-sm appearance-none cursor-pointer">
                <option value="all">All Stock Status</option>
                <option value="in-stock">In Stock</option>
                <option value="low-stock">Low Stock</option>
                <option value="out-of-stock">Out of Stock</option>
              </select>
              <select value={priceRange} onChange={event => setPriceRange(event.target.value)} className="bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-[13px] font-bold py-2.5 pl-4 pr-10 focus:ring-2 focus:ring-[#3125c4]/20 outline-none shadow-sm appearance-none cursor-pointer">
                <option value="all">All Prices</option>
                <option value="below-500">Below ₹500</option>
                <option value="500-5000">₹500 - ₹5000</option>
                <option value="above-5000">Above ₹5000</option>
              </select>
              {(search || selectedCategoryId || stockStatus !== 'all' || priceRange !== 'all') && (
                <button onClick={() => { setSearch(''); setSelectedCategoryId(''); setStockStatus('all'); setPriceRange('all'); }} className="px-4 py-2.5 rounded-xl text-[13px] font-black text-[#3125c4] bg-indigo-50 hover:bg-indigo-100 transition-colors">
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {isError && (
            <div className="mb-6 bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-sm font-bold">
              Failed to load products. Please try again.
            </div>
          )}

          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ${isFetching && !isLoading ? 'opacity-70' : ''}`}>
            {isLoading ? (
              Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <div key={i} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100/60 animate-pulse h-80" />
              ))
            ) : productsData.length === 0 ? (
              <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4 bg-white p-8 rounded-3xl text-center text-slate-600 font-semibold">No products found.</div>
            ) : (
              productsData.map((product) => {
                const qty = product.inventory?.quantity ?? 0;
                const status = product.inventory
                  ? qty === 0
                    ? 'Out of Stock'
                    : qty <= (product.inventory.lowStockThreshold ?? 5)
                      ? 'Low Stock'
                      : 'In Stock'
                  : 'Out of Stock';

                const stockColor = status === 'Low Stock' ? 'bg-amber-500' : status === 'Out of Stock' ? 'bg-red-500' : 'bg-emerald-500';

                return (
                  <div key={product.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100/60 group hover:shadow-xl hover:shadow-[#3125c4]/5 transition-all duration-300 flex flex-col">
                    <div className="h-52 overflow-hidden relative bg-slate-50 flex items-center justify-center p-4">
                      <div className="max-h-full object-contain">
                        {product.image && !imageErrorIds.has(product.id) ? (
                          <img src={product.image} alt={product.name} onError={() => handleImageError(product.id)} className="max-h-full object-contain w-40" />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full text-slate-400">
                            <ImageIcon size={56} />
                          </div>
                        )}
                      </div>
                      <div className={`absolute top-4 right-4 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md border shadow-sm ${
                        status === 'In Stock' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        status === 'Low Stock' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        'bg-red-50 text-red-600 border-red-100'
                      }`}>
                        {status}
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{product.category?.name ?? 'Uncategorized'}</p>
                      <h4 className="text-[15px] font-bold text-slate-800 mb-0.5 line-clamp-1">{product.name}</h4>

                      <div className="flex items-end justify-between mb-4">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-0.5">Cost</span>
                          <span className="text-[18px] font-black text-[#3125c4]">₹{Number(product.costPrice || 0).toLocaleString()}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-0.5">Stock level</span>
                          <p className={`text-[13px] font-bold ${status === 'Low Stock' ? 'text-amber-500' : status === 'Out of Stock' ? 'text-red-500' : 'text-slate-800'}`}>
                            {qty} Units
                          </p>
                        </div>
                      </div>

                      <div className="mt-auto">
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-5">
                          <div className={`h-full rounded-full ${stockColor}`} style={{ width: '100%' }} />
                        </div>

                        <div className="flex gap-2">
                          <button onClick={() => setEditingProductId(product.id)} className="flex-1 py-2 rounded-xl bg-slate-50 text-slate-600 font-bold text-[12px] border border-slate-100 hover:bg-slate-100 transition-colors">
                            Edit
                          </button>
                          <button onClick={() => setViewingProductId(product.id)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-50/50 text-[#3125c4] border border-indigo-100 hover:bg-indigo-50 transition-colors" aria-label={`View ${product.name}`}>
                            <Eye size={16} strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <footer className="mt-10 flex flex-col md:flex-row items-center justify-between p-4 md:p-6 bg-white rounded-3xl shadow-sm border border-slate-100/50 gap-4">
            <p className="text-[12px] font-bold text-slate-400">
              Showing {showingFrom} to {showingTo} of {pagination.totalItems} products
            </p>
            <div className="flex items-center gap-2">
              <button disabled={!pagination.hasPrevPage} onClick={() => setPage(prev => Math.max(prev - 1, 1))} className="px-3 py-2 text-[12px] font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-xl transition-colors flex items-center gap-1 disabled:opacity-40 disabled:pointer-events-none">
                <ChevronLeft size={16} strokeWidth={2.5} /> Previous
              </button>
              <div className="flex items-center gap-1">
                {pages.map(pageNumber => (
                  <button key={pageNumber} onClick={() => setPage(pageNumber)} className={`w-8 h-8 rounded-xl font-bold text-[13px] transition-colors ${pageNumber === pagination.page ? 'bg-[#3125c4] text-white shadow-sm shadow-[#3125c4]/30' : 'text-slate-500 hover:bg-slate-50'}`}>
                    {pageNumber}
                  </button>
                ))}
              </div>
              <button disabled={!pagination.hasNextPage} onClick={() => setPage(prev => Math.min(prev + 1, pagination.totalPages))} className="px-3 py-2 text-[12px] font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-xl transition-colors flex items-center gap-1 disabled:opacity-40 disabled:pointer-events-none">
                Next <ChevronRight size={16} strokeWidth={2.5} />
              </button>
            </div>
          </footer>
        </div>
      </main>

      <div className="fixed bottom-8 right-8 z-50 md:hidden">
        <button onClick={() => setShowAdd(true)} className="w-14 h-14 bg-[#3125c4] text-white rounded-full shadow-[0_8px_20px_rgba(49,37,196,0.4)] flex items-center justify-center active:scale-90 transition-transform">
          <Plus size={24} strokeWidth={2.5} />
        </button>
      </div>

  <AddProductModal isOpen={showAdd} onClose={() => setShowAdd(false)} categories={categories} onSuccess={refreshPageData} onCategoryAdded={handleCategoryAdded} />
  <EditProductModal isOpen={!!editingProductId} onClose={() => setEditingProductId(null)} productId={editingProductId} onUpdated={refreshPageData} categories={categories} />
  <ViewProductModal isOpen={!!viewingProductId} onClose={() => setViewingProductId(null)} productId={viewingProductId} />
    </div>
  );
}
