"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function GroupsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [friends, setFriends] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddMember, setShowAddMember] = useState(null); // group ID
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupCurrency, setNewGroupCurrency] = useState("INR");
  const [loading, setLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const groupsRes = await api.get("/api/v1/groups/");
      setGroups(groupsRes.data);

      const friendsRes = await api.get("/api/v1/auth/friends/accepted/");
      const frnds = friendsRes.data.map(f => {
         const friendData = f.sender.email === user.email ? f.receiver : f.sender;
         return {
            id: f.id,
            ...f,
            friend: friendData
         }
      });
      setFriends(frnds);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setActionStatus("");
    if (!user) return;

    try {
      await api.post("/api/v1/groups/", {
        name: newGroupName,
        currency: newGroupCurrency,
      });
      setNewGroupName("");
      setShowCreate(false);
      setActionStatus("Group created successfully!");
      fetchData();
    } catch (err) {
      setActionStatus("Error creating group");
      console.error(err);
    }
  };

  const handleAddFriend = async (groupId, friendId) => {
    setActionStatus("");
    try {
      await api.post(`/api/v1/groups/${groupId}/add_member/`, {
        user_id: friendId
      });
      setShowAddMember(null);
      setActionStatus("Friend added successfully!");
      fetchData();
    } catch (err) {
      console.error(err);
      setActionStatus(err.response?.data?.error || "Failed to add friend.");
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  // Metrics
  const totalGroups = groups.length;
  const totalMembers = groups.reduce((acc, g) => acc + (g.members?.length || 0), 0);
  const avgMembers = totalGroups > 0 ? (totalMembers / totalGroups).toFixed(1) : 0;
  const recentlyActive = groups.filter(g => g.total_spent > 0).length;

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header Area */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center border border-indigo-100">
            <i className="ri-group-2-line text-indigo-600 text-xl" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-900 tracking-tight">
              Groups
            </h1>
            <p className="text-xs text-surface-400">Manage your expense groups and members</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-surface-900 hover:bg-black text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
        >
          <i className="ri-add-line" /> New Group
        </button>
      </div>

      {actionStatus && (
        <div className="p-4 bg-brand-50 text-brand-700 rounded-xl font-medium border border-brand-100 flex items-center gap-2 animate-slide-up">
          <i className="ri-information-line text-lg" />
          {actionStatus}
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Groups */}
        <div className="summary-card rounded-2xl border transition-all overflow-hidden bg-white shadow-sm hover:shadow-md border-surface-200 group">
          <div className="h-10 w-full bg-indigo-500 flex items-center px-4">
            <span className="text-white text-xs font-semibold uppercase tracking-wider">Total Groups</span>
          </div>
          <div className="p-5 flex items-end justify-between relative overflow-hidden">
            <div className="text-4xl font-extrabold text-surface-900 z-10">{totalGroups}</div>
            <div className="absolute right-0 bottom-0 opacity-10">
              <svg width="100" height="60" viewBox="0 0 100 60"><path d="M0,60 C30,60 40,20 100,0 L100,60 Z" fill="currentColor" className="text-indigo-500"/></svg>
            </div>
          </div>
        </div>

        {/* Card 2: Active Groups */}
        <div className="summary-card rounded-2xl border transition-all overflow-hidden bg-white shadow-sm hover:shadow-md border-surface-200 group">
          <div className="h-10 w-full bg-emerald-500 flex items-center px-4">
            <span className="text-white text-xs font-semibold uppercase tracking-wider">Active Groups</span>
          </div>
          <div className="p-5 flex items-end justify-between relative overflow-hidden">
            <div className="text-4xl font-extrabold text-surface-900 z-10">{recentlyActive}</div>
            <div className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold z-10">
              Has expenses
            </div>
            <div className="absolute right-0 bottom-0 opacity-10">
              <svg width="100" height="60" viewBox="0 0 100 60"><path d="M0,60 C30,60 40,30 100,10 L100,60 Z" fill="currentColor" className="text-emerald-500"/></svg>
            </div>
          </div>
        </div>

        {/* Card 3: Avg Members */}
        <div className="summary-card rounded-2xl border transition-all overflow-hidden bg-white shadow-sm hover:shadow-md border-surface-200 group">
          <div className="h-10 w-full bg-amber-400 flex items-center px-4">
            <span className="text-surface-800 text-xs font-semibold uppercase tracking-wider">Avg Members/Group</span>
          </div>
          <div className="p-5 flex items-end justify-between relative overflow-hidden">
            <div className="text-4xl font-extrabold text-surface-900 z-10">{avgMembers}</div>
            <div className="absolute right-0 bottom-0 opacity-10">
              <svg width="100" height="60" viewBox="0 0 100 60"><path d="M0,60 C40,60 50,40 100,20 L100,60 Z" fill="currentColor" className="text-amber-500"/></svg>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-sm mt-6 overflow-hidden">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-surface-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm" />
            <input 
              type="text" 
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-50 border border-surface-200 rounded-lg text-sm outline-none focus:border-indigo-400 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-surface-400 font-semibold">
            {filteredGroups.length} group{filteredGroups.length !== 1 && 's'}
          </div>
        </div>

        {/* Groups Grid */}
        <div className="p-4">
          {filteredGroups.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-4">
                <i className="ri-group-line text-surface-300 text-3xl" />
              </div>
              <p className="text-sm font-semibold text-surface-500 mb-1">No groups found</p>
              <p className="text-xs text-surface-400">Create a new group to start sharing expenses.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGroups.map((group) => (
                <div key={group.id} className="border border-surface-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col bg-surface-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                        {group.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-surface-900 leading-tight">{group.name}</h3>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                            {group.currency}
                          </span>
                          <span className="text-[10px] text-surface-500 font-medium">
                            {group.members?.length || 0} members
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 bg-white rounded-lg p-3 border border-surface-100 flex justify-between items-center mb-4">
                    <span className="text-xs text-surface-500 font-medium">Total Spent</span>
                    <span className="font-bold text-indigo-600">
                      {new Intl.NumberFormat("en-IN", { style: "currency", currency: group.currency || "INR", maximumFractionDigits: 0 }).format(group.total_spent || 0)}
                    </span>
                  </div>

                  {/* Members Preview */}
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-surface-200">
                    <div className="flex flex-wrap gap-[-8px]">
                      {(group.members || []).slice(0, 4).map((m, i) => (
                        <div key={m.id} title={m.user.first_name || m.user.email} className="w-7 h-7 rounded-full bg-surface-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-surface-600 shadow-sm z-10" style={{ marginLeft: i > 0 ? '-8px' : '0' }}>
                          {m.user?.first_name?.[0]?.toUpperCase() || m.user?.email?.[0]?.toUpperCase() || '?'}
                        </div>
                      ))}
                      {(group.members || []).length > 4 && (
                        <div className="w-7 h-7 rounded-full bg-surface-100 border-2 border-white flex items-center justify-center text-[9px] font-bold text-surface-500 shadow-sm z-10" style={{ marginLeft: '-8px' }}>
                          +{(group.members || []).length - 4}
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => setShowAddMember(showAddMember === group.id ? null : group.id)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <i className="ri-user-add-line" /> Add
                    </button>
                  </div>

                  {/* Add Member Dropdown */}
                  {showAddMember === group.id && (
                    <div className="mt-3 p-3 bg-white rounded-lg border border-surface-200 shadow-sm animate-fade-in relative z-20">
                      <h4 className="text-[11px] uppercase tracking-wider font-bold text-surface-500 mb-2">
                        Add from Friends
                      </h4>
                      {friends.length === 0 ? (
                        <p className="text-xs text-surface-400">No friends to add.</p>
                      ) : (
                        <div className="flex flex-col gap-1 max-h-32 overflow-y-auto pr-1">
                          {friends.map((f) => {
                            const friendData = f.friend;
                            const isAlreadyMember = (group.members || []).some(m => m.user.id === friendData.id);
                            if (isAlreadyMember) return null;

                            return (
                              <div
                                key={f.id}
                                className="flex justify-between items-center p-1.5 rounded-md hover:bg-surface-50 transition-colors"
                              >
                                <span className="text-xs font-medium text-surface-800 truncate">
                                  {friendData.first_name || friendData.email.split("@")[0]}
                                </span>
                                <button
                                  onClick={() => handleAddFriend(group.id, friendData.id)}
                                  className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold hover:bg-indigo-100"
                                >
                                  Add
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-xl overflow-hidden animate-slide-up">
            <div className="p-5 border-b border-surface-100 flex items-center justify-between bg-surface-50">
              <h3 className="font-bold text-surface-900 text-lg">Create New Group</h3>
              <button 
                onClick={() => setShowCreate(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-200 text-surface-500 transition-colors"
              >
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <div className="p-5">
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-surface-700 block mb-1">Group Name</label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g. Goa Trip 2026"
                    className="w-full px-4 py-2 border border-surface-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-surface-700 block mb-1">Currency</label>
                  <select
                    value={newGroupCurrency}
                    onChange={(e) => setNewGroupCurrency(e.target.value)}
                    className="w-full px-4 py-2 border border-surface-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm bg-white"
                  >
                    <option value="INR">₹ INR</option>
                    <option value="USD">$ USD</option>
                    <option value="EUR">€ EUR</option>
                  </select>
                </div>
                <div className="mt-6 pt-2">
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition-colors shadow-sm">
                    Create Group
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
