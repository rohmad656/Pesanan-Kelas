import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, Role } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { User, Mail, Phone, ShieldCheck, Loader2, ArrowRight, Contact } from 'lucide-react';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import { motion } from 'motion/react';

export default function Register() {
  const { pendingRegistration, completeRegistration, logout } = useAuth();
  const { setTheme } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<Role>('mahasiswa');
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  useEffect(() => {
    setTheme('dark');
    if (!pendingRegistration) {
      navigate('/login');
    } else {
      setName(pendingRegistration.name);
      if (pendingRegistration.role) {
        setRole(pendingRegistration.role);
      }
    }
  }, [pendingRegistration, navigate, setTheme]);

  const getIdentifierLabel = () => {
    if (role === 'mahasiswa') return 'NIM';
    if (role === 'dosen') return 'NIP';
    return 'ID Staf';
  };

  const getIdentifierPlaceholder = () => {
    if (role === 'mahasiswa') return 'Contoh: 210605110001';
    if (role === 'dosen') return 'Contoh: 198001012010121001';
    return 'Contoh: STF001';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsapp.match(/^\+?[0-9]{10,15}$/)) {
      toast.error('Format nomor WhatsApp tidak valid. Gunakan format +628...');
      return;
    }

    setLoading(true);
    try {
      await completeRegistration({
        name,
        role,
        nim: identifier, // We use nim field to store NIM/NIP/ID
        whatsapp,
      });
      toast.success('Pendaftaran berhasil!');
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Gagal menyelesaikan pendaftaran');
    } finally {
      setLoading(false);
    }
  };

  if (!pendingRegistration) return null;

  return (
    <div className="bg-slate-50 dark:bg-[#1E1E2F] font-sans text-slate-900 dark:text-[#F5F5F5] flex items-center justify-center min-h-screen relative overflow-hidden p-4">
      {/* Background Decoration */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-dark-accent-light/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#ffafd5]/20 rounded-full blur-[120px]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-[#27273A] w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-[#3F3F5A]/30 overflow-hidden relative z-10"
      >
        <div className="p-6 sm:p-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-brand-dark-accent-light/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-brand-dark-accent" />
            </div>
            <h1 className="text-2xl font-extrabold mb-2 tracking-tight">Lengkapi Profil Anda</h1>
            <p className="text-slate-500 dark:text-[#B4B4C8] text-sm">
              Satu langkah lagi untuk bergabung dengan <span className="text-brand-dark-accent font-bold">CampusBook</span>.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email (Read Only) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#B4B4C8]">Email</label>
              <div className="relative group opacity-70">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="email"
                  disabled
                  value={pendingRegistration.email}
                  className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-[#1E1E2F] border border-transparent rounded-lg text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Role Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#B4B4C8]">Pilih Peran</label>
              <div className="bg-slate-100 dark:bg-[#32324A] p-1 rounded-lg flex relative">
                {(['mahasiswa', 'dosen', 'admin'] as Role[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={cn(
                      "flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-all duration-300 capitalize relative z-10",
                      role === r 
                        ? "text-white" 
                        : "text-slate-500 dark:text-[#B4B4C8] hover:text-brand-700 dark:text-brand-dark-accent"
                    )}
                  >
                    <span className="relative z-10">{r === 'admin' ? 'Staf' : r}</span>
                    {role === r && (
                      <motion.div
                        layoutId="activeRoleRegister"
                        className="absolute inset-0 bg-[#A78BFA] rounded-md shadow-sm"
                        transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#B4B4C8]">Nama Lengkap</label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-dark-accent transition-colors" />
                <input 
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-[#2D2D44] border border-transparent dark:border-[#3F3F5A]/30 rounded-lg focus:outline-none focus:border-brand-dark-accent text-slate-900 dark:text-[#F5F5F5] transition-all"
                  placeholder="Nama Lengkap Anda"
                />
              </div>
            </div>

            {/* Identifier (NIM/NIP/ID) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#B4B4C8]">{getIdentifierLabel()}</label>
              <div className="relative group">
                <Contact className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-dark-accent transition-colors" />
                <input 
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-[#2D2D44] border border-transparent dark:border-[#3F3F5A]/30 rounded-lg focus:outline-none focus:border-brand-dark-accent text-slate-900 dark:text-[#F5F5F5] transition-all"
                  placeholder={getIdentifierPlaceholder()}
                />
              </div>
            </div>

            {/* WhatsApp */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#B4B4C8]">Nomor WhatsApp</label>
              <div className="relative group">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-dark-accent transition-colors" />
                <input 
                  type="tel"
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-[#2D2D44] border border-transparent dark:border-[#3F3F5A]/30 rounded-lg focus:outline-none focus:border-brand-dark-accent text-slate-900 dark:text-[#F5F5F5] transition-all"
                  placeholder="+628..."
                />
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-brand-dark-accent-light hover:bg-brand-dark-accent-hover text-brand-dark-on-accent font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Selesaikan Pendaftaran
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-[#3F3F5A]/20 text-center">
            <button 
              onClick={() => logout()}
              className="text-sm text-slate-500 hover:text-slate-700 dark:text-[#B4B4C8] dark:hover:text-white transition-colors"
            >
              Gunakan Akun Lain
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
