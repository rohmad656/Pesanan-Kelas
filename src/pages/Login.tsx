import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, Role } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, LogIn, User, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

export default function Login() {
  const [role, setRole] = useState<Role>('mahasiswa');
  const { login, emailLogin, emailRegister, resetPassword } = useAuth();
  const { setTheme } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  
  useEffect(() => {
    // Force dark mode on login page
    setTheme('dark');
  }, [setTheme]);

  const [isVisible, setIsVisible] = useState(true);
  const [exitDestination, setExitDestination] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  const handleExit = (path: string) => {
    setExitDestination(path);
    setIsVisible(false);
  };
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
    setIdentifier(val);
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
        if (!identifier) {
          setError('Silakan masukkan email Anda terlebih dahulu.');
          setLoading(false);
          return;
        }
        await resetPassword(identifier);
        toast.success('Link reset password telah dikirim ke email Anda.');
        setIsForgotPassword(false);
      } else if (isRegistering) {
        await emailRegister(identifier, password, name, role);
        toast.success('Berhasil mendaftar dan masuk!');
        handleExit('/dashboard');
      } else {
        await emailLogin(identifier, password);
        toast.success('Berhasil masuk!');
        handleExit('/dashboard');
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'custom/user-not-found') {
        setError('Email belum terdaftar, silakan daftar dulu atau gunakan login Google.');
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
    try {
      await login(role, isRegistering);
      toast.success('Berhasil masuk dengan Google!');
      handleExit('/dashboard');
    } catch (err: any) {
      console.error("Google Login Error:", err);
      setError(`Gagal masuk dengan Google: ${err.message || err.code || 'Kesalahan tidak diketahui'}`);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-[#1E1E2F] font-sans text-slate-900 dark:text-[#F5F5F5] flex items-center justify-center min-h-screen relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-dark-accent-light/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#ffafd5]/20 rounded-full blur-[120px]"></div>
        <img 
          className="w-full h-full object-cover opacity-20 grayscale" 
          alt="Campus architecture" 
          src="https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=2086&auto=format&fit=crop" 
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
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                y: 0,
                transition: { type: "spring", damping: 25, stiffness: 300 }
              }}
              exit={{ 
                opacity: 0, 
                scale: 0.96, 
                y: 16,
                transition: { duration: 0.25, ease: "easeInOut" }
              }}
              className="bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 w-[95vw] max-w-md rounded-2xl shadow-sm border border-slate-200 dark:border-[#3F3F5A]/20 overflow-hidden relative max-h-[95vh] flex flex-col"
            >
              
              {/* Back Button */}
              <div className="absolute top-6 left-6 z-10">
                <button onClick={() => handleExit('/')} className="flex items-center text-slate-600 dark:text-[#B4B4C8] hover:text-brand-700 dark:text-brand-dark-accent transition-all duration-300 group">
                  <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                </button>
              </div>

          {/* Modal Content */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-6 sm:p-8 overflow-y-auto flex-1">
              {/* Header */}
              <div className="text-center mb-6 pt-4">
                <h1 className="text-2xl font-extrabold text-[#3b134b] dark:text-[#F5F5F5] mb-2 tracking-tight">
                  {isForgotPassword ? 'Reset Kata Sandi' : isRegistering ? 'Daftar Akun Baru' : 'Selamat Datang Kembali'}
                </h1>
                <p className="text-slate-500 dark:text-[#B4B4C8] text-sm italic">
                  {isForgotPassword ? 'Masukkan email Anda untuk menerima link reset kata sandi' : isRegistering ? 'Buat akun untuk mengakses layanan kampus' : 'Masuk untuk mengelola jadwal kampus Anda'}
                </p>
              </div>

              {/* Role Selector */}
              {!isForgotPassword && (
                <div className="bg-slate-100 dark:bg-[#32324A] p-1 rounded-lg flex mb-8">
                  {(['mahasiswa', 'dosen', 'admin'] as Role[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={cn(
                        "flex-1 py-2 px-3 text-sm font-semibold rounded-md transition-all duration-200 capitalize",
                        role === r 
                          ? "bg-[#A78BFA] text-white shadow-sm" 
                          : "text-slate-500 dark:text-[#B4B4C8] hover:text-brand-700 dark:text-brand-dark-accent"
                      )}
                    >
                      {r === 'admin' ? 'Staf' : r}
                    </button>
                  ))}
                </div>
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
              <div className="space-y-5">
                <AnimatePresence>
                  {isRegistering && (
                    <motion.div 
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

                <div className="space-y-1.5">
                  <label htmlFor="identifier" className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#B4B4C8]">{getIdentifierLabel()}</label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-700 dark:text-brand-dark-accent transition-colors" aria-hidden="true" />
                    <input 
                      id="identifier"
                      type="text"
                      required
                      autoFocus={!isRegistering}
                      value={identifier}
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
                </div>

                <AnimatePresence>
                  {!isForgotPassword && (
                    <motion.div 
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
              </div>

              {/* SSO Options */}
              {!isForgotPassword && (
                <>
                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-[#3F3F5A]/30"></div></div>
                    <div className="relative flex justify-center text-xs uppercase tracking-widest">
                      <span className="bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 px-4 text-slate-400">
                        {isRegistering ? 'Atau daftar dengan' : 'Atau masuk dengan'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button 
                      onClick={handleGoogleLogin}
                      disabled={loading || googleLoading}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white dark:bg-[#2D2D44] border border-slate-200 dark:border-[#3F3F5A]/30 rounded-lg hover:bg-slate-50 dark:hover:bg-[#32324A] hover:scale-[1.02] hover:shadow-[0_0_10px_rgba(209,166,255,0.2)] active:scale-[0.98] transition-all group disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-dark-accent-light focus:ring-offset-[#20082b]"
                      aria-label="Masuk dengan Google"
                    >
                      {googleLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                          <span className="text-sm font-bold text-slate-700 dark:text-[#F5F5F5]">
                            Menghubungkan ke Google...
                          </span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                          </svg>
                          <span className="text-sm font-bold text-slate-700 dark:text-[#F5F5F5]">
                            Google
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Sticky Action Footer */}
            <div className="p-6 border-t border-slate-200 dark:border-[#3F3F5A]/30 bg-white dark:bg-[#27273A] shrink-0">
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
            </div>
          </form>

          {/* Footer */}
          <div className="bg-slate-50 dark:bg-[#32324A]/50 p-6 text-center border-t border-slate-100 dark:border-[#3F3F5A]/20">
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
          </div>
        </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
