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

  const [rejectingRequest, setRejectingRequest] = useState<RoleRequest | null>(null);
  const [approvingRequest, setApprovingRequest] = useState<RoleRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const handleAction = async (request: RoleRequest, action: 'approve' | 'reject', reason?: string) => {
    if (processingId) return;
    
    try {
      setProcessingId(request.id);
      
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error("Sesi autentikasi tidak ditemukan. Silakan login ulang.");
      }

      // Call the NEW backend API to process everything in one go (more reliable & secure)
      const res = await fetch('/api/admin/process-role-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: request.id,
          action: action,
          rejectReason: reason,
          adminToken: idToken
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Gagal ${action === 'approve' ? 'menyetujui' : 'menolak'} permintaan`);
      }

      toast.success(`Permintaan ${action === 'approve' ? 'disetujui' : 'ditolak'}`);
      setSuccessId(request.id);
      
      // Delay cleaning up success state to allow animation
      setTimeout(() => {
        setProcessingId(null);
        setApprovingRequest(null);
        setRejectingRequest(null);
        setRejectReason('');
        setSuccessId(null);
      }, 2000);

    } catch (error: any) {
      setProcessingId(null);
      setApprovingRequest(null);
      setRejectingRequest(null);
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
                   ? "bg-brand-600 text-white shadow-lg shadow-brand-600/30 ring-2 ring-brand-600/20" 
                  : "text-slate-500 dark:text-[#B4B4C8] hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#3F3F5A]/50"
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
                <div className="p-5 flex flex-col md:flex-row md:items-center gap-6 relative">
                  {successId === request.id && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 z-10 bg-green-500/10 dark:bg-green-500/5 backdrop-blur-[2px] flex items-center justify-center border-2 border-green-500/50 rounded-2xl"
                    >
                      <motion.div 
                        initial={{ scale: 0.8, y: 10 }}
                        animate={{ scale: 1, y: 0 }}
                        className="flex flex-col items-center gap-2"
                      >
                        <div className="w-12 h-12 bg-white dark:bg-[#1E1E2F] rounded-full flex items-center justify-center shadow-lg">
                          <CheckCircle className="w-8 h-8 text-green-600 animate-bounce" />
                        </div>
                        <span className="font-bold text-green-700 dark:text-green-400 bg-white dark:bg-[#1E1E2F] px-4 py-1 rounded-full shadow-sm text-sm">Role Berhasil Diperbarui</span>
                      </motion.div>
                    </motion.div>
                  )}
                  
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
                        <p className="text-[10px] font-bold text-slate-500 dark:text-[#A4A4C8] uppercase tracking-wider">Peran Sekarang</p>
                        <p className="text-sm font-bold text-slate-800 dark:text-[#F5F5F5] capitalize">{request.currentRole}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-500 dark:text-[#A4A4C8] uppercase tracking-wider">Peran Diminta</p>
                        <div className="flex items-center gap-2">
                          <ChevronRight className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                          <p className="text-sm font-extrabold text-brand-600 dark:text-brand-dark-accent capitalize">{request.requestedRole}</p>
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
                        onClick={() => setApprovingRequest(request)}
                        disabled={!!processingId}
                        className={cn(
                          "flex-1 md:w-32 flex items-center justify-center gap-2 py-3 px-4 min-w-[44px] min-h-[44px] text-sm font-extrabold rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100",
                          processingId === request.id 
                            ? "bg-slate-100 text-slate-400" 
                            : "bg-green-600 hover:bg-green-700 text-white shadow-green-600/30 hover:shadow-green-500/40 dark:hover:shadow-green-500/20"
                        )}
                      >
                        {processingId === request.id ? (
                          <div className="w-4 h-4 border-2 border-slate-300 border-t-brand-600 rounded-full animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Setujui
                      </button>
                      <button
                        onClick={() => setRejectingRequest(request)}
                        disabled={!!processingId}
                        className="flex-1 md:w-32 flex items-center justify-center gap-2 py-3 px-4 min-w-[44px] min-h-[44px] bg-slate-100 dark:bg-[#32324A] hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 text-slate-700 dark:text-[#F5F5F5] text-sm font-extrabold rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 shadow-sm"
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

      <AnimatePresence>
        {approvingRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !processingId && setApprovingRequest(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-white dark:bg-[#27273A] rounded-3xl shadow-xl p-8 border border-slate-200 dark:border-[#3F3F5A]/30 text-center"
            >
              <div className="w-16 h-16 bg-green-100 dark:bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Konfirmasi Persetujuan</h3>
              <p className="text-sm text-slate-500 dark:text-[#B4B4C8] mb-6">
                Apakah Anda yakin ingin menyetujui perubahan peran <span className="font-bold text-slate-900 dark:text-white">{approvingRequest.email}</span> menjadi <span className="font-bold text-brand-600 dark:text-brand-dark-accent capitalize">{approvingRequest.requestedRole}</span>?
              </p>
              
              <div className="flex gap-3">
                <button
                  disabled={!!processingId}
                  onClick={() => setApprovingRequest(null)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-[#32324A] text-slate-700 dark:text-[#F5F5F5] font-bold rounded-xl transition-all hover:bg-slate-200 dark:hover:bg-[#3F3F5A] hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  disabled={!!processingId}
                  onClick={() => handleAction(approvingRequest, 'approve')}
                  className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-600/30 hover:shadow-green-500/40 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                >
                  {processingId === approvingRequest.id ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : 'Setuju'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {rejectingRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRejectingRequest(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-white dark:bg-[#27273A] rounded-2xl shadow-xl p-6 border border-slate-200 dark:border-[#3F3F5A]/30"
            >
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Tolak Permintaan</h3>
              <p className="text-sm text-slate-500 mb-4">Berikan alasan penolakan untuk {rejectingRequest.email}:</p>
              
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Contoh: Lampiran data tidak valid atau email sudah terdaftar"
                className="w-full p-4 bg-slate-50 dark:bg-[#1E1E2F] border border-slate-200 dark:border-[#3F3F5A]/50 rounded-xl text-sm text-slate-900 dark:text-[#F5F5F5] min-h-[100px] mb-4 focus:ring-2 focus:ring-red-500 outline-none transition-all placeholder:text-slate-400/70"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setRejectingRequest(null)}
                  className="flex-1 py-2 bg-slate-100 dark:bg-[#32324A] text-slate-700 dark:text-[#F5F5F5] font-bold rounded-xl transition-all hover:bg-slate-200 dark:hover:bg-[#3F3F5A] hover:scale-105 active:scale-95"
                >
                  Batal
                </button>
                <button
                  onClick={() => handleAction(rejectingRequest, 'reject', rejectReason)}
                  disabled={!rejectReason.trim()}
                  className="flex-1 py-2 bg-red-600 text-white font-bold rounded-xl transition-all hover:bg-red-700 shadow-lg shadow-red-600/30 hover:shadow-red-500/40 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
                >
                  Tolak
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
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
