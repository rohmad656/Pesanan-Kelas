import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Clock, XCircle, CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

export default function RoleStatusWidget() {
  const { profile } = useAuth();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.email) return;

    const q = query(
      collection(db, 'role_change_requests'),
      where('email', '==', profile.email),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setRequest({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setRequest(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error watching role status:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile?.email]);

  if (loading || !request) return null;

  // Only show if pending or rejected (to inform user)
  if (request.status === 'approved') return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "mb-6 p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-sm",
        request.status === 'pending' 
          ? "bg-amber-50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/20" 
          : "bg-red-50 dark:bg-red-500/5 border-red-200 dark:border-red-500/20"
      )}
    >
      <div className="flex items-start gap-4">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
          request.status === 'pending' 
            ? "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400" 
            : "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
        )}>
          {request.status === 'pending' ? <Clock className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
        </div>
        <div>
          <h4 className={cn(
            "text-sm font-bold",
            request.status === 'pending' ? "text-amber-900 dark:text-amber-200" : "text-red-900 dark:text-red-200"
          )}>
            Status Pengajuan Peran: {request.status === 'pending' ? 'Menunggu' : 'Ditolak'}
          </h4>
          <p className="text-xs text-slate-600 dark:text-[#B4B4C8] mt-0.5 leading-relaxed">
            {request.status === 'pending' 
              ? `Permintaan untuk menjadi ${request.requestedRole.toUpperCase()} sedang ditinjau oleh tim admin.`
              : `Permintaan menjadi ${request.requestedRole.toUpperCase()} ditolak. Anda dapat mencoba lagi setelah memperbaiki data.`
            }
          </p>
          {request.status === 'rejected' && request.rejectReason && (
            <p className="text-[10px] font-bold text-red-600 dark:text-red-400 mt-1 uppercase italic">
              Alasan: {request.rejectReason}
            </p>
          )}
        </div>
      </div>
      
      <Link 
        to="/profil" 
        className={cn(
          "px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all",
          request.status === 'pending'
            ? "bg-white dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 hover:bg-amber-100"
            : "bg-white dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20 hover:bg-red-100"
        )}
      >
        Lihat Riwayat <ChevronRight className="w-3 h-3" />
      </Link>
    </motion.div>
  );
}
