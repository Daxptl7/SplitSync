"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";

export default function AppLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-surface-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {/* Top bar for mobile */}
        <div className="lg:hidden sticky top-0 z-40 glass px-4 py-3 flex items-center justify-between border-b border-surface-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-accent-teal flex items-center justify-center text-white font-bold text-sm">
              S
            </div>
            <span className="font-bold text-surface-900">
              Split<span className="gradient-text">Right</span>
            </span>
          </div>
          <button className="p-2 rounded-lg hover:bg-surface-100">
            <i className="ri-menu-line text-xl text-surface-600" />
          </button>
        </div>
        <div className="p-6 lg:p-8 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
