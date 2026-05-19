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
  const [isRoleLocked, setIsRoleLocked] = useState(false);
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [identifierError, setIdentifierError] = useState('');
  const [isCheckingIdentifier, setIsCheckingIdentifier] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappError, setWhatsappError] = useState('');

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  
  useEffect(() => {
    setTheme('dark');
    if (!pendingRegistration) {
      navigate('/login', { replace: true });
    } else {
      setName(pendingRegistration.name);
      setEmail(pendingRegistration.email);
      if (pendingRegistration.role) {
        setRole(pendingRegistration.role);
        setIsRoleLocked(true);
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

  // Validate Email on change
  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (!val) {
      setEmailError('Email wajib diisi.');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setEmailError('Format email tidak valid.');
    } else {
      setEmailError('');
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
      // Only show length error if it exceeds the limit or if they've typed enough to be a mismatch
      if (identifier.length > 12) {
        setIdentifierError('NIM tidak boleh lebih dari 12 digit.');
        return;
      }
      if (identifier.length === 12) {
        setIdentifierError('');
      } else if (identifier.length > 0) {
        // Clear error while typing so it doesn't distract, isFormValid will handle the "blocked" state
        setIdentifierError(''); 
      }
    } else if (role === 'dosen') {
      if (!/^\d+$/.test(identifier)) {
        setIdentifierError('NIP harus berupa angka saja.');
        return;
      }
      if (identifier.length > 18) {
        setIdentifierError('NIP tidak boleh lebih dari 18 digit.');
        return;
      }
      if (identifier.length === 18) {
        setIdentifierError('');
      } else if (identifier.length > 0) {
        setIdentifierError('');
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

  const isCampusEmail = pendingRegistration?.email?.endsWith('@campus.ac.id');
  
  const isIdentifierLengthValid = (role === 'mahasiswa' && identifier.length === 12) || 
                                 (role === 'dosen' && identifier.length === 18) || 
                                 (role === 'admin' && identifier.length > 0);

  const isFormValid = identifier && !identifierError && isIdentifierLengthValid && whatsappNumber && !whatsappError && name && !isCheckingIdentifier && email && !emailError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    try {
      await completeRegistration({
        name,
        email, // Pass the potentially updated email
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

  const handleGoBack = () => {
    setLoading(true);
    logout()
      .then(() => {
        navigate('/login', { replace: true });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  if (!pendingRegistration) return null;

  return (
    <div className="bg-slate-50 dark:bg-[#1E1E2F] font-sans text-slate-900 dark:text-[#F5F5F5] flex items-center justify-center min-h-screen relative overflow-hidden p-4">
      {/* Background Decoration */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-dark-accent-light/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#ffafd5]/20 rounded-full blur-[120px]"></div>
        <img 
          className="w-full h-full object-cover grayscale opacity-10" 
          alt="Campus architecture" 
          src="https://images.unsplash.com/photo-1541339907198-e08756ebafe3?q=80&w=2070&auto=format&fit=crop" 
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            y: 0,
            transition: { 
              type: "spring", 
              damping: 22, 
              stiffness: 140,
              mass: 0.8
            }
          }}
          className="bg-white dark:bg-[#1e1e2d] w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-[#3F3F5A]/30 overflow-hidden relative max-h-[95vh] flex flex-col"
        >
          {/* Back Button */}
          <div className="absolute top-6 left-6 z-10">
            <button 
              onClick={handleGoBack}
              className="flex items-center text-slate-600 dark:text-[#B4B4C8] hover:text-brand-700 dark:hover:text-brand-dark-accent transition-all duration-300 group"
            >
              <ArrowRight className="w-6 h-6 rotate-180 group-hover:-translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="p-6 sm:p-8 overflow-y-auto flex-1 custom-scrollbar">
            <div className="text-center mb-8 pt-4">
              <div className="w-16 h-16 bg-brand-dark-accent-light/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-dark-accent-light/20 shadow-inner">
                <User className="w-8 h-8 text-brand-dark-accent" />
              </div>
              <h1 className="text-2xl font-extrabold text-[#3b134b] dark:text-[#F5F5F5] mb-2 tracking-tight">Lengkapi Profil</h1>
              <p className="text-slate-500 dark:text-[#B4B4C8] text-sm italic">
                Satu langkah lagi untuk bergabung ke portal <span className="text-brand-dark-accent font-bold">{PROJECT_NAME}</span>.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email (Read Only OR Editable for NIM users) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#B4B4C8]">
                  Alamat Email {isCampusEmail && <span className="text-red-500">*</span>}
                </label>
                <div className={cn(
                  "relative group",
                  !isCampusEmail && "opacity-80"
                )}>
                  <Mail className={cn(
                    "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors",
                    !isCampusEmail ? "text-slate-400" : "group-focus-within:text-brand-600 dark:text-brand-dark-accent"
                  )} />
                  <input 
                    type="email"
                    required
                    disabled={!isCampusEmail}
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    className={cn(
                      "w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-[#2D2D44] border border-transparent dark:border-[#3F3F5A]/20 rounded-lg focus:outline-none transition-all font-medium",
                      !isCampusEmail 
                        ? "text-slate-500 dark:text-slate-400 cursor-not-allowed" 
                        : "focus:border-brand-400 dark:border-brand-dark-accent focus:ring-1 focus:ring-brand-dark-accent-light text-slate-900 dark:text-[#F5F5F5]"
                    )}
                    placeholder="Masukkan Email Aktif"
                  />
                </div>
                {isCampusEmail && (
                  <p className="text-[10px] text-blue-500 font-bold italic mt-1 leading-tight">
                    *Ganti email default di atas dengan email asli Anda supaya bisa Login dengan Gmail nanti.
                  </p>
                )}
              </div>

              {/* Role Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#B4B4C8] flex justify-between items-center">
                  <span>Pilih Peran</span>
                  {isRoleLocked && (
                    <span className="text-[10px] text-brand-400 font-bold flex items-center gap-1 bg-brand-400/10 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3" /> Peran Terverifikasi
                    </span>
                  )}
                </label>
                <div className={cn(
                  "bg-slate-100 dark:bg-[#32324A] p-1 rounded-lg flex relative border border-slate-200/50 dark:border-[#3F3F5A]/50",
                  isRoleLocked && "opacity-80 grayscale-[0.5]"
                )}>
                  {(['mahasiswa', 'dosen', 'admin'] as Role[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      disabled={isRoleLocked && role !== r}
                      onClick={() => setRole(r)}
                      className={cn(
                        "flex-1 py-2 px-3 text-xs font-extrabold rounded-md transition-all duration-300 capitalize relative z-10",
                        role === r 
                          ? "text-white" 
                          : "text-slate-500 dark:text-[#B4B4C8] hover:text-brand-700 dark:hover:text-white",
                        isRoleLocked && role !== r && "cursor-not-allowed opacity-50"
                      )}
                    >
                      <span className="relative z-10">{r === 'admin' ? 'Staf' : r}</span>
                      {role === r && (
                        <motion.div
                          layoutId="activeRoleRegister"
                          className="absolute inset-0 bg-brand-500 rounded-md shadow-md"
                          transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                        />
                      )}
                    </button>
                  ))}
                </div>
                {isRoleLocked && (
                  <p className="text-[9px] text-slate-500 italic mt-1 font-medium">
                    *Peran dikunci berdasarkan pilihan awal atau deteksi sistem.
                  </p>
                )}
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#B4B4C8]">Nama Lengkap</label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-600 dark:text-brand-dark-accent transition-colors" />
                  <input 
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-[#2D2D44] border border-transparent dark:border-[#3F3F5A]/30 rounded-lg focus:outline-none focus:border-brand-400 dark:border-brand-dark-accent focus:ring-1 focus:ring-brand-dark-accent-light text-slate-900 dark:text-[#F5F5F5] transition-all"
                    placeholder="Nama Lengkap Anda"
                  />
                </div>
              </div>

              {/* Identifier (NIM/NIP/ID) */}
              <div id="identifier-field" className="space-y-1.5 group p-0.5 rounded-xl transition-all duration-500">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#B4B4C8] flex justify-between">
                  <span>{getIdentifierLabel()}</span>
                  <span className="text-[10px] font-medium text-slate-500 lowercase tracking-normal">
                    {role === 'mahasiswa' ? '12 digit' : role === 'dosen' ? '18 digit' : ''}
                  </span>
                </label>
                <div className="relative group">
                  <Contact className={cn(
                    "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors",
                    identifierError ? "text-red-500 underline underline-offset-4" : "text-slate-400 group-focus-within:text-brand-600 dark:text-brand-dark-accent"
                  )} />
                  <input 
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className={cn(
                      "w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-[#2D2D44] border rounded-lg focus:outline-none transition-all placeholder:text-slate-400/50",
                      identifierError 
                        ? "border-red-500/50 text-red-500 focus:ring-2 focus:ring-red-500/10" 
                        : "border-transparent dark:border-[#3F3F5A]/30 focus:border-brand-400 dark:border-brand-dark-accent focus:ring-1 focus:ring-brand-dark-accent-light text-slate-900 dark:text-[#F5F5F5]"
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
                  <p className="text-[10px] text-red-500 font-extrabold mt-1 animate-pulse">{identifierError}</p>
                )}
                {!identifierError && identifier.length > 0 && !isIdentifierLengthValid && (
                  <p className="text-[9px] text-brand-400/70 font-bold mt-1">
                    {role === 'mahasiswa' 
                      ? `${12 - identifier.length} digit lagi...` 
                      : role === 'dosen' 
                        ? `${18 - identifier.length} digit lagi...`
                        : ''}
                  </p>
                )}
              </div>

              {/* WhatsApp */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#B4B4C8]">Nomor WhatsApp</label>
                <div className="relative group">
                  <Phone className={cn(
                    "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors",
                    whatsappError ? "text-red-500" : "text-slate-400 group-focus-within:text-brand-600 dark:text-brand-dark-accent"
                  )} />
                  <input 
                    type="tel"
                    required
                    value={whatsappNumber}
                    onChange={(e) => handleWhatsappChange(e.target.value)}
                    className={cn(
                      "w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-[#2D2D44] border rounded-lg focus:outline-none transition-all",
                      whatsappError 
                        ? "border-red-500/50 text-red-500 focus:ring-2 focus:ring-red-500/10" 
                        : "border-transparent dark:border-[#3F3F5A]/30 focus:border-brand-400 dark:border-brand-dark-accent focus:ring-1 focus:ring-brand-dark-accent-light text-slate-900 dark:text-[#F5F5F5]"
                    )}
                    placeholder="+628..."
                  />
                </div>
                {whatsappError && (
                  <p className="text-[10px] text-red-500 font-extrabold mt-1">{whatsappError}</p>
                )}
              </div>
            </form>
          </div>

          <div className="p-6 border-t border-slate-200 dark:border-[#3F3F5A]/30 bg-white dark:bg-[#27273A] shrink-0">
            <button 
              onClick={handleSubmit}
              disabled={loading || !isFormValid}
              className="w-full py-3.5 bg-brand-dark-accent-light hover:bg-brand-dark-accent-hover text-brand-dark-on-accent font-bold rounded-lg shadow-lg hover:shadow-[0_0_15px_rgba(209,166,255,0.4)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:hover:shadow-none shadow-brand-500/20"
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

            <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-slate-500 dark:text-[#B4B4C8]/70">
              <ShieldCheck className="w-3.5 h-3.5 text-green-400/70" />
              <span>Data Anda aman dan terenkripsi secara otomatis</span>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-[#3F3F5A]/20 text-center">
              <button 
                onClick={handleGoBack}
                className="text-xs text-slate-500 hover:text-slate-700 dark:text-[#B4B4C8] dark:hover:text-white transition-colors font-medium"
              >
                Gunakan Akun Lain
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
