import React, { useState, useEffect } from 'react';
import { db, auth } from '../../lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc, 
  getDocs, 
  where,
  addDoc,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { 
  ShieldCheck, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Mail, 
  Info,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

interface RoleRequest {
  id: string;
  email: string;
  currentRole: string;
  requestedRole: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  updatedAt: any;
}

export default function RoleRequests() {
  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  useEffect(() => {
    const q = query(collection(db, 'role_change_requests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RoleRequest));
      setRequests(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAction = async (request: RoleRequest, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        const confirmApprove = window.confirm(`Apakah Anda yakin ingin menyetujui perubahan peran ${request.email} menjadi ${request.requestedRole.toUpperCase()}?`);
        if (!confirmApprove) return;

        // 1. Update the user role in the backend
        // We'll use our existing API for this to ensure Auth Custom Claims are updated too.
        // But first we need the UID of the user with this email.
        const usersRef = collection(db, 'users');
        const userQuery = query(usersRef, where('email', '==', request.email));
        const userSnapshot = await getDocs(userQuery);

        if (userSnapshot.empty) {
          // If user doc not found but email is in role_mappings (or not)
          // We can update role_mappings to ensure next registration or login uses the right role
          await addDoc(collection(db, 'role_mappings'), {
            role: request.requestedRole
          });
          // This is a bit complex without specific backend for un-migrated users
          // For now, assume user exists if they hit the modal (as designed in Login.tsx)
          toast.error("User profile tidak ditemukan. Pastikan user sudah terdaftar.");
          return;
        }

        const userDoc = userSnapshot.docs[0];
        const uid = userDoc.id;

        // Call the backend API to update role securely
        const idToken = await auth.currentUser?.getIdToken();
        if (!idToken) {
          // Fallback to direct Firestore update
          await updateDoc(doc(db, 'users', uid), {
            role: request.requestedRole,
            updatedAt: serverTimestamp()
          });
        } else {
          const res = await fetch('/api/admin/update-user-role', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetUid: uid,
              newRole: request.requestedRole,
              adminToken: idToken
            })
          });
          
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to update via API');
          }
        }
      }

      // Update request status
      await updateDoc(doc(db, 'role_change_requests', request.id), {
        status: action === 'approve' ? 'approved' : 'rejected',
        updatedAt: serverTimestamp()
      });

      // Audit Log
      await addDoc(collection(db, 'audit_logs'), {
        action: `ROLE_REQUEST_${action.toUpperCase()}`,
        targetUid: request.email,
        performedBy: auth.currentUser?.uid || 'system',
        timestamp: serverTimestamp(),
        details: `${action === 'approve' ? 'Disetujui' : 'Ditolak'} permintaan role ${request.requestedRole} untuk ${request.email}. Alasan: ${request.reason}`
      });

      // Notify User (if profile exists)
      const usersRef = collection(db, 'users');
      const userQuery = query(usersRef, where('email', '==', request.email));
      const userSnapshotForNotif = await getDocs(userQuery);
      
      if (!userSnapshotForNotif.empty) {
        const uid = userSnapshotForNotif.docs[0].id;
        await addDoc(collection(db, 'notifications'), {
          userId: uid,
          title: `Permintaan Role ${action === 'approve' ? 'Disetujui' : 'Ditolak'}`,
          message: action === 'approve' 
            ? `Admin telah menyetujui permintaan Anda untuk menjadi ${request.requestedRole.toUpperCase()}. Perubahan sudah aktif.`
            : `Maaf, permintaan perubahan peran Anda ditolak oleh Admin.`,
          type: action === 'approve' ? 'info' : 'rejected',
          isRead: false,
          createdAt: serverTimestamp(),
          meta: '/profil'
        });
      }

      toast.success(`Permintaan ${action === 'approve' ? 'disetujui' : 'ditolak'}`);
    } catch (error: any) {
      console.error(`Error ${action}ing request:`, error);
      toast.error(`Gagal ${action === 'approve' ? 'menyetujui' : 'menolak'} permintaan: ` + error.message);
    }
  };

  const filteredRequests = requests.filter(r => filter === 'all' ? true : r.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-[#F5F5F5]">Permintaan Perubahan Peran</h2>
          <p className="text-sm text-slate-500 dark:text-[#B4B4C8]">Tinjau dan kelola laporan kesalahan peran akun dari pengguna.</p>
        </div>

        <div className="flex bg-white dark:bg-[#27273A] p-1 rounded-xl border border-slate-200 dark:border-[#3F3F5A]/30 shadow-sm self-start">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize",
                filter === f 
                  ? "bg-brand-600 text-white shadow-md shadow-brand-600/20" 
                  : "text-slate-500 dark:text-[#B4B4C8] hover:bg-slate-100 dark:hover:bg-[#32324A]"
              )}
            >
              {f === 'pending' ? 'Menunggu' : f === 'approved' ? 'Setuju' : f === 'rejected' ? 'Tolak' : 'Semua'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
            <p className="text-slate-500 dark:text-[#B4B4C8] font-medium text-sm animate-pulse">Memuat data...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-[#27273A] rounded-2xl border border-dashed border-slate-300 dark:border-[#3F3F5A]/50">
            <div className="w-16 h-16 bg-slate-100 dark:bg-[#32324A] rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-[#F5F5F5]">Tidak Ada Permintaan</h3>
            <p className="text-slate-500 dark:text-[#B4B4C8] text-sm">Saat ini tidak ada permintaan peran dengan status "{filter}".</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredRequests.map((request) => (
              <motion.div
                key={request.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-[#27273A] rounded-2xl border border-slate-200 dark:border-[#3F3F5A]/30 overflow-hidden shadow-sm hover:shadow-md transition-all group"
              >
                <div className="p-5 flex flex-col md:flex-row md:items-center gap-6">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-500/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-brand-600 dark:text-brand-dark-accent" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 dark:text-[#F5F5F5]">{request.email}</p>
                          <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-widest",
                            request.status === 'pending' ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" :
                            request.status === 'approved' ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400" :
                            "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                          )}>
                            {request.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-[#B4B4C8]">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{request.createdAt ? new Date(request.createdAt.toMillis()).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Baru'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-3 bg-slate-50 dark:bg-[#1E1E2F] rounded-xl px-4 border border-slate-100 dark:border-[#3F3F5A]/20">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-[#6A6A8A] uppercase tracking-wider">Peran Sekarang</p>
                        <p className="text-sm font-semibold text-slate-700 dark:text-[#D1D1E0] capitalize">{request.currentRole}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-[#6A6A8A] uppercase tracking-wider">Peran Diminta</p>
                        <div className="flex items-center gap-2">
                          <ChevronRight className="w-3 h-3 text-brand-500 shrink-0" />
                          <p className="text-sm font-bold text-brand-600 dark:text-brand-dark-accent capitalize">{request.requestedRole}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 items-start bg-blue-50/50 dark:bg-blue-500/5 p-3 rounded-xl border border-blue-100 dark:border-blue-500/10">
                      <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-slate-600 dark:text-[#B4B4C8] italic line-clamp-3 group-hover:line-clamp-none transition-all">
                        "{request.reason}"
                      </p>
                    </div>
                  </div>

                  {request.status === 'pending' && (
                    <div className="flex md:flex-col gap-2 shrink-0 border-t md:border-t-0 md:border-l border-slate-200 dark:border-[#3F3F5A]/30 pt-4 md:pt-0 md:pl-6">
                      <button
                        onClick={() => handleAction(request, 'approve')}
                        className="flex-1 md:w-32 flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-green-600/20 transition-all"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Setujui
                      </button>
                      <button
                        onClick={() => handleAction(request, 'reject')}
                        className="flex-1 md:w-32 flex items-center justify-center gap-2 py-2.5 bg-slate-100 dark:bg-[#32324A] hover:bg-slate-200 dark:hover:bg-[#3F3F5A] text-slate-700 dark:text-[#F5F5F5] text-sm font-bold rounded-xl transition-all"
                      >
                        <XCircle className="w-4 h-4" />
                        Tolak
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
      
      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-4 rounded-xl flex items-start gap-4">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 dark:text-amber-200/70 leading-relaxed">
          <p className="font-bold mb-1 uppercase tracking-tight">Catatan untuk Admin:</p>
          Menyetujui permintaan akan secara otomatis mengubah peran user di database dan memperbarui profil mereka. 
          Pastikan Anda telah melakukan verifikasi data pendukung jika diperlukan. User akan menerima notifikasi otomatis setelah permintaan diproses.
        </div>
      </div>
    </div>
  );
}
