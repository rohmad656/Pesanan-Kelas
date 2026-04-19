import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Loader2, CheckCircle2, Search } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRoomId?: string;
  initialRoomName?: string;
}

export default function ReportIssueModal({ isOpen, onClose, initialRoomId, initialRoomName }: ReportIssueModalProps) {
  const { user, profile } = useAuth();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    roomId: initialRoomId || '',
    roomName: initialRoomName || '',
    description: '',
    severity: 'medium' // low, medium, high
  });

  useEffect(() => {
    if (isOpen && !initialRoomId) {
      fetchRooms();
    }
  }, [isOpen, initialRoomId]);

  const fetchRooms = async () => {
    setLoadingRooms(true);
    try {
      const q = query(collection(db, 'rooms'), where('status', '==', 'available'));
      const snapshot = await getDocs(q);
      const roomsData = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        building: doc.data().building
      }));
      setRooms(roomsData);
    } catch (error) {
      console.error("Error fetching rooms:", error);
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.roomId || !formData.description) {
      toast.error('Mohon lengkapi semua data');
      return;
    }

    setSubmitting(true);
    try {
      // Create issue report
      const issueData = {
        roomId: formData.roomId,
        roomName: formData.roomName || rooms.find(r => r.id === formData.roomId)?.name || 'Unknown',
        userId: user?.uid,
        userName: profile?.name,
        description: formData.description,
        severity: formData.severity,
        status: 'reported',
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'issues'), issueData);

      // Create notification for staff/admins using targetRole (Efficient and Secure)
      try {
        await addDoc(collection(db, 'notifications'), {
          targetRole: 'staff',
          title: '🚨 Laporan Kerusakan Baru',
          message: `${profile?.name} melaporkan masalah di ${issueData.roomName}: ${formData.description.substring(0, 30)}...`,
          type: 'issue',
          isRead: false,
          createdAt: serverTimestamp(),
          meta: '/admin/laporan'
        });
        
        // Also notify admins if needed
        await addDoc(collection(db, 'notifications'), {
          targetRole: 'admin',
          title: '🚨 Laporan Kerusakan Baru',
          message: `${profile?.name} melaporkan masalah di ${issueData.roomName}`,
          type: 'issue',
          isRead: false,
          createdAt: serverTimestamp(),
          meta: '/admin/laporan'
        });
      } catch (notifError) {
        console.warn("Failed to send notifications to staff:", notifError);
      }

      setSuccess(true);
      toast.success('Laporan berhasil dikirim');
      
      // Auto close after success
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setFormData({ ...formData, description: '' });
      }, 3000);

    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'issues');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-[#27273A] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-[#3F3F5A]/30"
        >
          <div className="p-6 border-b border-slate-100 dark:border-[#3F3F5A]/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-500/20 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-[#F5F5F5]">Laporkan Masalah</h2>
                <p className="text-xs text-slate-500 dark:text-[#B4B4C8]">Bantu kami menjaga fasilitas tetap prima</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-[#32324A] rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <div className="p-6">
            {success ? (
              <div className="py-12 text-center space-y-4">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-[#F5F5F5]">Terima Kasih!</h3>
                <p className="text-slate-600 dark:text-[#B4B4C8] max-w-xs mx-auto">
                  Laporan Anda telah berhasil dikirim. Tim kami akan segera menindaklanjuti laporan tersebut.
                </p>
                <div className="pt-6">
                  <button 
                    onClick={onClose}
                    className="px-8 py-3 bg-brand-700 text-white rounded-2xl font-bold hover:bg-brand-dark-hover transition-all"
                  >
                    Selesai
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-[#B4B4C8] mb-2">
                    Pilih Ruangan
                  </label>
                  {initialRoomId ? (
                    <div className="p-4 bg-slate-50 dark:bg-[#1E1E2F] rounded-2xl border border-slate-200 dark:border-[#3F3F5A]/30">
                      <p className="font-bold text-slate-900 dark:text-[#F5F5F5]">{initialRoomName}</p>
                    </div>
                  ) : (
                    <select
                      value={formData.roomId}
                      onChange={(e) => {
                        const room = rooms.find(r => r.id === e.target.value);
                        setFormData({ ...formData, roomId: e.target.value, roomName: room?.name || '' });
                      }}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1E1E2F] border border-slate-200 dark:border-[#3F3F5A]/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500 dark:text-[#F5F5F5] transition-all"
                      required
                    >
                      <option value="">Pilih Ruangan...</option>
                      {rooms.map(room => (
                        <option key={room.id} value={room.id}>{room.name} - {room.building}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-[#B4B4C8] mb-2">
                    Deskripsi Masalah
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1E1E2F] border border-slate-200 dark:border-[#3F3F5A]/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500 dark:text-[#F5F5F5] min-h-[120px] transition-all"
                    placeholder="Contoh: AC bocor, Kursi patah, Proyektor tidak mau menyala..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-[#B4B4C8] mb-3">
                    Tingkat Urgensi
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {['low', 'medium', 'high'].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setFormData({ ...formData, severity: level })}
                        className={`py-2.5 rounded-xl border text-xs font-bold transition-all capitalize ${
                          formData.severity === level 
                            ? 'bg-brand-700 text-white border-brand-700 shadow-lg shadow-brand-700/20' 
                            : 'bg-white dark:bg-[#32324A] text-slate-500 border-slate-200 dark:border-[#3F3F5A]/50'
                        }`}
                      >
                        {level === 'low' ? 'Rendah' : level === 'medium' ? 'Sedang' : 'Tinggi'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 bg-brand-700 text-white rounded-2xl font-bold hover:bg-brand-dark-hover transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group shadow-xl shadow-brand-700/20"
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <AlertTriangle className="w-5 h-5 group-hover:animate-pulse" />
                        Kirim Laporan
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
