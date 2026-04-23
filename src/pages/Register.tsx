import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, Role } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { User, Mail, Phone, ShieldCheck, Loader2, ArrowRight, Contact } from 'lucide-react';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import { motion } from 'motion/react';
import { PROJECT_NAME } from '../constants';

export default function Register() {
  const { pendingRegistration, completeRegistration, logout } = useAuth();
  const { setTheme } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<Role>('mahasiswa');
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [identifierError, setIdentifierError] = useState('');
  const [isCheckingIdentifier, setIsCheckingIdentifier] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappError, setWhatsappError] = useState('');

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

  // Format and Validate WhatsApp on change
  const handleWhatsappChange = (value: string) => {
    let formatted = value;
    // Auto-format: 08... -> +628...
    if (value.startsWith('08')) {
      formatted = '+628' + value.substring(2);
    } 
    // Only allow numbers and + prefix
    formatted = formatted.replace(/[^\d+]/g, '');
    
    setWhatsappNumber(formatted);

    // Validation
    if (!formatted) {
      setWhatsappError('');
    } else if (!formatted.startsWith('+62')) {
      setWhatsappError('Gunakan format +62...');
    } else if (formatted.length < 12 || formatted.length > 15) {
      setWhatsappError('Panjang nomor tidak valid (10-13 digit setelah +62)');
    } else {
      setWhatsappError('');
    }
  };

  // Validate Identifier on change
  useEffect(() => {
    if (!identifier) {
      setIdentifierError('');
      return;
    }

    // Format validation
    if (role === 'mahasiswa') {
      if (!/^\d+$/.test(identifier)) {
        setIdentifierError('NIM harus berupa angka saja.');
        return;
      }
      if (identifier.length !== 12) {
        setIdentifierError('NIM harus tepat 12 digit.');
        return;
      }
    } else if (role === 'dosen') {
      if (!/^\d+$/.test(identifier)) {
        setIdentifierError('NIP harus berupa angka saja.');
        return;
      }
      if (identifier.length !== 18) {
        setIdentifierError('NIP harus tepat 18 digit.');
        return;
      }
    }

    const checkIdentifier = async () => {
      setIsCheckingIdentifier(true);
      try {
        const { getDocs, collection, query, where } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        
        const q = query(collection(db, 'users'), where('nim', '==', identifier));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          setIdentifierError(`${getIdentifierLabel()} ini sudah terpakai oleh akun lain.`);
        } else {
          setIdentifierError('');
        }
      } catch (e) {
        console.warn("Failed to check NIM uniqueness:", e);
      } finally {
        setIsCheckingIdentifier(false);
      }
    };

    const timer = setTimeout(checkIdentifier, 500);
    return () => clearTimeout(timer);
  }, [identifier, role]);

  const getIdentifierLabel = () => {
    if (role === 'mahasiswa') return 'NIM';
    if (role === 'dosen') return 'NIP';
    return 'ID Staf';
  };

  const getIdentifierPlaceholder = () => {
    if (role === 'mahasiswa') return '12 Digit Angka NIM';
    if (role === 'dosen') return '18 Digit Angka NIP';
    return 'ID Staf Anda';
  };

  const isFormValid = identifier && !identifierError && whatsappNumber && !whatsappError && name && !isCheckingIdentifier;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    try {
      await completeRegistration({
        name,
        role,
        nim: identifier, // We use nim field to store NIM/NIP/ID
        whatsappNumber,
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
              Satu langkah lagi untuk bergabung dengan <span className="text-brand-dark-accent font-bold">{PROJECT_NAME}</span>.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email (Read Only) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Email</label>
              <div className="relative group opacity-80">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input 
                  type="email"
                  disabled
                  value={pendingRegistration.email}
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-100 dark:bg-[#1E1E2F] border border-slate-200 dark:border-[#3F3F5A]/30 rounded-xl text-slate-600 dark:text-slate-400 cursor-not-allowed font-medium"
                />
              </div>
            </div>

            {/* Role Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Pilih Peran</label>
              <div className="bg-slate-100 dark:bg-[#32324A] p-1.5 rounded-xl flex relative border border-slate-200/50 dark:border-[#3F3F5A]/50">
                {(['mahasiswa', 'dosen', 'admin'] as Role[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={cn(
                      "flex-1 py-2.5 px-3 min-h-[44px] text-xs font-extrabold rounded-lg transition-all duration-300 capitalize relative z-10",
                      role === r 
                        ? "text-white" 
                        : "text-slate-500 dark:text-[#B4B4C8] hover:text-brand-700 dark:hover:text-white"
                    )}
                  >
                    <span className="relative z-10">{r === 'admin' ? 'Staf' : r}</span>
                    {role === r && (
                      <motion.div
                        layoutId="activeRoleRegister"
                        className="absolute inset-0 bg-brand-500 rounded-lg shadow-md"
                        transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Nama Lengkap</label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-brand-600 dark:text-brand-dark-accent transition-colors" />
                <input 
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-50 dark:bg-[#1E1E2F] border border-slate-200 dark:border-[#3F3F5A]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 dark:border-brand-dark-accent text-slate-900 dark:text-[#F5F5F5] transition-all placeholder:text-slate-400/70"
                  placeholder="Nama Lengkap Anda"
                />
              </div>
            </div>

            {/* Identifier (NIM/NIP/ID) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">{getIdentifierLabel()}</label>
              <div className="relative group">
                <Contact className={cn(
                  "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors",
                  identifierError ? "text-red-500" : "text-slate-500 group-focus-within:text-brand-600 dark:text-brand-dark-accent"
                )} />
                <input 
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className={cn(
                    "w-full pl-10 pr-4 py-3.5 bg-slate-50 dark:bg-[#1E1E2F] border rounded-xl focus:outline-none transition-all placeholder:text-slate-400/70",
                    identifierError 
                      ? "border-red-500 text-red-500 focus:ring-2 focus:ring-red-500/20" 
                      : "border-slate-200 dark:border-[#3F3F5A]/30 focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 text-slate-900 dark:text-[#F5F5F5]"
                  )}
                  placeholder={getIdentifierPlaceholder()}
                />
                {isCheckingIdentifier && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  </div>
                )}
              </div>
              {identifierError && (
                <p className="text-[10px] text-red-500 font-extrabold mt-1">{identifierError}</p>
              )}
            </div>

            {/* WhatsApp */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Nomor WhatsApp</label>
              <div className="relative group">
                <Phone className={cn(
                  "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors",
                  whatsappError ? "text-red-500" : "text-slate-500 group-focus-within:text-brand-600 dark:text-brand-dark-accent"
                )} />
                <input 
                  type="tel"
                  required
                  value={whatsappNumber}
                  onChange={(e) => handleWhatsappChange(e.target.value)}
                  className={cn(
                    "w-full pl-10 pr-4 py-3.5 bg-slate-50 dark:bg-[#1E1E2F] border rounded-xl focus:outline-none transition-all placeholder:text-slate-400/70",
                    whatsappError 
                      ? "border-red-500 text-red-500 focus:ring-2 focus:ring-red-500/20" 
                      : "border-slate-200 dark:border-[#3F3F5A]/30 focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 text-slate-900 dark:text-[#F5F5F5]"
                  )}
                  placeholder="+628..."
                />
              </div>
              {whatsappError && (
                <p className="text-[10px] text-red-500 font-extrabold mt-1">{whatsappError}</p>
              )}
            </div>

            <div className="pt-4">
              <button 
                type="submit"
                disabled={loading || !isFormValid}
                className="w-full py-4 bg-brand-dark-accent-light hover:bg-brand-dark-accent-hover text-brand-dark-on-accent font-bold rounded-xl shadow-lg shadow-brand-500/20 hover:shadow-brand-500/40 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
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
