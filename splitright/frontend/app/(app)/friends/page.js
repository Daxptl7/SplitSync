"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function FriendsPage() {
  const { user } = useAuth();
  const [connections, setConnections] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFriendEmail, setNewFriendEmail] = useState("");
  const [activeTab, setActiveTab] = useState("all"); 

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // We will fetch ALL friend request records where this user is sender or receiver
      const res = await api.get("/api/v1/auth/friends/");
      
      const processed = res.data.map(req => {
        const isSender = req.sender.email === user.email;
        const otherUser = isSender ? req.receiver : req.sender;
        let connectionType = "none";
        
        if (req.status === "accepted") {
          connectionType = "friend";
        } else if (req.status === "pending") {
          connectionType = isSender ? "sent" : "received";
        } else if (req.status === "rejected") {
          connectionType = "rejected";
        }

        return {
          id: req.id,
          status: req.status,
          created_at: req.created_at,
          type: connectionType,
          otherUser: otherUser,
          isSender
        };
      });

      setConnections(processed);
    } catch (err) {
      console.error("Error fetching connections:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const sendRequest = async (e) => {
    e.preventDefault();
    setActionStatus("");
    if (!user) return;
    
    try {
      if (newFriendEmail.toLowerCase() === user.email.toLowerCase()) {
         setActionStatus("You cannot friend yourself.");
         return;
      }
      await api.post("/api/v1/auth/friends/send_request/", { email: newFriendEmail });
      setActionStatus("Friend request sent successfully!");
      setNewFriendEmail("");
      setShowAddModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setActionStatus(err.response?.data?.error || "Error sending request");
    }
  };

  const handleRequestAction = async (requestId, action) => {
    try {
      await api.post(`/api/v1/auth/friends/${requestId}/${action}/`);
      fetchData();
    } catch (err) {
      alert("Error processing request: " + (err.response?.data?.error || err.message));
    }
  };

  // Metrics
  const friendsCount = connections.filter(c => c.type === "friend").length;
  const receivedCount = connections.filter(c => c.type === "received").length;
  const sentCount = connections.filter(c => c.type === "sent").length;
  const totalCount = connections.length;

  // Filtering
  const filteredConnections = connections.filter(c => {
    if (activeTab === "friend" && c.type !== "friend") return false;
    if (activeTab === "received" && c.type !== "received") return false;
    if (activeTab === "sent" && c.type !== "sent") return false;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const nameMatch = (c.otherUser?.first_name || "").toLowerCase().includes(q);
      const emailMatch = (c.otherUser?.email || "").toLowerCase().includes(q);
      return nameMatch || emailMatch;
    }
    
    return true;
  });

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

  const getStatusBadgeVariant = (type) => {
    switch (type) {
      case "friend": return "text-emerald-700 bg-emerald-50 border-emerald-200";
      case "received": return "text-orange-700 bg-orange-50 border-orange-200";
      case "sent": return "text-amber-700 bg-amber-50 border-amber-200";
      case "rejected": return "text-rose-700 bg-rose-50 border-rose-200";
      default: return "text-surface-700 bg-surface-50 border-surface-200";
    }
  };

  const getStatusDotVariant = (type) => {
    switch (type) {
      case "friend": return "bg-emerald-500";
      case "received": return "bg-orange-500";
      case "sent": return "bg-amber-500";
      case "rejected": return "bg-rose-500";
      default: return "bg-surface-500";
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header Area */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center border border-indigo-100">
          <i className="ri-team-line text-indigo-600 text-xl" />
        </div>
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight">
          Connections list
        </h1>
      </div>

      {actionStatus && (
        <div className="p-4 bg-brand-50 text-brand-700 rounded-xl font-medium border border-brand-100 flex items-center gap-2">
          <i className="ri-information-line text-lg" />
          {actionStatus}
        </div>
      )}

      {/* Tabs / Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tab 1: All Friends */}
        <div 
          onClick={() => setActiveTab(activeTab === "friend" ? "all" : "friend")}
          className={`rounded-2xl border cursor-pointer transition-all overflow-hidden bg-white shadow-sm hover:shadow-md ${activeTab === "friend" ? "ring-2 ring-indigo-500 ring-offset-2" : "border-surface-200"}`}
        >
          <div className="h-10 w-full bg-indigo-500 flex items-center px-4">
            <span className="text-white text-xs font-semibold uppercase tracking-wider">Accepted Friends</span>
          </div>
          <div className="p-5 flex items-end justify-between relative overflow-hidden">
            <div className="text-4xl font-extrabold text-surface-900 z-10">{friendsCount}</div>
            <div className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold z-10">
              <i className="ri-arrow-up-line" /> Active
            </div>
            {/* Soft background wave visual */}
            <div className="absolute right-0 bottom-0 opacity-10">
              <svg width="100" height="60" viewBox="0 0 100 60"><path d="M0,60 C30,60 40,20 100,0 L100,60 Z" fill="currentColor" className="text-indigo-500"/></svg>
            </div>
          </div>
        </div>

        {/* Tab 2: Pending Received */}
        <div 
          onClick={() => setActiveTab(activeTab === "received" ? "all" : "received")}
          className={`rounded-2xl border cursor-pointer transition-all overflow-hidden bg-white shadow-sm hover:shadow-md ${activeTab === "received" ? "ring-2 ring-orange-400 ring-offset-2" : "border-surface-200"}`}
        >
          <div className="h-10 w-full bg-orange-400 flex items-center px-4">
            <span className="text-white text-xs font-semibold uppercase tracking-wider">Awaiting Action</span>
          </div>
          <div className="p-5 flex items-end justify-between relative overflow-hidden">
            <div className="text-4xl font-extrabold text-surface-900 z-10">{receivedCount}</div>
            <div className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[10px] font-bold z-10">
               Requires you
            </div>
            <div className="absolute right-0 bottom-0 opacity-10">
              <svg width="100" height="60" viewBox="0 0 100 60"><path d="M0,60 C30,60 40,30 100,10 L100,60 Z" fill="currentColor" className="text-orange-500"/></svg>
            </div>
          </div>
        </div>

        {/* Tab 3: Pending Sent */}
        <div 
          onClick={() => setActiveTab(activeTab === "sent" ? "all" : "sent")}
          className={`rounded-2xl border cursor-pointer transition-all overflow-hidden bg-white shadow-sm hover:shadow-md ${activeTab === "sent" ? "ring-2 ring-amber-300 ring-offset-2" : "border-surface-200"}`}
        >
          <div className="h-10 w-full bg-amber-300 flex items-center px-4">
            <span className="text-surface-800 text-xs font-semibold uppercase tracking-wider">Sent Requests</span>
          </div>
          <div className="p-5 flex items-end justify-between relative overflow-hidden">
            <div className="text-4xl font-extrabold text-surface-900 z-10">{sentCount}</div>
            <div className="flex items-center gap-1 bg-surface-100 text-surface-500 px-2 py-0.5 rounded-full text-[10px] font-bold z-10">
               Waiting
            </div>
            <div className="absolute right-0 bottom-0 opacity-10">
              <svg width="100" height="60" viewBox="0 0 100 60"><path d="M0,60 C40,60 50,40 100,20 L100,60 Z" fill="currentColor" className="text-amber-500"/></svg>
            </div>
          </div>
        </div>

        {/* Tab 4: Total Connections */}
        <div 
          onClick={() => setActiveTab("all")}
          className={`rounded-2xl border cursor-pointer transition-all overflow-hidden bg-white shadow-sm hover:shadow-md ${activeTab === "all" ? "ring-2 ring-emerald-400 ring-offset-2" : "border-surface-200"}`}
        >
          <div className="h-10 w-full bg-emerald-400 flex items-center px-4">
            <span className="text-white text-xs font-semibold uppercase tracking-wider">Total Network</span>
          </div>
          <div className="p-5 flex items-end justify-between relative overflow-hidden">
            <div className="text-4xl font-extrabold text-surface-900 z-10">{totalCount}</div>
            <div className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold z-10">
               All time
            </div>
            <div className="absolute right-0 bottom-0 opacity-10">
              <svg width="100" height="60" viewBox="0 0 100 60"><path d="M0,60 C20,60 60,10 100,0 L100,60 Z" fill="currentColor" className="text-emerald-500"/></svg>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-sm mt-6">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-surface-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm" />
            <input 
              type="text" 
              placeholder={`${connections.length} connections`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-50 border border-surface-200 rounded-lg text-sm outline-none focus:border-indigo-400 transition-colors"
            />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button className="flex items-center gap-1.5 text-indigo-600 font-semibold text-sm hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
              <i className="ri-download-2-line text-lg" /> Export
            </button>
            <button className="flex items-center gap-1.5 text-surface-600 font-semibold text-sm hover:bg-surface-50 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-surface-200">
              <i className="ri-sort-desc text-lg" /> Sort: default
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-surface-900 hover:bg-black text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
            >
              <i className="ri-add-line whitespace-nowrap" /> Add connection
            </button>
          </div>
        </div>

        {/* Filters bar (static placeholder for authentic UI matching) */}
        <div className="px-4 py-3 border-b border-surface-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="ri-filter-3-line text-surface-400 mr-1" />
            <div className="bg-surface-100 border border-surface-200 px-2 py-1 rounded-md text-xs font-semibold text-surface-700 flex items-center gap-1 cursor-pointer hover:bg-surface-200">
              Active <i className="ri-close-line" />
            </div>
            {activeTab !== "all" && (
              <div className="bg-surface-100 border border-surface-200 px-2 py-1 rounded-md text-xs font-semibold text-surface-700 flex items-center gap-1 cursor-pointer hover:bg-surface-200">
                {activeTab} <i className="ri-close-line" />
              </div>
            )}
            <button className="text-surface-400 text-xs font-semibold hover:text-surface-700 transition-colors ml-2" onClick={() => setActiveTab("all")}>
              Clear all
            </button>
          </div>
          <div className="text-xs font-semibold text-surface-400 flex items-center gap-3">
            <span>1 of 1</span>
            <div className="flex items-center gap-1">
              <button className="hover:text-surface-700 cursor-pointer disabled:opacity-50 inline-flex" disabled><i className="ri-arrow-left-s-line" /></button>
              <button className="hover:text-surface-700 cursor-pointer disabled:opacity-50 inline-flex" disabled><i className="ri-arrow-right-s-line" /></button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-100">
                <th className="py-3 px-4 w-12 text-center text-[10px] font-bold text-surface-400 tracking-wider">
                  <input type="checkbox" className="rounded border-surface-300 text-indigo-600 focus:ring-indigo-500" disabled />
                </th>
                <th className="py-3 pr-4 text-[10px] font-bold text-surface-400 uppercase tracking-wider">User</th>
                <th className="py-3 pr-4 text-[10px] font-bold text-surface-400 uppercase tracking-wider">Email</th>
                <th className="py-3 pr-4 text-[10px] font-bold text-surface-400 uppercase tracking-wider">Date</th>
                <th className="py-3 pr-4 text-[10px] font-bold text-surface-400 uppercase tracking-wider">Status</th>
                <th className="py-3 pr-4 w-24 text-[10px] font-bold text-surface-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-50 text-sm">
              {filteredConnections.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-surface-400">
                    No connections found.
                  </td>
                </tr>
              ) : (
                filteredConnections.map((conn) => (
                  <tr key={conn.id} className="hover:bg-surface-50 transition-colors group">
                    <td className="py-3 px-4 text-center align-middle">
                      <input type="checkbox" className="rounded border-surface-300 text-indigo-600 focus:ring-indigo-500" />
                    </td>
                    <td className="py-3 pr-4 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-surface-200 border border-surface-300 flex items-center justify-center font-bold text-surface-600 text-xs shrink-0">
                          {conn.otherUser?.first_name?.[0]?.toUpperCase() ||
                           conn.otherUser?.email?.[0]?.toUpperCase() || "?"}
                        </div>
                        <span className="font-semibold text-surface-800">
                          {conn.otherUser?.first_name || "Unknown"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-surface-500 align-middle">
                      {conn.otherUser?.email}
                    </td>
                    <td className="py-3 pr-4 text-surface-500 text-xs align-middle">
                      {formatDate(conn.created_at)}
                    </td>
                    <td className="py-3 pr-4 align-middle">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getStatusBadgeVariant(conn.type)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusDotVariant(conn.type)}`} />
                        {conn.type === "friend" ? "Accepted" : conn.type}
                      </div>
                    </td>
                    <td className="py-3 pr-4 align-middle text-right">
                      {conn.type === "received" ? (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleRequestAction(conn.id, "accept")} className="text-emerald-600 font-semibold hover:underline text-xs">Accept</button>
                          <span className="text-surface-300">|</span>
                          <button onClick={() => handleRequestAction(conn.id, "reject")} className="text-rose-600 font-semibold hover:underline text-xs">Reject</button>
                        </div>
                      ) : (
                        <button className="w-6 h-6 rounded flex items-center justify-center text-surface-400 hover:text-surface-700 hover:bg-surface-200 transition-colors ml-auto">
                          <i className="ri-more-fill" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Connection Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white max-w-sm w-full rounded-2xl shadow-xl overflow-hidden animate-slide-up">
            <div className="p-5 border-b border-surface-100 flex items-center justify-between bg-surface-50">
              <h3 className="font-bold text-surface-900 text-lg">Add Connection</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-200 text-surface-500 transition-colors"
              >
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <div className="p-5">
              <form onSubmit={sendRequest} className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-surface-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={newFriendEmail}
                    onChange={(e) => setNewFriendEmail(e.target.value)}
                    placeholder="e.g. barbara@example.com"
                    className="w-full px-4 py-2 bg-white border border-surface-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm"
                    required
                  />
                  <p className="text-xs text-surface-400 mt-1.5">An invite will be sent to this user.</p>
                </div>
                <div className="mt-6">
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition-colors shadow-sm">
                    Send Invite
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
