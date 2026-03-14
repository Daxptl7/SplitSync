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
  equal: "Equal",
  percentage: "Percentage",
  share: "Share",
  payer_excluded: "Payer Excluded",
};

export default function ExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedSplit, setSelectedSplit] = useState("equal");
  const [actionStatus, setActionStatus] = useState("");

  // Form state
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newGroupId, setNewGroupId] = useState("");
  const [newDate, setNewDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [splitData, setSplitData] = useState({}); // {userId: percentage}


  const [globalLimitData, setGlobalLimitData] = useState(null);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Check limit status globally on load
      const limitStatusRes = await api.get("/api/v1/expenses/limit_status/");
      setGlobalLimitData(limitStatusRes.data);

      // Fetch Groups the user is a part of
      const groupsRes = await api.get("/api/v1/groups/");
      setGroups(groupsRes.data);

      if (groupsRes.data.length > 0 && !newGroupId) {
        setNewGroupId(groupsRes.data[0].id);
      }

      // Fetch expenses (only for groups the user is a part of)
      if (groupsRes.data.length > 0) {
        const expensesRes = await api.get("/api/v1/expenses/");
        const exps = expensesRes.data;
        
        // Sort descending by date
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

    // First check personal expenditure limit
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
          return; // Stop and wait for user confirmation
        }
      } catch (err) {
        console.error("Error checking expenditure limit:", err);
      }
    }

    // Then check group risk
    if (!skipRiskCheck) {
      try {
        const riskRes = await api.get(`/api/v1/settlements/group_risk/?group_id=${newGroupId}`);
        const risks = riskRes.data || [];
        // TEMPORARY FOR TESTING: Force alert to show for anyone by setting threshold to -1
        const highRisk = risks.filter(r => r.risk_score > -1);
        
        if (highRisk.length > 0) {
          setHighRiskUsers(highRisk);
          setShowRiskAlert(true);
          return; // Stop and wait for user confirmation
        }
      } catch (err) {
        console.error("Error fetching risk scores:", err);
      }
    }

    // Proceed to create expense
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
      
      setShowAdd(false);
      setShowRiskAlert(false);
      setSkipRiskCheck(false);
      setNewDesc("");
      setNewAmount("");
      setSelectedSplit("equal");
      setSplitData({});
      setActionStatus("✅ Expense added successfully!");
      fetchData();
    } catch (err) {
      console.error("Create expense error:", err.response?.data || err.message);
      setActionStatus("❌ Error adding expense: " + (err.response?.data?.error || "Check your inputs"));
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
    return new Date(dateStr).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-surface-900 tracking-tight">
            Expenses
          </h1>
          <p className="text-surface-400 mt-1">
            Track and manage all shared expenses.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="btn-primary text-sm"
        >
          <i className="ri-add-line" /> Add Expense
        </button>
      </div>

      {globalLimitData?.limit_exceeded && (
        <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-xl font-medium border border-red-200 flex items-start gap-3 animate-slide-up">
          <i className="ri-error-warning-fill text-xl mt-0.5 text-red-500"></i>
          <div>
            <h4 className="font-bold text-red-800 text-sm mb-1">Monthly Expenditure Limit Exceeded</h4>
            <p className="text-xs text-red-700">You have currently spent ₹{globalLimitData?.current_spent?.toFixed(2)} this month, which is over your set limit of ₹{globalLimitData?.limit?.toFixed(2)}.</p>
          </div>
        </div>
      )}

      {actionStatus && (
        <div className="p-4 mb-6 bg-brand-50 text-brand-700 rounded-xl font-medium border border-brand-100">
          {actionStatus}
        </div>
      )}

      {/* Add Expense Form */}
      {showAdd && (
        <form
          onSubmit={validateAndAddExpense}
          className="glass-card p-6 mb-6 animate-slide-up"
        >
          <h3 className="text-lg font-semibold text-surface-800 mb-4">
            New Expense
          </h3>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-surface-600 mb-1 block">
                Description
              </label>
              <input
                type="text"
                placeholder="e.g., Dinner at restaurant"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-all text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-surface-600 mb-1 block">
                Amount (₹)
              </label>
              <input
                type="number"
                placeholder="0.00"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                required
                min="1"
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-all text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-surface-600 mb-1 block">
                Group
              </label>
              <select
                value={newGroupId}
                onChange={(e) => setNewGroupId(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-all text-sm bg-white"
              >
                {groups.length === 0 ? (
                  <option value="">No groups — create one first</option>
                ) : (
                  groups.map((g) => (
                     <option key={g.id} value={g.id}>
                       {g.name}
                     </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-surface-600 mb-1 block">
                Date
              </label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-all text-sm"
              />
            </div>
          </div>

          {/* Split Mode Selector */}
          <div className="mb-4">
            <label className="text-sm font-medium text-surface-600 mb-2 block">
              Split Mode
            </label>
            <div className="flex flex-wrap gap-2">
              {SPLIT_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSelectedSplit(mode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedSplit === mode
                      ? "bg-brand-600 text-white shadow-md"
                      : "bg-surface-100 text-surface-500 hover:bg-surface-200"
                  }`}
                >
                  {SPLIT_LABELS[mode]}
                </button>
              ))}
            </div>
          </div>

          {/* Percentage Split UI */}
          {selectedSplit === "percentage" && (
            <div className="mb-6 p-4 bg-surface-50 rounded-xl border border-surface-200">
              <h4 className="text-sm font-bold text-surface-800 mb-3 flex items-center justify-between">
                Member Percentages
                <span className={`text-xs ${Object.values(splitData).reduce((a, b) => a + (parseFloat(b) || 0), 0) === 100 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  Sum: {Object.values(splitData).reduce((a, b) => a + (parseFloat(b) || 0), 0).toFixed(1)}% / 100%
                </span>
              </h4>
              <div className="space-y-3">
                {groups.find(g => g.id === parseInt(newGroupId))?.members.map(m => (
                  <div key={m.user.id} className="flex items-center justify-between gap-4">
                    <span className="text-xs font-medium text-surface-600 truncate flex-1">
                      {m.user.first_name || m.user.email.split('@')[0]}
                    </span>
                    <div className="flex items-center gap-2 w-24">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={splitData[m.user.id] || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSplitData(prev => ({ ...prev, [m.user.id]: val }));
                        }}
                        placeholder="0"
                        className="w-full px-2 py-1.5 rounded-lg border border-surface-200 focus:border-brand-400 outline-none text-xs text-right"
                      />
                      <span className="text-xs font-bold text-surface-400">%</span>
                    </div>
                  </div>
                ))}
              </div>
              {Object.values(splitData).reduce((a, b) => a + (parseFloat(b) || 0), 0) !== 100 && (
                <p className="mt-3 text-[10px] text-rose-500 font-medium">
                  * Sum of all percentages must equal exactly 100%
                </p>
              )}
            </div>
          )}

          {/* Limit Alert Block */}
          {showLimitAlert && (
            <div className="mb-5 p-4 bg-orange-50 border border-orange-200 rounded-xl animate-fade-in">
              <div className="flex items-start gap-3">
                <i className="ri-error-warning-fill text-orange-500 text-xl mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-bold text-orange-800 text-sm mb-1">
                    ⚠ Limit Alert: Monthly Expenditure Exceeded
                  </h4>
                  <p className="text-orange-700 text-xs mb-3">
                    Your calculated share for this expense (₹{limitData?.new_share?.toFixed(2)}) plus your existing spending (₹{limitData?.current_spent?.toFixed(2)}) exceeds your monthly limit of ₹{limitData?.limit?.toFixed(2)}.
                  </p>
                  <div className="flex gap-2.5">
                    <button 
                      type="button" 
                      onClick={() => { 
                        setSkipLimitCheck(true); 
                        setShowLimitAlert(false);
                        validateAndAddExpense(); 
                      }}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                      Proceed Anyway
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowLimitAlert(false);
                        setLimitData(null);
                      }}
                      className="px-4 py-2 bg-white text-orange-700 hover:bg-orange-50 border border-orange-200 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Risk Alert Block */}
          {showRiskAlert && (
            <div className="mb-5 p-4 bg-orange-50 border border-orange-200 rounded-xl animate-fade-in">
              <div className="flex items-start gap-3">
                <i className="ri-error-warning-fill text-orange-500 text-xl mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-bold text-orange-800 text-sm mb-1">
                    ⚠ Risk Alert: High probability of delayed settlement
                  </h4>
                  <p className="text-orange-700 text-xs mb-3">
                    You are extending money to users with a history of poor settlement in this group:
                  </p>
                  <div className="space-y-2 mb-4">
                    {highRiskUsers.map(u => (
                      <div key={u.user_id} className="bg-white/60 p-2.5 rounded-lg text-xs text-orange-800 border border-orange-100">
                        <strong className="block mb-0.5">{u.name} — Score: {u.risk_score} (High Risk)</strong>
                        <span>Reason: {u.reason}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2.5">
                    <button 
                      type="button" 
                      onClick={() => { 
                        setSkipRiskCheck(true); 
                        setShowRiskAlert(false);
                        validateAndAddExpense(); 
                      }}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                      Proceed Anyway
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRiskAlert(false)}
                      className="px-4 py-2 bg-white text-orange-700 hover:bg-orange-50 border border-orange-200 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!showRiskAlert && !showLimitAlert && (
            <div className="flex gap-3">
              <button 
                type="submit" 
                disabled={selectedSplit === 'percentage' && Object.values(splitData).reduce((a, b) => a + (parseFloat(b) || 0), 0) !== 100}
                className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Expense
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAdd(false);
                  setShowRiskAlert(false);
                  setSkipRiskCheck(false);
                  setShowLimitAlert(false);
                  setSkipLimitCheck(false);
                }}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
            </div>
          )}
        </form>
      )}

      {/* Expenses List */}
      <div className="glass-card overflow-hidden">
        {expenses.length === 0 ? (
          <p className="text-center text-surface-500 py-10">
            No expenses recorded yet. Add one to get started!
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100">
                  <th className="text-left px-5 py-3.5 font-semibold text-surface-500 text-xs uppercase tracking-wider">
                    Description
                  </th>
                  <th className="text-left px-5 py-3.5 font-semibold text-surface-500 text-xs uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="text-left px-5 py-3.5 font-semibold text-surface-500 text-xs uppercase tracking-wider hidden sm:table-cell">
                    Paid by
                  </th>
                  <th className="text-left px-5 py-3.5 font-semibold text-surface-500 text-xs uppercase tracking-wider hidden md:table-cell">
                    Group
                  </th>
                  <th className="text-left px-5 py-3.5 font-semibold text-surface-500 text-xs uppercase tracking-wider hidden lg:table-cell">
                    Split
                  </th>
                  <th className="text-left px-5 py-3.5 font-semibold text-surface-500 text-xs uppercase tracking-wider hidden lg:table-cell">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => {
                  const groupObj = groups.find((g) => g.id === exp.group?.id);
                  const payerName =
                    exp.created_by?.first_name ||
                    exp.created_by?.email?.split("@")[0] ||
                    "—";
                  return (
                    <tr
                      key={exp.id}
                      className="border-b border-surface-50 hover:bg-surface-50 transition-colors"
                    >
                      <td className="px-5 py-3.5 font-medium text-surface-800">
                        {exp.description}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-brand-600">
                        {formatCurrency(exp.total_amount, groupObj?.currency || "INR")}
                      </td>
                      <td className="px-5 py-3.5 text-surface-500 hidden sm:table-cell">
                        {payerName}
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <span className="px-2 py-0.5 rounded-full bg-surface-100 text-surface-600 text-xs">
                          {groupObj?.name || "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 text-xs font-medium">
                          {SPLIT_LABELS[exp.split_type] || exp.split_type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-surface-400 hidden lg:table-cell">
                        {formatDate(exp.date)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
