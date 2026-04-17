import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building, Calendar, ShieldCheck, ArrowRight, Play, Lock, Database, Quote, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../contexts/ThemeContext';

const QUOTES = [
  {
    text: "Booking kelas untuk praktikum tambahan sekarang hanya butuh 3 klik. Tidak perlu lagi bolak-balik ke ruang admin fakultas.",
    author: "Mahasiswa Informatika",
    role: "Pengguna Aktif CampusBook"
  },
  {
    text: "Sangat membantu dalam mengatur jadwal ujian susulan. Saya bisa melihat ketersediaan ruangan secara real-time.",
    author: "Dosen Fakultas Teknik",
    role: "Pengguna Aktif CampusBook"
  },
  {
    text: "Rekap laporan peminjaman ruangan menjadi jauh lebih mudah dan transparan. Sangat menghemat waktu kerja kami.",
    author: "Staf Administrasi",
    role: "Pengelola Ruangan"
  }
];

export default function Landing() {
  const [currentQuote, setCurrentQuote] = useState(0);
  const { setTheme } = useTheme();

  useEffect(() => {
    // Force dark mode on landing page
    setTheme('dark');
    
    const interval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % QUOTES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [setTheme]);

  const trackClick = (eventName: string) => {
    // Simulasi tracking analytics (Google Analytics / Firebase)
    console.log(`[Analytics Tracking] Event: ${eventName}`);
  };

  return (
    <div className="min-h-screen bg-[#1E1E2F] text-[#F5F5F5] flex flex-col font-sans">
      {/* Header */}
      <header className="px-8 py-6 flex justify-between items-center border-b border-[#3F3F5A]/30 relative z-20 bg-[#1E1E2F]/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-lg flex items-center justify-center">
            <Building className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-extrabold text-[#F5F5F5] tracking-tight">CampusBook</span>
        </div>
        <Link 
          to="/login" 
          onClick={() => trackClick('click_login_header')}
          className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-600/20"
        >
          Masuk
        </Link>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center pt-20 pb-8 px-4 text-center relative overflow-hidden">
        {/* Background Gradients (Parallax) */}
        <motion.div 
          initial={{ y: 0 }}
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"
        ></motion.div>
        <motion.div 
          initial={{ y: 0 }}
          animate={{ y: [0, 20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"
        ></motion.div>
        
        <div className="z-10 max-w-4xl mx-auto flex flex-col items-center">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2D2D44] border border-[#3F3F5A]/50 text-indigo-300 text-sm font-medium mb-8"
          >
            <span className="flex h-2 w-2 rounded-full bg-indigo-500"></span>
            Sistem Pemesanan Ruangan Terpadu
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-400 to-indigo-300 mb-8 leading-tight"
          >
            Modern Academic <br className="hidden md:block" /> Experience
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
            className="text-lg md:text-xl text-[#B4B4C8] max-w-2xl mb-12 leading-relaxed"
          >
            Platform manajemen pemesanan ruangan kampus yang terintegrasi. Mudah, cepat, dan transparan untuk Mahasiswa, Dosen, dan Staf.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto px-4"
          >
            <Link 
              to="/login" 
              onClick={() => trackClick('click_mulai_sekarang')}
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all text-lg shadow-xl shadow-indigo-600/20 w-full sm:w-auto"
            >
              Mulai Sekarang
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a 
              href="#fitur" 
              onClick={() => trackClick('click_pelajari_lebih_lanjut')}
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#27273A] text-[#F5F5F5] border border-[#3F3F5A]/50 font-bold rounded-2xl hover:bg-[#32324A] hover:scale-105 active:scale-95 transition-all text-lg w-full sm:w-auto shadow-sm"
            >
              <Play className="w-5 h-5" />
              Pelajari Lebih Lanjut
            </a>
          </motion.div>
        </div>

        {/* Mockup Image */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mt-20 w-full max-w-5xl relative z-10 px-4"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#1E1E2F] via-transparent to-transparent z-10 pointer-events-none"></div>
          <div className="rounded-2xl border border-[#3F3F5A]/50 overflow-hidden shadow-2xl shadow-black/40 relative bg-[#27273A]">
            <div className="bg-[#1E1E2F] px-4 py-3 border-b border-[#3F3F5A]/50 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <img 
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop" 
              alt="Dashboard Preview" 
              className="w-full h-auto object-cover opacity-80"
              referrerPolicy="no-referrer"
            />
          </div>
        </motion.div>

        {/* Features Grid */}
        <div id="fitur" className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32 z-10 max-w-6xl w-full px-4">
          {[
            {
              icon: <Building className="w-7 h-7 text-indigo-400" />,
              title: "Manajemen Ruangan",
              desc: "Cari dan lihat ketersediaan ruangan secara real-time tanpa khawatir bentrok jadwal dengan pengguna lain.",
              hoverColor: "hover:border-indigo-500/50 hover:shadow-indigo-500/10"
            },
            {
              icon: <Calendar className="w-7 h-7 text-blue-400" />,
              title: "Booking Mudah",
              desc: "Proses pemesanan yang cepat dengan sistem verifikasi digital yang aman dan terstruktur.",
              hoverColor: "hover:border-blue-500/50 hover:shadow-blue-500/10"
            },
            {
              icon: <ShieldCheck className="w-7 h-7 text-indigo-300" />,
              title: "Terintegrasi",
              desc: "Satu platform terpusat untuk semua kebutuhan akademik, dari peminjaman kelas hingga laboratorium.",
              hoverColor: "hover:border-indigo-400/50 hover:shadow-indigo-400/10"
            }
          ].map((feature, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, ease: "easeOut", delay: index * 0.15 }}
              className={`bg-[#27273A] p-8 rounded-3xl border border-[#3F3F5A]/30 text-left hover:shadow-lg transition-all group shadow-sm ${feature.hoverColor}`}
            >
              <div className="w-14 h-14 bg-[#32324A] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-3 text-[#F5F5F5]">{feature.title}</h3>
              <p className="text-[#B4B4C8] leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Security & Integration */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mt-32 z-10 max-w-6xl w-full px-4 text-left"
        >
          <div className="bg-[#27273A] rounded-3xl border border-[#3F3F5A]/30 overflow-hidden shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-8 md:p-12 flex flex-col justify-center">
                <h2 className="text-3xl font-bold text-[#F5F5F5] mb-8">Keamanan & Integrasi Terjamin</h2>
                <div className="space-y-8">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 shrink-0 bg-[#32324A] rounded-xl flex items-center justify-center">
                      <Lock className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-[#F5F5F5] mb-2">Data Privasi Aman</h4>
                      <p className="text-[#B4B4C8] leading-relaxed">Sistem menggunakan enkripsi standar industri untuk melindungi data pribadi mahasiswa dan staf.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 shrink-0 bg-[#32324A] rounded-xl flex items-center justify-center">
                      <Database className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-[#F5F5F5] mb-2">Integrasi Sistem Akademik</h4>
                      <p className="text-[#B4B4C8] leading-relaxed">Terhubung langsung dengan database kampus untuk sinkronisasi jadwal kuliah secara otomatis.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-[#1E1E2F] p-12 flex items-center justify-center relative overflow-hidden min-h-[300px]">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#818cf8 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                <ShieldCheck className="w-48 h-48 text-indigo-500 opacity-20 relative z-10" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Testimonial */}
        <div className="mt-32 mb-20 z-10 max-w-4xl w-full px-4 text-center min-h-[250px]">
          <Quote className="w-12 h-12 text-indigo-400 mx-auto mb-8 opacity-50" />
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuote}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-2xl md:text-3xl font-medium text-[#F5F5F5] leading-relaxed mb-10">
                "{QUOTES[currentQuote].text}"
              </h3>
              <div className="flex items-center justify-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#32324A] flex items-center justify-center text-indigo-400">
                  <User className="w-7 h-7" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-[#F5F5F5] text-lg">{QUOTES[currentQuote].author}</p>
                  <p className="text-[#B4B4C8]">{QUOTES[currentQuote].role}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <motion.footer 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mt-auto pt-16 pb-8 border-t border-[#3F3F5A]/30 relative z-20 bg-[#1E1E2F]"
      >
        <div className="max-w-6xl mx-auto px-8 grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Building className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-extrabold text-[#F5F5F5] tracking-tight">CampusBook</span>
            </div>
            <p className="text-[#B4B4C8] max-w-sm leading-relaxed">
              Platform manajemen pemesanan ruangan kampus yang terintegrasi, aman, dan mudah digunakan.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-[#F5F5F5] mb-6 text-lg">Tautan</h4>
            <ul className="space-y-4 text-[#B4B4C8]">
              <li><Link to="/" onClick={() => trackClick('click_footer_beranda')} className="hover:text-indigo-400 transition-colors">Beranda</Link></li>
              <li><a href="#fitur" onClick={() => trackClick('click_footer_fitur')} className="hover:text-indigo-400 transition-colors">Fitur</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-[#F5F5F5] mb-6 text-lg">Bantuan</h4>
            <ul className="space-y-4 text-[#B4B4C8]">
              <li><Link to="/bantuan" onClick={() => trackClick('click_footer_kontak')} className="hover:text-indigo-400 transition-colors">Kontak Admin</Link></li>
              <li><Link to="/bantuan" onClick={() => trackClick('click_footer_panduan')} className="hover:text-indigo-400 transition-colors">Panduan Pengguna</Link></li>
              <li><Link to="/bantuan" onClick={() => trackClick('click_footer_lapor')} className="hover:text-indigo-400 transition-colors">Laporkan Masalah</Link></li>
            </ul>
          </div>
        </div>
        <div className="text-center text-[#B4B4C8] text-sm pt-8 border-t border-[#3F3F5A]/30 px-4">
          © 2026 CampusBook • Modern Academic Experience
        </div>
      </motion.footer>
    </div>
  );
}
