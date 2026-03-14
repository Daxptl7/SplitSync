"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [globalLimitData, setGlobalLimitData] = useState(null);
  const [loading, setLoading] = useState(true);
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
        return { icon: "ri-receipt-line", color: "text-indigo-600", bg: "bg-indigo-50" };
      case "settlement":
        return { icon: "ri-exchange-funds-line", color: "text-emerald-600", bg: "bg-emerald-50" };
      default:
        return { icon: "ri-file-list-line", color: "text-amber-600", bg: "bg-amber-50" };
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

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit", month: "2-digit", year: "numeric"
    }).replace(/\//g, '.');
  };

  if (loading) {
    return (
      <div className="p-8 text-center flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const activity = summary?.recent_activity || [];
  const netBalance = (summary?.owed_to_you || 0) - (summary?.you_owe || 0);

  // Limit progress
  const limitUsed = globalLimitData?.current_spent || 0;
  const limitMax = globalLimitData?.limit || 0;
  const limitPercent = limitMax > 0 ? Math.min((limitUsed / limitMax) * 100, 100) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header Area */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center border border-indigo-100">
            <i className="ri-dashboard-3-line text-indigo-600 text-xl" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-900 tracking-tight">
              Dashboard
            </h1>
            <p className="text-xs text-surface-400">Your financial overview at a glance</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/expenses")}
            className="bg-surface-900 hover:bg-black text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
          >
            <i className="ri-add-line" /> Add Expense
          </button>
        </div>
      </div>

      {/* Global Limit Warning Banner */}
      {globalLimitData?.limit_exceeded && (
        <div className="p-4 bg-red-50 text-red-700 rounded-2xl font-medium border border-red-200 flex items-start gap-3 animate-slide-up">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <i className="ri-error-warning-fill text-xl text-red-500"></i>
          </div>
          <div>
            <h4 className="font-bold text-red-800 text-sm mb-0.5">Monthly Limit Exceeded</h4>
            <p className="text-xs text-red-600">
              Spent ₹{limitUsed.toFixed(0)} of ₹{limitMax.toFixed(0)} limit this month. Consider settling debts or reducing expenses.
            </p>
          </div>
        </div>
      )}

      {/* Metric Cards — 2x2 grid, all visible */}
      <div className="grid grid-cols-2 gap-4 animate-slide-up">

        {/* Card 1: You Owe */}
        <div
          onClick={() => router.push("/settlements")}
          className="summary-card rounded-2xl border cursor-pointer transition-all overflow-hidden bg-white shadow-sm hover:shadow-md border-surface-200 group"
        >
          <div className="h-10 w-full bg-rose-500 flex items-center px-4">
            <span className="text-white text-xs font-semibold uppercase tracking-wider">You Owe</span>
          </div>
          <div className="p-5 flex items-end justify-between relative overflow-hidden">
            <div className="text-3xl font-extrabold text-surface-900 z-10">{formatCurrency(summary?.you_owe)}</div>
            <div className="flex items-center gap-1 bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full text-[10px] font-bold z-10">
              <i className="ri-arrow-up-line" /> Outgoing
            </div>
            <div className="absolute right-0 bottom-0 opacity-10">
              <svg width="100" height="60" viewBox="0 0 100 60"><path d="M0,60 C30,60 40,20 100,0 L100,60 Z" fill="currentColor" className="text-rose-500"/></svg>
            </div>
          </div>
        </div>

        {/* Card 2: Owed to You */}
        <div
          onClick={() => router.push("/settlements")}
          className="summary-card rounded-2xl border cursor-pointer transition-all overflow-hidden bg-white shadow-sm hover:shadow-md border-surface-200 group"
        >
          <div className="h-10 w-full bg-emerald-500 flex items-center px-4">
            <span className="text-white text-xs font-semibold uppercase tracking-wider">Owed to You</span>
          </div>
          <div className="p-5 flex items-end justify-between relative overflow-hidden">
            <div className="text-3xl font-extrabold text-surface-900 z-10">{formatCurrency(summary?.owed_to_you)}</div>
            <div className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold z-10">
              <i className="ri-arrow-down-line" /> Incoming
            </div>
            <div className="absolute right-0 bottom-0 opacity-10">
              <svg width="100" height="60" viewBox="0 0 100 60"><path d="M0,60 C30,60 40,30 100,10 L100,60 Z" fill="currentColor" className="text-emerald-500"/></svg>
            </div>
          </div>
        </div>

        {/* Card 3: Total Groups */}
        <div
          onClick={() => router.push("/groups")}
          className="summary-card rounded-2xl border cursor-pointer transition-all overflow-hidden bg-white shadow-sm hover:shadow-md border-surface-200 group"
        >
          <div className="h-10 w-full bg-indigo-500 flex items-center px-4">
            <span className="text-white text-xs font-semibold uppercase tracking-wider">Total Groups</span>
          </div>
          <div className="p-5 flex items-end justify-between relative overflow-hidden">
            <div className="text-4xl font-extrabold text-surface-900 z-10">{summary?.total_groups || 0}</div>
            <div className="flex items-center gap-1 bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-bold z-10">
              <i className="ri-group-line" /> Active
            </div>
            <div className="absolute right-0 bottom-0 opacity-10">
              <svg width="100" height="60" viewBox="0 0 100 60"><path d="M0,60 C40,60 50,40 100,20 L100,60 Z" fill="currentColor" className="text-indigo-500"/></svg>
            </div>
          </div>
        </div>

        {/* Card 4: This Month */}
        <div
          onClick={() => router.push("/expenses")}
          className="summary-card rounded-2xl border cursor-pointer transition-all overflow-hidden bg-white shadow-sm hover:shadow-md border-surface-200 group"
        >
          <div className="h-10 w-full bg-amber-400 flex items-center px-4">
            <span className="text-surface-800 text-xs font-semibold uppercase tracking-wider">This Month</span>
          </div>
          <div className="p-5 flex items-end justify-between relative overflow-hidden">
            <div className="text-3xl font-extrabold text-surface-900 z-10">{formatCurrency(summary?.this_month_expenses)}</div>
            <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold z-10">
              <i className="ri-calendar-check-line" /> Spent
            </div>
            <div className="absolute right-0 bottom-0 opacity-10">
              <svg width="100" height="60" viewBox="0 0 100 60"><path d="M0,60 C20,60 60,10 100,0 L100,60 Z" fill="currentColor" className="text-amber-500"/></svg>
            </div>
          </div>
        </div>
      </div>

      {/* Net Balance + Expenditure Limit Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Net Balance Card */}
        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
          <div className="p-5 flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              netBalance >= 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-rose-500 to-red-600'
            }`}>
              <i className={`${netBalance >= 0 ? 'ri-arrow-up-circle-line' : 'ri-arrow-down-circle-line'} text-white text-2xl`} />
            </div>
            <div className="flex-1">
              <p className="text-xs text-surface-400 font-semibold uppercase tracking-wider mb-1">Net Balance</p>
              <p className={`text-2xl font-extrabold ${netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {netBalance >= 0 ? '+' : ''}{formatCurrency(netBalance)}
              </p>
            </div>
            <div className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              netBalance >= 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
            }`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${netBalance >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              {netBalance >= 0 ? 'Positive' : 'Negative'}
            </div>
          </div>
        </div>

        {/* Expenditure Limit Card */}
        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
          <div className="p-5 flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              limitPercent >= 100 ? 'bg-gradient-to-br from-red-500 to-rose-600' :
              limitPercent >= 75 ? 'bg-gradient-to-br from-amber-500 to-orange-600' :
              'bg-gradient-to-br from-indigo-500 to-blue-600'
            }`}>
              <i className="ri-speed-line text-white text-2xl" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-surface-400 font-semibold uppercase tracking-wider mb-1.5">Monthly Limit</p>
              {limitMax > 0 ? (
                <>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-extrabold text-surface-900">₹{limitUsed.toFixed(0)}</span>
                    <span className="text-xs text-surface-400 font-medium">/ ₹{limitMax.toFixed(0)}</span>
                  </div>
                  <div className="w-full bg-surface-100 rounded-full h-2 mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        limitPercent >= 100 ? 'bg-gradient-to-r from-red-500 to-rose-500' :
                        limitPercent >= 75 ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                        'bg-gradient-to-r from-indigo-400 to-blue-500'
                      }`}
                      style={{ width: `${limitPercent}%` }}
                    />
                  </div>
                </>
              ) : (
                <p className="text-sm text-surface-400">No limit set — <button onClick={() => router.push("/profile")} className="text-indigo-600 font-semibold hover:underline">configure</button></p>
              )}
            </div>
            {limitMax > 0 && (
              <div className={`px-3 py-1.5 rounded-full text-[10px] font-bold ${
                limitPercent >= 100 ? 'bg-red-50 text-red-600 border border-red-200' :
                limitPercent >= 75 ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                'bg-indigo-50 text-indigo-600 border border-indigo-200'
              }`}>
                {limitPercent.toFixed(0)}%
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Grid: Recent Activity Table + Quick Actions */}
      <div className="grid lg:grid-cols-5 gap-6 animate-slide-up">

        {/* Recent Activity — Table style like Friends page */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="p-4 border-b border-surface-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                <i className="ri-pulse-line text-indigo-600 text-sm" />
              </div>
              <h2 className="font-bold text-surface-900 text-sm">Recent Activity</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-surface-400 font-semibold">{activity.length} events</span>
              <div className="w-px h-4 bg-surface-200" />
              <button
                onClick={() => router.push("/expenses")}
                className="flex items-center gap-1 text-indigo-600 font-semibold text-xs hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors"
              >
                View all <i className="ri-arrow-right-s-line" />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {activity.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-4">
                  <i className="ri-file-list-line text-surface-300 text-3xl" />
                </div>
                <p className="text-sm font-semibold text-surface-500 mb-1">No activity yet</p>
                <p className="text-xs text-surface-400">Add expenses or settle up to see activity here.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-100">
                    <th className="py-3 px-4 text-[10px] font-bold text-surface-400 uppercase tracking-wider w-10"></th>
                    <th className="py-3 pr-4 text-[10px] font-bold text-surface-400 uppercase tracking-wider">Description</th>
                    <th className="py-3 pr-4 text-[10px] font-bold text-surface-400 uppercase tracking-wider">Amount</th>
                    <th className="py-3 pr-4 text-[10px] font-bold text-surface-400 uppercase tracking-wider">Type</th>
                    <th className="py-3 pr-4 text-[10px] font-bold text-surface-400 uppercase tracking-wider text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-50 text-sm">
                  {activity.slice(0, 8).map((item, i) => {
                    const style = getActivityIcon(item.entry_type);
                    const description = item.description ||
                      `${item.from_user?.display_name || item.from_user?.email?.split("@")[0] || "Someone"} → ${item.to_user?.display_name || item.to_user?.email?.split("@")[0] || "Someone"}`;
                    return (
                      <tr key={item.id || i} className="activity-item hover:bg-surface-50 transition-colors">
                        <td className="py-3 px-4 align-middle">
                          <div className={`w-8 h-8 rounded-lg ${style.bg} flex items-center justify-center`}>
                            <i className={`${style.icon} ${style.color} text-sm`} />
                          </div>
                        </td>
                        <td className="py-3 pr-4 align-middle">
                          <p className="text-sm font-semibold text-surface-800 truncate max-w-[220px]">{description}</p>
                        </td>
                        <td className="py-3 pr-4 align-middle">
                          <span className="font-bold text-surface-900">₹{item.amount}</span>
                        </td>
                        <td className="py-3 pr-4 align-middle">
                          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                            item.entry_type === "expense"
                              ? "text-indigo-700 bg-indigo-50 border-indigo-200"
                              : "text-emerald-700 bg-emerald-50 border-emerald-200"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              item.entry_type === "expense" ? "bg-indigo-500" : "bg-emerald-500"
                            }`} />
                            {item.entry_type || "Other"}
                          </div>
                        </td>
                        <td className="py-3 pr-4 align-middle text-right">
                          <span className="text-xs text-surface-400 font-medium">{timeAgo(item.created_at)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer pagination (static) */}
          {activity.length > 0 && (
            <div className="px-4 py-3 border-t border-surface-100 flex items-center justify-between">
              <div className="text-xs text-surface-400 font-semibold">
                Showing {Math.min(8, activity.length)} of {activity.length} events
              </div>
              <div className="flex items-center gap-1">
                <button className="hover:text-surface-700 cursor-pointer disabled:opacity-50 inline-flex text-surface-400" disabled>
                  <i className="ri-arrow-left-s-line" />
                </button>
                <button className="hover:text-surface-700 cursor-pointer disabled:opacity-50 inline-flex text-surface-400" disabled>
                  <i className="ri-arrow-right-s-line" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions Panel */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-surface-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-surface-100 rounded-lg flex items-center justify-center">
              <i className="ri-flashlight-line text-surface-600 text-sm" />
            </div>
            <h2 className="font-bold text-surface-900 text-sm">Quick Actions</h2>
          </div>
          <div className="p-4 space-y-2">
            {[
              {
                icon: "ri-add-circle-line",
                label: "Add Expense",
                desc: "Record a new shared expense",
                color: "from-indigo-500 to-blue-600",
                ringColor: "hover:ring-indigo-300",
                href: "/expenses",
              },
              {
                icon: "ri-group-line",
                label: "Create Group",
                desc: "Start a new expense group",
                color: "from-emerald-500 to-teal-600",
                ringColor: "hover:ring-emerald-300",
                href: "/groups",
              },
              {
                icon: "ri-user-add-line",
                label: "Add Friend",
                desc: "Search user ID or email",
                color: "from-purple-500 to-indigo-600",
                ringColor: "hover:ring-purple-300",
                href: "/friends",
              },
              {
                icon: "ri-hand-coin-line",
                label: "Settle Up",
                desc: "Settle outstanding balances",
                color: "from-amber-500 to-orange-600",
                ringColor: "hover:ring-amber-300",
                href: "/settlements",
              },
              {
                icon: "ri-user-settings-line",
                label: "Profile & Settings",
                desc: "Set limits, manage account",
                color: "from-slate-500 to-slate-700",
                ringColor: "hover:ring-slate-300",
                href: "/profile",
              },
            ].map((action, i) => (
              <button
                key={i}
                onClick={() => router.push(action.href)}
                className={`quick-action-card w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface-50 transition-all text-left group hover:ring-2 ${action.ringColor} ring-offset-1`}
              >
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm`}
                >
                  <i className={`${action.icon} text-white text-lg`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-surface-800">{action.label}</p>
                  <p className="text-[11px] text-surface-400 truncate">{action.desc}</p>
                </div>
                <i className="ri-arrow-right-s-line text-surface-300 group-hover:text-surface-600 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
