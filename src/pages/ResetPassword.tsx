import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { confirmNewPassword, verifyResetCode } = useAuth();
  
  const initialOobCode = searchParams.get('oobCode') || '';
  const [oobCode, setOobCode] = useState(initialOobCode);
  const [manualCode, setManualCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(!!initialOobCode);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isCodeValidated, setIsCodeValidated] = useState(false);

  useEffect(() => {
    const verifyInitialCode = async () => {
      if (!initialOobCode) return;

      try {
        const userEmail = await verifyResetCode(initialOobCode);
        setEmail(userEmail);
        setIsCodeValidated(true);
      } catch (err: any) {
        console.error(err);
        setError('Link reset password tidak valid atau sudah kedaluwarsa.');
      } finally {
        setVerifying(false);
      }
    };

    verifyInitialCode();
  }, [initialOobCode, verifyResetCode]);

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const codeToVerify = manualCode || oobCode;
    if (!codeToVerify) return;

    setLoading(true);
    setError('');
    try {
      const userEmail = await verifyResetCode(codeToVerify);
      setEmail(userEmail);
      setOobCode(codeToVerify);
      setIsCodeValidated(true);
      toast.success('Kode valid! Silakan setel sandi baru.');
    } catch (err: any) {
      setError('Kode/token tidak valid atau sudah kedaluwarsa.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oobCode) return;

    if (password.length < 6) {
      setError('Kata sandi minimal 6 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await confirmNewPassword(oobCode, password);
      
      // Notify user via email
      try {
        await fetch('/api/notify-password-changed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
      } catch (notifyErr) {
        console.warn('Failed to send password change notification:', notifyErr);
      }

      setSuccess(true);
      toast.success('Kata sandi berhasil diperbarui!');
      setTimeout(() => navigate('/login'), 4000);
    } catch (err: any) {
      console.error(err);
      setError('Gagal memperbarui kata sandi. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#1E1E2F] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-brand-700 dark:text-brand-dark-accent animate-spin mx-auto" />
          <p className="text-slate-600 dark:text-[#B4B4C8]">Memverifikasi link reset...</p>
        </div>
      </div>
    );
  }

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
        className="bg-white dark:bg-[#27273A] w-full max-w-md rounded-2xl shadow-xl border border-slate-200 dark:border-[#3F3F5A]/20 overflow-hidden relative z-10"
      >
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-brand-100 dark:bg-[#32324A] rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-brand-700 dark:text-brand-dark-accent" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F5F5F5]">Atur Ulang Kata Sandi</h1>
            {email && <p className="text-slate-500 dark:text-[#B4B4C8] text-sm mt-1">Untuk akun: <span className="font-semibold">{email}</span></p>}
          </div>

          {error ? (
            <div className="space-y-6 text-center">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-left">{error}</p>
              </div>
              <button 
                onClick={() => { setError(''); manualCode ? setIsCodeValidated(false) : navigate('/login'); }}
                className="flex items-center justify-center gap-2 text-brand-700 dark:text-brand-dark-accent font-semibold hover:underline w-full"
              >
                <ArrowLeft className="w-4 h-4" /> {manualCode ? 'Coba Lagi' : 'Kembali ke Login'}
              </button>
            </div>
          ) : success ? (
            <div className="text-center space-y-6">
              <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-800/30">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-[#F5F5F5]">Sandi Berhasil Diubah!</h2>
                <p className="text-slate-600 dark:text-[#B4B4C8] text-sm mt-3 leading-relaxed">
                  Kata sandi Anda telah diperbarui. Sistem telah mengirimkan notifikasi konfirmasi ke email Anda secara otomatis.
                </p>
                <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800/30">
                  <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Mengalihkan ke login...
                  </p>
                </div>
              </div>
              <button 
                onClick={() => navigate('/login')}
                className="w-full py-3 bg-brand-700 dark:bg-brand-dark-accent text-white font-bold rounded-xl hover:bg-brand-800 dark:hover:bg-brand-dark-accent-hover transition-all"
              >
                Masuk Sekarang
              </button>
            </div>
          ) : !isCodeValidated ? (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div className="p-4 bg-slate-50 dark:bg-[#2D2D44] border border-slate-200 dark:border-[#3F3F5A]/30 rounded-xl">
                <p className="text-sm text-slate-600 dark:text-[#B4B4C8] leading-relaxed">
                  Silakan masukkan kode/token verifikasi yang telah dikirimkan ke email Anda untuk melanjutkan proses pembaruan kata sandi.
                </p>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#B4B4C8]">Kode Verifikasi</label>
                <input 
                  type="text"
                  required
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-[#2D2D44] border border-transparent dark:border-[#3F3F5A]/30 rounded-lg focus:outline-none focus:border-brand-400 dark:border-brand-dark-accent focus:ring-1 focus:ring-brand-dark-accent-light text-slate-900 dark:text-[#F5F5F5] placeholder:text-slate-400 transition-all font-mono"
                  placeholder="Masukkan kode..."
                />
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-brand-700 dark:bg-brand-dark-accent text-white font-bold rounded-xl hover:bg-brand-800 dark:hover:bg-brand-dark-accent-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verifikasi Kode'}
              </button>

              <button 
                type="button"
                onClick={() => navigate('/login')}
                className="w-full text-sm text-slate-500 dark:text-[#B4B4C8] hover:text-brand-700 dark:hover:text-brand-dark-accent transition-colors"
              >
                Kembali ke Login
              </button>
            </form>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#B4B4C8]">Kata Sandi Baru</label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-700 dark:text-brand-dark-accent transition-colors" />
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-[#2D2D44] border border-transparent dark:border-[#3F3F5A]/30 rounded-lg focus:outline-none focus:border-brand-400 dark:border-brand-dark-accent focus:ring-1 focus:ring-brand-dark-accent-light text-slate-900 dark:text-[#F5F5F5] placeholder:text-slate-400 transition-all"
                      placeholder="Minimal 6 karakter"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-700 dark:text-brand-dark-accent transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#B4B4C8]">Konfirmasi Kata Sandi</label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-700 dark:text-brand-dark-accent transition-colors" />
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-[#2D2D44] border border-transparent dark:border-[#3F3F5A]/30 rounded-lg focus:outline-none focus:border-brand-400 dark:border-brand-dark-accent focus:ring-1 focus:ring-brand-dark-accent-light text-slate-900 dark:text-[#F5F5F5] placeholder:text-slate-400 transition-all"
                      placeholder="Ulangi kata sandi"
                    />
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-brand-700 dark:bg-brand-dark-accent text-white font-bold rounded-xl hover:bg-brand-800 dark:hover:bg-brand-dark-accent-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Simpan Kata Sandi Baru'}
              </button>

              <button 
                type="button"
                onClick={() => setIsCodeValidated(false)}
                className="w-full text-sm text-slate-500 dark:text-[#B4B4C8] hover:text-brand-700 dark:hover:text-brand-dark-accent transition-colors"
              >
                Batal
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
