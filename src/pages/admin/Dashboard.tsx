import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle, XCircle, Clock, Building, Users, AlertTriangle, Download, ArrowUpDown, Filter, Loader2 } from 'lucide-react';
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [totalRooms, setTotalRooms] = useState<number | '-'>('-');
  const [totalUsers, setTotalUsers] = useState<number | '-'>('-');
  const [totalIssues, setTotalIssues] = useState<number | '-'>('-');
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [rejectingBooking, setRejectingBooking] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  useEffect(() => {
    // Listen to all bookings
    const qBookings = query(collection(db, 'bookings'));
    const unsubscribeBookings = onSnapshot(qBookings, (snapshot) => {
      const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      bookings.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setAllBookings(bookings);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'bookings');
    });

    // Listen to rooms count
    const unsubscribeRooms = onSnapshot(collection(db, 'rooms'), (snapshot) => {
      setTotalRooms(snapshot.size);
    }, (error) => {
      console.error("Error fetching rooms count:", error);
    });

    // Listen to users count
    const qUsers = query(collection(db, 'users'), where('deleted', '!=', true));
    const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
      setTotalUsers(snapshot.size);
    }, (error) => {
      console.error("Error fetching users count:", error);
    });

    // Listen to issues count
    const unsubscribeIssues = onSnapshot(collection(db, 'issues'), (snapshot) => {
      setTotalIssues(snapshot.size);
    }, (error) => {
      console.error("Error fetching issues count:", error);
    });

    return () => {
      unsubscribeBookings();
      unsubscribeRooms();
      unsubscribeUsers();
      unsubscribeIssues();
    };
  }, []);

  const handleApprove = async (booking: any) => {
    try {
      await runTransaction(db, async (transaction) => {
        // 1. "Lock" the room document
        const roomRef = doc(db, 'rooms', booking.roomId);
        await transaction.get(roomRef);

        // 2. Approve the current booking
        transaction.update(doc(db, 'bookings', booking.id), { status: 'approved' });
        
        const notificationRef = doc(collection(db, 'notifications'));
        transaction.set(notificationRef, {
          userId: booking.userId,
          title: 'Booking Disetujui',
          message: `Ruangan ${booking.roomName || booking.roomId} telah disetujui admin.`,
          type: 'approved',
          isRead: false,
          createdAt: serverTimestamp()
        });

        // 3. Find and reject overlapping pending bookings for the same room
        const newStart = new Date(booking.start_at || booking.startTime).getTime();
        const newEnd = new Date(booking.end_at || booking.endTime).getTime();

        const overlapping = allBookings.filter(b => 
          b.id !== booking.id && 
          b.roomId === booking.roomId && 
          b.status === 'pending'
        ).filter(b => {
          const bStart = new Date(b.start_at || b.startTime).getTime();
          const bEnd = new Date(b.end_at || b.endTime).getTime();
          return bStart < newEnd && bEnd > newStart;
        });

        overlapping.forEach(b => {
          transaction.update(doc(db, 'bookings', b.id), { 
            status: 'rejected',
            rejectionReason: 'Bentrok dengan jadwal lain yang sudah disetujui'
          });
          
          const rejectNotifRef = doc(collection(db, 'notifications'));
          transaction.set(rejectNotifRef, {
            userId: b.userId,
            title: 'Booking Ditolak (Bentrok)',
            message: `Booking ruangan ${b.roomName || b.roomId} ditolak karena bentrok dengan jadwal lain.`,
            type: 'rejected',
            isRead: false,
            createdAt: serverTimestamp()
          });
        });

        // 4. Update room to trigger transaction collision
        transaction.update(roomRef, { 
          lastBookingUpdate: serverTimestamp() 
        });
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${booking.id}`);
    }
  };

  const handleReject = async () => {
    if (!rejectingBooking || !rejectionReason.trim()) return;
    
    setIsRejecting(true);
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'bookings', rejectingBooking.id), { 
        status: 'rejected',
        rejectionReason: rejectionReason
      });
      batch.set(doc(collection(db, 'notifications')), {
        userId: rejectingBooking.userId,
        title: 'Booking Ditolak',
        message: `Ruangan ${rejectingBooking.roomName || rejectingBooking.roomId} ditolak oleh admin. Alasan: ${rejectionReason}`,
        type: 'rejected',
        isRead: false,
        createdAt: serverTimestamp()
      });
      await batch.commit();
      setRejectingBooking(null);
      setRejectionReason('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${rejectingBooking.id}`);
    } finally {
      setIsRejecting(false);
    }
  };

  const now = new Date();

  const processedBookings = allBookings.map(b => {
    const endStr = b.end_at || b.endTime;
    const isExpired = endStr ? new Date(endStr) < now : false;
    
    if (b.status === 'approved' && isExpired) {
      return { ...b, displayStatus: 'completed' };
    }
    return { ...b, displayStatus: b.status };
  });

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Menunggu';
      case 'approved': return 'Disetujui';
      case 'rejected': return 'Ditolak';
      case 'cancelled': return 'Dibatalkan';
      case 'completed': return 'Selesai';
      default: return status;
    }
  };

  const handleDownloadCSV = () => {
    const headers = ['Nama Pemesan', 'Ruangan', 'Tanggal', 'Jam Mulai', 'Jam Selesai', 'Status', 'Alasan Booking', 'Alasan Penolakan'];
    const rows = processedBookings.map(b => {
      const start = b.start_at || b.startTime ? new Date(b.start_at || b.startTime) : null;
      const end = b.end_at || b.endTime ? new Date(b.end_at || b.endTime) : null;
      
      const dateStr = start ? start.toLocaleDateString('id-ID') : '';
      const startTimeStr = start ? start.toLocaleTimeString('id-ID', { timeStyle: 'short' }) : '';
      const endTimeStr = end ? end.toLocaleTimeString('id-ID', { timeStyle: 'short' }) : '';
      
      return [
        `"${b.userName || ''}"`,
        `"${b.roomName || b.roomId || ''}"`,
        `"${dateStr}"`,
        `"${startTimeStr}"`,
        `"${endTimeStr}"`,
        `"${getStatusText(b.displayStatus) || ''}"`,
        `"${(b.reason || '').replace(/"/g, '""')}"`,
        `"${(b.rejectionReason || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `rekap_booking_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const pendingCount = processedBookings.filter(b => b.displayStatus === 'pending').length;
  const activeBookings = processedBookings.filter(b => ['pending', 'approved'].includes(b.displayStatus));
  const historyBookings = processedBookings.filter(b => ['rejected', 'cancelled', 'completed'].includes(b.displayStatus));
  
  const displayedBookings = (activeTab === 'active' ? activeBookings : historyBookings)
    .sort((a, b) => {
      const timeA = new Date(a.createdAt?.toMillis() || a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt?.toMillis() || b.createdAt || 0).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-900/30 dark:border-yellow-900/50';
      case 'approved': return 'text-green-600 bg-green-100 border-green-200 dark:text-green-400 dark:bg-green-900/30 dark:border-green-900/50';
      case 'rejected': return 'text-red-600 bg-red-100 border-red-200 dark:text-red-400 dark:bg-red-900/30 dark:border-red-900/50';
      case 'cancelled': return 'text-slate-600 bg-slate-100 border-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700';
      case 'completed': return 'text-blue-600 bg-blue-100 border-blue-200 dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-900/50';
      default: return 'text-slate-600 bg-slate-100 border-slate-200';
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="bg-brand-100 dark:bg-[#32324A] rounded-2xl p-8 shadow-lg border border-slate-200 dark:border-[#3F3F5A]/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-dark-accent-light opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-[#F5F5F5] mb-2">Dasbor Admin</h1>
        <p className="text-slate-600 dark:text-[#B4B4C8] max-w-2xl">
          Pusat kendali untuk verifikasi pemesanan, manajemen ruangan, dan pengguna.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Pending Verifikasi Panel */}
        <div 
          onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
          className="bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 p-6 rounded-2xl border border-slate-200 dark:border-[#3F3F5A]/30 cursor-pointer hover:border-brand-400 dark:hover:border-brand-dark-accent/50 hover:shadow-lg hover:-translate-y-1 transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-600 dark:text-[#B4B4C8] font-medium group-hover:text-brand-700 dark:group-hover:text-[#d1a6ff] transition-colors">Pending Verifikasi</h3>
            <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-[#F5F5F5]">{pendingCount}</p>
        </div>

        {/* Total Ruangan Panel */}
        <div 
          onClick={() => navigate('/admin/ruangan')}
          className="bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 p-6 rounded-2xl border border-slate-200 dark:border-[#3F3F5A]/30 cursor-pointer hover:border-green-400 dark:hover:border-green-500/50 hover:shadow-lg hover:-translate-y-1 transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-600 dark:text-[#B4B4C8] font-medium group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">Total Ruangan</h3>
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Building className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-[#F5F5F5]">{totalRooms}</p>
        </div>

        {/* Total Pengguna Panel */}
        <div 
          onClick={() => navigate('/admin/users')}
          className="bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 p-6 rounded-2xl border border-slate-200 dark:border-[#3F3F5A]/30 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500/50 hover:shadow-lg hover:-translate-y-1 transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-600 dark:text-[#B4B4C8] font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Total Pengguna</h3>
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-[#F5F5F5]">{totalUsers}</p>
        </div>

        {/* Laporan Masalah Panel */}
        <div 
          onClick={() => navigate('/admin/laporan')}
          className="bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 p-6 rounded-2xl border border-slate-200 dark:border-[#3F3F5A]/30 cursor-pointer hover:border-yellow-400 dark:hover:border-yellow-500/50 hover:shadow-lg hover:-translate-y-1 transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-600 dark:text-[#B4B4C8] font-medium group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">Laporan Masalah</h3>
            <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-[#F5F5F5]">{totalIssues}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 rounded-2xl border border-slate-200 dark:border-[#3F3F5A]/30 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-[#3F3F5A]/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-[#F5F5F5]">Daftar Pemesanan</h3>
            <p className="text-sm text-slate-600 dark:text-[#B4B4C8]">Kelola semua pengajuan booking ruangan.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#32324A] border border-slate-200 dark:border-[#3F3F5A]/50 rounded-xl px-3 py-2">
              <ArrowUpDown className="w-4 h-4 text-slate-500 dark:text-[#B4B4C8]" />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
                className="bg-transparent text-xs font-medium text-slate-700 dark:text-[#F5F5F5] focus:outline-none"
              >
                <option value="desc">Terbaru</option>
                <option value="asc">Terlama</option>
              </select>
            </div>
            <button
              onClick={handleDownloadCSV}
              className="px-4 py-2 bg-slate-100 dark:bg-[#32324A] text-slate-700 dark:text-[#F5F5F5] hover:bg-slate-200 dark:hover:bg-[#3F3F5A] rounded-xl font-medium transition-all flex items-center gap-2 text-sm border border-slate-200 dark:border-[#3F3F5A]/50"
            >
              <Download className="w-4 h-4" /> Download CSV
            </button>
          </div>
        </div>

        <div className="border-b border-slate-200 dark:border-[#3F3F5A]/30 bg-slate-50/50 dark:bg-[#32324A]/20 p-2 flex gap-2">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'active' ? 'bg-white dark:bg-[#3F3F5A] text-brand-700 dark:text-brand-dark-accent shadow-sm' : 'text-slate-600 dark:text-[#B4B4C8] hover:bg-slate-100 dark:hover:bg-[#32324A]'}`}
          >
            Pesanan Aktif
            {pendingCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{pendingCount}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'history' ? 'bg-white dark:bg-[#3F3F5A] text-brand-700 dark:text-brand-dark-accent shadow-sm' : 'text-slate-600 dark:text-[#B4B4C8] hover:bg-slate-100 dark:hover:bg-[#32324A]'}`}
          >
            Riwayat Pesanan
          </button>
        </div>
        
        <div className="p-0 overflow-x-auto">
          {displayedBookings.length === 0 ? (
            <div className="text-center py-12 text-slate-600 dark:text-[#B4B4C8]">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{activeTab === 'active' ? 'Tidak ada pesanan aktif.' : 'Belum ada riwayat pesanan.'}</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#32324A]/50 border-b border-slate-200 dark:border-[#3F3F5A]/30">
                  <th className="p-4 text-sm font-semibold text-slate-900 dark:text-[#F5F5F5]">Pemesan</th>
                  <th className="p-4 text-sm font-semibold text-slate-900 dark:text-[#F5F5F5]">Ruangan</th>
                  <th className="p-4 text-sm font-semibold text-slate-900 dark:text-[#F5F5F5]">Waktu</th>
                  <th className="p-4 text-sm font-semibold text-slate-900 dark:text-[#F5F5F5]">Alasan</th>
                  <th className="p-4 text-sm font-semibold text-slate-900 dark:text-[#F5F5F5]">Status</th>
                  <th className="p-4 text-sm font-semibold text-slate-900 dark:text-[#F5F5F5]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-[#3F3F5A]/30">
                {displayedBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-50 dark:hover:bg-[#32324A]/30 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-slate-900 dark:text-[#F5F5F5]">{booking.userName}</div>
                      <div className="text-xs text-slate-500 dark:text-[#B4B4C8] capitalize">{booking.userRole}</div>
                    </td>
                    <td className="p-4 text-sm text-slate-700 dark:text-[#B4B4C8]">
                      {booking.roomName || booking.roomId}
                    </td>
                    <td className="p-4 text-sm text-slate-700 dark:text-[#B4B4C8]">
                      <div className="whitespace-nowrap">
                        {booking.start_at || booking.startTime ? new Date(booking.start_at || booking.startTime).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : ''}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-[#B4B4C8]">
                        {booking.start_at || booking.startTime ? new Date(booking.start_at || booking.startTime).toLocaleTimeString('id-ID', { timeStyle: 'short' }) : ''} - 
                        {booking.end_at || booking.endTime ? new Date(booking.end_at || booking.endTime).toLocaleTimeString('id-ID', { timeStyle: 'short' }) : ''}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-700 dark:text-[#B4B4C8] max-w-[200px] truncate" title={booking.rejectionReason || booking.reason}>
                      {booking.displayStatus === 'rejected' ? (
                        <div className="flex flex-col">
                          <span className="text-red-500 dark:text-red-400 font-medium">Ditolak: {booking.rejectionReason || 'Bentrok'}</span>
                          <span className="text-xs opacity-60 italic">Tujuan: {booking.reason}</span>
                        </div>
                      ) : (
                        booking.reason
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(booking.displayStatus)}`}>
                        {getStatusText(booking.displayStatus)}
                      </span>
                    </td>
                    <td className="p-4">
                      {booking.displayStatus === 'pending' ? (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleApprove(booking)}
                            className="p-1.5 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 transition-colors"
                            title="Setujui"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              setRejectingBooking(booking);
                              setRejectionReason('');
                            }}
                            className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors"
                            title="Tolak"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 dark:text-[#B4B4C8]">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Rejection Modal */}
      <AnimatePresence>
        {rejectingBooking && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-[#27273A] w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-[#3F3F5A]/50 overflow-hidden p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-[#F5F5F5]">Tolak Pesanan</h3>
                  <p className="text-xs text-slate-500 dark:text-[#B4B4C8]">Berikan alasan penolakan untuk pemesan.</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="p-3 bg-slate-50 dark:bg-[#32324A] rounded-xl border border-slate-100 dark:border-[#3F3F5A]/30">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Pesanan</p>
                  <p className="text-sm font-medium text-slate-700 dark:text-[#F5F5F5]">{rejectingBooking.userName} - {rejectingBooking.roomName || rejectingBooking.roomId}</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Alasan Penolakan</label>
                  <textarea
                    autoFocus
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Contoh: Bentrok jadwal / Ruangan tidak tersedia..."
                    className="w-full p-3 bg-slate-50 dark:bg-[#2D2D44] border border-slate-200 dark:border-[#3F3F5A]/30 rounded-xl focus:outline-none focus:border-brand-400 dark:focus:border-brand-dark-accent text-sm min-h-[100px] resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setRejectingBooking(null)}
                  disabled={isRejecting}
                  className="flex-1 py-2.5 bg-transparent border border-slate-200 dark:border-[#3F3F5A]/30 text-slate-600 dark:text-[#B4B4C8] font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-[#32324A] transition-all disabled:opacity-50"
                >
                  Batal
                </button>
                <button 
                  onClick={handleReject}
                  disabled={isRejecting || !rejectionReason.trim()}
                  className="flex-1 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isRejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tolak Pesanan'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
