import { Settings, LogOut } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';

const Header = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    setUser(null, null);
    setIsDropdownOpen(false);
    navigate('/auth');
  };
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl shadow-sm">
      <div className="max-w-7xl mx-auto flex justify-between items-center px-8 py-4">
        
        <div className="flex items-center gap-10">
          <h1 className="text-2xl font-extrabold text-[#3125c4] italic">
            stockflow
          </h1>

          <nav className="hidden md:flex gap-6 text-sm">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                isActive
                  ? 'text-indigo-700 font-bold border-b-2 border-indigo-700 pb-1'
                  : 'text-gray-500 hover:text-indigo-600'
              }
            >
              Dashboard
            </NavLink>

            <NavLink
              to="/products"
              className={({ isActive }) =>
                isActive
                  ? 'text-indigo-700 font-bold border-b-2 border-indigo-700 pb-1'
                  : 'text-gray-500 hover:text-indigo-600'
              }
            >
              Inventory
            </NavLink>

            <NavLink
              to="/purchases"
              className={({ isActive }) =>
                isActive
                  ? 'text-indigo-700 font-bold border-b-2 border-indigo-700 pb-1'
                  : 'text-gray-500 hover:text-indigo-600'
              }
            >
              Purchases
            </NavLink>

            <NavLink
              to="/sales"
              className={({ isActive }) =>
                isActive
                  ? 'text-indigo-700 font-bold border-b-2 border-indigo-700 pb-1'
                  : 'text-gray-500 hover:text-indigo-600'
              }
            >
              Sales
            </NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <input
            placeholder="Search..."
            className="px-4 py-2 rounded-lg bg-gray-100 text-sm"
          />

          {/* <button> <Bell className="w-5 h-5" /> </button> */}
          <div className="relative">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            > 
              <Settings className="w-5 h-5" /> 
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg text-sm font-semibold transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* <button> <CircleUserRound className="w-5 h-5" /> </button> */}
        </div>
      </div>
    </header>
  );
};

export default Header;