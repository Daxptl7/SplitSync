"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ groups: 0, expenses: 0, settled: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionStatus, setActionStatus] = useState("");

  // Editable fields
  const [displayName, setDisplayName] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [upiHandle, setUpiHandle] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [profileRes, dashRes] = await Promise.all([
          api.get("/api/v1/auth/profile/"),
          api.get("/api/v1/auth/dashboard/"),
        ]);
        const p = profileRes.data;
        setProfile(p);
        setDisplayName(p.display_name || "");
        setCurrency(p.default_currency || "INR");
        setUpiHandle(p.upi_handle || "");
        setPhone(p.phone || "");

        setStats({
          groups: dashRes.data.total_groups || 0,
          expenses: 0,
          settled: 0,
        });
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setActionStatus("");
    try {
      const res = await api.put("/api/v1/auth/profile/", {
        display_name: displayName,
        default_currency: currency,
        upi_handle: upiHandle,
        phone: phone,
      });
      setProfile(res.data);
      setActionStatus("Profile updated successfully!");
    } catch (err) {
      setActionStatus(
        err.response?.data?.detail || "Error saving profile",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const initial = (
    profile?.display_name?.[0] ||
    profile?.email?.[0] ||
    "U"
  ).toUpperCase();
  const name = profile?.display_name || profile?.email?.split("@")[0] || "User";
  const email = profile?.email || "";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-surface-900 tracking-tight">
          Profile
        </h1>
        <p className="text-surface-400 mt-1">
          Manage your account settings and preferences.
        </p>
      </div>

      {actionStatus && (
        <div className="p-4 mb-6 bg-brand-50 text-brand-700 rounded-xl font-medium border border-brand-100">
          {actionStatus}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="glass-card p-6 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-teal flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
            {initial}
          </div>
          <h2 className="text-xl font-bold text-surface-800">{name}</h2>
          <p className="text-sm text-surface-400 mt-1">{email}</p>
          <div className="flex justify-center gap-6 mt-6 pt-4 border-t border-surface-100">
            <div className="text-center">
              <p className="text-xl font-bold text-brand-600">
                {stats.groups}
              </p>
              <p className="text-xs text-surface-400">Groups</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-emerald-600">
                {stats.expenses}
              </p>
              <p className="text-xs text-surface-400">Expenses</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-amber-600">
                {stats.settled}
              </p>
              <p className="text-xs text-surface-400">Settled</p>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="lg:col-span-2 glass-card p-6">
          <h2 className="text-lg font-semibold text-surface-800 mb-5">
            Account Settings
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-surface-600 mb-1 block">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-all text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-surface-600 mb-1 block">
                Email
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-surface-400 text-sm"
              />
              <p className="text-xs text-surface-400 mt-1">
                Managed by Firebase Auth
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-surface-600 mb-1 block">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-all text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-surface-600 mb-1 block">
                Default Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-all text-sm bg-white"
              >
                <option value="INR">₹ INR — Indian Rupee</option>
                <option value="USD">$ USD — US Dollar</option>
                <option value="EUR">€ EUR — Euro</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-surface-600 mb-1 block">
                UPI ID (encrypted at rest)
              </label>
              <input
                type="text"
                value={upiHandle}
                onChange={(e) => setUpiHandle(e.target.value)}
                placeholder="yourname@upi"
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-all text-sm"
              />
              <p className="text-xs text-surface-400 mt-1 flex items-center gap-1">
                <i className="ri-shield-check-line text-emerald-500" /> AES-256
                encrypted before storage
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary text-sm mt-2"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
