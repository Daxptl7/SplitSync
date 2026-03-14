"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function FriendsPage() {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchEmail, setSearchEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState("");

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch received pending requests
      const reqRes = await api.get("/api/v1/auth/friends/pending/");
      setRequests(reqRes.data);

      // Fetch accepted friends 
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
      console.error("Error fetching friends data:", err);
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
      if (searchEmail.toLowerCase() === user.email.toLowerCase()) {
         setActionStatus("You cannot friend yourself.");
         return;
      }

      await api.post("/api/v1/auth/friends/send_request/", { email: searchEmail });
      setActionStatus("Friend request sent!");
      setSearchEmail("");
    } catch (err) {
      console.error(err);
      setActionStatus(err.response?.data?.error || "Error sending request");
    }
  };

  const handleRequestAction = async (requestId, action) => {
    try {
      await api.post(`/api/v1/auth/friends/${requestId}/${action}/`);
      fetchData(); // Refresh lists
    } catch (err) {
      alert("Error processing request: " + (err.response?.data?.error || err.message));
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading friends...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-surface-900 tracking-tight">
          Friends
        </h1>
        <p className="text-surface-400 mt-1">
          Manage your connections to split expenses.
        </p>
      </div>

      {actionStatus && (
        <div className="p-4 bg-brand-50 text-brand-700 rounded-xl font-medium border border-brand-100">
          {actionStatus}
        </div>
      )}

      {/* Add Friend Section */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-surface-800 mb-4">
          Add a Friend
        </h3>
        <form onSubmit={sendRequest} className="flex gap-4">
          <input
            type="email"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            placeholder="Friend's email address..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-surface-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-all text-sm"
            required
          />
          <button type="submit" className="btn-primary">
            Send Invite
          </button>
        </form>
      </div>

      {/* Pending Requests */}
      {requests.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-surface-800 mb-4">
            Pending Requests
          </h3>
          <div className="space-y-4">
            {requests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between p-4 bg-surface-50 rounded-xl border border-surface-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-200 flex items-center justify-center font-bold text-surface-600">
                    {req.sender.first_name?.[0]?.toUpperCase() ||
                       req.sender.email[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-surface-800">
                      {req.sender.first_name ||
                        req.sender.email.split("@")[0]}
                    </p>
                    <p className="text-xs text-surface-500">
                      {req.sender.email}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRequestAction(req.id, "accept")}
                    className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-semibold hover:bg-emerald-200 transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRequestAction(req.id, "reject")}
                    className="px-4 py-2 bg-rose-100 text-rose-700 rounded-lg text-sm font-semibold hover:bg-rose-200 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-surface-800 mb-4">
          Your Friends
        </h3>
        {friends.length === 0 ? (
          <p className="text-surface-500 text-sm text-center py-6">
            You haven't added any friends yet.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {friends.map((friendship) => {
              const friend = friendship.friend;
              return (
                <div
                  key={friendship.id}
                  className="flex items-center gap-3 p-4 bg-white rounded-xl border border-surface-200"
                >
                  <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center font-bold text-brand-600 text-lg">
                    {friend.first_name?.[0]?.toUpperCase() ||
                      friend.email[0].toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-semibold text-surface-900">
                      {friend.first_name || friend.email.split("@")[0]}
                    </h4>
                    <p className="text-xs text-surface-400">{friend.email}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
