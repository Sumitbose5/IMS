// src/components/layout/Sidebar.tsx
import { LayoutDashboard, Package, ShoppingCart, CreditCard, AlertTriangle, Users, Settings, ScanBarcode, HelpCircle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const location = useLocation();

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Products', icon: Package, path: '/products' },
    { name: 'Purchases', icon: ShoppingCart, path: '/purchases' },
    { name: 'Sales', icon: CreditCard, path: '#' },
    { name: 'Low Stock Alerts', icon: AlertTriangle, path: '#' },
    { name: 'Users', icon: Users, path: '#' },
    { name: 'Settings', icon: Settings, path: '#' },
  ];

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-100/60 z-50 flex flex-col p-5 transition-transform duration-300
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-2 py-4 mb-4">
          <div className="w-11 h-11 rounded-xl bg-[#3125c4] flex items-center justify-center text-white shadow-[0_4px_12px_rgba(49,37,196,0.2)]">
            <Package size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter text-[#3125c4] leading-tight">StockFlow</h1>
            <p className="text-[9px] uppercase tracking-widest text-[#3125c4]/60 font-bold leading-none mt-1">Electronics Pro</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1.5 mt-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path) && item.path !== '#';
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all text-[13px] font-bold tracking-wide
                  ${isActive
                    ? 'bg-indigo-50/80 text-[#3125c4] shadow-sm border border-indigo-100/50'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                  }`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-[#3125c4]' : 'text-slate-400'} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="mt-auto pt-6 space-y-3">
          <button className="w-full py-3.5 px-4 bg-[#3125c4] text-white text-[13px] rounded-2xl font-bold flex items-center justify-center gap-2.5 shadow-[0_4px_12px_rgba(49,37,196,0.3)] hover:opacity-95 transition-all active:scale-[0.98]">
            <ScanBarcode size={18} strokeWidth={2.5} />
            <span>Scan Barcode</span>
          </button>

          <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-400 text-[13px] hover:text-slate-600 hover:bg-slate-50 transition-colors rounded-xl font-bold">
            <HelpCircle size={18} strokeWidth={2.5} />
            <span>Help Center</span>
          </a>
        </div>
      </aside>
    </>
  );
}