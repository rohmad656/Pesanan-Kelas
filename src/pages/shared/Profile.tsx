import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  User, 
  Mail, 
  Lock, 
  Bell, 
  Save, 
  AlertTriangle, 
  CheckCircle2, 
  Eye, 
  EyeOff,
  ShieldCheck,
  RefreshCw,
  Clock,
  XCircle,
  HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  doc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import RoleChangeModal from '../../components/RoleChangeModal';
import { cn } from '../../lib/utils';

export default function Profile() {
  const { profile, user, updateUserProfile, resendVerification } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [nim, setNim] = useState(profile?.nim || '');
  const [whatsappNumber, setWhatsappNumber] = useState(profile?.whatsappNumber || (profile as any)?.whatsapp || '');
  const [division, setDivision] = useState(profile?.division || '');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [notifPortal, setNotifPortal] = useState(profile?.notifPortal ?? true);
  const [notifEmail, setNotifEmail] = useState(profile?.notifEmail ?? true);
  const [notifWhatsApp, setNotifWhatsApp] = useState(profile?.notifWhatsApp ?? false);
  const [reminderMinutes, setReminderMinutes] = useState(profile?.reminderMinutes ?? 30);
  const [roleRequests, setRoleRequests] = useState<any[]>([]);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [whatsappError, setWhatsappError] = useState('');
  const [nimError, setNimError] = useState('');

  // Sync state with profile from context (Firestore single source of truth)
  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setEmail(profile.email || '');
      setNim(profile.nim || '');
      setWhatsappNumber(profile.whatsappNumber || (profile as any).whatsapp || '');
      setDivision(profile.division || '');
      setNotifPortal(profile.notifPortal ?? true);
      setNotifEmail(profile.notifEmail ?? true);
      setNotifWhatsApp(profile.notifWhatsApp ?? false);
      setReminderMinutes(profile.reminderMinutes ?? 30);
    }
  }, [profile]);

  useEffect(() => {
    if (!profile?.email) return;
    
    const q = query(
      collection(db, 'role_change_requests'), 
      where('email', '==', profile.email),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRoleRequests(data);
    });
    
    return () => unsubscribe();
  }, [profile?.email]);

  // Format and Validate WhatsApp on change
  const handleWhatsappChange = (value: string) => {
    let formatted = value;
    if (value.startsWith('08')) {
      formatted = '+628' + value.substring(2);
    } 
    formatted = formatted.replace(/[^\d+]/g, '');
    setWhatsappNumber(formatted);

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

  // Validate NIM/NIP on change
  const handleNimChange = (value: string) => {
    setNim(value);
    if (!value) {
      setNimError('');
      return;
    }

    if (profile?.role === 'mahasiswa') {
      if (!/^\d+$/.test(value)) {
        setNimError('NIM harus berupa angka saja.');
      } else if (value.length !== 12) {
        setNimError('NIM harus tepat 12 digit.');
      } else {
        setNimError('');
      }
    } else if (profile?.role === 'dosen') {
      if (!/^\d+$/.test(value)) {
        setNimError('NIP harus berupa angka saja.');
      } else if (value.length !== 18) {
        setNimError('NIP harus tepat 18 digit.');
      } else {
        setNimError('');
      }
    } else {
      setNimError('');
    }
  };

  const isFormValid = name && nim && !nimError && whatsappNumber && !whatsappError;
  const isEmailVerified = user?.emailVerified;

  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      await resendVerification();
    } catch (error: any) {
      toast.error(error.message || 'Gagal mengirim ulang verifikasi');
    } finally {
      setIsResending(false);
    }
  };

  // Notification Status Text
  const getActiveChannelsText = () => {
    const active = [];
    if (notifPortal) active.push('Portal');
    if (notifEmail) active.push('Email');
    if (notifWhatsApp && whatsappNumber && !whatsappError) active.push('WhatsApp');
    
    if (active.length === 0) return 'Tidak ada kanal aktif. Anda tidak akan menerima notifikasi.';
    return `Notifikasi akan dikirim ke: ${active.join(', ')}.`;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    // Safety check: at least one channel MUST be active
    if (!notifPortal && !notifEmail && (!notifWhatsApp || !whatsappNumber || whatsappError)) {
      toast.error('Minimal satu kanal notifikasi harus aktif!');
      return;
    }

    setIsSaving(true);
    try {
      // Update profile data in Firestore
      await updateUserProfile({
        name,
        email,
        nim,
        whatsappNumber,
        division,
        notifPortal,
        notifEmail,
        notifWhatsApp,
        reminderMinutes
      });

      // Automatic Sync to Help Center if Staff/Admin
      if (profile?.role === 'admin' || profile?.role === 'staff') {
        if (whatsappNumber && !whatsappError) {
          try {
            await setDoc(doc(db, 'admin_contacts', profile.id), {
              name: name,
              whatsapp: whatsappNumber,
              isActive: true,
              updatedAt: serverTimestamp(),
              staffId: profile.id
            }, { merge: true });
          } catch (syncError) {
            console.error("Auto-sync to admin_contacts failed:", syncError);
            // Don't block the main save if sync fails
          }
        }
      }

      // Update password if provided
      if (newPassword && newPassword.trim() !== '') {
        if (newPassword.length < 6) {
          toast.error('Kata sandi minimal 6 karakter');
          setIsSaving(false);
          return;
        }
        const { updatePassword } = await import('firebase/auth');
        const { auth } = await import('../../lib/firebase');
        if (auth.currentUser) {
          await updatePassword(auth.currentUser, newPassword);
          setNewPassword('');
          toast.success('Profil dan kata sandi berhasil diperbarui');
        }
      } else {
        toast.success('Profil berhasil diperbarui');
      }
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        toast.error('Sesi Anda telah berakhir. Silakan keluar dan masuk kembali untuk mengubah kata sandi atau email.');
      } else {
        toast.error(error.message || 'Gagal memperbarui profil');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const getIdentifierLabel = () => {
    if (profile?.role === 'mahasiswa') return 'NIM';
    if (profile?.role === 'dosen') return 'NIP';
    return 'ID Staf';
  };

  const isCampusEmail = profile?.email?.endsWith('@campus.ac.id');

  const handleCancelEmailChange = async () => {
    if (!profile) return;
    try {
      await updateUserProfile({ pendingEmail: '' });
      toast.success('Permintaan ubah email dibatalkan.');
    } catch (error: any) {
      toast.error('Gagal membatalkan permintaan.');
    }
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F5F5F5]">Profil & Pengaturan Akun</h1>
        {profile?.profileCompleted ? (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-500 rounded-full border border-green-500/20 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" /> Profil Lengkap
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 text-yellow-500 rounded-full border border-yellow-500/20 text-xs font-bold">
            <AlertTriangle className="w-4 h-4" /> Profil Belum Lengkap
          </div>
        )}
      </div>

      {!profile?.profileCompleted && profile?.role !== 'admin' && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-start gap-4">
          <div className="p-2 bg-yellow-500/20 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-yellow-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-yellow-600 dark:text-yellow-400">Lengkapi Profil Anda</h3>
            <p className="text-xs text-yellow-600/80 dark:text-yellow-400/80 mt-1">
              Anda harus melengkapi Nama, NIM/NIP, dan Nomor WhatsApp sebelum dapat melakukan pemesanan ruangan.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 border border-slate-200 dark:border-[#3F3F5A]/30 rounded-2xl p-6 flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full bg-brand-100 dark:bg-[#32324A] border-2 border-brand-400 dark:border-brand-dark-accent flex items-center justify-center text-3xl font-bold text-brand-700 dark:text-brand-dark-accent overflow-hidden">
              {profile?.photoURL ? (
                <img 
                  src={profile.photoURL} 
                  alt={profile.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                profile?.name.charAt(0).toUpperCase()
              )}
            </div>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-[#F5F5F5]">{profile?.name}</h2>
          <p className="text-slate-600 dark:text-[#B4B4C8] text-sm capitalize">
            {profile?.role === 'admin' || profile?.role === 'staff' ? 'Admin/Staff' : profile?.role}
          </p>
          
          <div className="mt-6 w-full space-y-2 text-left">
            <div className="p-3 bg-slate-50 dark:bg-[#32324A] rounded-xl border border-slate-100 dark:border-[#3F3F5A]/30">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center justify-between">
                <span>Status Email</span>
                {!isEmailVerified && (
                  <button 
                    disabled={isResending}
                    onClick={handleResendVerification}
                    className="text-[9px] text-brand-600 dark:text-brand-dark-accent hover:underline disabled:opacity-50 transition-colors"
                  >
                    {isResending ? 'Mengirim...' : 'Kirim Ulang Link'}
                  </button>
                )}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700 dark:text-[#F5F5F5] truncate mr-2">{profile?.email}</span>
                {isEmailVerified ? (
                  <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-[10px] font-bold rounded border border-green-500/20 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Terverifikasi
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-[10px] font-bold rounded border border-red-500/20 flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" /> Belum Verif
                  </span>
                )}
              </div>
              {!isEmailVerified && !profile?.pendingEmail && (
                <p className="text-[9px] text-red-500 mt-1.5 leading-tight italic">
                  *Email harus terverifikasi untuk dapat melakukan pemesanan ruangan dan laporan.
                </p>
              )}
              {profile?.pendingEmail && (
                <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase mb-1 flex items-center justify-between">
                    <span>Menunggu Verifikasi</span>
                    <button 
                      onClick={handleCancelEmailChange}
                      className="text-[9px] text-red-500 hover:underline"
                    >
                      Batal
                    </button>
                  </p>
                  <p className="text-[11px] font-bold text-slate-700 dark:text-[#F5F5F5] truncate">{profile.pendingEmail}</p>
                  <p className="text-[9px] text-slate-500 mt-1 italic leading-tight">
                    Link verifikasi telah dikirim ke alamat di atas. Klik link tersebut untuk mengganti email akun Anda.
                  </p>
                </div>
              )}
            </div>
            <div className="p-3 bg-slate-50 dark:bg-[#32324A] rounded-xl border border-slate-100 dark:border-[#3F3F5A]/30">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Status {getIdentifierLabel()}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700 dark:text-[#F5F5F5]">
                  {profile?.nim && profile.nim.trim() !== "" ? profile.nim : 'Belum diisi'}
                </span>
                {profile?.nim && profile.nim.trim() !== "" ? (
                  <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-[10px] font-bold rounded border border-green-500/20">Aktif</span>
                ) : (
                  <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-[10px] font-bold rounded border border-red-500/20">Kosong</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Settings Form */}
        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 border border-slate-200 dark:border-[#3F3F5A]/30 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-[#F5F5F5] mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-brand-700 dark:text-brand-dark-accent" /> Informasi Dasar
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Nama Lengkap {!profile?.profileCompleted && <span className="text-red-500">*</span>}
                </label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#1E1E2F] border border-slate-200 dark:border-[#3F3F5A]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 dark:border-brand-dark-accent text-slate-900 dark:text-[#F5F5F5] transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Email {!profile?.profileCompleted && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#1E1E2F] border border-slate-200 dark:border-[#3F3F5A]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 dark:border-brand-dark-accent text-slate-900 dark:text-[#F5F5F5] transition-all"
                  />
                </div>
                {isCampusEmail && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-bold italic">
                    *Ganti email default dengan email pribadi Anda agar lebih fleksibel.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {getIdentifierLabel()} {!profile?.profileCompleted && <span className="text-red-500">*</span>}
                </label>
                <input 
                  type="text" 
                  required
                  value={nim}
                  onChange={(e) => handleNimChange(e.target.value)}
                  placeholder={`Masukkan ${getIdentifierLabel()}`}
                  className={cn(
                    "w-full px-4 py-2.5 bg-slate-50 dark:bg-[#1E1E2F] border rounded-xl focus:outline-none transition-all",
                    nimError ? "border-red-500 text-red-500 ring-1 ring-red-500/20" : "border-slate-200 dark:border-[#3F3F5A]/30 focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 dark:border-brand-dark-accent text-slate-900 dark:text-[#F5F5F5]"
                  )}
                />
                {nimError && (
                  <p className="text-[10px] text-red-500 mt-1 font-extrabold">{nimError}</p>
                )}
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 italic font-medium">
                  *Anda bisa login menggunakan {getIdentifierLabel()} ini.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Nomor WhatsApp {!profile?.profileCompleted && <span className="text-red-500">*</span>}
                </label>
                <input 
                  type="tel" 
                  required
                  value={whatsappNumber}
                  onChange={(e) => handleWhatsappChange(e.target.value)}
                  placeholder="+628..."
                  className={cn(
                    "w-full px-4 py-2.5 bg-slate-50 dark:bg-[#1E1E2F] border rounded-xl focus:outline-none transition-all",
                    whatsappError ? "border-red-500 text-red-500 ring-1 ring-red-500/20" : "border-slate-200 dark:border-[#3F3F5A]/30 focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 dark:border-brand-dark-accent text-slate-900 dark:text-[#F5F5F5]"
                  )}
                />
                {whatsappError && (
                  <p className="text-[10px] text-red-500 mt-1 font-extrabold">{whatsappError}</p>
                )}
              </div>
              {profile?.role !== 'mahasiswa' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Jabatan / Divisi</label>
                  <input 
                    type="text" 
                    value={division}
                    onChange={(e) => setDivision(e.target.value)}
                    placeholder="Contoh: Dosen Teknik Informatika"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#1E1E2F] border border-slate-200 dark:border-[#3F3F5A]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 dark:border-brand-dark-accent text-slate-900 dark:text-[#F5F5F5] transition-all"
                  />
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-[#3F3F5A]/30">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-[#F5F5F5] mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-pink-600 dark:text-[#ffafd5]" /> Keamanan
              </h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Kata Sandi Baru</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Biarkan kosong jika tidak ingin mengubah"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#1E1E2F] border border-slate-200 dark:border-[#3F3F5A]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 dark:border-brand-dark-accent text-slate-900 dark:text-[#F5F5F5] pr-12 transition-all placeholder:text-slate-400/70"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-[#F5F5F5] transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                      title={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-[#3F3F5A]/30">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-[#F5F5F5] mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600 dark:text-[#86d2ff]" /> Preferensi Notifikasi
              </h3>
              <div className="space-y-5">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold text-slate-700 dark:text-[#F5F5F5]">Kanal Notifikasi</p>
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors",
                      (!notifPortal && !notifEmail && !notifWhatsApp) ? "bg-red-500/10 text-red-500" : "bg-brand-500/10 text-brand-500 dark:text-brand-dark-accent"
                    )}>
                      {getActiveChannelsText()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <label className="group flex flex-col p-3 border border-slate-200 dark:border-[#3F3F5A]/30 rounded-xl hover:border-brand-400 dark:hover:border-brand-dark-accent transition-all cursor-pointer bg-white dark:bg-[#27273A]">
                      <div className="flex items-center gap-3 mb-1">
                        <input 
                          type="checkbox" 
                          checked={notifPortal}
                          onChange={(e) => setNotifPortal(e.target.checked)}
                          className="w-4 h-4 rounded border-brand-dark-border-strong text-brand-700 dark:text-brand-dark-accent focus:ring-brand-dark-accent-light bg-slate-50 dark:bg-[#1E1E2F]" 
                        />
                        <span className="text-slate-900 dark:text-[#F5F5F5] text-sm font-semibold">Portal</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-[#B4B4C8] ml-7">Notifikasi muncul di dashboard aplikasi.</span>
                    </label>

                    <label className="group flex flex-col p-3 border border-slate-200 dark:border-[#3F3F5A]/30 rounded-xl hover:border-brand-400 dark:hover:border-brand-dark-accent transition-all cursor-pointer bg-white dark:bg-[#27273A]">
                      <div className="flex items-center gap-3 mb-1">
                        <input 
                          type="checkbox" 
                          checked={notifEmail}
                          onChange={(e) => setNotifEmail(e.target.checked)}
                          className="w-4 h-4 rounded border-brand-dark-border-strong text-brand-700 dark:text-brand-dark-accent focus:ring-brand-dark-accent-light bg-slate-50 dark:bg-[#1E1E2F]" 
                        />
                        <span className="text-slate-900 dark:text-[#F5F5F5] text-sm font-semibold">Email</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-[#B4B4C8] ml-7">Pesan dikirim ke inbox email terdaftar.</span>
                    </label>

                    <label className={cn(
                      "group flex flex-col p-3 border border-slate-200 dark:border-[#3F3F5A]/30 rounded-xl hover:border-brand-400 dark:hover:border-brand-dark-accent transition-all cursor-pointer bg-white dark:bg-[#27273A]",
                      whatsappError && "opacity-60 grayscale cursor-not-allowed"
                    )}>
                      <div className="flex items-center gap-3 mb-1">
                        <input 
                          type="checkbox" 
                          checked={notifWhatsApp}
                          disabled={!!whatsappError}
                          onChange={(e) => setNotifWhatsApp(e.target.checked)}
                          className="w-4 h-4 rounded border-brand-dark-border-strong text-brand-700 dark:text-brand-dark-accent focus:ring-brand-dark-accent-light bg-slate-50 dark:bg-[#1E1E2F] disabled:opacity-50" 
                        />
                        <span className="text-slate-900 dark:text-[#F5F5F5] text-sm font-semibold">WhatsApp</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-[#B4B4C8] ml-7">
                        {whatsappError ? 'Nomor WA belum valid.' : 'Pesan dikirim ke nomor WA terdaftar.'}
                      </span>
                    </label>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-700 dark:text-[#F5F5F5]">Pengingat Jadwal (Reminder)</p>
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" title="Sistem akan mengirimkan pengingat sebelum waktu booking dimulai." />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-600 dark:text-[#B4B4C8] text-sm">Kirim pengingat</span>
                    <select 
                      value={reminderMinutes}
                      onChange={(e) => setReminderMinutes(parseInt(e.target.value))}
                      className="px-3 py-1.5 bg-white dark:bg-[#1E1E2F] border border-slate-200 dark:border-[#3F3F5A]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-dark-accent-light text-slate-900 dark:text-[#F5F5F5] text-sm shadow-sm"
                    >
                      <option value="5">5 menit</option>
                      <option value="15">15 menit</option>
                      <option value="30">30 menit</option>
                      <option value="60">1 jam</option>
                      <option value="120">2 jam</option>
                      <option value="1440">1 hari</option>
                    </select>
                    <span className="text-slate-600 dark:text-[#B4B4C8] text-sm">sebelum jadwal dimulai</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 flex justify-end">
              <button 
                type="submit"
                disabled={isSaving || !isFormValid}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-dark-accent-light text-brand-dark-on-accent font-bold rounded-xl hover:bg-brand-dark-accent-hover shadow-lg shadow-brand-500/20 hover:shadow-brand-500/40 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </div>

        {/* Role Management Card */}
        {profile?.role !== 'admin' && (
          <div className="bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 border border-slate-200 dark:border-[#3F3F5A]/30 rounded-2xl p-6 space-y-4 h-fit">
            <h3 className="text-sm font-bold text-slate-900 dark:text-[#F5F5F5] uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand-600 dark:text-brand-dark-accent" /> Manajemen Peran
            </h3>
            
            <p className="text-xs text-slate-500 dark:text-[#B4B4C8] leading-relaxed">
              Jika peran akun Anda saat ini (<strong>{profile.role.toUpperCase()}</strong>) tidak sesuai, Anda dapat mengajukan permintaan perubahan ke Admin Kampus.
            </p>

            <button
              onClick={() => setIsRoleModalOpen(true)}
              disabled={roleRequests.some(r => r.status === 'pending')}
              className="w-full py-2.5 bg-slate-100 dark:bg-[#32324A] text-brand-700 dark:text-brand-dark-accent font-bold rounded-xl hover:bg-brand-50 dark:hover:bg-[#3F3F5A] transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 border border-brand-100 dark:border-brand-900/30 shadow-sm hover:shadow-md disabled:opacity-50 disabled:scale-100"
            >
              <RefreshCw className="w-4 h-4" />
              Ajukan Perubahan Peran
            </button>

            {roleRequests.length > 0 && (
              <div className="pt-4 space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Riwayat Permintaan</p>
                <div className="space-y-2">
                  {roleRequests.slice(0, 3).map((req) => (
                    <div key={req.id} className="p-3 bg-slate-50 dark:bg-[#1E1E2F] rounded-xl border border-slate-100 dark:border-[#3F3F5A]/20">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{req.requestedRole}</span>
                        <div className="flex items-center gap-1.5">
                          {req.status === 'pending' ? (
                            <Clock className="w-3 h-3 text-amber-500" />
                          ) : req.status === 'approved' ? (
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                          ) : (
                            <XCircle className="w-3 h-3 text-red-500" />
                          )}
                          <span className={cn(
                            "text-[10px] font-bold uppercase",
                            req.status === 'pending' ? "text-amber-500" :
                            req.status === 'approved' ? "text-green-500" :
                            "text-red-500"
                          )}>
                            {req.status === 'pending' ? 'Menunggu' : req.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {req.createdAt ? new Date(req.createdAt.toMillis()).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Baru'}
                      </p>
                      {req.status === 'rejected' && req.rejectReason && (
                        <p className="mt-2 text-[10px] text-red-500 italic border-l-2 border-red-500/30 pl-2">
                          "{req.rejectReason}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <RoleChangeModal 
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        userEmail={profile?.email || ''}
        currentRole={profile?.role || ''}
      />
    </div>
  );
}
