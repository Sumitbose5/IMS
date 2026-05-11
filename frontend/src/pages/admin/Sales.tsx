import { Download, Plus, TrendingUp, TrendingDown, Eye, Pencil, RefreshCw } from "lucide-react";
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import AddSaleModal from '../../components/sales/AddSaleModal';
import SaleDetailsModal from '../../components/sales/SaleDetailsModal';

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-slate-200 ${className}`} />
);

const SalesPage = () => {
  const [open, setOpen] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [prevStats, setPrevStats] = useState<any>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [outstanding, setOutstanding] = useState<any[]>([]);
  const [preset, setPreset] = useState<string>('month');
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());

  const fetchSales = async ({ queryKey }: { queryKey: any[] }) => {
    const [_key, presetQ, monthQ, yearQ] = queryKey;
    const qs = new URLSearchParams();
    if (presetQ) qs.set('preset', presetQ);
    if (presetQ === '') {
      qs.set('month', String(monthQ));
      qs.set('year', String(yearQ));
    }

    const res = await fetch(`${import.meta.env.VITE_BASE_URL}/sales?${qs.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch sales');
    const data = await res.json();

    // compute params for previous comparable period when possible
    const prevParams = (() => {
      if (presetQ === 'month' || presetQ === '') {
        let m = monthQ - 1;
        let y = yearQ;
        if (m < 1) { m = 12; y = yearQ - 1; }
        return `month=${m}&year=${y}`;
      }
      if (presetQ === 'year') {
        return `year=${yearQ - 1}&fullYear=1`;
      }
      return null;
    })();

    let prev = null;
    if (prevParams) {
      try {
        const pres = await fetch(`${import.meta.env.VITE_BASE_URL}/sales?${prevParams}`);
        if (pres.ok) prev = (await pres.json()).stats || null;
      } catch (e) {
        // ignore prev fetch errors
      }
    }

    return { stats: data.stats || null, prevStats: prev, sales: data.sales || [], outstanding: data.outstanding || [] };
  };

  const { data, isLoading, isFetching, refetch } = useQuery({ queryKey: ['sales', preset, month, year], queryFn: fetchSales, staleTime: 1000 * 60 * 2 });

  useEffect(() => {
    if (data) {
      setStats(data.stats);
      setPrevStats(data.prevStats);
      setSales(data.sales);
      setOutstanding(data.outstanding);
    }
  }, [data]);

  const onPresetClick = (p: string) => { setPreset(p); };

  return (
    <main className="pt-10 pb-20 px-8 max-w-7xl mx-auto bg-gray-50 min-h-screen">

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-1">Sales</h1>
          <p className="text-gray-500 text-sm">Track all sales transactions and revenue insights</p>
        </div>

          <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 font-semibold rounded-lg text-sm border border-gray-200 shadow-sm disabled:opacity-60 cursor-pointer"
          >
            {isFetching ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Refreshing
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Refresh
              </>
            )}
          </button>

          {/* Export CSV (kept but disabled) */}
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 font-semibold rounded-lg text-sm border border-blue-200 cursor-not-allowed">
            <Download className="w-4 h-4" />
            Export CSV
          </button>

          {/* New Sale */}
          <button onClick={() => { setEditingSaleId(null); setOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-[#3125c4] text-white font-semibold rounded-lg shadow-lg text-sm cursor-pointer">
            <Plus className="w-4 h-4" />
            New Sale
          </button>
        </div>
      </div>

      <AddSaleModal
        isOpen={open}
        saleId={editingSaleId}
        onClose={() => { setOpen(false); setEditingSaleId(null); }}
        onSaved={() => { setOpen(false); setEditingSaleId(null); refetch(); }}
      />
      <SaleDetailsModal saleId={selectedSaleId ?? undefined} isOpen={detailOpen} onClose={() => { setDetailOpen(false); setSelectedSaleId(null); }} />

      {/* Filter Bar */}
      <div className="bg-blue-50 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 mb-8 shadow-sm">

        <div className="flex items-center gap-3 flex-wrap">

          <select value={month} onChange={e => { setMonth(Number(e.target.value)); setPreset(''); }} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium">
            {Array.from({length:12}).map((_,i)=> <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>)}
          </select>

          <select value={year} onChange={e => { setYear(Number(e.target.value)); setPreset(''); }} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium">
            <option value={year}>{year}</option>
            <option value={year-1}>{year-1}</option>
            <option value={year-2}>{year-2}</option>
          </select>

          <div className="h-6 w-px bg-gray-300 mx-2"></div>

          <div className="flex bg-gray-50 p-1 rounded-lg">
            <button onClick={() => onPresetClick('today')} className={`px-3 py-1 text-xs font-semibold ${preset==='today' ? 'bg-[#3125c4] text-white rounded-md' : 'text-gray-600 hover:bg-gray-100 rounded-md'}`}>Today</button>
            <button onClick={() => onPresetClick('week')} className={`px-3 py-1 text-xs font-semibold ${preset==='week' ? 'bg-[#3125c4] text-white rounded-md' : 'text-gray-600 hover:bg-gray-100 rounded-md'}`}>This Week</button>
            <button onClick={() => onPresetClick('month')} className={`px-3 py-1 text-xs font-semibold ${preset==='month' ? 'bg-[#3125c4] text-white rounded-md' : 'text-gray-600 hover:bg-gray-100 rounded-md'}`}>This Month</button>
            <button onClick={() => onPresetClick('year')} className={`px-3 py-1 text-xs font-semibold ${preset==='year' ? 'bg-[#3125c4] text-white rounded-md' : 'text-gray-600 hover:bg-gray-100 rounded-md'}`}>This Year</button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
        {[
          { key: 'totalSales', title: 'Total Sales', valueKey: 'totalAmount', icon: TrendingUp },
          { key: 'totalOrders', title: 'Total Orders', valueKey: 'totalOrders', icon: null },
          { key: 'avgOrder', title: 'Average Order Value', valueKey: 'avgOrderValue', icon: null },
          { key: 'itemsSold', title: 'Items Sold', valueKey: 'itemsSold', icon: TrendingDown },
          { key: 'outstandingIncome', title: 'Outstanding Income', valueKey: 'outstandingAmount', icon: TrendingDown },
        ].map(card => {
          const curr = stats ? Number(stats[card.valueKey] || 0) : 0;
          const prev = prevStats ? Number(prevStats[card.valueKey] || 0) : 0;

          // format display
          const display = isLoading ? null : (card.valueKey === 'avgOrderValue' || card.valueKey === 'totalAmount' || card.valueKey === 'outstandingAmount') ? `₹${Number(curr || 0).toLocaleString('en-IN')}` : String(curr || 0);

          // compute change percent
          let changeText = '0%';
          let changeType: 'positive' | 'negative' | 'stable' = 'stable';

          if (prev && prev !== 0) {
            const pct = Math.round(((curr - prev) / prev) * 100);
            changeText = `${Math.abs(pct)}% vs last`;
            changeType = pct > 0 ? 'positive' : (pct < 0 ? 'negative' : 'stable');
          } else if (prev === 0 && curr !== 0) {
            changeText = '0%';
            changeType = 'positive';
          }

          const IconComponent = card.icon;

          return (
            <div key={card.key} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <p className="text-gray-500 text-xs font-semibold uppercase mb-2">{card.title}</p>
              <h3 className="text-2xl font-bold text-gray-900">{display === null ? <Skeleton className="h-6 w-24" /> : display}</h3>
              <div className={`mt-3 flex items-center gap-1 text-xs font-semibold ${changeType === 'positive' ? 'text-green-600' : changeType === 'negative' ? 'text-red-600' : 'text-gray-400'}`}>
                {IconComponent && <IconComponent className="w-3 h-3" />}
                {changeText}
              </div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-10">

        <div className="px-6 py-5 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-lg font-bold">Recent Transactions</h2>
            <span className="text-xs font-semibold text-gray-400">
              April 2026
            </span>
          </div>

          <input
            placeholder="Search transactions..."
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>

  <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-600 uppercase bg-gray-50">
              <th className="px-6 py-3 text-left font-semibold">Sale ID</th>
              <th className="px-6 py-3 text-left font-semibold">Customer</th>
              <th className="px-6 py-3 text-left font-semibold">Items</th>
              <th className="px-6 py-3 text-left font-semibold">Amount</th>
              <th className="px-6 py-3 text-left font-semibold">Date</th>
              <th className="px-6 py-3 text-center font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-6 py-4 text-center"><Skeleton className="h-4 w-8 mx-auto" /></td>
                </tr>
              ))
            ) : (
              sales.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-bold text-[#3125c4]">{String(s.id).slice(0,8)}</td>
                  <td className="px-6 py-4">{s.customerName || 'Walk-in'}</td>
                  <td className="px-6 py-4"><span className="inline-block bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded font-semibold">{s.itemCount} items</span></td>
                  <td className="px-6 py-4 font-bold">₹{Number(s.totalAmount).toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4">{new Date(s.sale_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/([A-Za-z]+)/, (m) => m.toLowerCase())}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => { setSelectedSaleId(String(s.id)); setDetailOpen(true); }}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
                        aria-label="View sale"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setEditingSaleId(String(s.id)); setOpen(true); }}
                        className="rounded-lg p-2 text-gray-400 hover:bg-indigo-50 hover:text-[#3125c4] cursor-pointer"
                        aria-label="Edit sale"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* <div className="px-6 py-4 text-center">
          <button className="text-[#3125c4] font-semibold text-sm hover:underline">
            View All Transactions
          </button>
        </div> */}
      </div>

      {/* Outstanding Incomes */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-10">
        <div className="px-6 py-5 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-lg font-bold">Outstanding Incomes</h2>
            <span className="text-xs font-semibold text-gray-400">Pending customer amounts</span>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-600 uppercase bg-gray-50">
              <th className="px-6 py-3 text-left font-semibold">Customer</th>
              <th className="px-6 py-3 text-left font-semibold">Phone</th>
              <th className="px-6 py-3 text-left font-semibold">Amount Due</th>
              <th className="px-6 py-3 text-left font-semibold">Sale Date</th>
              <th className="px-6 py-3 text-center font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {outstanding.length === 0 ? (
              <tr>
                <td className="px-6 py-4 text-gray-500" colSpan={5}>No outstanding incomes</td>
              </tr>
            ) : (
              outstanding.map(o => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">{o.customerName || 'Walk-in'}</td>
                  <td className="px-6 py-4">{o.phone || '-'}</td>
                  <td className="px-6 py-4 font-bold">₹{Number(o.amountDue || o.dueAmount || o.balance || 0).toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4">{o.sale_date ? new Date(o.sale_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/([A-Za-z]+)/, (m) => m.toLowerCase()) : '-'}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => { setSelectedSaleId(String(o.saleId || o.id)); setDetailOpen(true); }} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer" aria-label="View sale">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Chart */}
      {/* <div className="bg-white rounded-xl p-8 shadow-sm">

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">Sales Overview</h2>
          <span className="text-xs text-gray-400">Selected interval for Apr 2025</span>
        </div>

        <div className="flex items-end justify-between h-56 gap-3">
          {[
            { height: 45, label: "1st" },
            { height: 82, label: "5th" },
            { height: 60, label: "10th" },
            { height: 120, label: "15th" },
            { height: 95, label: "20th" },
            { height: 140, label: "25th" },
          ].map((bar, i) => (
            <div key={i} className="flex flex-col items-center flex-1">
              <div
                className="w-full bg-blue-300 rounded-t-lg transition-all hover:opacity-80"
                style={{ height: `${bar.height}px` }}
              />
              <span className="text-xs text-gray-500 mt-3 font-medium">
                {bar.label}
              </span>
            </div>
          ))}
        </div>
      </div> */}

    </main>
  );
};

export default SalesPage;
