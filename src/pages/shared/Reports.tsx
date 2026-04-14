import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { AlertTriangle, Send, Loader2, CheckCircle, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Reports() {
  const { profile } = useAuth();
  const [roomId, setRoomId] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReport, setSubmittedReport] = useState<{ room: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !roomId || !description) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'issues'), {
        roomId,
        userId: profile.uid,
        userName: profile.name,
        description,
        status: 'reported',
        createdAt: serverTimestamp()
      });

      // Add notification for admin
      await addDoc(collection(db, 'notifications'), {
        targetRole: 'admin',
        title: 'Laporan Kerusakan Baru',
        message: `Laporan baru di ruangan ${roomId} dari ${profile.name}.`,
        type: 'warning',
        isRead: false,
        createdAt: serverTimestamp()
      });

      setSubmittedReport({ room: roomId });
      setRoomId('');
      setDescription('');
      toast.success('Laporan berhasil dikirim. Tim sarana prasarana akan segera menindaklanjuti.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'issues');
      toast.error('Gagal mengirim laporan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mock staff mapping based on room
  const getStaffForRoom = (roomName: string) => {
    if (roomName.toLowerCase().includes('lab')) {
      return { name: 'Budi Santoso', role: 'Teknisi Lab', wa: '6281234567890', img: 'https://ui-avatars.com/api/?name=Budi+Santoso&background=d1a6ff&color=3a0a67' };
    }
    return { name: 'Siti Aminah', role: 'Staff Sarpras', wa: '6289876543210', img: 'https://ui-avatars.com/api/?name=Siti+Aminah&background=ffafd5&color=3a0a67' };
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F5F5F5]">Laporan & Bantuan</h1>
        <p className="text-slate-600 dark:text-[#B4B4C8] text-sm">Laporkan kendala teknis atau kerusakan fasilitas ruangan.</p>
      </div>

      {submittedReport ? (
        <div className="bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 rounded-2xl border border-slate-200 dark:border-[#3F3F5A]/30 p-6 md:p-8 text-center">
          <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-[#F5F5F5] mb-2">Laporan Diterima</h2>
          <p className="text-slate-600 dark:text-[#B4B4C8] mb-8">
            Terima kasih, laporan kerusakan untuk ruangan <span className="font-bold text-slate-900 dark:text-[#F5F5F5]">{submittedReport.room}</span> telah kami terima.
          </p>

          <div className="bg-brand-50 dark:bg-[#32324A]/30 border border-brand-100 dark:border-[#3F3F5A]/50 rounded-2xl p-6 text-left max-w-md mx-auto">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-[#B4B4C8] mb-4">Staff Penanggung Jawab</h3>
            <div className="flex items-center gap-4">
              <img src={getStaffForRoom(submittedReport.room).img} alt="Staff" className="w-12 h-12 rounded-full border-2 border-brand-200 dark:border-brand-dark-accent/30" />
              <div className="flex-1">
                <h4 className="font-bold text-slate-900 dark:text-[#F5F5F5]">{getStaffForRoom(submittedReport.room).name}</h4>
                <p className="text-xs text-slate-600 dark:text-[#B4B4C8]">{getStaffForRoom(submittedReport.room).role}</p>
              </div>
              <a 
                href={`https://wa.me/${getStaffForRoom(submittedReport.room).wa}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-[#25D366]/10 text-[#25D366] rounded-xl hover:bg-[#25D366]/20 transition-colors flex items-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm font-bold hidden sm:block">Hubungi</span>
              </a>
            </div>
          </div>

          <button 
            onClick={() => setSubmittedReport(null)}
            className="mt-8 px-6 py-2.5 bg-slate-100 dark:bg-[#32324A] text-slate-700 dark:text-[#F5F5F5] font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-brand-dark-hover transition-colors"
          >
            Buat Laporan Baru
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 rounded-2xl border border-slate-200 dark:border-[#3F3F5A]/30 p-6 md:p-8">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-200 dark:border-[#3F3F5A]/30">
            <div className="w-12 h-12 bg-red-500/20 text-red-400 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-[#F5F5F5]">Form Pelaporan Masalah</h2>
              <p className="text-slate-600 dark:text-[#B4B4C8] text-sm">Tim sarana prasarana akan segera menindaklanjuti laporan Anda.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-[#B4B4C8]">Nama Ruangan</label>
              <input 
                type="text" 
                required
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Contoh: Lab Komputer 1"
                className="w-full px-4 py-3 bg-brand-100 dark:bg-[#32324A] border border-slate-200 dark:border-[#3F3F5A]/50 rounded-xl text-slate-900 dark:text-[#F5F5F5] placeholder:text-slate-600 dark:text-[#B4B4C8]/50 focus:outline-none focus:border-brand-400 dark:border-brand-dark-accent focus:ring-1 focus:ring-brand-dark-accent-light transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-[#B4B4C8]">Deskripsi Masalah</label>
              <textarea 
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Jelaskan kendala yang Anda alami (misal: Proyektor tidak menyala, AC bocor)..."
                className="w-full px-4 py-3 bg-brand-100 dark:bg-[#32324A] border border-slate-200 dark:border-[#3F3F5A]/50 rounded-xl text-slate-900 dark:text-[#F5F5F5] placeholder:text-slate-600 dark:text-[#B4B4C8]/50 focus:outline-none focus:border-brand-400 dark:border-brand-dark-accent focus:ring-1 focus:ring-brand-dark-accent-light transition-all resize-none"
              ></textarea>
            </div>

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full md:w-auto px-8 py-3 bg-brand-dark-accent-light text-brand-dark-on-accent font-bold rounded-xl hover:bg-brand-dark-accent-hover hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Mengirim...</>
              ) : (
                <><Send className="w-5 h-5" /> Kirim Laporan</>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
