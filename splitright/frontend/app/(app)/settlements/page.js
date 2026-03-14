"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";

export default function SettlementsPage() {
  const [settlements, setSettlements] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState("");
  const [payingId, setPayingId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSettlement, setNewSettlement] = useState({
    email: "",
    amount: "",
    notes: "",
    groupId: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [settlementsRes, groupsRes] = await Promise.all([
        api.get("/api/v1/settlements/"),
        api.get("/api/v1/groups/"),
      ]);
      setSettlements(settlementsRes.data);
      setGroups(groupsRes.data);
      if (groupsRes.data.length > 0 && !newSettlement.groupId) {
        setNewSettlement((prev) => ({ ...prev, groupId: groupsRes.data[0].id }));
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSettlement = async (e) => {
    e.preventDefault();
    setActionStatus("");
    try {
      await api.post("/api/v1/settlements/create_manual/", {
        email: newSettlement.email,
        amount: parseFloat(newSettlement.amount),
        notes: newSettlement.notes,
        group_id: newSettlement.groupId,
      });
      setActionStatus("✅ Settlement created successfully!");
      setShowCreateForm(false);
      setNewSettlement({ email: "", amount: "", notes: "", groupId: groups[0]?.id || "" });
      fetchData();
    } catch (err) {
      setActionStatus(err.response?.data?.error || "Error creating settlement");
    }
  };

  const handleMarkPaid = async (id) => {
    setActionStatus("");
    try {
      await api.post(`/api/v1/settlements/${id}/mark_completed/`);
      setActionStatus("✅ Settlement marked as paid!");
      fetchData();
    } catch (err) {
      setActionStatus(err.response?.data?.error || "Error marking as paid");
    }
  };

  const handleRazorpayPay = async (settlement) => {
    setPayingId(settlement.id);
    setActionStatus("");

    try {
      const orderRes = await api.post(`/api/v1/settlements/${settlement.id}/create_order/`);
      const { order_id, amount, currency, key_id } = orderRes.data;

      const options = {
        key: key_id,
        amount: amount,
        currency: currency,
        name: "SplitRight",
        description: `Settlement: ${settlement.notes || "Payment"}`,
        order_id: order_id,
        handler: async function (response) {
          try {
            await api.post(`/api/v1/settlements/${settlement.id}/verify_payment/`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setActionStatus("✅ Payment successful! Settlement completed.");
            fetchData();
          } catch (err) {
            setActionStatus("❌ Payment verification failed. Contact support.");
          } finally {
            setPayingId(null);
          }
        },
        modal: {
          ondismiss: function () {
            setPayingId(null);
            setActionStatus("Payment cancelled.");
          },
        },
        prefill: {
          email: settlement.from_user?.email || "",
        },
        theme: {
          color: "#4F46E5",
        },
      };

      if (typeof window !== "undefined" && window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", function (response) {
          setActionStatus(`❌ Payment failed: ${response.error.description}`);
          setPayingId(null);
        });
        rzp.open();
      } else {
        setActionStatus("Razorpay is loading. Please try again in a moment.");
        setPayingId(null);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Failed to create payment order";
      setActionStatus(errorMsg);
      setPayingId(null);
    }
  };

  const handleUPIPay = (settlement) => {
    const toName =
      settlement.to_user?.display_name ||
      settlement.to_user?.email?.split("@")[0] ||
      "SplitRight";
    const amount = Number(settlement.amount).toFixed(2);
    const upiUrl = `upi://pay?pa=&pn=${encodeURIComponent(toName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`SplitRight - ${settlement.notes || "Payment"}`)}`;
    const link = document.createElement("a");
    link.href = upiUrl;
    link.click();
    setActionStatus(
      `UPI payment initiated for ${formatCurrency(settlement.amount)} to ${toName}. After payment, click "Mark Paid" to confirm.`
    );
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
  const completedCount = settlements.filter((s) => s.status === "completed").length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-surface-900 tracking-tight">
            Settlements
          </h1>
          <p className="text-surface-400 mt-1">
            Optimized settlement plan — minimum transfers computed.
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn-primary text-sm"
        >
          <i className="ri-add-line mr-1" />
          {showCreateForm ? "Cancel" : "New Settlement"}
        </button>
      </div>

      {actionStatus && (
        <div className={`p-4 mb-6 rounded-xl font-medium border ${
          actionStatus.includes("✅")
            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
            : actionStatus.includes("❌")
            ? "bg-red-50 text-red-700 border-red-100"
            : "bg-brand-50 text-brand-700 border-brand-100"
        }`}>
          {actionStatus}
        </div>
      )}

      {/* Create Settlement Form */}
      {showCreateForm && (
        <form onSubmit={handleCreateSettlement} className="glass-card p-6 mb-6 animate-slide-up">
          <h3 className="text-lg font-semibold text-surface-800 mb-4">
            Create Manual Settlement
          </h3>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-surface-600 mb-1 block">Who owes you? (email)</label>
              <input type="email" placeholder="friend@example.com" value={newSettlement.email}
                onChange={(e) => setNewSettlement({ ...newSettlement, email: e.target.value })} required
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-all text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-surface-600 mb-1 block">Amount (₹)</label>
              <input type="number" placeholder="0.00" value={newSettlement.amount}
                onChange={(e) => setNewSettlement({ ...newSettlement, amount: e.target.value })} required min="1"
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-all text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-surface-600 mb-1 block">Group</label>
              <select value={newSettlement.groupId}
                onChange={(e) => setNewSettlement({ ...newSettlement, groupId: e.target.value })} required
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-all text-sm bg-white">
                {groups.length === 0 ? (
                  <option value="">No groups — create one first</option>
                ) : (
                  groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)
                )}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-surface-600 mb-1 block">Note (optional)</label>
              <input type="text" placeholder="e.g., Dinner split" value={newSettlement.notes}
                onChange={(e) => setNewSettlement({ ...newSettlement, notes: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-all text-sm" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="btn-primary text-sm">Create Settlement</button>
            <button type="button" onClick={() => setShowCreateForm(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </form>
      )}

      {/* Stats */}
      <div className="glass-card p-5 mb-6 flex items-center gap-4 border border-brand-100">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0">
          <i className="ri-flashlight-line text-white text-xl" />
        </div>
        <div>
          <p className="font-semibold text-surface-800 text-sm">Min Cash Flow Algorithm</p>
          <p className="text-xs text-surface-400">
            <span className="text-brand-600 font-medium">{pendingCount} pending</span> ·{" "}
            <span className="text-emerald-600 font-medium">{completedCount} settled</span> ·{" "}
            {settlements.length} total transfers
          </p>
        </div>
      </div>

      {/* Settlement Cards */}
      {settlements.length === 0 ? (
        <div className="glass-card p-10 text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-4">
            <i className="ri-exchange-funds-line text-surface-400 text-2xl" />
          </div>
          <p className="text-surface-600 font-medium mb-1">No settlements yet</p>
          <p className="text-surface-400 text-sm mb-4">
            Click <strong>"New Settlement"</strong> above to create one, or add expenses to groups with 2+ members.
          </p>
        </div>
      ) : (
        <div className="space-y-4 mb-10">
          {settlements.map((s) => {
            const fromName = s.from_user?.display_name || s.from_user?.email?.split("@")[0] || "—";
            const toName = s.to_user?.display_name || s.to_user?.email?.split("@")[0] || "—";
            return (
              <div key={s.id} className="glass-card overflow-hidden">
                {/* Settlement Info */}
                <div className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center text-xs font-bold text-rose-600">
                        {fromName[0]?.toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-surface-700">{fromName}</span>
                    </div>
                    <i className="ri-arrow-right-line text-surface-300" />
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-600">
                        {toName[0]?.toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-surface-700">{toName}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-surface-800">{formatCurrency(s.amount)}</p>
                    <p className="text-xs text-surface-400">{s.notes || "Settlement"}</p>
                  </div>
                </div>

                {/* Payment Buttons — ALWAYS VISIBLE for pending settlements */}
                {s.status === "pending" ? (
                  <div className="px-5 pb-5 border-t border-surface-100 pt-4">
                    <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">
                      Pay via
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {/* Razorpay */}
                      <button
                        onClick={() => handleRazorpayPay(s)}
                        disabled={payingId === s.id}
                        className="p-3 rounded-xl border-2 border-surface-100 hover:border-blue-400 hover:bg-blue-50 transition-all text-center group disabled:opacity-50"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                          <i className="ri-bank-card-line text-white text-lg" />
                        </div>
                        <p className="text-xs font-semibold text-surface-700">
                          {payingId === s.id ? "Processing..." : "Razorpay"}
                        </p>
                        <p className="text-[10px] text-surface-400">Cards · NetBanking · Wallets</p>
                      </button>

                      {/* UPI */}
                      <button
                        onClick={() => handleUPIPay(s)}
                        className="p-3 rounded-xl border-2 border-surface-100 hover:border-emerald-400 hover:bg-emerald-50 transition-all text-center group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                          <i className="ri-smartphone-line text-white text-lg" />
                        </div>
                        <p className="text-xs font-semibold text-surface-700">UPI</p>
                        <p className="text-[10px] text-surface-400">GPay · PhonePe · Paytm</p>
                      </button>

                      {/* Manual */}
                      <button
                        onClick={() => handleMarkPaid(s.id)}
                        className="p-3 rounded-xl border-2 border-surface-100 hover:border-amber-400 hover:bg-amber-50 transition-all text-center group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                          <i className="ri-hand-coin-line text-white text-lg" />
                        </div>
                        <p className="text-xs font-semibold text-surface-700">Mark Paid</p>
                        <p className="text-[10px] text-surface-400">Cash · Bank Transfer</p>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="px-5 pb-4 border-t border-surface-100 pt-3 flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-semibold">
                      <i className="ri-check-double-line mr-1" />
                      Settled
                    </span>
                    {s.completed_at && (
                      <span className="text-xs text-surface-400">
                        on {new Date(s.completed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Payment Methods Info — Always Visible */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-surface-800 mb-4">
          Supported Payment Methods
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-surface-100 hover:border-brand-200 transition-all">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-3">
              <i className="ri-bank-card-line text-white text-lg" />
            </div>
            <p className="text-sm font-semibold text-surface-700">Razorpay</p>
            <p className="text-xs text-surface-400">Credit/Debit Cards, NetBanking, Wallets, UPI via Razorpay checkout</p>
          </div>
          <div className="p-4 rounded-xl border border-surface-100 hover:border-brand-200 transition-all">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-3">
              <i className="ri-smartphone-line text-white text-lg" />
            </div>
            <p className="text-sm font-semibold text-surface-700">UPI Direct</p>
            <p className="text-xs text-surface-400">Opens GPay, PhonePe, or Paytm directly on your phone via UPI deep-link</p>
          </div>
          <div className="p-4 rounded-xl border border-surface-100 hover:border-brand-200 transition-all">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-3">
              <i className="ri-hand-coin-line text-white text-lg" />
            </div>
            <p className="text-sm font-semibold text-surface-700">Manual / Cash</p>
            <p className="text-xs text-surface-400">Paid offline? Mark the settlement as completed manually</p>
          </div>
        </div>
      </div>
    </div>
  );
}
