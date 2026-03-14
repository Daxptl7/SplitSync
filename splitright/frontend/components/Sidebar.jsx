'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const NAV_ITEMS = [
  { href: '/dashboard', icon: 'ri-dashboard-line', label: 'Dashboard' },
  { href: '/groups', icon: 'ri-group-line', label: 'Groups' },
  { href: '/friends', icon: 'ri-user-heart-line', label: 'Friends' },
  { href: '/expenses', icon: 'ri-receipt-line', label: 'Expenses' },
  { href: '/settlements', icon: 'ri-exchange-funds-line', label: 'Settlements' },
  { href: '/profile', icon: 'ri-user-settings-line', label: 'Profile' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  
  const handleLogout = async () => {
      try {
          await logout();
          router.push("/");
      } catch (error) {
          console.error("Failed to log out", error);
      }
  };

  const initial = user?.display_name?.[0] || user?.email?.[0] || "U";
  const name = user?.display_name || user?.email?.split("@")[0] || "User";

  return (
    <aside className="flex flex-col w-64 h-screen sticky top-0 bg-white border-r border-surface-100 py-6 px-4">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 px-3 mb-8 group">
        <img 
          src="/d877cd1e-7c48-4499-a7a2-4c493cfdc64d-removebg-preview.png" 
          alt="SplitRight Logo" 
          className="h-9 w-9 object-cover rounded-xl shadow-md group-hover:scale-105 transition-transform"
        />
        <span className="text-lg font-bold text-surface-900 tracking-tight">
          Split<span className="gradient-text">Right</span>
        </span>
      </Link>

      {/* Nav Links */}
      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-brand-50 text-brand-700 shadow-sm'
                  : 'text-surface-500 hover:bg-surface-50 hover:text-surface-700'
              }`}
            >
              <i className={`${item.icon} text-lg ${isActive ? 'text-brand-600' : ''}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User Profile & Logout */}
      <div className="mt-auto pt-4 border-t border-surface-100">
        <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm shrink-0">
                {initial.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-surface-800 truncate">{name}</p>
                <p className="text-xs text-surface-500 truncate">{user?.email}</p>
            </div>
        </div>
        <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
        >
            <i className="ri-logout-box-r-line text-lg" />
            Logout
        </button>
      </div>
    </aside>
  );
}
