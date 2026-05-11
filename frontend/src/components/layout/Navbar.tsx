// src/components/layout/Navbar.tsx
import { Menu, Search, Maximize, Bell } from 'lucide-react';

interface NavbarProps {
  toggleSidebar: () => void;
}

export default function Navbar({ toggleSidebar }: NavbarProps) {
  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 z-50 bg-[#f8f9fc] flex justify-between items-center px-6 md:px-8 py-5 transition-all">
      <div className="flex items-center flex-1 gap-4">
        {/* Mobile Menu Button */}
        <button
          onClick={toggleSidebar}
          className="md:hidden p-2 text-slate-500 hover:bg-slate-200 rounded-lg transition-all active:scale-95"
        >
          <Menu size={24} />
        </button>

        {/* Search */}
        <div className="relative max-w-lg w-full hidden sm:block">
          <Search size={18} strokeWidth={2.5} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search inventory..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-[13px] font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3125c4]/20 focus:border-[#3125c4] shadow-sm transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 md:gap-5">
        <button className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-xl transition-all active:scale-95 hidden md:block">
          <Maximize size={20} strokeWidth={2.5} />
        </button>

        <button className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-xl transition-all relative active:scale-95">
          <Bell size={20} strokeWidth={2.5} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[#f8f9fc]"></span>
        </button>
      </div>
    </header>
  );
}