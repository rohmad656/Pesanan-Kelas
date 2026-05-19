import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Mail, ArrowRight, Loader2, RefreshCw, LogOut, CheckCircle2, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';
import { PROJECT_NAME } from '../constants';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

export default function VerifyEmail() {
  const { user, profile, resendVerification, logout, loading } = useAuth();
  const { setTheme } = useTheme();
  const navigate = useNavigate();
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    setTheme('dark');
  }, [setTheme]);

  // Redirect if already verified or not logged in
  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/login');
      } else {
        const isVerified = user.emailVerified || user.providerData.some(p => p.providerId === 'google.com');
        if (isVerified) {
          navigate('/dashboard');
        }
      }
    }
  }, [user, loading, navigate]);

  const handleResend = async () => {
    if (countdown > 0) return;
    setIsResending(true);
    try {
      await resendVerification();
      setCountdown(60);
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengirim ulang email verifikasi');
    } finally {
      setIsResending(false);
    }
  };

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleManualCheck = async () => {
    if (!user) return;
    setIsResending(true);
    try {
      await user.reload();
      const isVerified = user.emailVerified || user.providerData.some(p => p.providerId === 'google.com');
      if (isVerified) {
        toast.success('Email berhasil diverifikasi!');
        navigate('/dashboard');
      } else {
        toast.error('Email belum diverifikasi. Silakan cek kotak masuk atau folder spam Anda.');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan saat memeriksa status.');
    } finally {
      setIsResending(false);
    }
  };

  if (loading) return null;
  if (!user) return <Navigate to="/login" />;

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
        className="bg-white dark:bg-[#27273A] w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-[#3F3F5A]/30 overflow-hidden relative z-10"
      >
        <div className="p-8 sm:p-10">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-brand-dark-accent-light/20 rounded-full flex items-center justify-center mx-auto mb-6 relative">
              <Mail className="w-10 h-10 text-brand-dark-accent" />
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute -top-1 -right-1"
              >
                <ShieldAlert className="w-6 h-6 text-brand-400 fill-brand-400/20" />
              </motion.div>
            </div>
            <h1 className="text-2xl font-extrabold mb-3 tracking-tight">Verifikasi Email Anda</h1>
            <p className="text-slate-500 dark:text-[#B4B4C8] text-sm leading-relaxed">
              Kami telah mengirimkan tautan verifikasi ke:
              <br />
              <span className="text-brand-dark-accent font-bold break-all">{user.email}</span>
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                Verifikasi diperlukan untuk mengakses seluruh fitur {PROJECT_NAME}, termasuk pemesanan ruangan dan pelaporan.
              </p>
            </div>

            <button 
              onClick={handleManualCheck}
              disabled={isResending}
              className="w-full py-4 bg-brand-dark-accent-light hover:bg-brand-dark-accent-hover text-brand-dark-on-accent font-bold rounded-xl shadow-lg shadow-brand-500/20 hover:shadow-brand-500/40 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {isResending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Konfirmasi Sudah Verifikasi
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <button 
              onClick={handleResend}
              disabled={isResending || countdown > 0}
              className="w-full py-3 bg-slate-100 dark:bg-[#32324A] hover:bg-slate-200 dark:hover:bg-[#3b3b55] text-slate-700 dark:text-[#B4B4C8] font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-xs"
            >
              <RefreshCw className={cn("w-4 h-4", isResending && "animate-spin")} />
              {countdown > 0 ? `Kirim ulang dalam ${countdown}s` : 'Kirim Ulang Link Verifikasi'}
            </button>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-100 dark:border-[#3F3F5A]/20 text-center">
            <button 
              onClick={() => logout()}
              className="text-xs text-slate-500 hover:text-slate-700 dark:text-[#B4B4C8] dark:hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              Gunakan Akun Lain
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
