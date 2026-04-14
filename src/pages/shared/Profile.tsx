import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User, Mail, Lock, Bell, Camera, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Profile() {
  const { profile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [whatsapp, setWhatsapp] = useState(profile?.whatsapp || '');
  const [division, setDivision] = useState(profile?.division || '');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success('Profil berhasil diperbarui');
    }, 1000);
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F5F5F5]">Profil & Pengaturan Akun</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 border border-slate-200 dark:border-[#3F3F5A]/30 rounded-2xl p-6 flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full bg-brand-100 dark:bg-[#32324A] border-2 border-brand-400 dark:border-brand-dark-accent flex items-center justify-center text-3xl font-bold text-brand-700 dark:text-brand-dark-accent">
              {profile?.name.charAt(0).toUpperCase()}
            </div>
            <button className="absolute bottom-0 right-0 p-2 bg-brand-dark-accent-light text-brand-dark-on-accent rounded-full hover:bg-brand-dark-accent-hover transition-colors">
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-[#F5F5F5]">{profile?.name}</h2>
          <p className="text-slate-600 dark:text-[#B4B4C8] text-sm capitalize">{profile?.role}</p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-medium border border-green-500/20">
            Akun Aktif
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
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-[#B4B4C8]">Nama Lengkap</label>
                <input 
                  type="text" 
                  defaultValue={profile?.name}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#1E1E2F] border border-slate-200 dark:border-[#3F3F5A]/30 rounded-xl focus:outline-none focus:border-brand-400 dark:border-brand-dark-accent text-slate-900 dark:text-[#F5F5F5]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-[#B4B4C8]">Email</label>
                <input 
                  type="email" 
                  defaultValue={profile?.email}
                  disabled
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#1E1E2F]/50 border border-slate-200 dark:border-[#3F3F5A]/30 rounded-xl text-slate-600 dark:text-[#B4B4C8] cursor-not-allowed"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-[#B4B4C8]">Nomor WhatsApp (Opsional)</label>
                <input 
                  type="tel" 
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+628..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#1E1E2F] border border-slate-200 dark:border-[#3F3F5A]/30 rounded-xl focus:outline-none focus:border-brand-400 dark:border-brand-dark-accent text-slate-900 dark:text-[#F5F5F5]"
                />
              </div>
              {profile?.role === 'admin' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-[#B4B4C8]">Jabatan / Divisi</label>
                  <input 
                    type="text" 
                    value={division}
                    onChange={(e) => setDivision(e.target.value)}
                    placeholder="Contoh: Staff Sarpras Fakultas Teknik"
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
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-brand-dark-border-strong text-brand-700 dark:text-brand-dark-accent focus:ring-brand-dark-accent-light bg-slate-50 dark:bg-[#1E1E2F]" />
                    <span className="text-slate-600 dark:text-[#B4B4C8] text-sm">Notifikasi Portal (In-App)</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-brand-dark-border-strong text-brand-700 dark:text-brand-dark-accent focus:ring-brand-dark-accent-light bg-slate-50 dark:bg-[#1E1E2F]" />
                    <span className="text-slate-600 dark:text-[#B4B4C8] text-sm">Email</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-brand-dark-border-strong text-brand-700 dark:text-brand-dark-accent focus:ring-brand-dark-accent-light bg-slate-50 dark:bg-[#1E1E2F]" />
                    <span className="text-slate-600 dark:text-[#B4B4C8] text-sm">WhatsApp</span>
                  </label>
                </div>

                <div className="space-y-3 pt-2">
                  <p className="text-sm font-bold text-slate-700 dark:text-[#F5F5F5]">Pengingat Jadwal (Reminder)</p>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-600 dark:text-[#B4B4C8] text-sm">Kirim pengingat</span>
                    <select defaultValue="30" className="px-3 py-1.5 bg-slate-50 dark:bg-[#1E1E2F] border border-slate-200 dark:border-[#3F3F5A]/30 rounded-lg focus:outline-none focus:border-brand-400 dark:border-brand-dark-accent text-slate-900 dark:text-[#F5F5F5] text-sm">
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
