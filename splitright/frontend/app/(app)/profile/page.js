"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function ProfilePage() {
  const { user } = useAuth();
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
  const [expenditureLimit, setExpenditureLimit] = useState("");

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

        const meRes = await api.get("/api/v1/auth/me/");
        setExpenditureLimit(meRes.data.expenditure_limit || "");

        setStats({
          groups: dashRes.data.total_groups || 0,
          expenses: 0, // Would come from an expenses count endpoint
          settled: 0, // Would come from settlements endpoint
        });
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setActionStatus("");
    try {
      const res = await api.put("/api/v1/auth/profile/", {
        display_name: displayName,
        default_currency: currency,
        upi_handle: upiHandle,
        phone: phone,
      });
      
      await api.patch("/api/v1/auth/me/", {
        expenditure_limit: expenditureLimit,
      });

      setProfile(res.data);
      setActionStatus("Profile updated successfully!");
    } catch (err) {
      setActionStatus(
        err.response?.data?.detail || err.response?.data?.error || "Error saving profile"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const initial = (profile?.display_name?.[0] || profile?.email?.[0] || "U").toUpperCase();
  const name = profile?.display_name || profile?.email?.split("@")[0] || "User";
  const email = profile?.email || "";

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header Area */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center border border-indigo-100">
          <i className="ri-user-settings-line text-indigo-600 text-xl" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight">
            Profile Settings
          </h1>
          <p className="text-xs text-surface-400">Manage your account details and limits</p>
        </div>
      </div>

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

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Left Sidebar: Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-surface-200 p-6 text-center shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-indigo-500 to-purple-600 z-0"></div>
            
            <div className="relative z-10 mx-auto w-24 h-24 rounded-full border-4 border-white bg-white shadow-sm flex items-center justify-center text-3xl font-extrabold text-indigo-600 mb-4 mt-6">
              {initial}
            </div>
            
            <h2 className="text-xl font-bold text-surface-900 leading-tight">{name}</h2>
            <p className="text-xs font-semibold text-surface-400 mt-1 flex items-center justify-center gap-1">
              <i className="ri-mail-line" /> {email}
            </p>

            <div className="mt-6 mx-2 bg-surface-50 rounded-xl p-4 border border-surface-100 flex justify-around">
              <div className="text-center">
                <p className="text-2xl font-extrabold text-indigo-600">{stats.groups}</p>
                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Groups</p>
              </div>
              <div className="w-px h-10 bg-surface-200" />
              <div className="text-center">
                <p className="text-2xl font-extrabold text-indigo-600">{currency}</p>
                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Currency</p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-surface-100">
              <p className="text-[10px] text-surface-400">UID: {user?.uid}</p>
            </div>
          </div>
        </div>

        {/* Right Main: Settings Form */}
        <div className="lg:col-span-2 space-y-6">
          
          <form onSubmit={handleSave} className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-surface-100 bg-surface-50/50 flex items-center gap-2">
              <i className="ri-profile-line text-indigo-500 text-lg" />
              <h2 className="font-bold text-surface-900">Personal Information</h2>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold text-surface-600 uppercase tracking-wider block mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl focus:border-indigo-400 focus:bg-white outline-none transition-all text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-surface-600 uppercase tracking-wider block mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl focus:border-indigo-400 focus:bg-white outline-none transition-all text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-surface-600 uppercase tracking-wider block mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-4 py-2.5 bg-surface-100 border border-surface-200 rounded-xl text-surface-500 text-sm font-medium cursor-not-allowed"
                />
                <p className="text-[10px] font-semibold text-surface-400 mt-1 flex items-center gap-1">
                  <i className="ri-lock-line" /> Managed securely by Firebase Auth
                </p>
              </div>
            </div>

            <div className="p-5 border-y border-surface-100 bg-surface-50/50 flex items-center gap-2">
              <i className="ri-bank-card-line text-indigo-500 text-lg" />
              <h2 className="font-bold text-surface-900">Payment & Preferences</h2>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold text-surface-600 uppercase tracking-wider block mb-1.5 flex items-center justify-between">
                    <span>UPI ID</span>
                    <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">Secured</span>
                  </label>
                  <div className="relative">
                    <i className="ri-smartphone-line absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                    <input
                      type="text"
                      value={upiHandle}
                      onChange={(e) => setUpiHandle(e.target.value)}
                      placeholder="yourname@upi"
                      className="w-full pl-9 pr-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl focus:border-indigo-400 focus:bg-white outline-none transition-all text-sm font-medium"
                    />
                  </div>
                  <p className="text-[10px] font-semibold text-surface-400 mt-1 flex items-center gap-1">
                    <i className="ri-shield-check-line text-emerald-500" /> AES-256 Encrypted at Rest
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-surface-600 uppercase tracking-wider block mb-1.5">
                    Default Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl focus:border-indigo-400 focus:bg-white outline-none transition-all text-sm font-medium"
                  >
                    <option value="INR">₹ INR — Indian Rupee</option>
                    <option value="USD">$ USD — US Dollar</option>
                    <option value="EUR">€ EUR — Euro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-surface-600 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                  Monthly Expenditure Limit <i className="ri-information-line text-surface-400" title="Get alerted when you spend over this amount" />
                </label>
                <div className="relative max-w-xs">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-surface-400">
                    {currency === "INR" ? "₹" : currency === "USD" ? "$" : "€"}
                  </span>
                  <input
                    type="number"
                    value={expenditureLimit}
                    onChange={(e) => setExpenditureLimit(e.target.value)}
                    placeholder="e.g. 50000"
                    min="0"
                    className="w-full pl-8 pr-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl focus:border-indigo-400 focus:bg-white outline-none transition-all text-lg font-bold text-surface-900"
                  />
                </div>
                <p className="text-[10px] font-semibold text-surface-400 mt-1.5">
                  Leave blank to disable limit tracking.
                </p>
              </div>
            </div>

            <div className="p-5 border-t border-surface-100 bg-surface-50/50 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <><i className="ri-loader-4-line animate-spin" /> Saving...</>
                ) : (
                  <><i className="ri-save-3-line" /> Save Changes</>
                )}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
