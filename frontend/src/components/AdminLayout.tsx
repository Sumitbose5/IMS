import React from 'react';
import Header from './layout/Header';

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="bg-[#f8f9fc] text-slate-900 antialiased min-h-screen font-['Inter',sans-serif]">
      {/* <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} /> */}
      <Header />

      <main className="min-h-screen flex flex-col ">
        <div className="flex-1">
          {children}
        </div>

        <footer className="w-full py-8 mt-auto px-6 md:px-12 bg-transparent flex flex-col md:flex-row justify-center md:items-center text-[10px] uppercase tracking-widest font-bold">
          <p className="text-slate-400">
            © 2024 STOCKFLOW. THE LUCID EXECUTIVE SYSTEM.
          </p>
        </footer>
      </main>

      {/* Mobile FAB placeholder - preserve existing layout behaviour for mobile */}
      <div className="fixed bottom-8 right-8 z-50 md:hidden">
        <button className="w-14 h-14 bg-[#3125c4] text-white rounded-full shadow-[0_8px_20px_rgba(49,37,196,0.4)] flex items-center justify-center active:scale-90 transition-transform">
          {/* empty - individual pages can provide their own FAB via children if needed */}
        </button>
      </div>
    </div>
  );
};

export default AdminLayout;
