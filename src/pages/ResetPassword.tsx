import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { confirmNewPassword, verifyResetCode } = useAuth();
  
  const oobCode = searchParams.get('oobCode');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const verifyCode = async () => {
      if (!oobCode) {
        setError('Kode reset tidak valid atau sudah kedaluwarsa.');
        setVerifying(false);
        return;
      }

      try {
        const userEmail = await verifyResetCode(oobCode);
        setEmail(userEmail);
      } catch (err: any) {
        console.error(err);
        setError('Link reset password tidak valid atau sudah kedaluwarsa. Silakan minta link baru.');
      } finally {
        setVerifying(false);
      }
    };

    verifyCode();
  }, [oobCode, verifyResetCode]);

  const handleSubmit = async (e: React.FormEvent) => {
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
      setSuccess(true);
      toast.success('Kata sandi berhasil diperbarui!');
      setTimeout(() => navigate('/login'), 3000);
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
                onClick={() => navigate('/login')}
                className="flex items-center justify-center gap-2 text-brand-700 dark:text-brand-dark-accent font-semibold hover:underline w-full"
              >
                <ArrowLeft className="w-4 h-4" /> Kembali ke Login
              </button>
            </div>
          ) : success ? (
            <div className="text-center space-y-6">
              <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-800/30">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-[#F5F5F5]">Berhasil!</h2>
                <p className="text-slate-600 dark:text-[#B4B4C8] text-sm mt-2">
                  Kata sandi Anda telah diperbarui. Anda akan diarahkan ke halaman login dalam beberapa detik.
                </p>
              </div>
              <button 
                onClick={() => navigate('/login')}
                className="w-full py-3 bg-brand-700 dark:bg-brand-dark-accent text-white font-bold rounded-xl hover:bg-brand-800 dark:hover:bg-brand-dark-accent-hover transition-all"
              >
                Masuk Sekarang
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
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
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Memperbarui...
                  </>
                ) : (
                  'Simpan Kata Sandi Baru'
                )}
              </button>

              <button 
                type="button"
                onClick={() => navigate('/login')}
                className="w-full text-sm text-slate-500 dark:text-[#B4B4C8] hover:text-brand-700 dark:hover:text-brand-dark-accent transition-colors"
              >
                Batal dan Kembali
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
