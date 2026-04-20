import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User, Mail, Lock, Bell, Save, AlertTriangle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Profile() {
  const { profile, updateUserProfile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [nim, setNim] = useState(profile?.nim || '');
  const [whatsappNumber, setWhatsappNumber] = useState(profile?.whatsappNumber || (profile as any)?.whatsapp || '');
  const [division, setDivision] = useState(profile?.division || '');
  const [newPassword, setNewPassword] = useState('');
  const [notifPortal, setNotifPortal] = useState(profile?.notifPortal ?? true);
  const [notifEmail, setNotifEmail] = useState(profile?.notifEmail ?? true);
  const [notifWhatsApp, setNotifWhatsApp] = useState(profile?.notifWhatsApp ?? false);
  const [reminderMinutes, setReminderMinutes] = useState(profile?.reminderMinutes ?? 30);

  // Sync state with profile from context (Firestore single source of truth)
  React.useEffect(() => {
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // WhatsApp validation: only numbers and + prefix
    if (whatsappNumber && !whatsappNumber.match(/^\+?[0-9]{10,15}$/)) {
      toast.error('Format nomor WhatsApp tidak valid. Gunakan format +628...');
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
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Status Email</p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700 dark:text-[#F5F5F5] truncate mr-2">{profile?.email}</span>
                {isCampusEmail ? (
                  <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 text-[10px] font-bold rounded border border-yellow-500/20">Default</span>
                ) : (
                  <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-[10px] font-bold rounded border border-green-500/20">Terverifikasi</span>
                )}
              </div>
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
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-[#B4B4C8]">
                  Nama Lengkap {!profile?.profileCompleted && <span className="text-red-500">*</span>}
                </label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#1E1E2F] border border-slate-200 dark:border-[#3F3F5A]/30 rounded-xl focus:outline-none focus:border-brand-400 dark:border-brand-dark-accent text-slate-900 dark:text-[#F5F5F5]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-[#B4B4C8]">
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
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#1E1E2F] border border-slate-200 dark:border-[#3F3F5A]/30 rounded-xl focus:outline-none focus:border-brand-400 dark:border-brand-dark-accent text-slate-900 dark:text-[#F5F5F5]"
                  />
                </div>
                {isCampusEmail && (
                  <p className="text-[10px] text-yellow-600 dark:text-yellow-400 mt-1 italic">
                    *Ganti email default dengan email pribadi Anda agar lebih fleksibel.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-[#B4B4C8]">
                  {getIdentifierLabel()} {!profile?.profileCompleted && <span className="text-red-500">*</span>}
                </label>
                <input 
                  type="text" 
                  required
                  value={nim}
                  onChange={(e) => setNim(e.target.value)}
                  placeholder={`Masukkan ${getIdentifierLabel()}`}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#1E1E2F] border border-slate-200 dark:border-[#3F3F5A]/30 rounded-xl focus:outline-none focus:border-brand-400 dark:border-brand-dark-accent text-slate-900 dark:text-[#F5F5F5]"
                />
                <p className="text-[10px] text-slate-500 mt-1 italic">
                  *Anda bisa login menggunakan {getIdentifierLabel()} ini.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-[#B4B4C8]">
                  Nomor WhatsApp {!profile?.profileCompleted && <span className="text-red-500">*</span>}
                </label>
                <input 
                  type="tel" 
                  required
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="+628..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#1E1E2F] border border-slate-200 dark:border-[#3F3F5A]/30 rounded-xl focus:outline-none focus:border-brand-400 dark:border-brand-dark-accent text-slate-900 dark:text-[#F5F5F5]"
                />
              </div>
              {profile?.role !== 'mahasiswa' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-[#B4B4C8]">Jabatan / Divisi</label>
                  <input 
                    type="text" 
                    value={division}
                    onChange={(e) => setDivision(e.target.value)}
                    placeholder="Contoh: Dosen Teknik Informatika"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#1E1E2F] border border-slate-200 dark:border-[#3F3F5A]/30 rounded-xl focus:outline-none focus:border-brand-400 dark:border-brand-dark-accent text-slate-900 dark:text-[#F5F5F5]"
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
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-[#B4B4C8]">Kata Sandi Baru</label>
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Biarkan kosong jika tidak ingin mengubah"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#1E1E2F] border border-slate-200 dark:border-[#3F3F5A]/30 rounded-xl focus:outline-none focus:border-[#ffafd5] text-slate-900 dark:text-[#F5F5F5]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-[#3F3F5A]/30">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-[#F5F5F5] mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600 dark:text-[#86d2ff]" /> Preferensi Notifikasi
              </h3>
              <div className="space-y-5">
                <div className="space-y-3">
                  <p className="text-sm font-bold text-slate-700 dark:text-[#F5F5F5]">Kanal Notifikasi</p>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={notifPortal}
                      onChange={(e) => setNotifPortal(e.target.checked)}
                      className="w-4 h-4 rounded border-brand-dark-border-strong text-brand-700 dark:text-brand-dark-accent focus:ring-brand-dark-accent-light bg-slate-50 dark:bg-[#1E1E2F]" 
                    />
                    <span className="text-slate-600 dark:text-[#B4B4C8] text-sm">Notifikasi Portal (In-App)</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={notifEmail}
                      onChange={(e) => setNotifEmail(e.target.checked)}
                      className="w-4 h-4 rounded border-brand-dark-border-strong text-brand-700 dark:text-brand-dark-accent focus:ring-brand-dark-accent-light bg-slate-50 dark:bg-[#1E1E2F]" 
                    />
                    <span className="text-slate-600 dark:text-[#B4B4C8] text-sm">Email</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={notifWhatsApp}
                      onChange={(e) => setNotifWhatsApp(e.target.checked)}
                      className="w-4 h-4 rounded border-brand-dark-border-strong text-brand-700 dark:text-brand-dark-accent focus:ring-brand-dark-accent-light bg-slate-50 dark:bg-[#1E1E2F]" 
                    />
                    <span className="text-slate-600 dark:text-[#B4B4C8] text-sm">WhatsApp</span>
                  </label>
                </div>

                <div className="space-y-3 pt-2">
                  <p className="text-sm font-bold text-slate-700 dark:text-[#F5F5F5]">Pengingat Jadwal (Reminder)</p>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-600 dark:text-[#B4B4C8] text-sm">Kirim pengingat</span>
                    <select 
                      value={reminderMinutes}
                      onChange={(e) => setReminderMinutes(parseInt(e.target.value))}
                      className="px-3 py-1.5 bg-slate-50 dark:bg-[#1E1E2F] border border-slate-200 dark:border-[#3F3F5A]/30 rounded-lg focus:outline-none focus:border-brand-400 dark:border-brand-dark-accent text-slate-900 dark:text-[#F5F5F5] text-sm"
                    >
                      <option value="15">15 menit</option>
                      <option value="30">30 menit</option>
                      <option value="60">1 jam</option>
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
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-dark-accent-light text-brand-dark-on-accent font-bold rounded-xl hover:bg-brand-dark-accent-hover transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
