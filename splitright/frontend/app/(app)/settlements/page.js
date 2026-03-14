"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";

export default function SettlementsPage() {
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/v1/settlements/");
      setSettlements(res.data);
    } catch (err) {
      console.error("Error fetching settlements:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleMarkPaid = async (id) => {
    setActionStatus("");
    try {
      await api.post(`/api/v1/settlements/${id}/mark_completed/`);
      setActionStatus("Settlement marked as paid!");
      fetchData();
    } catch (err) {
      setActionStatus(
        err.response?.data?.error || "Error marking as paid",
      );
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const pendingCount = settlements.filter((s) => s.status === "pending").length;
  const totalExpenses = settlements.length;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-surface-900 tracking-tight">
          Settlements
        </h1>
        <p className="text-surface-400 mt-1">
          Optimized settlement plan — minimum transfers computed.
        </p>
      </div>

      {actionStatus && (
        <div className="p-4 mb-6 bg-brand-50 text-brand-700 rounded-xl font-medium border border-brand-100">
          {actionStatus}
        </div>
      )}

      {/* Algorithm Info */}
      <div className="glass-card p-5 mb-6 flex items-center gap-4 border border-brand-100">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0">
          <i className="ri-flashlight-line text-white text-xl" />
        </div>
        <div>
          <p className="font-semibold text-surface-800 text-sm">
            Min Cash Flow Algorithm
          </p>
          <p className="text-xs text-surface-400">
            Greedy min-heap debt graph reduction · O(n log n) ·{" "}
            <span className="text-brand-600 font-medium">
              {pendingCount} pending
            </span>{" "}
            transfers from {totalExpenses} total
          </p>
        </div>
      </div>

      {/* Settlement Cards */}
      {settlements.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <p className="text-surface-500">
            No settlements yet. Settlements are created when expenses are
            recorded in groups.
          </p>
        </div>
      ) : (
        <div className="space-y-3 mb-10">
          {settlements.map((s) => {
            const fromName =
              s.from_user?.display_name ||
              s.from_user?.email?.split("@")[0] ||
              "—";
            const toName =
              s.to_user?.display_name ||
              s.to_user?.email?.split("@")[0] ||
              "—";
            return (
              <div
                key={s.id}
                className="glass-card p-5 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center text-xs font-bold text-rose-600">
                      {fromName[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-surface-700">
                      {fromName}
                    </span>
                  </div>
                  <i className="ri-arrow-right-line text-surface-300" />
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-600">
                      {toName[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-surface-700">
                      {toName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-bold text-surface-800">
                      {formatCurrency(s.amount)}
                    </p>
                    <p className="text-xs text-surface-400">
                      {s.notes || "Settlement"}
                    </p>
                  </div>
                  {s.status === "pending" ? (
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-brand-700 text-white text-xs font-semibold hover:shadow-md transition-all">
                        <i className="ri-bank-card-line mr-1" />
                        Pay
                      </button>
                      <button
                        onClick={() => handleMarkPaid(s.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-semibold hover:bg-emerald-100 transition-all"
                      >
                        <i className="ri-check-line mr-1" />
                        Mark Paid
                      </button>
                    </div>
                  ) : (
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-semibold">
                      <i className="ri-check-double-line mr-1" />
                      Settled
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Payment methods */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-surface-800 mb-4">
          Payment Methods
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              icon: "ri-bank-card-line",
              label: "Razorpay",
              desc: "Cards, NetBanking, Wallets",
              color: "from-blue-500 to-indigo-600",
            },
            {
              icon: "ri-smartphone-line",
              label: "UPI Deep-link",
              desc: "GPay, PhonePe, Paytm",
              color: "from-emerald-500 to-teal-600",
            },
            {
              icon: "ri-hand-coin-line",
              label: "Manual",
              desc: "Cash or bank transfer",
              color: "from-amber-500 to-orange-600",
            },
          ].map((method, i) => (
            <div
              key={i}
              className="p-4 rounded-xl border border-surface-100 hover:border-brand-200 transition-all cursor-pointer group"
            >
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${method.color} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}
              >
                <i className={`${method.icon} text-white text-lg`} />
              </div>
              <p className="text-sm font-semibold text-surface-700">
                {method.label}
              </p>
              <p className="text-xs text-surface-400">{method.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
