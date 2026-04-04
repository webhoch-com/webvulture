import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Search, Settings, Users, LogOut, Globe } from 'lucide-react';

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors ${
      isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
    }`;

  return (
    <div className="flex h-screen bg-gray-900">
      <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-5 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-blue-400" />
            <div>
              <h1 className="text-white font-bold text-sm">webhoch</h1>
              <p className="text-gray-400 text-xs">Webseiten Vorschau</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavLink to="/dashboard" className={linkClass}>
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </NavLink>
          <NavLink to="/search" className={linkClass}>
            <Search className="w-4 h-4" /> Suche
          </NavLink>
          {isAdmin && (
            <>
              <NavLink to="/settings" className={linkClass}>
                <Settings className="w-4 h-4" /> Einstellungen
              </NavLink>
              <NavLink to="/users" className={linkClass}>
                <Users className="w-4 h-4" /> Benutzer
              </NavLink>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-gray-700">
          <div className="text-gray-400 text-xs mb-2">
            Angemeldet als <span className="text-white">{user?.username}</span>
            <span className="ml-1 text-gray-500">({user?.role})</span>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-gray-400 hover:text-red-400 text-sm transition-colors">
            <LogOut className="w-4 h-4" /> Abmelden
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
