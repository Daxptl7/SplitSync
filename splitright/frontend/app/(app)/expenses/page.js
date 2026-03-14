"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const SPLIT_MODES = [
  "equal",
  "percentage",
  "share",
  "payer_excluded",
];

const SPLIT_LABELS = {
  equal: "Equal Split",
  percentage: "By Percentage",
  share: "By Exact Share",
  payer_excluded: "Exclude Payer",
};

export default function ExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSplit, setSelectedSplit] = useState("equal");
  const [actionStatus, setActionStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newGroupId, setNewGroupId] = useState("");
  const [newDate, setNewDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [splitData, setSplitData] = useState({});

  const [globalLimitData, setGlobalLimitData] = useState(null);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const limitStatusRes = await api.get("/api/v1/expenses/limit_status/");
      setGlobalLimitData(limitStatusRes.data);

      const groupsRes = await api.get("/api/v1/groups/");
      setGroups(groupsRes.data);

      if (groupsRes.data.length > 0 && !newGroupId) {
        setNewGroupId(groupsRes.data[0].id);
      }

      if (groupsRes.data.length > 0) {
        const expensesRes = await api.get("/api/v1/expenses/");
        const exps = expensesRes.data;
        exps.sort((a,b) => new Date(b.date) - new Date(a.date));
        setExpenses(exps);
      } else {
        setExpenses([]);
      }

    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const [showRiskAlert, setShowRiskAlert] = useState(false);
  const [highRiskUsers, setHighRiskUsers] = useState([]);
  const [skipRiskCheck, setSkipRiskCheck] = useState(false);

  const [showLimitAlert, setShowLimitAlert] = useState(false);
  const [limitData, setLimitData] = useState(null);
  const [skipLimitCheck, setSkipLimitCheck] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user]);

  useEffect(() => {
    if (selectedSplit === "percentage" && newGroupId) {
      const group = groups.find(g => g.id === parseInt(newGroupId));
      if (group && group.members) {
        const count = group.members.length;
        const equalPct = (100 / count).toFixed(2);
        const initial = {};
        group.members.forEach(m => {
          initial[m.user.id] = equalPct;
        });
        setSplitData(initial);
      }
    } else {
      setSplitData({});
    }
  }, [selectedSplit, newGroupId, groups]);

  const validateAndAddExpense = async (e) => {
    if (e) e.preventDefault();
    setActionStatus("");
    if (!user) return;

    if (!skipLimitCheck) {
      try {
        const limitRes = await api.post("/api/v1/expenses/check_limit/", {
          group_id: newGroupId,
          amount: parseFloat(newAmount),
          split_type: selectedSplit,
          split_data: splitData
        });
        
        if (limitRes.data && limitRes.data.limit_exceeded) {
          setLimitData(limitRes.data);
          setShowLimitAlert(true);
          return; 
        }
      } catch (err) {
        console.error("Error checking expenditure limit:", err);
      }
    }

    if (!skipRiskCheck) {
      try {
        const riskRes = await api.get(`/api/v1/settlements/group_risk/?group_id=${newGroupId}`);
        const risks = riskRes.data || [];
        const highRisk = risks.filter(r => r.risk_score > -1);
        
        if (highRisk.length > 0) {
          setHighRiskUsers(highRisk);
          setShowRiskAlert(true);
          return; 
        }
      } catch (err) {
        console.error("Error fetching risk scores:", err);
      }
    }

    await createExpense();
  };

  const createExpense = async () => {
    try {
      await api.post("/api/v1/expenses/", {
        group_id: newGroupId,
        description: newDesc,
        total_amount: parseFloat(newAmount),
        split_type: selectedSplit,
        split_data: splitData,
        date: newDate,
      });
      
      setShowAddModal(false);
      setShowRiskAlert(false);
      setSkipRiskCheck(false);
      setNewDesc("");
      setNewAmount("");
      setSelectedSplit("equal");
      setSplitData({});
      setActionStatus("Expense added successfully!");
      fetchData();
    } catch (err) {
      console.error("Create expense error:", err.response?.data || err.message);
      setActionStatus("Error adding expense: " + (err.response?.data?.error || "Check your inputs"));
    }
  };

  const formatCurrency = (amount, currency = "INR") => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit", month: "2-digit", year: "numeric",
    }).replace(/\//g, '.');
  };

  if (loading) {
    return (
      <div className="p-8 text-center flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  // Metrics
  const totalExpenses = expenses.length;
  const currentMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const filteredExpenses = expenses.filter(e => 
    e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.created_by?.first_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header Area */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center border border-indigo-100">
            <i className="ri-receipt-line text-indigo-600 text-xl" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-900 tracking-tight">
              Expenses
            </h1>
            <p className="text-xs text-surface-400">Track and manage all your shared costs</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-surface-900 hover:bg-black text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
        >
          <i className="ri-add-line" /> Add Expense
        </button>
      </div>

      {globalLimitData?.limit_exceeded && (
        <div className="p-4 bg-red-50 text-red-700 rounded-2xl font-medium border border-red-200 flex items-start gap-3 animate-slide-up">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <i className="ri-error-warning-fill text-xl text-red-500"></i>
          </div>
          <div>
            <h4 className="font-bold text-red-800 text-sm mb-0.5">Monthly Expenditure Limit Exceeded</h4>
            <p className="text-xs text-red-600">
              You have currently spent ₹{globalLimitData?.current_spent?.toFixed(0)} this month, tracking over your limit of ₹{globalLimitData?.limit?.toFixed(0)}.
            </p>
          </div>
        </div>
      )}

      {actionStatus && (
        <div className={`p-4 rounded-xl font-medium border flex items-center gap-2 animate-slide-up ${
          actionStatus.includes("Error") 
            ? "bg-red-50 text-red-700 border-red-100" 
            : "bg-emerald-50 text-emerald-700 border-emerald-100"
        }`}>
          <i className={actionStatus.includes("Error") ? "ri-error-warning-line text-lg" : "ri-check-line text-lg"} />
          {actionStatus}
        </div>
      )}



      {/* Main Table Area */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-sm mt-6">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-surface-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm" />
            <input 
              type="text" 
              placeholder="Search expenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-50 border border-surface-200 rounded-lg text-sm outline-none focus:border-indigo-400 transition-colors"
            />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto text-xs font-semibold text-surface-400">
            {filteredExpenses.length} record{filteredExpenses.length !== 1 && 's'}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-50/50">
                <th className="py-3 px-4 w-12 text-center text-[10px] font-bold text-surface-400 tracking-wider">
                  <input type="checkbox" className="rounded border-surface-300 text-indigo-600 focus:ring-indigo-500" disabled />
                </th>
                <th className="py-3 pr-4 text-[10px] font-bold text-surface-400 uppercase tracking-wider">Description</th>
                <th className="py-3 pr-4 text-[10px] font-bold text-surface-400 uppercase tracking-wider">Amount</th>
                <th className="py-3 pr-4 text-[10px] font-bold text-surface-400 uppercase tracking-wider hidden sm:table-cell">Paid By</th>
                <th className="py-3 pr-4 text-[10px] font-bold text-surface-400 uppercase tracking-wider hidden md:table-cell">Group</th>
                <th className="py-3 pr-4 text-[10px] font-bold text-surface-400 uppercase tracking-wider hidden lg:table-cell">Split Type</th>
                <th className="py-3 pr-4 text-[10px] font-bold text-surface-400 uppercase tracking-wider text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-50 text-sm">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-16 text-center text-surface-400">
                    <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-4">
                      <i className="ri-file-list-line text-surface-300 text-3xl" />
                    </div>
                    <p className="text-sm font-semibold text-surface-500 mb-1">No expenses found</p>
                    <p className="text-xs text-surface-400">Click Add Expense to record a split.</p>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const groupObj = groups.find((g) => g.id === exp.group?.id);
                  const payerName = exp.created_by?.first_name || exp.created_by?.email?.split("@")[0] || "Someone";
                  
                  return (
                    <tr key={exp.id} className="hover:bg-surface-50 transition-colors group">
                      <td className="py-3 px-4 text-center align-middle">
                        <input type="checkbox" className="rounded border-surface-300 text-indigo-600 focus:ring-indigo-500" />
                      </td>
                      <td className="py-3 pr-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                            <i className="ri-receipt-line text-indigo-600 text-sm" />
                          </div>
                          <span className="font-semibold text-surface-900 truncate max-w-[200px] block">
                            {exp.description}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 align-middle font-bold text-indigo-600">
                        {formatCurrency(exp.total_amount, groupObj?.currency || "INR")}
                      </td>
                      <td className="py-3 pr-4 align-middle text-surface-600 font-medium hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-surface-200 text-[9px] flex items-center justify-center font-bold text-surface-600">
                            {payerName[0]?.toUpperCase()}
                          </div>
                          {payerName}
                        </div>
                      </td>
                      <td className="py-3 pr-4 align-middle hidden md:table-cell">
                        <span className="px-2 py-1 rounded-md bg-surface-100 text-surface-600 text-[10px] font-bold uppercase tracking-wider">
                          {groupObj?.name || "—"}
                        </span>
                      </td>
                      <td className="py-3 pr-4 align-middle hidden lg:table-cell">
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border text-amber-700 bg-amber-50 border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          {SPLIT_LABELS[exp.split_type] || exp.split_type}
                        </div>
                      </td>
                      <td className="py-3 pr-4 align-middle text-right text-surface-500 text-xs font-medium">
                        {formatDate(exp.date)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto pt-10 pb-10">
          <div className="bg-white max-w-xl w-full rounded-2xl shadow-xl overflow-hidden animate-slide-up relative z-10">
            <div className="p-5 border-b border-surface-100 flex items-center justify-between bg-surface-50 sticky top-0 z-20">
              <h3 className="font-bold text-surface-900 text-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <i className="ri-receipt-line" />
                </div>
                Record Expense
              </h3>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setShowRiskAlert(false);
                  setShowLimitAlert(false);
                  setSkipRiskCheck(false);
                  setSkipLimitCheck(false);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-200 text-surface-500 transition-colors"
                type="button"
              >
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            
            <div className="p-6">
              <form onSubmit={validateAndAddExpense} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-sm font-semibold text-surface-700 block mb-1.5">Description</label>
                    <input
                      type="text"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      placeholder="e.g. Dinner, Uber, Groceries"
                      className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-surface-700 block mb-1.5">Amount (₹)</label>
                    <input
                      type="number"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      placeholder="0.00"
                      min="1"
                      className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm font-semibold text-indigo-700"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-surface-700 block mb-1.5">Group</label>
                    <select
                      value={newGroupId}
                      onChange={(e) => setNewGroupId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm font-medium"
                      required
                    >
                      {groups.length === 0 ? (
                        <option value="">No groups available</option>
                      ) : (
                        groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-surface-700 block mb-1.5">Date</label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm"
                      required
                    />
                  </div>
                </div>

                {/* Split Mode Selector */}
                <div className="pt-2 border-t border-surface-100 mt-6">
                  <label className="text-sm font-semibold text-surface-700 block mb-3">How was this split?</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {SPLIT_MODES.map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setSelectedSplit(mode)}
                        className={`px-2 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                          selectedSplit === mode
                            ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                            : "bg-surface-50 border-transparent text-surface-500 hover:bg-surface-100 hover:text-surface-700"
                        }`}
                      >
                        {SPLIT_LABELS[mode]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Percentage UI */}
                {selectedSplit === "percentage" && (
                  <div className="p-4 bg-surface-50 rounded-xl border border-surface-200 mt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-bold text-surface-700 uppercase tracking-wider">Member Percentages</h4>
                      <div className={`text-[10px] font-bold px-2 py-1 rounded bg-white border ${Object.values(splitData).reduce((a, b) => a + (parseFloat(b) || 0), 0) === 100 ? 'text-emerald-600 border-emerald-200' : 'text-rose-500 border-rose-200'}`}>
                        Total: {Object.values(splitData).reduce((a, b) => a + (parseFloat(b) || 0), 0).toFixed(1)}% / 100%
                      </div>
                    </div>
                    
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                      {groups.find(g => g.id === parseInt(newGroupId))?.members.map(m => (
                        <div key={m.user.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-surface-100 shadow-sm">
                          <span className="text-xs font-semibold text-surface-800 flex items-center gap-2 truncate">
                            <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[9px] font-bold">
                              {m.user.first_name?.[0]?.toUpperCase() || m.user.email?.[0]?.toUpperCase()}
                            </div>
                            {m.user.first_name || m.user.email.split('@')[0]}
                          </span>
                          <div className="flex items-center gap-1 w-20 relative">
                            <input
                              type="number"
                              min="0" max="100" step="0.01"
                              value={splitData[m.user.id] || ""}
                              onChange={(e) => setSplitData(prev => ({ ...prev, [m.user.id]: e.target.value }))}
                              placeholder="0"
                              className="w-full pl-2 pr-6 py-1.5 rounded-lg border border-surface-200 focus:border-indigo-500 outline-none text-xs font-semibold text-right transition-colors"
                            />
                            <span className="absolute right-2 text-[10px] font-bold text-surface-400 pointer-events-none">%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Alert Blocks */}
                {showLimitAlert && (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl mt-4 animate-fade-in flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                      <i className="ri-error-warning-fill text-lg" />
                    </div>
                    <div>
                      <h4 className="font-bold text-orange-800 text-xs mb-1 uppercase tracking-wider">Limit Exceeded</h4>
                      <p className="text-orange-700 text-xs leading-relaxed mb-3">
                        Your share plus existing spending exceeds your monthly limit of ₹{limitData?.limit?.toFixed(0)}.
                      </p>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setSkipLimitCheck(true); setShowLimitAlert(false); validateAndAddExpense(); }}
                          className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider">
                          Proceed Anyway
                        </button>
                        <button type="button" onClick={() => { setShowLimitAlert(false); setLimitData(null); }}
                          className="px-3 py-1.5 bg-white text-orange-700 border border-orange-200 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {showRiskAlert && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl mt-4 animate-fade-in flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                      <i className="ri-shield-cross-fill text-lg" />
                    </div>
                    <div>
                      <h4 className="font-bold text-rose-800 text-xs mb-1 uppercase tracking-wider">High Risk Group</h4>
                      <p className="text-rose-700 text-xs leading-relaxed mb-2">
                        You are lending to users with poor settlement history:
                      </p>
                      <div className="space-y-1 mb-3">
                        {highRiskUsers.map(u => (
                          <div key={u.user_id} className="text-[10px] font-medium text-rose-800 bg-white/50 px-2 py-1 rounded">
                            {u.name} — {u.reason}
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setSkipRiskCheck(true); setShowRiskAlert(false); validateAndAddExpense(); }}
                          className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider">
                          Proceed Anyway
                        </button>
                        <button type="button" onClick={() => setShowRiskAlert(false)}
                          className="px-3 py-1.5 bg-white text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit Block */}
                {!showRiskAlert && !showLimitAlert && (
                  <div className="pt-6 mt-6 border-t border-surface-100 pb-2">
                    <button 
                      type="submit" 
                      disabled={selectedSplit === 'percentage' && Object.values(splitData).reduce((a, b) => a + (parseFloat(b) || 0), 0) !== 100}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <i className="ri-save-3-line" /> Save Expense
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
