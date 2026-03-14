"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";

export default function SettlementsPage() {
  const [settlements, setSettlements] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState("");
  const [payingId, setPayingId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
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
      setActionStatus("Settlement created successfully!");
      setShowCreateModal(false);
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
      setActionStatus("Settlement marked as paid!");
      fetchData();
    } catch (err) {
      setActionStatus("Error marking as paid: " + err.response?.data?.error);
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
            setActionStatus("Payment successful! Settlement completed.");
            fetchData();
          } catch (err) {
            setActionStatus("Payment verification failed. Contact support.");
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
          color: "#4F46E5", // Indigo 600
        },
      };

      if (typeof window !== "undefined" && window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", function (response) {
          setActionStatus(`Payment failed: ${response.error.description}`);
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
      <div className="p-8 text-center flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const pendingCount = settlements.filter((s) => s.status === "pending").length;
  const completedCount = settlements.filter((s) => s.status === "completed").length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header Area */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center border border-indigo-100">
            <i className="ri-exchange-funds-line text-indigo-600 text-xl" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-900 tracking-tight">
              Settlements
            </h1>
            <p className="text-xs text-surface-400">Optimized cash flows. Settle up securely.</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-surface-900 hover:bg-black text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
        >
          <i className="ri-add-line" /> New
        </button>
      </div>

      {actionStatus && (
        <div className={`p-4 rounded-xl font-medium border flex items-center gap-2 animate-slide-up ${
          actionStatus.includes("Error") || actionStatus.includes("failed") 
            ? "bg-red-50 text-red-700 border-red-100" 
            : "bg-emerald-50 text-emerald-700 border-emerald-100"
        }`}>
          <i className={actionStatus.includes("Error") || actionStatus.includes("failed") ? "ri-error-warning-line text-lg" : "ri-check-line text-lg"} />
          {actionStatus}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="summary-card rounded-2xl border transition-all overflow-hidden bg-white shadow-sm hover:shadow-md border-surface-200 group">
          <div className="h-10 w-full bg-amber-500 flex items-center px-4">
            <span className="text-white text-xs font-semibold uppercase tracking-wider">Pending</span>
          </div>
          <div className="p-5 flex items-end justify-between relative overflow-hidden">
            <div className="text-4xl font-extrabold text-surface-900 z-10">{pendingCount}</div>
            <div className="flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px] font-bold z-10">
              <i className="ri-time-line" /> Awaiting
            </div>
            <div className="absolute right-0 bottom-0 opacity-10">
              <svg width="100" height="60" viewBox="0 0 100 60"><path d="M0,60 C30,60 40,20 100,0 L100,60 Z" fill="currentColor" className="text-amber-500"/></svg>
            </div>
          </div>
        </div>
        
        <div className="summary-card rounded-2xl border transition-all overflow-hidden bg-white shadow-sm hover:shadow-md border-surface-200 group">
          <div className="h-10 w-full bg-emerald-500 flex items-center px-4">
            <span className="text-white text-xs font-semibold uppercase tracking-wider">Settled</span>
          </div>
          <div className="p-5 flex items-end justify-between relative overflow-hidden">
            <div className="text-4xl font-extrabold text-surface-900 z-10">{completedCount}</div>
            <div className="flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold z-10">
              <i className="ri-check-double-line" /> Completed
            </div>
            <div className="absolute right-0 bottom-0 opacity-10">
              <svg width="100" height="60" viewBox="0 0 100 60"><path d="M0,60 C40,60 50,40 100,20 L100,60 Z" fill="currentColor" className="text-emerald-500"/></svg>
            </div>
          </div>
        </div>
      </div>

      {/* Algorithm Banner */}
      <div className="bg-gradient-to-r from-surface-900 via-indigo-900 to-indigo-800 rounded-2xl p-5 flex items-center gap-4 text-white shadow-sm">
        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
          <i className="ri-flashlight-line text-2xl" />
        </div>
        <div>
          <h3 className="font-bold text-sm tracking-wide">Min Cash Flow Algorithm Active</h3>
          <p className="text-[11px] text-indigo-200 mt-1.5 leading-relaxed pr-4">
            SplitRight automatically minimizes the number of transactions required within your groups to settle debts optimally. The settlements shown below represent the absolute minimum paths to clear all balances.
          </p>
        </div>
      </div>

      {/* Settlements List */}
      <div className="space-y-4 pt-2">
        {settlements.length === 0 ? (
          <div className="bg-white border border-surface-200 rounded-2xl p-10 text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-4">
              <i className="ri-exchange-funds-line text-surface-400 text-2xl" />
            </div>
            <p className="text-surface-600 font-medium mb-1">No settlements yet</p>
            <p className="text-surface-400 text-[11px] max-w-sm mx-auto">
              If you have outstanding balanced inside groups, they will appear here as optimized settlement tasks. You can also manually create requests.
            </p>
          </div>
        ) : (
          settlements.map((s) => {
            const fromName = s.from_user?.display_name || s.from_user?.email?.split("@")[0] || "Someone";
            const toName = s.to_user?.display_name || s.to_user?.email?.split("@")[0] || "Someone";
            return (
              <div key={s.id} className="bg-white border border-surface-200 rounded-2xl overflow-hidden shadow-sm flex flex-col md:flex-row md:items-stretch transition-shadow hover:shadow-md">
                
                {/* Info Block */}
                <div className="flex-1 p-5 border-b md:border-b-0 md:border-r border-surface-100 flex flex-col justify-center bg-surface-50/30">
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex items-center gap-3 w-full">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-[10px] font-bold text-rose-600 border border-rose-200">
                          {fromName[0]?.toUpperCase()}
                        </div>
                        <span className="text-[10px] font-bold text-surface-600 mt-1 max-w-[60px] truncate text-center">{fromName}</span>
                      </div>
                      
                      <div className="flex-1 flex flex-col justify-center items-center h-full relative">
                        <div className="w-full h-px bg-surface-300 absolute top-1/2 -translate-y-1/2 z-0"></div>
                        <span className="relative z-10 bg-white px-2 py-0.5 rounded-md border border-surface-200 text-[10px] font-bold text-surface-500 uppercase tracking-wider flex items-center gap-1">
                          <i className="ri-arrow-right-line" /> Pays
                        </span>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-600 border border-emerald-200">
                          {toName[0]?.toUpperCase()}
                        </div>
                        <span className="text-[10px] font-bold text-surface-600 mt-1 max-w-[60px] truncate text-center">{toName}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xl font-extrabold text-surface-900 tracking-tight">{formatCurrency(s.amount)}</p>
                      <p className="text-[10px] font-bold text-surface-400 capitalize">{s.notes || "Settlement"}</p>
                    </div>
                  </div>
                </div>

                {/* Actions Block */}
                <div className="p-4 bg-white flex flex-col justify-center min-w-[280px]">
                  {s.status === "pending" ? (
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleRazorpayPay(s)}
                        disabled={payingId === s.id}
                        className="flex flex-col items-center justify-center p-2 rounded-xl border border-surface-200 hover:border-indigo-400 hover:bg-indigo-50 transition-colors group disabled:opacity-50"
                        title="Razorpay (Cards, NetBanking, UPI)"
                      >
                        <i className={`text-xl mb-1 ${payingId === s.id ? 'ri-loader-4-line animate-spin text-indigo-500' : 'ri-bank-card-fill text-indigo-500 group-hover:scale-110 transition-transform'}`} />
                        <span className="text-[10px] font-bold text-surface-600">{payingId === s.id ? 'Wait...' : 'Razorpay'}</span>
                      </button>

                      <button
                        onClick={() => handleUPIPay(s)}
                        className="flex flex-col items-center justify-center p-2 rounded-xl border border-surface-200 hover:border-emerald-400 hover:bg-emerald-50 transition-colors group"
                        title="Direct UPI (GPay, PhonePe)"
                      >
                        <i className="ri-smartphone-fill text-emerald-500 text-xl mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold text-surface-600">UPI App</span>
                      </button>

                      <button
                        onClick={() => handleMarkPaid(s.id)}
                        className="flex flex-col items-center justify-center p-2 rounded-xl border border-surface-200 hover:border-amber-400 hover:bg-amber-50 transition-colors group"
                        title="Mark as paid manually"
                      >
                        <i className="ri-hand-coin-fill text-amber-500 text-xl mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold text-surface-600">Mark Paid</span>
                      </button>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl flex items-center justify-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider w-full text-center">
                        <i className="ri-check-double-line text-lg" />
                        <span>Completed</span>
                        {s.completed_at && (
                          <span className="text-[10px] font-medium opacity-70 ml-1 lowercase tracking-normal">
                             ({new Date(s.completed_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })})
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Manual Settlement Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white max-w-sm w-full rounded-2xl shadow-xl overflow-hidden animate-slide-up">
            <div className="p-4 border-b border-surface-100 bg-surface-50 flex items-center justify-between">
              <h3 className="font-bold text-surface-900 flex items-center gap-2">
                <i className="ri-hand-coin-line text-indigo-500" /> New Settlement Check
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-surface-400 hover:text-surface-600 transition-colors">
                <i className="ri-close-line text-xl" />
              </button>
            </div>
            <div className="p-5">
              <form onSubmit={handleCreateSettlement} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-surface-500 block mb-1">Who owes you? (Email)</label>
                  <input type="email" placeholder="friend@example.com" value={newSettlement.email}
                    onChange={(e) => setNewSettlement({ ...newSettlement, email: e.target.value })} required
                    className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:border-indigo-400 outline-none text-sm transition-colors" />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-surface-500 block mb-1">Amount (₹)</label>
                  <input type="number" placeholder="0.00" value={newSettlement.amount} min="1"
                    onChange={(e) => setNewSettlement({ ...newSettlement, amount: e.target.value })} required
                    className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:border-indigo-400 outline-none text-sm transition-colors text-indigo-700 font-bold" />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-surface-500 block mb-1">Group</label>
                  <select value={newSettlement.groupId}
                    onChange={(e) => setNewSettlement({ ...newSettlement, groupId: e.target.value })} required
                    className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:border-indigo-400 outline-none text-sm transition-colors appearance-none">
                    {groups.length === 0 ? (
                      <option value="">No groups</option>
                    ) : (
                      groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-surface-500 block mb-1">Note (Optional)</label>
                  <input type="text" placeholder="e.g. Dinner split" value={newSettlement.notes}
                    onChange={(e) => setNewSettlement({ ...newSettlement, notes: e.target.value })}
                    className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:border-indigo-400 outline-none text-sm transition-colors" />
                </div>
                
                <div className="pt-2">
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg transition-colors text-sm shadow-sm">
                    Create Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
