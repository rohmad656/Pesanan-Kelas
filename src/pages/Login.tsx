import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

export default function Login() {
  const [role, setRole] = useState<Role>('mahasiswa');
  const { login, emailLogin, emailRegister, resetPassword, pendingRegistration } = useAuth();
  const { setTheme } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  
  useEffect(() => {
    // Force dark mode on login page
    setTheme('dark');

    // If there's a pending registration, redirect to registration page
    if (pendingRegistration) {
      navigate('/daftar');
    }
  }, [setTheme, pendingRegistration, navigate]);

  const [isVisible, setIsVisible] = useState(true);
  const [exitDestination, setExitDestination] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

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
    if (role === 'mahasiswa') return 'Email atau NIM';
    if (role === 'dosen') return 'Email atau NIP';
    return 'ID Staf atau Email';
  };

  const getIdentifierPlaceholder = () => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isForgotPassword) {
        if (!nim) {
          setError('Silakan masukkan email Anda terlebih dahulu.');
          setLoading(false);
          return;
        }
        await resetPassword(nim);
        toast.success('Link reset password telah dikirim ke email Anda.');
        setIsForgotPassword(false);
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
        await emailLogin(nim, password);
        toast.success('Berhasil masuk!');
        handleExit('/dashboard');
      }
    } catch (err: any) {
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

  const [showRegistrationConfirm, setShowRegistrationConfirm] = useState<{ email: string, name: string, user: FirebaseUser, suggestedRole: Role } | null>(null);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const currentUser = result.user;

      // login() now returns isNewUser if it's a new user
      const { isNewUser } = await login(role, currentUser);

      if (isNewUser) {
        toast.success(`Hampir selesai! Silakan lengkapi data Anda.`);
        handleExit('/daftar');
      } else {
        toast.success(`Selamat datang kembali!`);
        handleExit('/dashboard');
      }
    } catch (err: any) {
      console.error("Google Login Error:", err);
      if (err.code === 'auth/popup-blocked') {
        setError('Popup diblokir oleh browser. Silakan izinkan popup untuk situs ini dan coba lagi.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setGoogleLoading(false);
        toast.error('Login dibatalkan.');
      } else {
        setError(`Gagal masuk dengan Google: ${err.message || err.code || 'Kesalahan tidak diketahui'}`);
      }
    } finally {
      setGoogleLoading(false);
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            {/* Login Modal Card */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30, filter: "blur(4px)" }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                y: 0,
                filter: "blur(0px)",
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
                y: 10,
                filter: "blur(4px)",
                transition: { duration: 0.2, ease: "easeIn" }
              }}
              className="bg-white dark:bg-[#27273A] dark:shadow-2xl dark:shadow-black/40 w-[95vw] max-w-md rounded-2xl shadow-xl border border-slate-200 dark:border-[#3F3F5A]/30 overflow-hidden relative max-h-[95vh] flex flex-col"
            >
              
              {/* Back Button */}
              <div className="absolute top-6 left-6 z-10">
                <button 
                  onClick={() => {
                    if (isForgotPassword) {
                      setIsForgotPassword(false);
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
                  {isForgotPassword ? 'Reset Kata Sandi' : isRegistering ? 'Daftar Akun Baru' : 'Selamat Datang Kembali'}
                </h1>
                <p className="text-slate-500 dark:text-[#B4B4C8] text-sm italic">
                  {isForgotPassword ? 'Masukkan email Anda untuk menerima link reset kata sandi' : isRegistering ? 'Buat akun untuk mengakses layanan kampus' : 'Masuk untuk mengelola jadwal kampus Anda'}
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
                        "flex-1 py-2 px-3 text-sm font-semibold rounded-md transition-all duration-300 capitalize relative z-10",
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
                      className="mt-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md font-medium transition-colors shadow-sm"
                    >
                      Daftar Sekarang
                    </button>
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

                <motion.div 
                  key={role}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-1.5"
                >
                  <label htmlFor="nim" className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#B4B4C8]">{getIdentifierLabel()}</label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-700 dark:text-brand-dark-accent transition-colors" aria-hidden="true" />
                    <input 
                      id="nim"
                      type="text"
                      required
                      autoFocus={!isRegistering}
                      value={nim}
                      onChange={handleIdentifierChange}
                      className={cn(
                        "w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-[#2D2D44] border rounded-lg focus:outline-none focus:ring-1 transition-all text-slate-900 dark:text-[#F5F5F5] placeholder:text-slate-400",
                        validationError ? "border-red-500/50 focus:border-red-500 focus:ring-red-500" : "border-transparent dark:border-[#3F3F5A]/30 focus:border-brand-400 dark:border-brand-dark-accent focus:ring-brand-dark-accent-light"
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
                        <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#B4B4C8]">Kata Sandi</label>
                        {!isRegistering && (
                          <button 
                            type="button" 
                            onClick={() => {
                              setIsForgotPassword(true);
                              setError('');
                            }} 
                            className="text-xs font-semibold text-blue-600 dark:text-[#86d2ff] hover:underline focus:outline-none focus:ring-2 focus:ring-[#86d2ff] rounded"
                          >
                            Lupa sandi?
                          </button>
                        )}
                      </div>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-700 dark:text-brand-dark-accent transition-colors" aria-hidden="true" />
                        <input 
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          required={!isForgotPassword}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-[#2D2D44] border border-transparent dark:border-[#3F3F5A]/30 rounded-lg focus:outline-none focus:border-brand-400 dark:border-brand-dark-accent focus:ring-1 focus:ring-brand-dark-accent-light text-slate-900 dark:text-[#F5F5F5] placeholder:text-slate-400 transition-all"
                          placeholder="••••••••"
                          aria-label="Kata Sandi"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-700 dark:text-brand-dark-accent transition-colors focus:outline-none focus:text-brand-700 dark:text-brand-dark-accent"
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
                      mode={isRegistering ? 'register' : 'login'}
                      disabled={loading}
                      label={isRegistering ? 'Daftar dengan Google' : 'Masuk dengan Google'}
                    />
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
                  <><Loader2 className="w-5 h-5 animate-spin" /> Memproses...</>
                ) : (
                  <>
                    {isForgotPassword ? 'Kirim Link Reset' : isRegistering ? 'Daftar Sekarang' : 'Masuk Sekarang'}
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
                      setError('');
                    }} 
                    className="text-brand-700 dark:text-brand-dark-accent font-bold hover:text-pink-600 dark:text-[#ffafd5] transition-colors underline decoration-2 underline-offset-4 decoration-brand-dark-accent-light/30"
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
                    className="text-brand-700 dark:text-brand-dark-accent font-bold hover:text-pink-600 dark:text-[#ffafd5] transition-colors underline decoration-2 underline-offset-4 decoration-brand-dark-accent-light/30"
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
    </div>
  );
}
