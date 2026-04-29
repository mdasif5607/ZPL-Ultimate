import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { collection, query, getDocs, doc, updateDoc, Timestamp, addDoc, serverTimestamp } from 'firebase/firestore';
import { Users, Clock, Check, X, Shield, Calendar } from 'lucide-react';
import { motion } from 'motion/react';

export const AdminDashboard: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const q = query(collection(db, 'accessRequests'));
      const querySnapshot = await getDocs(q);
      const reqs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRequests(reqs.filter((r: any) => r.status === 'pending'));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'accessRequests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
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
      
      await fetchRequests();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  if (loading) return <div className="text-zinc-500 font-mono text-xs animate-pulse">Scanning access requests...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2">
          <Shield className="w-4 h-4" /> Command Center
        </h2>
        <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{requests.length} Pending</span>
      </div>

      <div className="space-y-4">
        {requests.length === 0 ? (
          <div className="border border-white/5 bg-zinc-900/20 rounded-xl p-8 flex flex-col items-center text-center">
            <Check className="w-8 h-8 text-zinc-700 mb-2" />
            <p className="text-xs text-zinc-600 font-medium">All systems authorized. No pending requests.</p>
          </div>
        ) : (
          requests.map((req) => (
            <motion.div 
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              key={req.id}
              className="bg-zinc-900 border border-white/[0.05] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div>
                <div className="text-sm font-bold text-white mb-1">{req.userEmail}</div>
                <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-mono">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {req.requestedAt.toDate().toLocaleDateString()}</span>
                  <span className="uppercase text-blue-500/80 tracking-tighter">Request ID: {req.id.slice(0, 8)}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button 
                  onClick={() => handleAction(req.id, req.userId, 1)}
                  className="px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-bold hover:bg-blue-500 hover:text-white transition-all flex items-center gap-1"
                >
                   1D
                </button>
                <button 
                  onClick={() => handleAction(req.id, req.userId, 5)}
                  className="px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-bold hover:bg-blue-500 hover:text-white transition-all"
                >
                  5D
                </button>
                <button 
                  onClick={() => handleAction(req.id, req.userId, 30)}
                  className="px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-bold hover:bg-blue-500 hover:text-white transition-all"
                >
                  30D
                </button>
                <button 
                  onClick={() => handleAction(req.id, req.userId, 365)}
                  className="px-3 py-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-bold hover:bg-indigo-500 hover:text-white transition-all"
                >
                  1Y
                </button>
                <button 
                  onClick={() => handleAction(req.id, req.userId, null)}
                  className="ml-2 p-1.5 bg-red-500/10 text-red-500 border border-red-500/10 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
