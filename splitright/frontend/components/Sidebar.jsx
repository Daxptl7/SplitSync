'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-white border-r border-surface-100 py-6 px-4">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 px-3 mb-8 group">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-accent-teal flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:scale-105 transition-transform">
          S
        </div>
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

      {/* Bottom */}
      <div className="mt-auto pt-4 border-t border-surface-100">
        <div className="px-3 py-2 rounded-xl bg-gradient-to-r from-brand-50 to-teal-50 border border-brand-100">
          <p className="text-xs font-semibold text-brand-700 mb-0.5">Free Plan</p>
          <p className="text-[11px] text-surface-400">Unlimited splits &amp; groups</p>
        </div>
      </div>
    </aside>
  );
}
