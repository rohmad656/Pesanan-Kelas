import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, writeBatch, or } from 'firebase/firestore';
import { Bell, CheckCircle2, Trash2, Clock, AlertCircle, Info, MessageSquare, AlertTriangle, CalendarDays } from 'lucide-react';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import BaseModal from '../../components/BaseModal';

export default function Notifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  useEffect(() => {
    if (!profile) return;

    // Listen to notifications where targetRole is 'admin' for staff/admin OR userId is current user
    let q;
    if (profile.role === 'admin' || profile.role === 'staff') {
      q = query(
        collection(db, 'notifications'),
        or(
          where('userId', '==', profile.uid),
          where('targetRole', '==', 'admin')
        )
      );
    } else {
      q = query(
        collection(db, 'notifications'),
        or(
          where('userId', '==', profile.uid),
          where('targetRole', '==', profile.role)
        )
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as any)).sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      
      setNotifications(notifs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
      toast.success('Notifikasi dihapus');
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast.error('Gagal menghapus notifikasi');
    }
  };

  const deleteAllNotifications = async () => {
    if (notifications.length === 0) return;
    setIsDeletingAll(true);
    try {
      const batch = writeBatch(db);
      notifications.forEach((n) => {
        batch.delete(doc(db, 'notifications', n.id));
      });
      await batch.commit();
      toast.success('Semua notifikasi berhasil dihapus');
      setIsDeleteAllModalOpen(false);
    } catch (error) {
      console.error("Error deleting all notifications:", error);
      toast.error('Gagal menghapus semua notifikasi');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length === 0) return;

    const batch = writeBatch(db);
    unread.forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { isRead: true });
    });

    try {
      await batch.commit();
      toast.success('Semua notifikasi ditandai dibaca');
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const getNotificationUI = (notif: any) => {
    let IconComponent = Bell;
    let iconColorClass = 'text-slate-600 dark:text-[#B4B4C8]';
    let badgeColorClass = 'bg-slate-500';
    let badgeText = '';

    // Category: Booking
    if (['booking', 'approved', 'rejected', 'reminder'].includes(notif.type)) {
      IconComponent = CalendarDays;
      iconColorClass = 'text-blue-500 dark:text-blue-400';
      if (notif.type === 'approved') {
        badgeColorClass = 'bg-green-500';
        badgeText = 'Disetujui';
      } else if (notif.type === 'rejected') {
        badgeColorClass = 'bg-red-500';
        badgeText = 'Ditolak';
      } else if (notif.type === 'reminder') {
        badgeColorClass = 'bg-amber-500';
        badgeText = 'Ingat';
      }
    } 
    // Category: Laporan / Issue
    else if (['issue', 'laporan', 'report'].includes(notif.type)) {
      IconComponent = AlertTriangle;
      iconColorClass = 'text-amber-500 dark:text-amber-400';
      if (notif.title.toLowerCase().includes('selesai') || notif.message.toLowerCase().includes('selesai')) {
        badgeColorClass = 'bg-green-500';
        badgeText = 'Selesai';
      }
    }
    // Category: Info
    else {
      IconComponent = Bell;
      iconColorClass = 'text-brand-500 dark:text-brand-dark-accent';
    }

    return { IconComponent, iconColorClass, badgeColorClass, badgeText };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-500/10 rounded-xl">
            <Bell className="w-6 h-6 text-brand-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F5F5F5]">Notifikasi & Pesan</h1>
            <p className="text-sm text-slate-500 dark:text-[#B4B4C8]">Kelola semua pemberitahuan sistem Anda</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {notifications.some(n => !n.isRead) && (
            <button 
              onClick={markAllRead}
              className="text-sm font-bold text-brand-600 dark:text-brand-dark-accent hover:underline flex items-center gap-1.5"
            >
              Tandai semua dibaca
            </button>
          )}
          {notifications.length > 0 && (
            <button 
              onClick={() => setIsDeleteAllModalOpen(true)}
              className="text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 px-3.5 py-2 rounded-xl border border-red-200/50 dark:border-red-500/20 transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Hapus Semua
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="bg-white dark:bg-[#27273A] border border-slate-200 dark:border-[#3F3F5A]/30 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-[#32324A] rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-[#F5F5F5]">Tidak ada pesan</h3>
            <p className="text-slate-500 dark:text-[#B4B4C8] text-sm mt-1">Kotak masuk Anda saat ini kosong.</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {notifications.map((notif) => {
              const { IconComponent, iconColorClass, badgeColorClass, badgeText } = getNotificationUI(notif);
              return (
                <motion.div
                  key={notif.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={cn(
                    "group bg-white dark:bg-[#27273A] border rounded-2xl p-5 flex gap-5 transition-all duration-200 relative",
                    notif.isRead 
                      ? "border-slate-200 dark:border-[#3F3F5A]/30 opacity-80" 
                      : "border-brand-200 dark:border-brand-500/30 shadow-sm shadow-brand-500/5 bg-brand-50/10 dark:bg-brand-500/5"
                  )}
                >
                  <div className={cn("shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-50 dark:bg-[#32324A] border border-slate-100 dark:border-[#3F3F5A]/50 transition-transform group-hover:scale-110", iconColorClass)}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  
                  <div className="flex-1 min-w-0 pr-8">
                    <div className="flex items-center gap-3 mb-1 wrap">
                      <h3 className={cn("text-base font-bold", notif.isRead ? "text-slate-700 dark:text-[#F5F5F5]" : "text-slate-900 dark:text-white")}>
                        {notif.title}
                      </h3>
                      {badgeText && (
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full text-white font-black uppercase tracking-wider", badgeColorClass)}>
                          {badgeText}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-[#B4B4C8] leading-relaxed">
                      {notif.message}
                    </p>
                    <div className="mt-3 flex items-center gap-4">
                      {notif.meta && (
                        <span className="text-[10px] font-bold px-2 py-1 bg-brand-50 dark:bg-brand-dark-accent/10 text-brand-600 dark:text-brand-dark-accent rounded lowercase italic">
                          {notif.meta}
                        </span>
                      )}
                      <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {notif.createdAt?.toDate().toLocaleString('id-ID', { 
                          day: 'numeric', 
                          month: 'short', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notif.isRead && (
                      <button 
                        onClick={() => markAsRead(notif.id)}
                        className="p-2 text-brand-600 dark:text-brand-dark-accent hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-lg transition-colors border border-brand-100 dark:border-brand-900/30"
                        title="Tandai dibaca"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => deleteNotification(notif.id)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors border border-red-100 dark:border-red-900/30"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {!notif.isRead && (
                    <div className="absolute top-4 right-4 w-3 h-3 bg-brand-500 rounded-full shadow-lg shadow-brand-500/50 group-hover:opacity-0 transition-opacity"></div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Modal Konfirmasi Hapus Semua Notifikasi */}
      <BaseModal
        isOpen={isDeleteAllModalOpen}
        onClose={() => setIsDeleteAllModalOpen(false)}
        className="max-w-md"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-500/10 rounded-2xl flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-[#F5F5F5]">Hapus Semua Notifikasi?</h3>
              <p className="text-xs text-slate-500 dark:text-[#B4B4C8]">Tindakan ini tidak dapat dibatalkan</p>
            </div>
          </div>

          <p className="text-slate-600 dark:text-[#B4B4C8] text-sm leading-relaxed">
            Apakah Anda yakin ingin menghapus semua notifikasi Anda secara permanen? 
            Tindakan ini akan menghapus seluruh data notifikasi yang ada di portal Anda.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => setIsDeleteAllModalOpen(false)}
              className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-[#32324A] text-slate-700 dark:text-[#F5F5F5] font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-[#3f3f5a] transition-all hover:scale-105 active:scale-95"
            >
              Batal
            </button>
            <button
              onClick={deleteAllNotifications}
              disabled={isDeletingAll}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-600/30 hover:shadow-red-500/40 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
            >
              {isDeletingAll ? (
                <div className="w-5 h-5 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" />
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Hapus Semua
                </>
              )}
            </button>
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-[#3F3F5A]/20 text-center">
            <p className="text-[10px] text-slate-400 italic">Data dihapus dari database sistem.</p>
          </div>
        </div>
      </BaseModal>
    </div>
  );
}
