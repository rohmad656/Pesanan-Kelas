import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, Role } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { auth, googleProvider, db } from '../lib/firebase';
import { signInWithPopup, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, LogIn, User, Loader2, ShieldCheck, AlertCircle, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleButton } from '../components/GoogleButton';
import RoleChangeModal from '../components/RoleChangeModal';
import { PROJECT_NAME, SUPPORT_EMAIL, SUPPORT_EMAIL_ALT } from '../constants';

export default function Login() {
  const [role, setRole] = useState<Role>('mahasiswa');
  const { login, emailLogin, emailRegister, sendOTPReset, verifyOTPReset, completeOTPReset, pendingRegistration, conflictInfo, loginWithRedirect } = useAuth();
  const { setTheme } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [loginStep, setLoginStep] = useState<string>('');
  const [showRedirectOption, setShowRedirectOption] = useState(false);
  const [error, setError] = useState('');
  
  useEffect(() => {
    // Force dark mode on login page
    setTheme('dark');

    // If there's a pending registration, redirect to registration page
    if (pendingRegistration) {
      navigate('/daftar');
    }
  }, [setTheme, pendingRegistration, navigate]);
  
  // Auto-detect password reset from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oobCode = params.get('oobCode');
    const mode = params.get('mode');
    
    if (oobCode && mode === 'resetPassword') {
      setIsForgotPassword(true);
      setResetStep('CODE');
      setResetCode(oobCode);
    }
  }, []);

  const [isVisible, setIsVisible] = useState(true);
  const [exitDestination, setExitDestination] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetStep, setResetStep] = useState<'EMAIL' | 'CODE' | 'NEW_PASSWORD' | 'SUCCESS'>('EMAIL');
  const [resetCode, setResetCode] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  const handleExit = (path: string) => {
    setExitDestination(path);
    setIsVisible(false);
  };
  const [nim, setNim] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Scroll Lock for Login Modal
  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isVisible]);

  const getIdentifierLabel = () => {
    if (isForgotPassword && resetStep === 'EMAIL') return "Email atau NIM Akun";
    if (role === 'mahasiswa') return 'Email atau NIM';
    if (role === 'dosen') return 'Email atau NIP';
    return 'ID Staf atau Email';
  };

  const getIdentifierPlaceholder = () => {
    if (isForgotPassword && resetStep === 'EMAIL') return "Masukkan Email atau NIM Anda";
    if (role === 'mahasiswa') return 'mhs@kampus.ac.id / 123456';
    if (role === 'dosen') return 'dosen@kampus.ac.id / 987654';
    return 'admin@kampus.ac.id / STF001';
  };

  const [validationError, setValidationError] = useState('');

  const validateEmail = (email: string) => {
    return email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  };

  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNim(val);
    if (val && !validateEmail(val) && val.length > 5 && !val.match(/^[0-9A-Z]+$/i)) {
      setValidationError('Format email atau ID mungkin tidak valid.');
    } else {
      setValidationError('');
    }
  };

  const notifyPasswordChanged = async (email: string) => {
    try {
      await fetch('/api/notify-password-changed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
    } catch (e) {
      console.warn("Failed to trigger password change notification:", e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isForgotPassword) {
        // ... existing forgot password logic ...
        if (resetStep === 'EMAIL') {
          if (!nim) {
            setError('Silakan masukkan email Anda terlebih dahulu.');
            setLoading(false);
            return;
          }
          const res = (await sendOTPReset(nim)) as any;
          if (res.success) {
            toast.success(res.message);
            // If backend resolved a NIM to an email, we switch to that email for next steps
            if (res.resolvedEmail && res.resolvedEmail !== nim) {
              console.log("Switching to resolved email:", res.resolvedEmail);
              setNim(res.resolvedEmail);
            }
            setResetStep('CODE');
          } else {
            setError(res.message || 'Gagal mengirim kode OTP.');
          }
        } else if (resetStep === 'CODE') {
          if (!resetCode || resetCode.length !== 6) {
            setError('Silakan masukkan 6 digit kode OTP yang valid.');
            setLoading(false);
            return;
          }
          
          setIsVerifyingCode(true);
          const res = await verifyOTPReset(nim, resetCode);
          if (res.success) {
            setResetStep('NEW_PASSWORD');
            toast.success('Kode valid! Silakan masukkan sandi baru.');
          } else {
            setError(res.message || 'Kode tidak valid atau sudah kadaluarsa.');
          }
          setIsVerifyingCode(false);
        } else if (resetStep === 'NEW_PASSWORD') {
          if (password !== confirmPassword) {
            setError('Konfirmasi kata sandi tidak cocok.');
            setLoading(false);
            return;
          }
          if (password.length < 8) {
            setError('Kata sandi minimal harus 8 karakter.');
            setLoading(false);
            return;
          }
          const res = await completeOTPReset(nim, resetCode, password);
          if (res.success) {
            await notifyPasswordChanged(nim);
            setResetStep('SUCCESS');
            setResetCode('');
            setPassword('');
            setConfirmPassword('');
          } else {
            setError(res.message || 'Gagal mengubah password.');
          }
        } else if (resetStep === 'SUCCESS') {
          setIsForgotPassword(false);
          setResetStep('EMAIL');
          setError('');
        }
      } else if (isRegistering) {
        if (password !== confirmPassword) {
          setError('Konfirmasi kata sandi tidak cocok.');
          setLoading(false);
          return;
        }
        await emailRegister(nim, password, name, role);
        toast.success('Berhasil mendaftar dan masuk!');
        handleExit('/dashboard');
      } else {
        setLoginStep('Mencari data akun...');
        await emailLogin(nim, password, role);
        setLoginStep('Masuk ke Dashboard...');
        toast.success('Berhasil masuk!');
        handleExit('/dashboard');
      }
    } catch (err: any) {
      setLoginStep('');
      console.error(err);
      if (err.code === 'custom/user-not-found') {
        setError('Akun tidak ditemukan. Pastikan Email atau NIM/NIP sudah benar.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Email belum terdaftar atau kata sandi salah. Silakan daftar dulu atau gunakan login Google.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Email atau ID ini sudah terdaftar. Silakan masuk menggunakan email tersebut.');
      } else if (err.code === 'auth/weak-password') {
        setError('Kata sandi terlalu lemah. Gunakan minimal 6 karakter.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Autentikasi Email/Password belum diaktifkan di Firebase Console. Silakan gunakan Login Google untuk saat ini.');
      } else if (err.code === 'auth/user-not-found') {
        setError('Akun dengan email ini tidak ditemukan.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Format email tidak valid.');
      } else {
        setError(err.message || 'Terjadi kesalahan saat autentikasi.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');
    setLoginStep('Membuka jendela Google...');
    
    // Safety timeout to prevent infinite loading if popup hangs
    const timeoutId = setTimeout(() => {
      if (googleLoading) {
        setGoogleLoading(false);
        setLoginStep('');
        setShowRedirectOption(true);
        setError('Proses login terlalu lama. Silakan coba lagi atau gunakan metode Redirect di bawah ini.');
      }
    }, 45000); // 45 seconds timeout

    try {
      const result = await signInWithPopup(auth, googleProvider);
      clearTimeout(timeoutId);
      
      const currentUser = result.user;
      setLoginStep('Memproses data profil...');

      // login() now automatically creates a skeleton profile, detects role, and validates against 'role' state
      const { isNewUser } = await login(role, currentUser);

      setLoginStep('Menyiapkan dashboard...');
      if (isNewUser) {
        toast.success(`Akun Google berhasil terhubung!`);
        handleExit('/dashboard');
      } else {
        toast.success(`Selamat datang kembali!`);
        handleExit('/dashboard');
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      setLoginStep('');
      
      if (err.code === 'auth/popup-closed-by-user') {
        setGoogleLoading(false);
        // Silently handle - users know they closed it.
        return;
      }
      
      console.error("Google Login Error:", err);
      if (err.code === 'auth/popup-blocked') {
        setShowRedirectOption(true);
        setError('Popup diblokir oleh browser. Silakan izinkan popup untuk situs ini atau gunakan metode Redirect di bawah.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setGoogleLoading(false);
      } else if (err.code === 'auth/network-request-failed') {
        setError('Koneksi internet bermasalah. Silakan periksa jaringan Anda.');
      } else {
        setError(`Gagal masuk dengan Google: ${err.message || err.code || 'Kesalahan tidak diketahui'}. Tips: Coba buka di Tab Baru.`);
      }
    } finally {
      setGoogleLoading(false);
      setLoginStep('');
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-[#1E1E2F] font-sans text-slate-900 dark:text-[#F5F5F5] flex items-center justify-center min-h-screen relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 z-0">
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            x: [0, 20, 0],
            y: [0, -20, 0]
          }}
          transition={{ 
            duration: 15, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-dark-accent-light/20 rounded-full blur-[120px]"
        ></motion.div>
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, -30, 0],
            y: [0, 30, 0]
          }}
          transition={{ 
            duration: 18, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#ffafd5]/20 rounded-full blur-[120px]"
        ></motion.div>
        <motion.img 
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.2 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="w-full h-full object-cover grayscale" 
          alt="Campus architecture" 
          src="https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=2086&auto=format&fit=crop" 
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Modal Overlay */}
      <AnimatePresence onExitComplete={() => {
        if (exitDestination) navigate(exitDestination);
      }}>
        {isVisible && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3, ease: "easeInOut" } }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            {/* Login Modal Card */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                transition: { 
                  type: "spring", 
                  damping: 22, 
                  stiffness: 140,
                  mass: 0.8
                }
              }}
              exit={{ 
                opacity: 0, 
                scale: 0.98, 
                transition: { duration: 0.2, ease: "easeIn" }
              }}
              className="bg-white dark:bg-[#1e1e2d] w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-[#3F3F5A]/30 overflow-hidden relative max-h-[95vh] flex flex-col"
            >
              
              {/* Back Button */}
              <div className="absolute top-6 left-6 z-10">
                <button 
                  onClick={() => {
                    if (isForgotPassword) {
                      if (resetStep === 'CODE') setResetStep('EMAIL');
                      else if (resetStep === 'NEW_PASSWORD') setResetStep('CODE');
                      else {
                        setIsForgotPassword(false);
                      }
                      setError('');
                    } else {
                      handleExit('/');
                    }
                  }} 
                  className="flex items-center text-slate-600 dark:text-[#B4B4C8] hover:text-brand-700 dark:text-brand-dark-accent transition-all duration-300 group"
                >
                  <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Modal Content */}
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.08,
                    delayChildren: 0.2
                  }
                }
              }}
              className="p-6 sm:p-8 overflow-y-auto flex-1"
            >
              {/* Header */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 }
                }}
                className="text-center mb-6 pt-4"
              >
                <h1 className="text-2xl font-extrabold text-[#3b134b] dark:text-[#F5F5F5] mb-2 tracking-tight">
                  {isForgotPassword ? (
                    resetStep === 'EMAIL' ? 'Lupa Kata Sandi' : 
                    resetStep === 'CODE' ? 'Verifikasi Kode' : 'Atur Sandi Baru'
                  ) : isRegistering ? 'Daftar Akun Baru' : 'Selamat Datang Kembali'}
                </h1>
                <p className="text-slate-500 dark:text-[#B4B4C8] text-sm italic">
                  {isForgotPassword ? (
                    resetStep === 'EMAIL' ? 'Masukkan email Anda untuk menerima kode OTP 6-digit' :
                    resetStep === 'CODE' ? 'Masukkan 6 digit kode OTP yang dikirim ke email Anda' :
                    'Masukkan kata sandi baru untuk akun Anda'
                  ) : isRegistering ? 'Buat akun untuk mengakses layanan kampus' : 'Masuk untuk mengelola jadwal kampus Anda'}
                </p>
              </motion.div>

              {/* Role Selector */}
              {!isForgotPassword && (
                <motion.div 
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  className="bg-slate-100 dark:bg-[#32324A] p-1 rounded-lg flex mb-8 relative"
                >
                  {(['mahasiswa', 'dosen', 'admin'] as Role[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={cn(
                        "flex-1 py-2 px-3 text-sm font-semibold rounded-md transition-all duration-300 capitalize relative z-10 hover:text-slate-700 dark:hover:text-white",
                        role === r 
                          ? "text-white" 
                          : "text-slate-500 dark:text-[#B4B4C8] hover:text-brand-700 dark:text-brand-dark-accent"
                      )}
                    >
                      <span className="relative z-10">{r === 'admin' ? 'Staf' : r}</span>
                      {role === r && (
                        <motion.div
                          layoutId="activeRole"
                          className="absolute inset-0 bg-[#A78BFA] rounded-md shadow-sm"
                          transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                        />
                      )}
                    </button>
                  ))}
                </motion.div>
              )}

              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 dark:text-red-400 text-sm text-center flex flex-col items-center gap-2"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p>{error}</p>
                  </div>
                  {error.includes('belum terdaftar') && !isRegistering && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegistering(true);
                        setError('');
                      }}
                      className="mt-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md font-medium transition-all shadow-md hover:scale-105 active:scale-95"
                    >
                      Daftar Sekarang
                    </button>
                  )}
                  {error.includes('sudah terdaftar sebagai') && conflictInfo && (
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => setIsRoleModalOpen(true)}
                        className="mt-2 text-brand-400 hover:text-brand-300 font-bold underline underline-offset-4 text-xs transition-colors"
                      >
                        Ajukan Perubahan Peran
                      </button>
                      <div className="mt-1 flex flex-col items-center gap-0.5">
                        <span className="text-[9px] text-slate-500 italic">Gunakan email ini untuk bantuan teknis aplikasi {PROJECT_NAME}:</span>
                        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[10px] text-brand-400 hover:text-brand-300 font-medium transition-colors">
                          Email Support Kampus: {SUPPORT_EMAIL}
                        </a>
                        <span className="text-[8px] text-slate-500">Alternatif: {SUPPORT_EMAIL_ALT}</span>
                      </div>
                    </div>
                  )}
                  {!error.includes('sudah terdaftar sebagai') && error.length > 0 && (
                    <div className="mt-2 flex flex-col items-center gap-1">
                      <p className="text-[10px] text-slate-500 font-medium">Bantuan Teknis {PROJECT_NAME}:</p>
                      <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[10px] text-red-400 hover:text-red-300 transition-colors underline underline-offset-2">
                        Email Support Kampus: {SUPPORT_EMAIL}
                      </a>
                      <span className="text-[8px] text-slate-500">Fallback: {SUPPORT_EMAIL_ALT}</span>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Form Inputs */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 }
                }}
                className="space-y-5"
              >
                <AnimatePresence mode="wait">
                  {isRegistering && (
                    <motion.div 
                      key="register-name"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1.5 overflow-hidden"
                    >
                      <label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#B4B4C8]">Nama Lengkap</label>
                      <div className="relative group">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-700 dark:text-brand-dark-accent transition-colors" aria-hidden="true" />
                        <input 
                          id="name"
                          type="text"
                          required
                          autoFocus
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-[#2D2D44] border border-transparent dark:border-[#3F3F5A]/30 rounded-lg focus:outline-none focus:border-brand-400 dark:border-brand-dark-accent focus:ring-1 focus:ring-brand-dark-accent-light text-slate-900 dark:text-[#F5F5F5] placeholder:text-slate-400 transition-all"
                          placeholder="Nama Lengkap Anda"
                          aria-label="Nama Lengkap"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  {isForgotPassword && resetStep === 'CODE' && (
                    <motion.div 
                      key="reset-code"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1.5 overflow-hidden"
                    >
                      <label htmlFor="resetCode" className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#B4B4C8]">Kode OTP 6-Digit</label>
                      <div className="relative group">
                        <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-700 dark:text-brand-dark-accent transition-colors" />
                        <input 
                          id="resetCode"
                          type="text"
                          required
                          maxLength={6}
                          value={resetCode}
                          onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-[#2D2D44] border border-transparent dark:border-[#3F3F5A]/30 rounded-lg focus:outline-none focus:border-brand-400 dark:border-brand-dark-accent text-slate-900 dark:text-[#F5F5F5] placeholder:text-slate-400 font-mono text-center tracking-[0.5em] text-lg transition-all"
                          placeholder="000000"
                        />
                        {isVerifyingCode && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-[#B4B4C8] mt-2 italic px-1">
                        Tips: Periksa folder <strong>Spam</strong> jika Anda tidak menerima email di Inbox Utama.
                      </p>
                    </motion.div>
                  )}

                  {isForgotPassword && resetStep === 'NEW_PASSWORD' && (
                    <motion.div 
                      key="new-password-fields"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-5 overflow-hidden"
                    >
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#B4B4C8]">Sandi Baru</label>
                        <div className="relative group">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input 
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-[#2D2D44] border border-transparent rounded-lg focus:outline-none focus:border-brand-400 text-slate-900 dark:text-[#F5F5F5]"
                            placeholder="Sandi baru"
                          />
                          <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#B4B4C8]">Konfirmasi Sandi Baru</label>
                        <div className="relative group">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input 
                            type={showConfirmPassword ? 'text' : 'password'}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-[#2D2D44] border border-transparent rounded-lg focus:outline-none focus:border-brand-400 text-slate-900 dark:text-[#F5F5F5]"
                            placeholder="Ulangi sandi baru"
                          />
                          <button 
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                          >
                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {isForgotPassword && resetStep === 'SUCCESS' && (
                    <motion.div 
                      key="success-step"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="py-6 text-center space-y-4"
                    >
                      <div className="flex justify-center">
                        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20">
                          <ShieldCheck className="w-8 h-8 text-green-500" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Sandi Berhasil Diubah</h3>
                        <p className="text-sm text-slate-500 dark:text-[#B4B4C8]">
                          Kata sandi Anda telah diperbarui. Silakan gunakan sandi baru untuk masuk ke akun Anda.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {(!isForgotPassword || (resetStep === 'EMAIL' && resetStep !== 'SUCCESS')) && (
                    <motion.div 
                      key="main-identifier"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-1.5"
                    >
                      <label htmlFor="nim" className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">{getIdentifierLabel()}</label>
                      <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-brand-600 dark:text-brand-dark-accent transition-colors" aria-hidden="true" />
                        <input 
                          id="nim"
                          type="text"
                          required
                          autoFocus={!isRegistering}
                          value={nim}
                          onChange={handleIdentifierChange}
                          className={cn(
                            "w-full pl-10 pr-4 py-3.5 bg-slate-50 dark:bg-[#1E1E2F] border rounded-xl focus:outline-none focus:ring-2 transition-all text-slate-900 dark:text-[#F5F5F5] placeholder:text-slate-400/70",
                            validationError ? "border-red-500/50 focus:border-red-500 focus:ring-red-500" : "border-slate-200 dark:border-[#3F3F5A]/30 focus:border-brand-500 dark:border-brand-dark-accent focus:ring-brand-500/50"
                          )}
                          placeholder={getIdentifierPlaceholder()}
                          aria-label={getIdentifierLabel()}
                          aria-invalid={!!validationError}
                        />
                      </div>
                      {validationError && (
                        <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3 h-3" /> {validationError}
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  {!isForgotPassword && (
                    <motion.div 
                      key="password-field"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1.5 overflow-hidden"
                    >
                      <div className="flex justify-between items-center">
                        <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Kata Sandi</label>
                        {!isRegistering && (
                          <button 
                            type="button" 
                            onClick={() => {
                              setIsForgotPassword(true);
                              setResetStep('EMAIL');
                              setError('');
                            }} 
                            className="text-xs font-bold text-blue-600 dark:text-[#86d2ff] hover:underline hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-[#86d2ff]/50 rounded px-1.5 py-0.5"
                          >
                            Lupa sandi?
                          </button>
                        )}
                      </div>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-brand-600 dark:text-brand-dark-accent transition-colors" aria-hidden="true" />
                        <input 
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          required={!isForgotPassword}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-10 pr-10 py-3.5 bg-slate-50 dark:bg-[#1E1E2F] border border-slate-200 dark:border-[#3F3F5A]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 dark:border-brand-dark-accent text-slate-900 dark:text-[#F5F5F5] placeholder:text-slate-400/70 transition-all"
                          placeholder="••••••••"
                          aria-label="Kata Sandi"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-slate-400 hover:text-brand-700 dark:hover:text-brand-dark-accent transition-colors focus:outline-none focus:text-brand-700 active:scale-90"
                          aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  {isRegistering && (
                    <motion.div 
                      key="confirm-password"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1.5 overflow-hidden"
                    >
                      <label htmlFor="confirmPassword" className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#B4B4C8]">Konfirmasi Kata Sandi</label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-700 dark:text-brand-dark-accent transition-colors" aria-hidden="true" />
                        <input 
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          required={isRegistering}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-[#2D2D44] border border-transparent dark:border-[#3F3F5A]/30 rounded-lg focus:outline-none focus:border-brand-400 dark:border-brand-dark-accent focus:ring-1 focus:ring-brand-dark-accent-light text-slate-900 dark:text-[#F5F5F5] placeholder:text-slate-400 transition-all"
                          placeholder="••••••••"
                          aria-label="Konfirmasi Kata Sandi"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-700 dark:text-brand-dark-accent transition-colors focus:outline-none focus:text-brand-700 dark:text-brand-dark-accent"
                          aria-label={showConfirmPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* SSO Options */}
              {!isForgotPassword && (
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    visible: { opacity: 1, y: 0 }
                  }}
                >
                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-[#3F3F5A]/30"></div></div>
                    <div className="relative flex justify-center text-xs uppercase tracking-widest">
                      <span className="bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 px-4 text-slate-400">
                        {isRegistering ? 'Atau daftar dengan' : 'Atau masuk dengan'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <GoogleButton 
                      onClick={handleGoogleLogin}
                      loading={googleLoading}
                      loadingLabel={loginStep}
                      mode={isRegistering ? 'register' : 'login'}
                      disabled={loading}
                      label={isRegistering ? 'Daftar dengan Google' : 'Masuk dengan Google'}
                    />

                    {showRedirectOption && (
                      <motion.button
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        type="button"
                        onClick={() => loginWithRedirect(role)}
                        className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-brand-600 dark:text-[#B4B4C8] dark:hover:text-brand-dark-accent border border-dashed border-slate-300 dark:border-[#3F3F5A]/50 rounded-lg transition-all hover:scale-[1.02] active:scale-95 hover:bg-slate-50 dark:hover:bg-[#32324A]/30"
                      >
                        Gunakan Metode Redirect (Lebih Lambat tapi Stabil)
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Sticky Action Footer */}
            <motion.div 
              variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0 }
              }}
              className="p-6 border-t border-slate-200 dark:border-[#3F3F5A]/30 bg-white dark:bg-[#27273A] shrink-0"
            >
              <button 
                type="submit"
                disabled={loading || !!validationError}
                className="w-full py-3.5 bg-brand-dark-accent-light hover:bg-brand-dark-accent-hover hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(209,166,255,0.4)] active:scale-[0.98] text-brand-dark-on-accent font-bold rounded-lg shadow-lg shadow-brand-dark-accent-light/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-dark-accent-light focus:ring-offset-[#20082b]"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> {loginStep || 'Memproses...'}</>
                ) : (
                  <>
                    {isForgotPassword ? (
                      resetStep === 'EMAIL' ? 'Kirim Kode OTP' :
                      resetStep === 'CODE' ? 'Verifikasi OTP' : 
                      resetStep === 'SUCCESS' ? 'Selesai & Masuk' : 'Ubah Kata Sandi'
                    ) : isRegistering ? 'Daftar Sekarang' : 'Masuk Sekarang'}
                    {!isForgotPassword && <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                  </>
                )}
              </button>

              {/* Security Trust Indicator */}
              <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-slate-500 dark:text-[#B4B4C8]/70">
                <ShieldCheck className="w-3.5 h-3.5 text-green-400/70" />
                <span>Data Anda aman dengan enkripsi standar industri</span>
              </div>
            </motion.div>
          </form>

          {/* Footer */}
          <motion.div 
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1 }
            }}
            className="bg-slate-50 dark:bg-[#32324A]/50 p-6 text-center border-t border-slate-100 dark:border-[#3F3F5A]/20"
          >
            <p className="text-sm text-slate-500 dark:text-[#B4B4C8]">
              {isForgotPassword ? (
                <>
                  Ingat kata sandi Anda?{' '}
                  <button 
                    onClick={() => {
                      setIsForgotPassword(false);
                      setResetStep('EMAIL');
                      setError('');
                    }} 
                    className="text-brand-700 dark:text-brand-dark-accent font-bold hover:text-pink-600 dark:text-[#ffafd5] transition-all hover:scale-105 active:scale-95 underline decoration-2 underline-offset-4 decoration-brand-dark-accent-light/30 inline-block"
                  >
                    Masuk
                  </button>
                </>
              ) : (
                <>
                  {isRegistering ? 'Sudah punya akun? ' : 'Belum punya akun? '}
                  <button 
                    onClick={() => {
                      setIsRegistering(!isRegistering);
                      setError('');
                    }} 
                    className="text-brand-700 dark:text-brand-dark-accent font-bold hover:text-pink-600 dark:text-[#ffafd5] transition-all hover:scale-105 active:scale-95 underline decoration-2 underline-offset-4 decoration-brand-dark-accent-light/30 inline-block"
                  >
                    {isRegistering ? 'Masuk' : 'Daftar'}
                  </button>
                </>
              )}
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
  {conflictInfo && (
    <RoleChangeModal
      isOpen={isRoleModalOpen}
      onClose={() => setIsRoleModalOpen(false)}
      userEmail={conflictInfo.email}
      currentRole={conflictInfo.role}
    />
  )}
</div>
  );
}
