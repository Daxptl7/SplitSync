"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";

export default function AppLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Close mobile menu when Route changes
  useEffect(() => {
      setIsMobileMenuOpen(false);
  }, [children]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-surface-50 relative">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={`fixed inset-y-0 left-0 z-50 transform lg:transform-none lg:static transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <Sidebar />
      </div>

      <main className="flex-1 w-full lg:min-w-0 overflow-y-auto">
        {/* Top bar for mobile */}
        <div className="lg:hidden sticky top-0 z-30 glass px-4 py-3 flex items-center justify-between border-b border-surface-100 bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <img 
              src="/d877cd1e-7c48-4499-a7a2-4c493cfdc64d-removebg-preview.png" 
              alt="SplitRight Logo" 
              className="w-8 h-8 object-cover rounded-lg shadow-sm"
            />
            <span className="font-bold text-surface-900">
              Split<span className="gradient-text">Right</span>
            </span>
          </div>
          <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-surface-100 transition-colors"
          >
            <i className="ri-menu-line text-xl text-surface-600" />
          </button>
        </div>
        <div className="p-6 lg:p-8 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
