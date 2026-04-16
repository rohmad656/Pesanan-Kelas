import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, writeBatch, or } from 'firebase/firestore';
import { Bell, CheckCircle2, Trash2, Clock, AlertCircle, Info, MessageSquare } from 'lucide-react';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

export default function Notifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'notifications'),
      or(
        where('userId', '==', profile.uid),
        where('targetRole', '==', profile.role)
      )
    );

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

  const getIcon = (type: string) => {
    switch (type) {
      case 'approved': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'rejected': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'reminder': return <Clock className="w-5 h-5 text-blue-500" />;
      default: return <Info className="w-5 h-5 text-brand-500" />;
    }
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-500/10 rounded-xl">
            <Bell className="w-6 h-6 text-brand-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F5F5F5]">Notifikasi & Pesan</h1>
            <p className="text-sm text-slate-500 dark:text-[#B4B4C8]">Kelola semua pemberitahuan sistem Anda</p>
          </div>
        </div>
        
        {notifications.some(n => !n.isRead) && (
          <button 
            onClick={markAllRead}
            className="text-sm font-bold text-brand-600 dark:text-brand-dark-accent hover:underline"
          >
            Tandai semua dibaca
          </button>
        )}
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
            {notifications.map((notif) => (
              <motion.div
                key={notif.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "group bg-white dark:bg-[#27273A] border rounded-2xl p-4 flex gap-4 transition-all duration-200",
                  notif.isRead 
                    ? "border-slate-200 dark:border-[#3F3F5A]/30 opacity-80" 
                    : "border-brand-200 dark:border-brand-500/30 shadow-sm shadow-brand-500/5 bg-brand-50/10 dark:bg-brand-500/5"
                )}
              >
                <div className="shrink-0 mt-1">
                  {getIcon(notif.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={cn("text-sm font-bold truncate", notif.isRead ? "text-slate-700 dark:text-[#F5F5F5]" : "text-slate-900 dark:text-white")}>
                      {notif.title}
                    </h3>
                    <span className="text-[10px] font-medium text-slate-400 shrink-0">
                      {notif.createdAt?.toDate().toLocaleString('id-ID', { 
                        day: 'numeric', 
                        month: 'short', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-[#B4B4C8] mt-1 leading-relaxed">
                    {notif.message}
                  </p>
                  {notif.meta && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-[#32324A] text-slate-500 dark:text-[#B4B4C8] rounded uppercase tracking-wider">
                        {notif.meta}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!notif.isRead && (
                    <button 
                      onClick={() => markAsRead(notif.id)}
                      className="p-2 text-brand-600 dark:text-brand-dark-accent hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-lg transition-colors"
                      title="Tandai dibaca"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                  <button 
                    onClick={() => deleteNotification(notif.id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
