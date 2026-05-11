import { DownloadCloud, Plus, CreditCard, ShoppingCart, Box, Calendar, Printer, FileDown } from "lucide-react";
import PurchaseTable from "../../components/purchase/PurchaseTable";
// Purchase details moved to modal
// import PurchaseSidebar from '../../components/purchase/PurchaseSidebar';
import PurchaseDetailsModal from '../../components/purchase/PurchaseDetailsModal';
import { useState, useEffect } from 'react';
import AddPurchaseModal from '../../components/purchase/AddPurchaseModal';

const Purchases = () => {
    const [open, setOpen] = useState(false);
    const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [editPurchaseId, setEditPurchaseId] = useState<string | null>(null);
    const now = new Date();
    const [month, setMonth] = useState<number>(now.getMonth() + 1);
    const [year, _setYear] = useState<number>(now.getFullYear());
    const [fullYear, setFullYear] = useState(false);
    const [stats, setStats] = useState<{ totalAmount: number; totalOrders: number; avgOrderValue: number } | null>(null);
    const [totalDebt, setTotalDebt] = useState<number | null>(null);
    const [debtors, setDebtors] = useState<Array<any>>([]);

    const fetchStats = async (y: number, m: number, full: boolean) => {
        try {
            const qs = new URLSearchParams({ year: String(y), month: String(m), fullYear: full ? '1' : '0' });
            const res = await fetch(`${import.meta.env.VITE_BASE_URL}/utils/purchases?${qs.toString()}`);
            if (!res.ok) return;
            const data = await res.json();
            setStats(data.stats ?? null);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchDebtors = async (y: number, m: number, full: boolean) => {
        try {
            const qs = new URLSearchParams({ year: String(y), month: String(m), fullYear: full ? '1' : '0' });
            const res = await fetch(`${import.meta.env.VITE_BASE_URL}/utils/debtors?${qs.toString()}`);
            if (!res.ok) return;
            const data = await res.json();
            setTotalDebt(Number(data.totalDebt || 0));
            setDebtors(data.debtors || []);
        } catch (e) {
            console.error(e);
        }
    };

    // fetch stats and debtors when filters change or refreshKey bumps
    useEffect(() => { fetchStats(year, month, fullYear); fetchDebtors(year, month, fullYear); }, [year, month, fullYear, refreshKey]);

    function formatDate(d?: string | number | Date) {
        if (!d) return '—';
        try {
            const dt = new Date(d);
            if (isNaN(dt.getTime())) return '—';
            return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch {
            return '—';
        }
    }
    return (
        <div className="min-h-screen bg-gray-50">
            <main className="max-w-7xl mx-auto px-6 py-10">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold">Purchases</h1>
                        <p className="text-gray-500 mt-1">Manage supplier purchases and stock entries</p>
                    </div>

                    <div className="flex items-center gap-3 ml-auto">
                        <button className="inline-flex items-center gap-2 border border-gray-200 bg-white text-gray-700 px-4 py-2 rounded-lg shadow-sm font-semibold">
                            <DownloadCloud className="w-4 h-4" />
                            <span className="text-sm">Export Reports</span>
                        </button>

                        <button onClick={() => { setEditPurchaseId(null); setOpen(true); }} className="inline-flex items-center gap-2 bg-[#3125c4] text-white px-4 py-2 rounded-lg shadow-lg font-semibold">
                            <Plus className="w-4 h-4" />
                            <span className="text-sm font-medium">New Purchase</span>
                        </button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid md:grid-cols-3 gap-6 mb-10">
                    <div className="bg-white p-6 rounded-xl shadow-md flex items-start gap-4">
                        <div className="p-3 rounded-lg bg-[#efeafe] text-[#3125c4]">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-bold">TOTAL PURCHASES ({fullYear ? 'YEAR' : 'MONTH'})</p>
                            <h2 className="text-2xl font-bold mt-1">₹{stats ? Number(stats.totalAmount).toLocaleString('en-IN') : '—'}</h2>
                            <p className="text-xs text-green-500 mt-2">+12% from last month</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-md flex items-start gap-4">
                        <div className="p-3 rounded-lg bg-[#eef7ff] text-[#2563eb]">
                            <ShoppingCart className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-bold">TOTAL ORDERS</p>
                            <h2 className="text-2xl font-bold mt-1">{stats ? stats.totalOrders : '—'}</h2>
                            <p className="text-xs text-green-500 mt-2">All fulfilled</p>
                        </div>
                    </div>

                    {/* <div className="bg-white p-6 rounded-xl shadow-md flex items-start gap-4">
                        <div className="p-3 rounded-lg bg-[#fff7ed] text-[#c2410c]">
                            <Box className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-bold">AVERAGE ORDER VALUE</p>
                            <h2 className="text-2xl font-bold mt-1">{stats ? `₹${Number(stats.avgOrderValue).toLocaleString('en-IN')}` : '—'}</h2>
                            <p className="text-xs text-gray-400 mt-2">Stable vs last month</p>
                        </div>
                    </div> */}
                    <div className="bg-white p-6 rounded-xl shadow-md flex items-start gap-4">
                        <div className="p-3 rounded-lg bg-[#fff1f2] text-[#b91c1c]">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-bold">TOTAL DEBT</p>
                            <h2 className="text-2xl font-bold mt-1">{totalDebt !== null ? `₹${Number(totalDebt).toLocaleString('en-IN')}` : '—'}</h2>
                            <p className="text-xs text-red-500 mt-2">Outstanding payable to suppliers</p>
                        </div>
                    </div>
                </div>

                {/* Filters / Export row - separate block */}
                <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-sm p-5 mb-6">

                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

                        {/* LEFT SIDE */}
                        <div className="flex flex-wrap items-end gap-5">

                            {/* Month */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    Month
                                </label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <select value={month} onChange={e => setMonth(Number(e.target.value))} className="pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                        <option value={1}>January</option>
                                        <option value={2}>February</option>
                                        <option value={3}>March</option>
                                        <option value={4}>April</option>
                                        <option value={5}>May</option>
                                        <option value={6}>June</option>
                                        <option value={7}>July</option>
                                        <option value={8}>August</option>
                                        <option value={9}>September</option>
                                        <option value={10}>October</option>
                                        <option value={11}>November</option>
                                        <option value={12}>December</option>
                                    </select>
                                </div>
                            </div>

                            {/* Year */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    Year
                                </label>
                                <select className="px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                    <option value={year}>{year}</option>
                                    <option value={year - 1}>{year - 1}</option>
                                    <option value={year - 2}>{year - 2}</option>
                                </select>
                            </div>

                            {/* Full year checkbox */}
                            <label className="flex items-center gap-2 text-sm text-gray-600 mt-6 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={fullYear}
                                    onChange={e => setFullYear(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mb-3"
                                />
                                <span className="font-medium mb-3">Full Year</span>
                            </label>

                        </div>

                        {/* RIGHT SIDE */}
                        <div className="flex flex-wrap items-center gap-3">

                            {/* Print */}
                            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition">
                                <Printer className="w-4 h-4" />
                                Print Report
                            </button>

                            {/* Export */}
                            <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold shadow-sm hover:bg-indigo-700 transition">
                                <FileDown className="w-4 h-4" />
                                Export CSV
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main two-column layout */}
                <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1">
                        <div className="bg-white p-6 rounded-xl shadow">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">Recent Purchase Orders</h3>
                                <div className="flex items-center gap-2 text-gray-400">
                                    <span className="text-sm">Filter</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L15 12.414V19a1 1 0 01-1.447.894L9 17H4a1 1 0 01-1-1V4z" />
                                    </svg>
                                </div>
                            </div>

                            <PurchaseTable onSelect={(id) => { setSelectedPurchaseId(id); setDetailOpen(true); }} onEdit={(id) => { setEditPurchaseId(id); setOpen(true); }} refreshKey={refreshKey} month={month} year={year} fullYear={fullYear} />
                        </div>
                    </div>

                    <div className="w-full lg:w-1/3">
                        <div className="bg-red-50 p-6 rounded-xl shadow border border-red-50">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-red-700 flex items-center gap-3">
                                    Debtors
                                </h3>
                            </div>

                            <div>
                                {debtors.length === 0 ? (
                                    <div className="text-sm text-gray-500">No debtors for selected range</div>
                                ) : (
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="text-xs text-gray-500">
                                                <th className="py-2 ">Supplier</th>
                                                <th className="py-2 ">Date</th>
                                                <th className="py-2 ">Debt</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {debtors.map(d => (
                                                <tr key={d.id} className="border-t hover:bg-red-50 cursor-pointer" onClick={() => { setSelectedPurchaseId(d.id); setDetailOpen(true); }}>
                                                    <td className="py-2 font-medium ">{d.supplierName}</td>
                                                    <td className="py-2 text-sm ">{formatDate(d.purchaseDate)}</td>
                                                    <td className="py-2 text-right text-red-700 font-bold">₹{Number(d.due_amount || d.due || 0).toLocaleString('en-IN')}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>

                    <AddPurchaseModal isOpen={open} purchaseId={editPurchaseId} onClose={() => { setOpen(false); setEditPurchaseId(null); }} onSaved={() => { setRefreshKey(k => k + 1); setOpen(false); setEditPurchaseId(null); }} />

                    <PurchaseDetailsModal purchaseId={selectedPurchaseId} isOpen={detailOpen} onClose={() => { setDetailOpen(false); setSelectedPurchaseId(null); }} />
                </div>

            </main>
        </div>
    );
};

export default Purchases;