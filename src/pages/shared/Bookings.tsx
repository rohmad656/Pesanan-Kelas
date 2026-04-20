import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Calendar, Clock, MapPin, XCircle, Download, CalendarPlus } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import { motion, AnimatePresence } from 'motion/react';

export default function Bookings() {
  const { profile } = useAuth();
  const { bookings, loadingBookings } = useData();
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [cancellingIds, setCancellingIds] = useState<Set<string>>(new Set());

  // Scroll lock and Escape Key when modal is open
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCancelId(null);
    };

    if (cancelId) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [cancelId]);

  const handleCancel = async () => {
    if (!cancelId) return;
    const idToCancel = cancelId;
    
    // Optimistic Update: Add to cancelling set
    setCancellingIds(prev => new Set(prev).add(idToCancel));
    setCancelId(null);
    
    // Immediate feedback
    const toastId = toast.loading('Membatalkan pesanan...');

    try {
      await updateDoc(doc(db, 'bookings', idToCancel), { status: 'cancelled' });
      toast.success('Pemesanan berhasil dibatalkan.', { id: toastId });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${idToCancel}`);
      toast.error('Gagal membatalkan pemesanan.', { id: toastId });
      // Rollback: Remove from cancelling set if failed
      setCancellingIds(prev => {
        const next = new Set(prev);
        next.delete(idToCancel);
        return next;
      });
    }
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return '';
    try {
      return format(new Date(isoString), 'dd MMM yyyy, HH:mm');
    } catch (e) {
      return '';
    }
  };

  const formatTimeOnly = (isoString: string) => {
    if (!isoString) return '';
    try {
      return format(new Date(isoString), 'HH:mm');
    } catch (e) {
      return '';
    }
  };

  const handleDownloadProof = (booking: any) => {
    const content = `BUKTI PEMESANAN RUANGAN CAMPUSBOOK\n
=========================================
ID Pesanan    : ${booking.id}
Status        : DISETUJUI
=========================================
Nama Pemesan  : ${booking.userName}
Peran         : ${booking.userRole}
Ruangan       : ${booking.roomName || booking.roomId}
Waktu Mulai   : ${formatDate(booking.start_at || booking.startTime)}
Waktu Selesai : ${formatDate(booking.end_at || booking.endTime)}
Alasan        : ${booking.reason}
=========================================
Harap tunjukkan bukti ini kepada petugas jika diminta.`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bukti_Booking_${booking.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Bukti pemesanan berhasil diunduh.');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'approved': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'rejected': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'cancelled': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'completed': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Menunggu Verifikasi';
      case 'approved': return 'Disetujui';
      case 'rejected': return 'Ditolak';
      case 'cancelled': return 'Dibatalkan';
      case 'completed': return 'Selesai';
      default: return status;
    }
  };

  const handleAddToCalendar = (booking: any) => {
    const startStr = booking.start_at || booking.startTime;
    const endStr = booking.end_at || booking.endTime;
    
    if (!startStr || !endStr) return;
    
    const start = new Date(startStr);
    const end = new Date(endStr);
    
    const formatTime = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d+/g, '');
    };

    const title = encodeURIComponent(`Booking: ${booking.roomName || booking.roomId}`);
    const details = encodeURIComponent(`Alasan: ${booking.reason}`);
    const location = encodeURIComponent(booking.roomName || booking.roomId);
    
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatTime(start)}/${formatTime(end)}&details=${details}&location=${location}`;
    
    window.open(googleCalendarUrl, '_blank');
  };

  const now = new Date();

  const processedBookings = bookings.map(b => {
    const endStr = b.end_at || b.endTime;
    const isExpired = endStr ? new Date(endStr) < now : false;
    
    if (b.status === 'approved' && isExpired) {
      return { ...b, displayStatus: 'completed' };
    }
    return { ...b, displayStatus: b.status };
  });

  const activeBookings = processedBookings.filter(b => ['pending', 'approved'].includes(b.displayStatus));
  const historyBookings = processedBookings.filter(b => ['rejected', 'cancelled', 'completed'].includes(b.displayStatus));

  const displayedBookings = (activeTab === 'active' ? activeBookings : historyBookings).map(b => {
    if (cancellingIds.has(b.id)) {
      return { ...b, displayStatus: 'cancelled' };
    }
    return b;
  });

  if (loadingBookings) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 bg-slate-200 dark:bg-[#3F3F5A] rounded animate-pulse mb-2"></div>
          <div className="h-4 w-64 bg-slate-200 dark:bg-[#3F3F5A] rounded animate-pulse"></div>
        </div>
        <div className="flex gap-6 border-b border-slate-200 dark:border-[#3F3F5A]/30 mb-6">
          <div className="h-6 w-24 bg-slate-200 dark:bg-[#3F3F5A] rounded animate-pulse mb-2"></div>
          <div className="h-6 w-32 bg-slate-200 dark:bg-[#3F3F5A] rounded animate-pulse mb-2"></div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-[#27273A] rounded-2xl border border-slate-200 dark:border-[#3F3F5A]/30 p-6 animate-pulse">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <div className="h-6 w-1/3 bg-slate-200 dark:bg-[#3F3F5A] rounded"></div>
                  <div className="h-4 w-1/2 bg-slate-200 dark:bg-[#3F3F5A] rounded"></div>
                  <div className="h-4 w-1/4 bg-slate-200 dark:bg-[#3F3F5A] rounded"></div>
                </div>
                <div className="w-32 h-8 bg-slate-200 dark:bg-[#3F3F5A] rounded-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F5F5F5]">Pesanan Saya</h1>
        <p className="text-slate-600 dark:text-[#B4B4C8] text-sm">Pantau status pemesanan ruangan Anda.</p>
      </div>

      <div className="flex gap-4 border-b border-slate-200 dark:border-[#3F3F5A]/30 pb-px">
        <button
          onClick={() => setActiveTab('active')}
          className={`pb-3 text-sm font-bold transition-colors relative ${
            activeTab === 'active' ? 'text-brand-700 dark:text-brand-dark-accent' : 'text-slate-600 dark:text-[#B4B4C8] hover:text-slate-900 dark:text-[#F5F5F5]'
          }`}
        >
          Pesanan Aktif
          {activeTab === 'active' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-dark-accent-light rounded-t-full"></span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 text-sm font-bold transition-colors relative ${
            activeTab === 'history' ? 'text-brand-700 dark:text-brand-dark-accent' : 'text-slate-600 dark:text-[#B4B4C8] hover:text-slate-900 dark:text-[#F5F5F5]'
          }`}
        >
          Riwayat Pesanan
          {activeTab === 'history' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-dark-accent-light rounded-t-full"></span>
          )}
        </button>
      </div>

      <div className="space-y-4">
        {displayedBookings.length === 0 ? (
          <div className="bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 rounded-2xl border border-slate-200 dark:border-[#3F3F5A]/30 p-12 text-center text-slate-600 dark:text-[#B4B4C8]">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>{activeTab === 'active' ? 'Anda belum memiliki pesanan aktif.' : 'Belum ada riwayat pesanan.'}</p>
          </div>
        ) : (
          displayedBookings.map(booking => (
            <div key={booking.id} className="bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 rounded-2xl border border-slate-200 dark:border-[#3F3F5A]/30 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-[#F5F5F5]">Ruangan: {booking.roomName || booking.roomId}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(booking.displayStatus)}`}>
                    {getStatusText(booking.displayStatus)}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600 dark:text-[#B4B4C8] mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>
                      {formatDate(booking.start_at || booking.startTime)} - {formatTimeOnly(booking.end_at || booking.endTime)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>Alasan: {booking.reason}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {booking.displayStatus === 'approved' && (
                  <>
                    <button 
                      onClick={() => handleAddToCalendar(booking)}
                      className="px-4 py-2 bg-brand-100 dark:bg-[#32324A] text-blue-600 dark:text-[#86d2ff] hover:bg-brand-dark-hover hover:scale-105 active:scale-95 rounded-xl font-medium transition-all flex items-center gap-2 text-sm border border-[#86d2ff]/30"
                    >
                      <CalendarPlus className="w-4 h-4" /> Kalender
                    </button>
                    <button 
                      onClick={() => handleDownloadProof(booking)}
                      className="px-4 py-2 bg-brand-100 dark:bg-[#32324A] text-brand-700 dark:text-brand-dark-accent hover:bg-brand-dark-hover hover:scale-105 active:scale-95 rounded-xl font-medium transition-all flex items-center gap-2 text-sm"
                    >
                      <Download className="w-4 h-4" /> Bukti Booking
                    </button>
                  </>
                )}
                {booking.displayStatus === 'pending' && (
                  <button 
                    onClick={() => setCancelId(booking.id)}
                    className="px-4 py-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:scale-105 active:scale-95 rounded-xl font-medium transition-all flex items-center gap-2 text-sm"
                  >
                    <XCircle className="w-4 h-4" /> Batalkan
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      <AnimatePresence>
        {cancelId && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 cursor-pointer"
            onClick={() => setCancelId(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1e1e2d] w-full max-w-sm rounded-2xl shadow-xl border border-slate-200 dark:border-[#3F3F5A]/50 overflow-hidden p-6 text-center cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 dark:text-[#F5F5F5] mb-2">Batalkan Pesanan?</h3>
              <p className="text-slate-600 dark:text-[#B4B4C8] text-sm mb-6">Apakah Anda yakin ingin membatalkan pesanan ruangan ini? Tindakan ini tidak dapat diurungkan.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setCancelId(null)}
                  className="flex-1 py-2.5 bg-transparent border border-brand-dark-border-strong text-slate-600 dark:text-[#B4B4C8] font-bold rounded-xl hover:bg-brand-100 dark:bg-[#32324A] hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Kembali
                </button>
                <button 
                  onClick={handleCancel}
                  className="flex-1 py-2.5 bg-red-500/20 text-red-400 border border-red-500/30 font-bold rounded-xl hover:bg-red-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Ya, Batalkan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
