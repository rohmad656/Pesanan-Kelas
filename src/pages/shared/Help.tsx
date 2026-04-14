import React from 'react';
import { HelpCircle, BookOpen, MessageCircle, Phone, Mail, User, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function Help() {
  const { profile } = useAuth();
  
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

  const staffDirectory = [
    { name: 'Budi Santoso', role: 'Staff Sarpras Fakultas Teknik', wa: '6281234567890', email: 'budi@campusbook.ac.id', img: 'https://ui-avatars.com/api/?name=Budi+Santoso&background=d1a6ff&color=3a0a67' },
    { name: 'Siti Aminah', role: 'Admin Pusat Layanan Terpadu', wa: '6289876543210', email: 'siti@campusbook.ac.id', img: 'https://ui-avatars.com/api/?name=Siti+Aminah&background=ffafd5&color=3a0a67' }
  ];

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
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-[#F5F5F5] flex items-center gap-2">
            <Phone className="w-5 h-5 text-pink-600 dark:text-[#ffafd5]" /> Direktori Staff & Bantuan
          </h2>
          
          <div className="space-y-4">
            {/* Staff Directory (Only visible to logged-in non-admins for safety, or everyone in dashboard) */}
            {profile && (
              <div className="bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 border border-slate-200 dark:border-[#3F3F5A]/30 rounded-2xl p-5 space-y-4">
                <h3 className="font-semibold text-slate-900 dark:text-[#F5F5F5] text-sm border-b border-slate-200 dark:border-[#3F3F5A]/30 pb-2">Kontak Staff (WhatsApp)</h3>
                <div className="space-y-4">
                  {staffDirectory.map((staff, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <img src={staff.img} alt={staff.name} className="w-10 h-10 rounded-full border border-brand-300 dark:border-brand-dark-accent/30" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 dark:text-[#F5F5F5] text-sm truncate">{staff.name}</h4>
                        <p className="text-slate-600 dark:text-[#B4B4C8] text-xs truncate">{staff.role}</p>
                      </div>
                      <a 
                        href={`https://wa.me/${staff.wa}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 bg-[#25D366]/10 text-[#25D366] rounded-lg hover:bg-[#25D366]/20 transition-colors shrink-0"
                        title="Hubungi via WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Report Issue Section */}
            <div className="bg-brand-100 dark:bg-[#32324A]/30 border border-red-500/30 rounded-2xl p-5">
              <h3 className="font-semibold text-red-400 text-sm flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" /> Laporkan Masalah Ruangan
              </h3>
              <p className="text-slate-600 dark:text-[#B4B4C8] text-xs leading-relaxed mb-4">
                Jika Anda menemukan kerusakan fasilitas (AC mati, proyektor rusak, dll) saat menggunakan ruangan, segera laporkan ke staff terkait.
              </p>
              <button className="w-full py-2 bg-red-500/10 text-red-400 border border-red-500/30 rounded-xl text-sm font-bold hover:bg-red-500/20 transition-colors">
                Buat Laporan Kerusakan
              </button>
            </div>

            {/* General Email */}
            <div className="bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 border border-slate-200 dark:border-[#3F3F5A]/30 rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-[#32324A] flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-pink-600 dark:text-[#ffafd5]" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-[#F5F5F5] text-sm">Email Support Umum</h4>
                  <p className="text-slate-600 dark:text-[#B4B4C8] text-xs mt-1">support@campusbook.ac.id</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
