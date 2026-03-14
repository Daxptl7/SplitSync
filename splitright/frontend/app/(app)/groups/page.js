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

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch Groups where the current user is a member
      const groupsRes = await api.get("/api/v1/groups/");
      setGroups(groupsRes.data);

      // 2. Fetch accepted friends
      const friendsRes = await api.get("/api/v1/auth/friends/accepted/");
      const frnds = friendsRes.data.map(f => {
         // Determine which is the friend vs the current user
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
      <div className="p-8 text-center text-surface-500">
        Loading your groups...
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-surface-900 tracking-tight">
            Groups
          </h1>
          <p className="text-surface-400 mt-1">
            Manage your expense groups and members.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="btn-primary text-sm"
        >
          <i className="ri-add-line" /> New Group
        </button>
      </div>

      {actionStatus && (
        <div className="p-4 mb-6 bg-brand-50 text-brand-700 rounded-xl font-medium border border-brand-100">
          {actionStatus}
        </div>
      )}

      {/* Create Group Form */}
      {showCreate && (
        <form
          onSubmit={handleCreateGroup}
          className="glass-card p-6 mb-6 animate-slide-up"
        >
          <h3 className="text-lg font-semibold text-surface-800 mb-4">
            Create New Group
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-surface-600 mb-1 block">
                Group Name
              </label>
              <input
                type="text"
                placeholder="e.g., Goa Trip 2026"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-all text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-surface-600 mb-1 block">
                Currency
              </label>
              <select
                value={newGroupCurrency}
                onChange={(e) => setNewGroupCurrency(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-all text-sm bg-white"
              >
                <option value="INR">₹ INR</option>
                <option value="USD">$ USD</option>
                <option value="EUR">€ EUR</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button type="submit" className="btn-primary text-sm">
              Create Group
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Groups Grid */}
      {groups.length === 0 ? (
        <p className="text-center text-surface-500 py-10 glass-card">
          You are not part of any groups yet.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {groups.map((group) => (
            <div key={group.id} className="glass-card p-5 group flex flex-col justify-between">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 cursor-pointer">
                  <div className="w-11 h-11 rounded-2xl bg-brand-100 flex items-center justify-center text-lg font-bold text-brand-600">
                    {group.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-surface-800 group-hover:text-brand-600 transition-colors">
                      {group.name}
                    </h3>
                    <p className="text-xs text-surface-400">
                      {group.members?.length || 0} members · Currency:{" "}
                      {group.currency}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <span className="text-xs px-2 py-1 rounded-full font-medium bg-emerald-50 text-emerald-600">
                    Active
                  </span>
                  <button
                    onClick={() =>
                      setShowAddMember(
                        showAddMember === group.id ? null : group.id,
                      )
                    }
                    className="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-1 rounded hover:bg-brand-100 transition"
                  >
                    + Add Friend
                  </button>
                </div>
              </div>

              {/* Members Preview */}
              <div className="flex flex-wrap gap-[-8px] mt-2">
                 {(group.members || []).slice(0, 3).map((m, i) => (
                    <div key={m.id} title={m.user.first_name || m.user.email} className="w-8 h-8 rounded-full bg-surface-200 border-2 border-white flex items-center justify-center text-xs font-bold text-surface-600 shadow-sm z-10" style={{ marginLeft: i > 0 ? '-8px' : '0' }}>
                       {m.user?.first_name?.[0]?.toUpperCase() || m.user?.email?.[0]?.toUpperCase() || '?'}
                    </div>
                 ))}
                 {(group.members || []).length > 3 && (
                    <div className="w-8 h-8 rounded-full bg-surface-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-surface-500 shadow-sm z-10" style={{ marginLeft: '-8px' }}>
                       +{(group.members || []).length - 3}
                    </div>
                 )}
              </div>

              {/* Add Member Dropdown */}
              {showAddMember === group.id && (
                <div className="mt-4 p-4 bg-surface-50 rounded-xl border border-surface-100 animate-slide-up">
                  <h4 className="text-sm font-semibold text-surface-700 mb-2">
                    Select a Friend to Add
                  </h4>
                  {friends.length === 0 ? (
                    <p className="text-xs text-surface-500">
                      You don't have any friends to add yet.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                      {friends.map((f) => {
                        const friendData = f.friend;
                        
                        // Optimization: Skip displaying if they are already in the group
                        const isAlreadyMember = (group.members || []).some(m => m.user.id === friendData.id);
                        if (isAlreadyMember) return null;

                        return (
                          <div
                            key={f.id}
                            className="flex justify-between items-center p-2 rounded hover:bg-white transition-colors border border-transparent hover:border-surface-200"
                          >
                            <span className="text-sm text-surface-800">
                              {friendData.first_name ||
                                friendData.email.split("@")[0]}
                            </span>
                            <button
                              onClick={() =>
                                handleAddFriend(group.id, friendData.id)
                              }
                              className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 font-medium"
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
  );
}
