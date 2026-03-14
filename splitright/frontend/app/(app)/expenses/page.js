"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const SPLIT_MODES = [
  "equal",
  "percentage",
  "custom",
  "share",
  "payer_excluded",
];

const SPLIT_LABELS = {
  equal: "Equal",
  percentage: "Percentage",
  custom: "Custom",
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

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
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
      console.error("Error fetching expenses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setActionStatus("");
    if (!user) return;

    try {
      await api.post("/api/v1/expenses/", {
        group: newGroupId,
        description: newDesc,
        total_amount: parseFloat(newAmount),
        split_type: selectedSplit,
        date: newDate,
      });
      
      setShowAdd(false);
      setNewDesc("");
      setNewAmount("");
      setSelectedSplit("equal");
      setActionStatus("Expense added successfully!");
      fetchData();
    } catch (err) {
      console.error(err);
      setActionStatus("Error adding expense");
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

      {actionStatus && (
        <div className="p-4 mb-6 bg-brand-50 text-brand-700 rounded-xl font-medium border border-brand-100">
          {actionStatus}
        </div>
      )}

      {/* Add Expense Form */}
      {showAdd && (
        <form
          onSubmit={handleAddExpense}
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

          <div className="flex gap-3">
            <button type="submit" className="btn-primary text-sm">
              Save Expense
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
          </div>
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
