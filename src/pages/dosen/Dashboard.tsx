import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Search, CalendarDays, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

export default function DosenDashboard() {
  const { profile } = useAuth();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants} className="bg-brand-100 dark:bg-[#32324A] rounded-2xl p-8 shadow-lg border border-slate-200 dark:border-[#3F3F5A]/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-dark-accent-light opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-[#F5F5F5] mb-2">Selamat Datang, {profile?.name}!</h1>
        <p className="text-slate-600 dark:text-[#B4B4C8] max-w-2xl">
          Dasbor Dosen untuk pemesanan ruangan insidental, kelas pengganti, dan pelaporan fasilitas.
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/ruangan" className="bg-white dark:bg-[#27273A] p-6 rounded-2xl border border-slate-200 dark:border-[#3F3F5A]/30 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-blue-400 dark:hover:border-blue-500/50 transition-all group">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 group-hover:scale-110 transition-transform">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Pesan Ruangan</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Cari dan pesan ruangan untuk kelas pengganti atau kegiatan dosen.</p>
        </Link>

        <Link to="/pesanan" className="bg-white dark:bg-[#27273A] p-6 rounded-2xl border border-slate-200 dark:border-[#3F3F5A]/30 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-green-400 dark:hover:border-green-500/50 transition-all group">
          <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400 mb-4 group-hover:scale-110 transition-transform">
            <CalendarDays className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">Status Booking</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Pantau riwayat pemesanan dan unduh bukti booking digital.</p>
        </Link>

        <Link to="/laporan" className="bg-white dark:bg-[#27273A] p-6 rounded-2xl border border-slate-200 dark:border-[#3F3F5A]/30 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-orange-400 dark:hover:border-orange-500/50 transition-all group">
          <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/20 rounded-xl flex items-center justify-center text-orange-600 dark:text-orange-400 mb-4 group-hover:scale-110 transition-transform">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">Laporan Kerusakan</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Laporkan kendala teknis atau kerusakan fasilitas segera setelah penggunaan.</p>
        </Link>
      </motion.div>

      <motion.div variants={itemVariants} className="bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 rounded-2xl border border-slate-200 dark:border-[#3F3F5A]/30 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-[#F5F5F5] mb-4">Notifikasi Terbaru</h3>
        <div className="text-center py-8 text-slate-600 dark:text-[#B4B4C8]">
          <p>Tidak ada notifikasi baru.</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
