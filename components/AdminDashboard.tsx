import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType, getAllUsers, revokeAccess, UserProfile } from '../services/firebase';
import { collection, query, getDocs, doc, updateDoc, Timestamp, where } from 'firebase/firestore';
import { Users, Clock, Check, X, Shield, Zap, AlertCircle, Ban, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';

export const AdminDashboard: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usageLogs, setUsageLogs] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'requests' | 'users'>('requests');

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch Requests
      const reqQuery = query(collection(db, 'accessRequests'));
      const reqSnapshot = await getDocs(reqQuery);
      setRequests(reqSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((r: any) => r.status === 'pending'));

      // Fetch Users
      const allUsers = await getAllUsers();
      setUsers(allUsers);

      // Fetch Today's Usage
      const date = new Date().toISOString().split('T')[0];
      const usageQuery = query(collection(db, 'usageLogs'), where('date', '==', date));
      const usageSnapshot = await getDocs(usageQuery);
      const logs: Record<string, number> = {};
      usageSnapshot.docs.forEach(doc => {
        const data = doc.data();
        logs[data.userId] = data.count;
      });
      setUsageLogs(logs);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (requestId: string, userId: string, days: number | null) => {
    try {
      const status = days ? 'approved' : 'rejected';
      await updateDoc(doc(db, 'accessRequests', requestId), { status });
      
      if (days) {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + days);
        await updateDoc(doc(db, 'users', userId), {
          accessExpiresAt: Timestamp.fromDate(expiry)
        });
      }
      
      await fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleRevoke = async (userId: string) => {
    if (confirm("Are you sure you want to revoke access for this user?")) {
      await revokeAccess(userId);
      await fetchData();
    }
  };

  if (loading) return <div className="text-zinc-500 font-mono text-xs animate-pulse">Synchronizing command center...</div>;

  return (
    <div className="space-y-8">
      {/* Tabs */}
      <div className="flex items-center p-1 bg-zinc-800/50 rounded-xl w-fit">
        <button 
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'requests' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          Access Requests
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          User Database
        </button>
      </div>

      {activeTab === 'requests' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <Shield className="w-4 h-4" /> Pending Authorization
            </h2>
            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{requests.length} Requests</span>
          </div>

          <div className="space-y-4">
            {requests.length === 0 ? (
              <div className="border border-white/5 bg-zinc-900/10 rounded-2xl p-12 flex flex-col items-center text-center">
                <Check className="w-10 h-10 text-zinc-700 mb-4" />
                <p className="text-xs text-zinc-600 font-medium tracking-wide">All security queues clear.</p>
              </div>
            ) : (
              requests.map((req) => (
                <motion.div 
                  layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  key={req.id}
                  className="bg-zinc-900 border border-white/[0.05] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div>
                    <div className="text-sm font-bold text-white mb-1">{req.userEmail}</div>
                    <div className="flex items-center gap-3 text-[10px] text-zinc-600 font-mono">
                      <span className="flex items-center gap-1 font-bold"><Clock className="w-3 h-3" /> {req.requestedAt.toDate().toLocaleDateString()}</span>
                      <span className="uppercase text-blue-500/60 font-bold">REQ_ID: {req.id.slice(0, 8)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {[1, 5, 30, 365].map(days => (
                      <button 
                        key={days}
                        onClick={() => handleAction(req.id, req.userId, days)}
                        className="px-3 py-2 bg-blue-500/5 text-blue-400 border border-blue-500/10 rounded-xl text-[10px] font-black hover:bg-blue-500 hover:text-white transition-all min-w-[40px]"
                      >
                        {days >= 365 ? '1Y' : `${days}D`}
                      </button>
                    ))}
                    <button 
                      onClick={() => handleAction(req.id, req.userId, null)}
                      className="ml-2 p-2 bg-red-500/5 text-red-500/60 border border-red-500/10 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <Users className="w-4 h-4" /> Personnel Directory
            </h2>
            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{users.length} Identities</span>
          </div>

          <div className="bg-zinc-900 border border-white/[0.05] rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/[0.05]">
                    <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">User Identity</th>
                    <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Access Token</th>
                    <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Daily Usage</th>
                    <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {users.map(user => {
                    const expiry = user.accessExpiresAt?.toDate();
                    const hasActiveAccess = user.role === 'admin' || (expiry && expiry > new Date());
                    const dailyTokenCount = usageLogs[user.uid] || 0;

                    return (
                      <tr key={user.uid} className="hover:bg-white/[0.01] transition-colors group">
                        <td className="p-4">
                          <div className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{user.email}</div>
                          <div className="text-[10px] font-mono text-zinc-600 mt-0.5">UID: {user.uid.slice(0, 12)}...</div>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          {user.role === 'admin' ? (
                            <span className="text-[9px] font-black uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-lg flex items-center gap-1 w-fit">
                              <Shield className="w-3 h-3" /> System Admin
                            </span>
                          ) : hasActiveAccess ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-lg w-fit">
                                Authorized
                              </span>
                              <span className="text-[9px] text-zinc-600 font-mono">Until {expiry?.toLocaleDateString()}</span>
                            </div>
                          ) : (
                            <span className="text-[9px] font-black uppercase bg-zinc-800 text-zinc-600 border border-white/5 px-2 py-0.5 rounded-lg w-fit">
                              Unauthorized
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full max-w-[80px] overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-1000 ${dailyTokenCount >= 10 ? 'bg-red-500' : 'bg-blue-500'}`}
                                style={{ width: `${Math.min((dailyTokenCount / 10) * 100, 100)}%` }}
                              />
                            </div>
                            <span className={`text-[10px] font-mono font-bold ${dailyTokenCount >= 10 ? 'text-red-500' : 'text-zinc-500'}`}>
                              {dailyTokenCount}/10
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          {user.role !== 'admin' && hasActiveAccess && (
                            <button 
                              onClick={() => handleRevoke(user.uid)}
                              className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                              title="Revoke Access"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

