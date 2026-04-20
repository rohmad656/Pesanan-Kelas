import React, { useEffect, useState } from 'react';
import { HelpCircle, BookOpen, MessageCircle, Phone, Mail, User, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import ReportIssueModal from '../../components/ReportIssueModal';

export default function Help() {
  const { profile } = useAuth();
  const [staffDirectory, setStaffDirectory] = useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  
  const faqs = [
    {
      q: "Bagaimana cara memesan ruangan?",
      a: "Buka menu 'Cari Ruangan', pilih ruangan yang tersedia sesuai kapasitas dan fasilitas yang Anda butuhkan, lalu klik tombol 'Pesan'. Isi formulir keperluan dan tunggu persetujuan dari admin."
    },
    {
      q: "Bagaimana cara membatalkan pesanan?",
      a: "Buka menu 'Pesanan Saya', cari pesanan yang berstatus 'Pending' atau 'Disetujui', lalu klik tombol 'Batalkan'. Anda mungkin perlu memberikan alasan pembatalan."
    },
    {
      q: "Berapa lama proses persetujuan ruangan?",
      a: "Normalnya, admin akan memproses permohonan peminjaman ruangan dalam waktu 1x24 jam hari kerja."
    },
    {
      q: "Apakah saya bisa memesan ruangan untuk kegiatan di luar jam kuliah?",
      a: "Bisa, namun memerlukan persetujuan khusus dan melampirkan surat izin kegiatan dari fakultas atau universitas saat mengisi form pemesanan."
    }
  ];

  const troubleshooting = [
    {
      title: "UI Tidak Berubah Setelah Update",
      causes: [
        "Cache browser menyimpan versi lama aplikasi.",
        "Dev server / Bundler tidak memuat ulang perubahan secara otomatis.",
        "Komponen yang diubah tidak terpanggil di halaman yang sedang dibuka."
      ],
      solutions: [
        "Lakukan 'Hard Reload' (Ctrl+Shift+R) untuk membersihkan cache browser.",
        "Pastikan koneksi stabil agar aplikasi dapat menarik build terbaru.",
        "Hapus cache aplikasi melalui pengaturan browser jika kendala berlanjut."
      ]
    }
  ];

  useEffect(() => {
    async function fetchStaff() {
      try {
        const q = query(
          collection(db, 'users'), 
          where('role', 'in', ['staff', 'admin'])
        );
        const snapshot = await getDocs(q);
        const staffData = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter((user: any) => user.deleted !== true);
        setStaffDirectory(staffData);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'users');
      } finally {
        setLoadingStaff(false);
      }
    }

    fetchStaff();
  }, []);

  return (
    <div className="animate-fade-in max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4 mb-12">
        <div className="w-16 h-16 bg-brand-100 dark:bg-[#32324A] rounded-2xl flex items-center justify-center mx-auto">
          <HelpCircle className="w-8 h-8 text-brand-700 dark:text-brand-dark-accent" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-[#F5F5F5]">Pusat Bantuan</h1>
        <p className="text-slate-600 dark:text-[#B4B4C8] max-w-xl mx-auto">
          Temukan jawaban untuk pertanyaan umum atau hubungi tim admin kami untuk bantuan lebih lanjut.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-[#F5F5F5] flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-brand-700 dark:text-brand-dark-accent" /> Pertanyaan Umum (FAQ)
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div key={idx} className="bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 border border-slate-200 dark:border-[#3F3F5A]/30 rounded-2xl p-5 hover:border-brand-300 dark:border-brand-dark-accent/30 transition-colors">
                  <h3 className="font-semibold text-slate-900 dark:text-[#F5F5F5] mb-2">{faq.q}</h3>
                  <p className="text-slate-600 dark:text-[#B4B4C8] text-sm leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>

            <h2 className="text-xl font-bold text-slate-900 dark:text-[#F5F5F5] flex items-center gap-2 pt-4">
              <AlertTriangle className="w-5 h-5 text-orange-500" /> Kendala Teknis & Sinkronisasi
            </h2>
            <div className="space-y-4">
              {troubleshooting.map((item, idx) => (
                <div key={idx} className="bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 border border-slate-200 dark:border-[#3F3F5A]/30 rounded-2xl overflow-hidden">
                  <div className="p-5 bg-orange-500/5 border-b border-orange-500/10">
                    <h3 className="font-bold text-slate-900 dark:text-[#F5F5F5]">{item.title}</h3>
                  </div>
                  <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Kemungkinan Penyebab</h4>
                      <ul className="space-y-2">
                        {item.causes.map((c, i) => (
                          <li key={i} className="text-xs text-slate-600 dark:text-[#B4B4C8] flex gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mt-1 shrink-0" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-500">Solusi Rekomendasi</h4>
                      <ul className="space-y-2">
                        {item.solutions.map((s, i) => (
                          <li key={i} className="text-xs text-slate-900 dark:text-[#F5F5F5] font-medium flex gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="px-5 py-3 bg-slate-50 dark:bg-[#32324A] text-[10px] text-slate-500 dark:text-[#B4B4C8] flex items-center justify-between">
                    <span>💡 Tips: Rebuild & Cloud Sync biasanya menyelesaikan 99% masalah tampilan.</span>
                    <span className="font-bold opacity-50 uppercase tracking-tighter italic">Update + Rebuild</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-[#F5F5F5] flex items-center gap-2">
            <Phone className="w-5 h-5 text-pink-600 dark:text-[#ffafd5]" /> Direktori Admin/Staff & Bantuan
          </h2>
          
          <div className="space-y-4">
            {/* Staff Directory */}
            <div className="bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 border border-slate-200 dark:border-[#3F3F5A]/30 rounded-2xl p-5 space-y-4">
              <h3 className="font-semibold text-slate-900 dark:text-[#F5F5F5] text-sm border-b border-slate-200 dark:border-[#3F3F5A]/30 pb-2">Kontak Tim Admin (WhatsApp)</h3>
              <div className="space-y-4">
                {loadingStaff ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-brand-700 dark:text-brand-dark-accent" />
                  </div>
                ) : staffDirectory.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Belum ada data staff yang tersedia.</p>
                ) : (
                  staffDirectory.map((staff) => (
                    <div key={staff.id} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-[#32324A] flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-brand-300 dark:border-brand-dark-accent/30">
                        {staff.photoURL ? (
                          <img src={staff.photoURL} alt={staff.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          (staff.name || '?').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 dark:text-[#F5F5F5] text-sm truncate">{staff.name}</h4>
                        <p className="text-slate-600 dark:text-[#B4B4C8] text-xs truncate capitalize">
                          {staff.division || (staff.role === 'admin' || staff.role === 'staff' ? 'Admin/Staff' : staff.role)}
                        </p>
                      </div>
                      {(staff.whatsappNumber || staff.whatsapp) && (
                        <a 
                          href={`https://wa.me/${(staff.whatsappNumber || staff.whatsapp).replace(/\+/g, '')}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 bg-[#25D366]/10 text-[#25D366] rounded-lg hover:bg-[#25D366]/20 transition-colors shrink-0"
                          title="Hubungi via WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Report Issue Section */}
            <div className="bg-brand-100 dark:bg-[#32324A]/30 border border-red-500/30 rounded-2xl p-5">
              <h3 className="font-semibold text-red-400 text-sm flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" /> Laporkan Masalah Ruangan
              </h3>
              <p className="text-slate-600 dark:text-[#B4B4C8] text-xs leading-relaxed mb-4">
                Jika Anda menemukan kerusakan fasilitas (AC mati, proyektor rusak, dll) saat menggunakan ruangan, segera laporkan ke tim admin.
              </p>
              <button 
                onClick={() => setIsReportModalOpen(true)}
                className="w-full py-2 bg-red-500/10 text-red-400 border border-red-500/30 rounded-xl text-sm font-bold hover:bg-red-500/20 transition-colors cursor-pointer"
              >
                Buat Laporan Kerusakan
              </button>
            </div>

            {/* General Email */}
            <div className="bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 border border-slate-200 dark:border-[#3F3F5A]/30 rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-[#32324A] flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-pink-600 dark:text-[#ffafd5]" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-slate-900 dark:text-[#F5F5F5] text-sm">Email Support Umum</h4>
                  <p className="text-slate-600 dark:text-[#B4B4C8] text-xs mt-1 break-words overflow-wrap-anywhere whitespace-normal">support@campusbook.ac.id</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ReportIssueModal 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)} 
      />
    </div>
  );
}
