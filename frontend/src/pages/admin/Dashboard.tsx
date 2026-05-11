import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import QrScanner from 'qr-scanner';
import {
  AlertCircle,
  AlertTriangle,
  Box,
  Camera,
  Download,
  Plus,
  Receipt,
  RefreshCcw,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Wallet,
  X
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { useQuery } from '@tanstack/react-query';

type DashboardStats = {
  totalItems: number;
  totalProducts: number;
  totalCategories: number;
  stockValue: number;
  todaySales: number;
  todayOrders: number;
  todayChangePercent: number;
  lowStockCount: number;
};

type PerformancePoint = {
  label: string;
  revenue: number;
  orders: number;
};

type TopProduct = {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
};

type RecentSale = {
  id: string;
  invoice: string;
  customerName: string;
  productSummary: string;
  itemCount: number;
  amount: number;
  date: string;
};

type LowStockProduct = {
  id: string;
  name: string;
  sku: string | null;
  quantity: number;
  threshold: number;
  categoryName: string | null;
};

type RecentPurchase = {
  id: string;
  purchaseNo: string;
  supplierName: string;
  itemSummary: string;
  amount: number;
  date: string;
};

type DashboardData = {
  generatedAt: string;
  stats: DashboardStats;
  salesPerformance: {
    monthly: PerformancePoint[];
    yearly: PerformancePoint[];
  };
  topProducts: TopProduct[];
  recentSales: RecentSale[];
  lowStockProducts: LowStockProduct[];
  recentPurchases: RecentPurchase[];
};

type VerifiedSaleReport = {
  verified: boolean;
  verifiedBy: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  business: {
    name: string;
    phone: string;
    email: string;
  };
  sale: {
    id: string;
    customerName: string;
    customerPhone?: string | null;
    totalAmount: string | number;
    paid_amount: string | number;
    due_amount: string | number;
    paymentMethod?: string | null;
    paymentStatus?: string | null;
    sale_date: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    sellingPrice: number;
    totalPrice: number;
    product?: {
      name?: string;
      sku?: string | null;
    } | null;
  }>;
};

const API_BASE = import.meta.env.VITE_BASE_URL || "http://localhost:3000";

const formatCurrency = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-slate-200 ${className}`} />
);

const EmptyState = ({ text }: { text: string }) => (
  <div className="py-8 text-center text-sm font-medium text-slate-400">{text}</div>
);

export default function Dashboard() {
  // dashboard data is now handled by react-query
  const [dashboard, setDashboard] = useState<DashboardData | null>(null); // kept for typing fallback
  const [chartMode, setChartMode] = useState<"monthly" | "yearly">("monthly");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [verifiedReport, setVerifiedReport] = useState<VerifiedSaleReport | null>(null);
  const scannerRef = useRef<any /* QrScanner | null */>(null);
  const { token, user } = useAuth();

  const fetchDashboard = async () => {
    const response = await fetch(`${API_BASE}/utils/dashboard`);
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(text || "Unable to load dashboard data");
    }
    const data = (await response.json()) as DashboardData;
    return data;
  };

  // use tanstack/react-query to fetch and cache dashboard data
  const { data, isLoading, isError, error: queryError, refetch, isFetching } = useQuery<DashboardData, Error>({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    staleTime: 1000 * 60 * 2,
  });

  // assign query data into local dashboard variable for rest of file
  useEffect(() => {
    if (data) setDashboard(data as DashboardData);
  }, [data]);

  const loading = isLoading || isFetching;
  const apiError = isError ? (queryError?.message ?? 'Unable to load dashboard data') : null;

  const chartData = useMemo(() => dashboard?.salesPerformance[chartMode] ?? [], [chartMode, dashboard]);

  const stats = dashboard?.stats;
  const isPositiveSalesChange = (stats?.todayChangePercent ?? 0) >= 0;
  const currentUserId = user?.userId || user?.id;

  const verifyQrPayload = async (qrResult: any) => {
    if (scanLoading) return;

    setScanLoading(true);
    setScanError(null);
    setVerifiedReport(null);

    // scanner may return an object { data: string, cornerPoints: [...] } or a raw string
    const rawPayload: string = (typeof qrResult === 'object' && qrResult !== null && 'data' in qrResult)
      ? String(qrResult.data)
      : String(qrResult || '');

    // extract report token (supports JSON payload { token } or raw JWT)
    let reportToken: string | undefined;
    if (rawPayload) {
      const trimmed = rawPayload.trim();
      try {
        const parsed = JSON.parse(trimmed);
        reportToken = parsed?.token;
      } catch {
        // not JSON -> allow raw JWT encoded directly in QR (three dot parts)
        if (trimmed.split('.').length === 3) reportToken = trimmed;
      }
    }

    try {
      const response = await fetch(`${API_BASE}/sales/report/verify-qr`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          qrPayload: rawPayload,
          token: reportToken,
          userId: currentUserId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to verify QR code");
      }

      setVerifiedReport(data);
      try {
        // stop the scanner if it's running
        await scannerRef.current?.stop?.();
      } catch {}
      try {
        // destroy to release resources if available
        scannerRef.current?.destroy?.();
      } catch {}
      scannerRef.current = null;
    } catch (err) {
      console.error(err);
      setScanError(err instanceof Error ? err.message : "Failed to verify QR code");
    } finally {
      setScanLoading(false);
    }
  };

  useEffect(() => {
    if (!scannerOpen) {
      try {
        scannerRef.current?.stop();
      } catch {}
      try {
        scannerRef.current?.destroy?.();
      } catch {}
      scannerRef.current = null;
      return;
    }

    setScanError(null);
    setVerifiedReport(null);

    // ensure worker path is set (Vite-friendly)
    try {
      // @ts-ignore
      QrScanner.WORKER_PATH = new URL('qr-scanner/dist/qr-scanner-worker.min.js', import.meta.url).toString();
    } catch {}

    const container = document.getElementById('sale-report-qr-reader');
    if (!container) return;

    // create a video element to host the camera stream
    const video = document.createElement('video');
    video.setAttribute('playsinline', 'true');
    video.style.width = '100%';
    video.style.height = 'auto';
    // clear container then append
    container.innerHTML = '';
    container.appendChild(video);

    const scanner = new QrScanner(video, (result: string) => {
      verifyQrPayload(result);
    }, {
      highlightScanRegion: true,
      highlightCodeOutline: true,
    } as any);

    scannerRef.current = scanner;

    scanner.start().catch((err: any) => {
      console.error('QR scanner start failed', err);
      setScanError(typeof err === 'string' ? err : String(err?.message || err));
    });

    return () => {
      try { scanner.stop(); } catch {}
      try { scanner.destroy(); } catch {}
      if (container && container.contains(video)) container.removeChild(video);
      scannerRef.current = null;
    };
  }, [scannerOpen]);

  return (
    <main className="min-h-screen bg-[#f8f9fc] px-6 py-10 md:px-12">
      <div className="mb-10 flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
        <div>
          <h2 className="mb-2 text-[28px] font-black tracking-tight text-slate-800 md:text-3xl">
            Dashboard
          </h2>
          <p className="text-sm font-medium text-slate-500">
            Live inventory, sales, and purchase overview from your backend.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setScannerOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-[13px] font-bold text-[#3125c4] shadow-sm transition hover:bg-indigo-100"
          >
            <Camera size={16} />
            Scan QR
          </button>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
          >
            {isFetching ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Refreshing
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                Refresh
              </>
            )}
          </button>
          <Link
            to="/purchases"
            className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-[13px] font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Record Purchase
          </Link>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 rounded-lg bg-[#3125c4] px-5 py-2.5 text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(49,37,196,0.3)] transition hover:opacity-95"
          >
            <Plus size={18} strokeWidth={3} />
            Add Product
          </Link>
        </div>
      </div>

      {apiError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {apiError}
        </div>
      )}

      {scannerOpen && (
      <div className="fixed inset-0 z-70 flex items-start justify-center overflow-y-auto bg-slate-950/60 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <h3 className="text-xl font-black text-slate-900">Scan Sale Report QR</h3>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Scan a generated sale report QR code to verify and view the transaction.
                </p>
              </div>
              <button
                onClick={() => setScannerOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[360px_minmax(0,1fr)]">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div id="sale-report-qr-reader" className="overflow-hidden rounded-lg bg-white" />
                {scanLoading && (
                  <div className="mt-3 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-600">
                    Verifying QR code...
                  </div>
                )}
                {scanError && (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                    {scanError}
                  </div>
                )}
                {verifiedReport && (
                  <div className="mt-3 flex justify-center">
                    <button
                      onClick={() => {
                        setVerifiedReport(null);
                        setScanError(null);
                        // restart scanner by toggling scannerOpen
                        setScannerOpen(false);
                        setTimeout(() => setScannerOpen(true), 200);
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      Scan Again <RefreshCcw size={16} />
                    </button>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5">
                {!verifiedReport ? (
                  <div className="flex min-h-90 flex-col items-center justify-center text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-indigo-50 text-[#3125c4]">
                      <ShieldCheck size={26} />
                    </div>
                    <h4 className="text-lg font-black text-slate-900">Awaiting verified report</h4>
                    <p className="mt-2 max-w-sm text-sm font-medium text-slate-500">
                      Only admin users can verify QR codes. Once verified, the sale details will appear here.
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                      <p className="text-sm font-black text-emerald-700">Verified sale transaction</p>
                      <p className="mt-1 text-xs font-medium text-emerald-700">
                        Verified by {verifiedReport.verifiedBy.name} ({verifiedReport.verifiedBy.role})
                      </p>
                    </div>

                    <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-lg bg-slate-50 p-4">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Business</p>
                        <p className="mt-1 font-black text-slate-900">{verifiedReport.business.name}</p>
                        <p className="text-xs font-medium text-slate-500">{verifiedReport.business.phone}</p>
                        <p className="text-xs font-medium text-slate-500">{verifiedReport.business.email}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-4">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Sale</p>
                        <p className="mt-1 font-black text-slate-900">#{verifiedReport.sale.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-xs font-medium text-slate-500">{formatDate(verifiedReport.sale.sale_date)}</p>
                        <p className="text-xs font-medium text-slate-500 capitalize">{verifiedReport.sale.paymentStatus || "pending"}</p>
                      </div>
                    </div>

                    <div className="mb-5 rounded-lg border border-slate-200">
                      <div className="border-b border-slate-100 px-4 py-3">
                        <p className="font-black text-slate-900">{verifiedReport.sale.customerName || "Walk-in"}</p>
                        <p className="text-sm text-slate-500">{verifiedReport.sale.customerPhone || "No phone provided"}</p>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {verifiedReport.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-800">{item.product?.name || "Unknown product"}</p>
                              <p className="text-xs font-medium text-slate-400">Qty {item.quantity} · SKU {item.product?.sku || "N/A"}</p>
                            </div>
                            <p className="font-black text-slate-900">{formatCurrency(item.totalPrice)}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total</p>
                        <p className="mt-1 font-black text-slate-900">{formatCurrency(Number(verifiedReport.sale.totalAmount))}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Paid</p>
                        <p className="mt-1 font-black text-emerald-700">{formatCurrency(Number(verifiedReport.sale.paid_amount))}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Due</p>
                        <p className="mt-1 font-black text-red-600">{formatCurrency(Number(verifiedReport.sale.due_amount))}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
              <Box size={22} strokeWidth={2.5} />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Total Items</p>
          </div>
          <h3 className="text-3xl font-black tracking-tight text-slate-800">
            {loading ? <Skeleton className="h-9 w-28" /> : stats?.totalItems.toLocaleString("en-IN")}
          </h3>
          <p className="mt-2 text-[11px] font-medium text-slate-400">
            {loading ? "Loading products" : `${stats?.totalProducts ?? 0} products across ${stats?.totalCategories ?? 0} categories`}
          </p>
        </div>

        <div className="rounded-lg border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-slate-600">
              <Wallet size={22} strokeWidth={2.5} />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Stock Value</p>
          </div>
          <h3 className="text-3xl font-black tracking-tight text-slate-800">
            {loading ? <Skeleton className="h-9 w-36" /> : formatCurrency(stats?.stockValue ?? 0)}
          </h3>
          <p className="mt-2 text-[11px] font-medium text-slate-400">Quantity multiplied by product cost price</p>
        </div>

        <div className="relative overflow-hidden rounded-lg border-b-4 border-[#3125c4] bg-white p-6 shadow-xl shadow-[#3125c4]/10">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#3125c4] text-white shadow-lg shadow-[#3125c4]/30">
                <TrendingUp size={22} strokeWidth={2.5} />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#3125c4]">Today's Sales</p>
            </div>
            {!loading && (
              <span
                className={`rounded px-2 py-1 text-[11px] font-bold tracking-wide ${
                  isPositiveSalesChange ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                }`}
              >
                {isPositiveSalesChange ? "+" : ""}
                {stats?.todayChangePercent ?? 0}%
              </span>
            )}
          </div>
          <h3 className="text-3xl font-black tracking-tight text-slate-800">
            {loading ? <Skeleton className="h-9 w-32" /> : formatCurrency(stats?.todaySales ?? 0)}
          </h3>
          <p className="mt-2 text-[11px] font-medium text-slate-400">
            {loading ? "Loading orders" : `${stats?.todayOrders ?? 0} completed orders today`}
          </p>
        </div>

        <div className="rounded-lg border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 text-red-500">
                <AlertTriangle size={22} strokeWidth={2.5} />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Low Stock</p>
            </div>
          </div>
          <h3 className="text-3xl font-black tracking-tight text-slate-800">
            {loading ? <Skeleton className="h-9 w-16" /> : stats?.lowStockCount ?? 0}
          </h3>
          <p className="mt-2 text-[11px] font-medium text-slate-400">Products at or below threshold</p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-lg border border-slate-100 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <h3 className="mb-1 text-[17px] font-bold text-slate-800">Sales Performance</h3>
              <p className="text-xs font-medium text-slate-400">
                {chartMode === "monthly" ? "Month-wise revenue for this year" : "Year-wise revenue for the last five years"}
              </p>
            </div>
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
              <button
                onClick={() => setChartMode("monthly")}
                className={`rounded px-3 py-1.5 text-[11px] font-bold ${
                  chartMode === "monthly" ? "bg-white text-[#3125c4] shadow-sm" : "text-slate-500"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setChartMode("yearly")}
                className={`rounded px-3 py-1.5 text-[11px] font-bold ${
                  chartMode === "yearly" ? "bg-white text-[#3125c4] shadow-sm" : "text-slate-500"
                }`}
              >
                Yearly
              </button>
            </div>
          </div>

          <div className="h-72">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {chartMode === "monthly" ? (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(value) => `₹${Number(value) / 1000}k`} />
                    <Tooltip formatter={(value, name) => [name === "revenue" ? formatCurrency(Number(value)) : value, name]} />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="#3125c4" radius={[6, 6, 0, 0]} />
                  </BarChart>
                ) : (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(value) => `₹${Number(value) / 1000}k`} />
                    <Tooltip formatter={(value, name) => [name === "revenue" ? formatCurrency(Number(value)) : value, name]} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#3125c4" strokeWidth={3} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="orders" name="Orders" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-indigo-50 bg-[#f2f4fc] p-6">
          <h3 className="mb-6 text-[17px] font-bold text-slate-800">Top Performers</h3>
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-16 w-full" />)
            ) : dashboard?.topProducts.length ? (
              dashboard.topProducts.slice(0, 3).map((product, index) => (
                <div key={product.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-sm font-black text-[#3125c4]">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold text-slate-800">{product.name}</p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {product.quantity} units sold
                      </p>
                    </div>
                  </div>
                  <span className="ml-3 whitespace-nowrap text-[13px] font-black text-[#3125c4]">
                    {formatCurrency(product.revenue)}
                  </span>
                </div>
              ))
            ) : (
              <EmptyState text="No sales recorded yet" />
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-lg border border-slate-100 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-[17px] font-bold text-slate-800">Recent Sales</h3>
            <Link to="/sales" className="flex items-center gap-1 text-[11px] font-bold text-[#3125c4] hover:underline">
              View Sales <Download size={14} strokeWidth={2.5} className="ml-1" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  {["Invoice", "Product", "Qty", "Amount", "Date"].map((heading) => (
                    <th key={heading} className="border-b border-slate-100 bg-[#f8f9fc]/80 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-[13px]">
                {loading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <tr key={index}>
                      <td className="px-4 py-5" colSpan={5}><Skeleton className="h-5 w-full" /></td>
                    </tr>
                  ))
                ) : dashboard?.recentSales.length ? (
                  dashboard.recentSales.map((sale) => (
                    <tr key={sale.id} className="transition-colors hover:bg-slate-50/70">
                      <td className="border-b border-slate-50 px-4 py-5 font-bold text-slate-500">{sale.invoice}</td>
                      <td className="border-b border-slate-50 px-4 py-5">
                        <span className="font-bold text-slate-800">{sale.productSummary}</span>
                        <p className="mt-1 text-xs text-slate-400">{sale.customerName || "Walk-in"}</p>
                      </td>
                      <td className="border-b border-slate-50 px-4 py-5 font-medium text-slate-600">{sale.itemCount}</td>
                      <td className="border-b border-slate-50 px-4 py-5 font-black text-slate-800">{formatCurrency(sale.amount)}</td>
                      <td className="border-b border-slate-50 px-4 py-5 text-[12px] font-medium text-slate-400">{formatDate(sale.date)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}><EmptyState text="No recent sales found" /></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex flex-col gap-6">
          <section className="rounded-lg border border-red-100 bg-[#fff5f5] p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600 text-white shadow-lg shadow-red-600/20">
                <AlertCircle size={20} strokeWidth={2.5} />
              </div>
              <h3 className="text-[17px] font-bold text-slate-900">Low Stock Alerts</h3>
            </div>

            <div className="mb-6 space-y-3">
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-10 w-full" />)
              ) : dashboard?.lowStockProducts.length ? (
                dashboard.lowStockProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between border-b border-red-100 pb-3">
                    <div className="min-w-0">
                      <span className="block truncate text-[13px] font-bold text-slate-700">{product.name}</span>
                      <span className="text-[11px] font-medium text-slate-400">{product.categoryName ?? product.sku ?? "Uncategorized"}</span>
                    </div>
                    <span className="ml-3 whitespace-nowrap rounded bg-white px-2 py-1 text-[10px] font-bold text-red-500 shadow-sm ring-1 ring-red-50">
                      {product.quantity} left
                    </span>
                  </div>
                ))
              ) : (
                <EmptyState text="No low stock products" />
              )}
            </div>

            <Link
              to="/products"
              className="block w-full rounded-lg bg-[#b91c1c] py-3 text-center text-[12px] font-bold text-white shadow-lg shadow-red-900/20 transition hover:bg-[#991b1b]"
            >
              View All Alerts
            </Link>
          </section>

          <section className="flex-1 rounded-lg border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="mb-6 text-[17px] font-bold text-slate-800">Recent Purchases</h3>
            <div className="space-y-3">
              {loading ? (
                  Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-16 w-full" />)
                ) : dashboard?.recentPurchases.length ? (
                  dashboard.recentPurchases.slice(0, 3).map((purchase) => (
                  <div key={purchase.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400">
                        <Receipt size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{purchase.purchaseNo}</p>
                        <p className="mt-0.5 truncate text-[13px] font-bold text-slate-800">{purchase.itemSummary}</p>
                        <p className="mt-1 text-[11px] font-medium text-slate-400">{purchase.supplierName}</p>
                      </div>
                    </div>
                    <span className="ml-3 whitespace-nowrap text-[13px] font-black text-[#3125c4]">{formatCurrency(purchase.amount)}</span>
                  </div>
                ))
              ) : (
                <EmptyState text="No recent purchases found" />
              )}
            </div>
            <div className="mt-4">
              <Link to="/purchases" className="block w-full rounded-lg bg-[#3125c4] py-2 text-center text-[12px] font-bold text-white shadow-sm hover:opacity-95">
                View All Purchases
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
