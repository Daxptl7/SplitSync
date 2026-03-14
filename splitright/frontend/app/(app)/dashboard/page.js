"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import api from "@/lib/api";

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [globalLimitData, setGlobalLimitData] = useState(null);
  const [loading, setLoading] = useState(true);
  const cardsRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [dashRes, limitStatusRes] = await Promise.all([
          api.get("/api/v1/auth/dashboard/"),
          api.get("/api/v1/expenses/limit_status/")
        ]);
        setSummary(dashRes.data);
        setGlobalLimitData(limitStatusRes.data);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (!loading && summary && cardsRef.current) {
      const ctx = gsap.context(() => {
        gsap.from(".summary-card", {
          opacity: 0,
          y: 20,
          stagger: 0.1,
          duration: 0.5,
          ease: "power2.out",
        });
        gsap.from(".activity-item", {
          opacity: 0,
          x: -15,
          stagger: 0.08,
          duration: 0.4,
          delay: 0.3,
          ease: "power2.out",
        });
      }, cardsRef);

      return () => ctx.revert();
    }
  }, [loading, summary]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case "expense":
        return {
          icon: "ri-receipt-line",
          color: "bg-brand-50 text-brand-600",
        };
      case "settlement":
        return {
          icon: "ri-exchange-funds-line",
          color: "bg-emerald-50 text-emerald-600",
        };
      default:
        return {
          icon: "ri-file-list-line",
          color: "bg-amber-50 text-amber-600",
        };
    }
  };

  const timeAgo = (dateStr) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const summaryCards = [
    {
      label: "You Owe",
      value: formatCurrency(summary?.you_owe),
      icon: "ri-arrow-up-circle-line",
      color: "text-rose-500",
      bg: "bg-rose-50",
      border: "border-rose-100",
    },
    {
      label: "Owed to You",
      value: formatCurrency(summary?.owed_to_you),
      icon: "ri-arrow-down-circle-line",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
    },
    {
      label: "Total Groups",
      value: String(summary?.total_groups || 0),
      icon: "ri-group-line",
      color: "text-brand-600",
      bg: "bg-brand-50",
      border: "border-brand-100",
    },
    {
      label: "This Month",
      value: formatCurrency(summary?.this_month_expenses),
      icon: "ri-calendar-check-line",
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100",
    },
  ];

  const activity = summary?.recent_activity || [];

  return (
    <div ref={cardsRef}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-surface-900 tracking-tight">
          Dashboard
        </h1>
        <p className="text-surface-400 mt-1">
          Welcome back! Here&apos;s your expense overview.
        </p>
      </div>

      {/* Global Limit Banner */}
      {globalLimitData?.limit_exceeded && (
        <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-xl font-medium border border-red-200 flex items-start gap-3 animate-slide-up">
          <i className="ri-error-warning-fill text-xl mt-0.5 text-red-500"></i>
          <div>
            <h4 className="font-bold text-red-800 text-sm mb-1">Monthly Expenditure Limit Exceeded</h4>
            <p className="text-xs text-red-700">You have currently spent ₹{globalLimitData?.current_spent?.toFixed(2)} this month, which is over your set limit of ₹{globalLimitData?.limit?.toFixed(2)}.</p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {summaryCards.map((card, i) => (
          <div
            key={i}
            className={`summary-card glass-card p-5 border ${card.border}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-surface-400 font-medium">
                {card.label}
              </span>
              <div
                className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center`}
              >
                <i className={`${card.icon} ${card.color} text-lg`} />
              </div>
            </div>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-surface-800">
              Recent Activity
            </h2>
          </div>
          {activity.length === 0 ? (
            <p className="text-sm text-surface-400 text-center py-8">
              No activity yet. Add expenses or settle up to see activity here.
            </p>
          ) : (
            <div className="space-y-3">
              {activity.map((item, i) => {
                const style = getActivityIcon(item.entry_type);
                return (
                  <div
                    key={item.id || i}
                    className="activity-item flex items-start gap-3 py-3 px-3 rounded-xl hover:bg-surface-50 transition-colors"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg ${style.color} flex items-center justify-center flex-shrink-0 mt-0.5`}
                    >
                      <i className={`${style.icon} text-sm`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-surface-700 leading-snug">
                        {item.description ||
                          `${item.from_user?.display_name || item.from_user?.email?.split("@")[0] || "Someone"} → ${item.to_user?.display_name || item.to_user?.email?.split("@")[0] || "Someone"}: ₹${item.amount}`}
                      </p>
                      <p className="text-xs text-surface-400 mt-0.5">
                        {timeAgo(item.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-surface-800 mb-5">
            Quick Actions
          </h2>
          <div className="space-y-3">
            {[
              {
                icon: "ri-add-circle-line",
                label: "Add Expense",
                desc: "Record a new shared expense",
                color: "from-brand-500 to-brand-700",
                href: "/expenses",
              },
              {
                icon: "ri-group-line",
                label: "Create Group",
                desc: "Start a new expense group",
                color: "from-accent-teal to-emerald-600",
                href: "/groups",
              },
              {
                icon: "ri-user-add-line",
                label: "Add Friend",
                desc: "Search user ID or email",
                color: "from-purple-500 to-indigo-600",
                href: "/friends",
              },
              {
                icon: "ri-hand-coin-line",
                label: "Settle Up",
                desc: "Settle outstanding balances",
                color: "from-amber-500 to-orange-600",
                href: "/settlements",
              },
            ].map((action, i) => (
              <button
                key={i}
                onClick={() => router.push(action.href)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface-50 transition-all text-left group"
              >
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center group-hover:scale-105 transition-transform`}
                >
                  <i className={`${action.icon} text-white text-lg`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-surface-700">
                    {action.label}
                  </p>
                  <p className="text-xs text-surface-400">{action.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
