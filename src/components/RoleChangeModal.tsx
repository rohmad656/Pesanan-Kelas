import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { X, Send, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

interface RoleChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  currentRole: string;
}

export default function RoleChangeModal({ isOpen, onClose, userEmail, currentRole }: RoleChangeModalProps) {
  const [targetRole, setTargetRole] = useState<'mahasiswa' | 'dosen' | 'admin'>('mahasiswa');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Mohon isi alasan perubahan peran');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'role_change_requests'), {
        email: userEmail,
        currentRole: currentRole.toLowerCase(),
        requestedRole: targetRole,
        reason: reason.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Notify admins
      await addDoc(collection(db, 'notifications'), {
        title: 'Permintaan Perubahan Role',
        message: `User ${userEmail} mengajukan perubahan role menjadi ${targetRole.toUpperCase()}.`,
        type: 'issue',
        targetRole: 'admin',
        isRead: false,
        createdAt: serverTimestamp(),
        meta: '/admin/perubahan-peran'
      });

      setIsSuccess(true);
      toast.success('Pengajuan perubahan peran berhasil dikirim!');
    } catch (error) {
      console.error('Error submitting role change request:', error);
      toast.error('Gagal mengirim pengajuan. Silakan coba lagi nanti.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white dark:bg-[#27273A] rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-[#3F3F5A]/30"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-[#F5F5F5]">Ajukan Perubahan Peran</h3>
                  <p className="text-sm text-slate-500 dark:text-[#B4B4C8]">Akun Anda terdaftar dengan peran yang salah?</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-[#3F3F5A]/30 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {!isSuccess ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="p-3 bg-brand-50 dark:bg-brand-500/5 border border-brand-100 dark:border-brand-500/20 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-brand-600 dark:text-brand-dark-accent shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-600 dark:text-[#B4B4C8] leading-relaxed">
                      Permintaan ini akan ditinjau oleh Admin Kampus. Masukkan alasan yang jelas mengapa Anda membutuhkan perubahan peran (misal: "Saya Dosen tapi terdaftar sebagai Mahasiswa").
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-[#B4B4C8] uppercase tracking-wider">Email Akun</label>
                    <input
                      type="text"
                      readOnly
                      value={userEmail}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#1E1E2F] border border-slate-200 dark:border-[#3F3F5A]/50 rounded-xl text-sm text-slate-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-[#B4B4C8] uppercase tracking-wider">Peran Sekarang</label>
                      <div className="px-4 py-2.5 bg-slate-50 dark:bg-[#1E1E2F] border border-slate-200 dark:border-[#3F3F5A]/50 rounded-xl text-sm text-slate-500 capitalize">
                        {currentRole}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-[#B4B4C8] uppercase tracking-wider">Peran Yang Diminta</label>
                      <select
                        value={targetRole}
                        onChange={(e) => setTargetRole(e.target.value as any)}
                        className="w-full px-4 py-2.5 bg-white dark:bg-[#27273A] border border-slate-200 dark:border-[#3F3F5A]/50 rounded-xl text-sm focus:outline-none focus:border-brand-400 text-slate-900 dark:text-[#F5F5F5] capitalize"
                      >
                        <option value="mahasiswa">Mahasiswa</option>
                        <option value="dosen">Dosen</option>
                        <option value="admin">Admin/Staff</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-[#B4B4C8] uppercase tracking-wider">Alasan Perubahan</label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Contoh: Saya Dosen Tetap Fakultas Teknik tapi sistem mendeteksi sebagai Mahasiswa..."
                      className="w-full px-4 py-3 bg-white dark:bg-[#27273A] border border-slate-200 dark:border-[#3F3F5A]/50 rounded-xl text-sm focus:outline-none focus:border-brand-400 text-slate-900 dark:text-[#F5F5F5] min-h-[100px] resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg shadow-brand-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Kirim Pengajuan
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="py-8 text-center space-y-4">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-500" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-lg font-bold text-slate-900 dark:text-[#F5F5F5]">Pengajuan Terkirim!</h4>
                    <p className="text-sm text-slate-600 dark:text-[#B4B4C8]">
                      Mohon tunggu konfirmasi dari Admin Kampus. Kami akan memproses permintaan Anda segera.
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="mt-4 px-8 py-2.5 bg-slate-100 dark:bg-[#32324A] text-slate-900 dark:text-[#F5F5F5] font-bold rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
