import { Link, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutSuccess } from '../redux/authSlice';
import { LayoutDashboard, Briefcase, Activity, ShieldAlert, LogOut } from 'lucide-react';

export default function Sidebar() {
  const location = useLocation();
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Jobs', path: '/jobs', icon: <Briefcase size={20} /> },
    ...(user?.role === 'ADMIN' ? [
      { name: 'Workers', path: '/workers', icon: <Activity size={20} /> },
      { name: 'Dead Letter', path: '/dead-letter', icon: <ShieldAlert size={20} /> }
    ] : [])
  ];

  return (
    <div className="w-64 bg-card border-r border-border h-screen sticky top-0 flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
          <Activity size={24} />
          TaskFlow
        </h1>
        <p className="text-sm text-muted-foreground mt-1 text-truncate">{user?.email}</p>
        {user?.role === 'ADMIN' && <span className="inline-block mt-2 px-2 py-1 text-xs bg-primary/20 text-primary rounded-full">ADMIN</span>}
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              location.pathname === item.path 
                ? 'bg-primary text-primary-foreground font-medium' 
                : 'hover:bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {item.icon}
            {item.name}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <button 
          onClick={() => dispatch(logoutSuccess())}
          className="flex items-center gap-3 w-full px-4 py-3 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </div>
  );
}
