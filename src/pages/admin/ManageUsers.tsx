import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType, auth } from '../../lib/firebase';
import { 
  collection, 
  getDocs, 
  orderBy, 
  query, 
  addDoc, 
  serverTimestamp, 
  updateDoc, 
  doc, 
  deleteDoc, 
  where 
} from 'firebase/firestore';
import { Filter, Trash2, Users, Search, ChevronLeft, ChevronRight, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';

import BaseModal from '../../components/BaseModal';

const roleOrder: Record<string, number> = {
  admin: 1,
  staff: 2,
  dosen: 3,
  mahasiswa: 4
};

const USERS_PER_PAGE = 10;

export default function ManageUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>('semua');
  const [statusFilter, setStatusFilter] = useState<string>('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'contacts'>('users');
  const [contacts, setContacts] = useState<any[]>([]);
  const [newContact, setNewContact] = useState({ name: '', whatsapp: '' });
  const [isAddingContact, setIsAddingContact] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const adminToken = await auth.currentUser?.getIdToken();
      if (!adminToken) throw new Error('Sesi tidak valid');

      const response = await fetch(`/api/admin/users?adminToken=${adminToken}`);
      const result = await response.json();

      if (!response.ok) throw new Error(result.error);
      
      setUsers(result.users || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('Gagal memuat data pengguna dari server.');
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const q = query(collection(db, 'admin_contacts'), orderBy('updatedAt', 'desc'));
      const snap = await getDocs(q);
      setContacts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Fetch contacts error:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchContacts();
  }, []);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name || !newContact.whatsapp) return;
    setIsAddingContact(true);
    try {
      await addDoc(collection(db, 'admin_contacts'), {
        ...newContact,
        isActive: true,
        updatedAt: serverTimestamp()
      });
      toast.success('Kontak admin berhasil ditambahkan');
      setNewContact({ name: '', whatsapp: '' });
      fetchContacts();
    } catch (error) {
      toast.error('Gagal menambahkan kontak');
    } finally {
      setIsAddingContact(false);
    }
  };

  const toggleContactStatus = async (contact: any) => {
    try {
      await updateDoc(doc(db, 'admin_contacts', contact.id), {
        isActive: !contact.isActive,
        updatedAt: serverTimestamp()
      });
      fetchContacts();
    } catch (error) {
      toast.error('Gagal memperbarui status');
    }
  };

  const deleteContact = async (id: string) => {
    if (!confirm('Hapus kontak ini?')) return;
    try {
      await deleteDoc(doc(db, 'admin_contacts', id));
      setContacts(prev => prev.filter(c => c.id !== id));
      toast.success('Kontak dihapus');
    } catch (error) {
      toast.error('Gagal menghapus');
    }
  };

  const handleRoleChange = async (user: any, newRole: string) => {
    setIsUpdatingRole(user.id);
    try {
      const adminToken = await auth.currentUser?.getIdToken();
      if (!adminToken) throw new Error('Sesi tidak valid');

      const response = await fetch('/api/admin/update-user-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUid: user.id, newRole, adminToken }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      // Locally update state
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
      toast.success(`Peran ${user.name} berhasil diubah menjadi ${newRole.toUpperCase()} (Custom Claims Synced)`);
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error(error.message || 'Gagal mengubah peran');
    } finally {
      setIsUpdatingRole(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeleting(userToDelete.id);
    try {
      const adminToken = await auth.currentUser?.getIdToken();
      if (!adminToken) throw new Error('Sesi tidak valid');

      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: userToDelete.id, adminToken }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Gagal menghapus pengguna');

      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      toast.success('Pengguna berhasil dihapus secara permanen dari Auth & Firestore');
      setUserToDelete(null);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Gagal menghapus pengguna');
    } finally {
      setIsDeleting(null);
    }
  };

  const filteredAndSortedUsers = users
    .filter(user => {
      // Role filter
      const matchesRole = roleFilter === 'semua' || 
                         (roleFilter === 'admin' ? (user.role === 'admin' || user.role === 'staff') : user.role === roleFilter);
      
      // Status filter
      const isActive = !!user.lastLogin;
      const matchesStatus = statusFilter === 'semua' || 
                           (statusFilter === 'aktif' ? isActive : !isActive);

      // Search filter
      const matchesSearch = searchQuery === '' || 
                           user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           user.nim?.includes(searchQuery);

      return matchesRole && matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      const orderA = roleOrder[a.role] || 99;
      const orderB = roleOrder[b.role] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return (a.name || '').localeCompare(b.name || '');
    });

  const totalPages = Math.ceil(filteredAndSortedUsers.length / USERS_PER_PAGE);
  const currentUsers = filteredAndSortedUsers.slice(
    (currentPage - 1) * USERS_PER_PAGE,
    currentPage * USERS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, statusFilter, searchQuery]);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F5F5F5]">Manajemen Pengguna</h1>
          <div className="flex items-center gap-2 mt-1">
            <button 
              onClick={() => setActiveTab('users')}
              className={cn(
                "text-sm font-medium px-4 py-2 rounded-lg transition-all",
                activeTab === 'users' 
                  ? "bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-dark-accent shadow-sm" 
                  : "text-slate-500 hover:text-slate-700 dark:text-[#B4B4C8] hover:bg-slate-100 dark:hover:bg-[#32324A]/50"
              )}
            >
              Daftar Pengguna
            </button>
            <button 
              onClick={() => setActiveTab('contacts')}
              className={cn(
                "text-sm font-medium px-4 py-2 rounded-lg transition-all",
                activeTab === 'contacts' 
                  ? "bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-dark-accent shadow-sm" 
                  : "text-slate-500 hover:text-slate-700 dark:text-[#B4B4C8] hover:bg-slate-100 dark:hover:bg-[#32324A]/50"
              )}
            >
              Kontak Official
            </button>
          </div>
        </div>
        
        {activeTab === 'users' && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white dark:bg-[#27273A] dark:shadow-md border border-slate-200 dark:border-[#3F3F5A]/50 rounded-xl px-4 py-2 flex items-center md:flex-row gap-3">
              <Users className="w-5 h-5 text-brand-600 dark:text-brand-dark-accent" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Pengguna</span>
                <span className="text-lg font-extrabold text-slate-900 dark:text-[#F5F5F5] leading-none">{users.length}</span>
              </div>
            </div>

            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
              <input 
                type="text"
                placeholder="Cari nama, email, NIM..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white dark:bg-[#27273A] border border-slate-200 dark:border-[#3F3F5A]/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 text-slate-900 dark:text-[#F5F5F5] placeholder:text-slate-400 dark:placeholder:text-slate-500 w-64 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 border border-slate-200 dark:border-[#3F3F5A]/50 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-brand-500/50 transition-all">
              <Filter className="w-4 h-4 text-slate-500 dark:text-[#B4B4C8]" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-sm text-slate-900 dark:text-[#F5F5F5] focus:outline-none cursor-pointer"
              >
                <option value="semua">Semua Status</option>
                <option value="aktif">Status: AKTIF</option>
                <option value="nonaktif">Status: NONAKTIF</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 border border-slate-200 dark:border-[#3F3F5A]/50 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-brand-500/50 transition-all">
              <Filter className="w-4 h-4 text-slate-500 dark:text-[#B4B4C8]" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-transparent text-sm text-slate-900 dark:text-[#F5F5F5] focus:outline-none capitalize cursor-pointer"
              >
                <option value="semua">Semua Peran</option>
                <option value="mahasiswa">Mahasiswa</option>
                <option value="dosen">Dosen</option>
                <option value="admin">Admin/Staff</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {activeTab === 'users' ? (
        <div className="bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 rounded-2xl border border-slate-200 dark:border-[#3F3F5A]/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-slate-600 dark:text-[#B4B4C8]">
              <thead className="bg-brand-100 dark:bg-[#32324A] text-slate-900 dark:text-[#F5F5F5]">
                <tr>
                  <th className="px-6 py-4 font-semibold">Nama</th>
                  <th className="px-6 py-4 font-semibold">Email</th>
                  <th className="px-6 py-4 font-semibold">NIM / NIP</th>
                  <th className="px-6 py-4 font-semibold">WhatsApp</th>
                  <th className="px-6 py-4 font-semibold">Peran (Role)</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#3F3F5A]/30">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center align-middle">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-brand-400 border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm font-medium">Menghubungkan ke Auth & Firestore...</p>
                      </div>
                    </td>
                  </tr>
                ) : currentUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors border-b border-slate-100 dark:border-[#3F3F5A]/20 last:border-0">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-[#F5F5F5] align-middle">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-[#32324A] flex items-center justify-center font-bold text-sm overflow-hidden shrink-0 shadow-sm">
                          {user.photoURL ? (
                            <img 
                              src={user.photoURL} 
                              alt={user.name} 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            (user.name || '?').charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={cn("truncate text-sm font-semibold", user.isOrphan && "text-red-500 dark:text-red-400")}>{user.name}</p>
                            {user.isOrphan && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" title="Data tersimpan, akun Auth dihapus (Status: Nonaktif)" />}
                          </div>
                          {user.division && (
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate uppercase tracking-wider">{user.division}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium truncate max-w-[200px] text-slate-600 dark:text-slate-300 align-middle">{user.email}</td>
                    <td className="px-6 py-4 align-middle">
                      {user.nim ? (
                        <span className="text-xs font-bold font-mono bg-slate-100 dark:bg-[#1E1E2F] px-2 py-1 rounded-lg text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/50">
                          {user.nim}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 italic text-xs">Belum diisi</span>
                      )}
                    </td>
                    <td className="px-6 py-4 align-middle">
                      {(user.whatsappNumber || user.whatsapp) ? (
                        <a 
                          href={`https://wa.me/${(user.whatsappNumber || user.whatsapp).replace(/\+/g, '')}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-green-600 dark:text-green-400 hover:underline text-sm font-bold flex items-center gap-1.5"
                        >
                          <span className="w-2 h-2 bg-green-500 rounded-full" />
                          {user.whatsappNumber || user.whatsapp}
                        </a>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 italic text-xs">Belum diisi</span>
                      )}
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <select 
                        disabled={isUpdatingRole === user.id}
                        value={user.role === 'staff' ? 'admin' : user.role}
                        onChange={(e) => handleRoleChange(user, e.target.value)}
                        className="px-3 py-2 bg-slate-100 dark:bg-[#32324A] border border-slate-200 dark:border-[#3F3F5A]/50 rounded-xl text-xs font-bold text-slate-900 dark:text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 capitalize disabled:opacity-50 cursor-pointer"
                      >
                        <option value="mahasiswa">Mahasiswa</option>
                        <option value="dosen">Dosen</option>
                        <option value="admin">Admin/Staff</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap align-middle">
                      {user.isOrphan ? (
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="w-2 h-2 bg-red-500 rounded-full shadow-sm" />
                            <span className="text-[10px] font-extrabold text-red-600 dark:text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider">NONAKTIF</span>
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 italic">Akun dihapus, data tersisa</span>
                        </div>
                      ) : user.lastLogin ? (
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="w-2 h-2 bg-green-500 rounded-full shadow-sm animate-pulse" />
                            <span className="text-[10px] font-extrabold text-green-600 dark:text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider">AKTIF</span>
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold font-mono">
                            {new Date(user.lastLogin.toMillis?.() || user.lastLogin).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="w-2 h-2 bg-slate-400 dark:bg-slate-600 rounded-full shadow-sm" />
                            <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 border border-slate-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider">NONAKTIF</span>
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 italic">Belum pernah login</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center align-middle">
                      {auth.currentUser?.uid !== user.id && (
                        <button
                          onClick={() => setUserToDelete(user)}
                          disabled={isDeleting === user.id}
                          className="inline-flex items-center justify-center p-2.5 min-w-[44px] min-h-[44px] text-red-500 hover:bg-red-500/10 rounded-xl transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
                          title="Hapus Akun secara Permanen"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!loading && filteredAndSortedUsers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 italic font-medium align-middle">Pencarian tidak ditemukan.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-slate-50/50 dark:bg-black/10 border-t border-slate-100 dark:border-[#3F3F5A]/30 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Menampilkan <span className="font-bold">{(currentPage - 1) * USERS_PER_PAGE + 1}</span> - <span className="font-bold">{Math.min(currentPage * USERS_PER_PAGE, filteredAndSortedUsers.length)}</span> dari <span className="font-bold">{filteredAndSortedUsers.length}</span> pengguna
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-slate-200 dark:border-[#3F3F5A]/30 rounded-lg hover:bg-white dark:hover:bg-[#32324A] disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                        currentPage === i + 1 
                          ? 'bg-brand-600 text-white shadow-md' 
                          : 'hover:bg-slate-200 dark:hover:bg-[#32324A] text-slate-600 dark:text-[#B4B4C8]'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-slate-200 dark:border-[#3F3F5A]/30 rounded-lg hover:bg-white dark:hover:bg-[#32324A] disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-4">
            <div className="bg-white dark:bg-[#27273A] p-6 rounded-2xl border border-slate-200 dark:border-[#3F3F5A]/30 shadow-sm">
              <h3 className="font-bold mb-4">Tambah Kontak Baru</h3>
              <form onSubmit={handleAddContact} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5 block">Nama Admin / Unit</label>
                  <input 
                    type="text"
                    required
                    value={newContact.name}
                    onChange={e => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Contoh: Admin Akademik"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#1E1E2F] border border-slate-200 dark:border-[#3F3F5A]/50 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all placeholder:text-slate-400/70"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5 block">WhatsApp (Format: +62...)</label>
                  <input 
                    type="text"
                    required
                    value={newContact.whatsapp}
                    onChange={e => setNewContact(prev => ({ ...prev, whatsapp: e.target.value }))}
                    placeholder="+62812345678"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#1E1E2F] border border-slate-200 dark:border-[#3F3F5A]/50 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all placeholder:text-slate-400/70"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isAddingContact}
                  className="w-full py-2.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 shadow-lg shadow-brand-600/30 hover:shadow-brand-500/40 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100"
                >
                  {isAddingContact ? 'Menyimpan...' : 'Tambah Kontak'}
                </button>
              </form>
            </div>
          </div>

          <div className="md:col-span-2 space-y-4">
            <div className="bg-white dark:bg-[#27273A] rounded-2xl border border-slate-200 dark:border-[#3F3F5A]/30 shadow-sm overflow-hidden">
               <div className="p-4 bg-brand-50 dark:bg-brand-500/5 border-b border-brand-100 dark:border-brand-900/20">
                  <h3 className="font-bold text-sm">Daftar Kontak Berjalan</h3>
                  <p className="text-[10px] text-slate-500">Kontak yang ditandai aktif akan muncul di sidebar Mahasiswa & Dosen.</p>
               </div>
               <div className="divide-y divide-slate-100 dark:divide-[#3F3F5A]/30">
                  {contacts.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 italic text-sm">Belum ada kontak terdaftar.</div>
                  ) : contacts.map(c => (
                    <div key={c.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#32324A]/50 transition-colors">
                      <div className="flex items-center gap-3">
                         <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-bold", c.isActive ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400")}>
                            {c.name.charAt(0).toUpperCase()}
                         </div>
                         <div>
                            <p className="font-bold text-sm text-slate-900 dark:text-white">{c.name}</p>
                            <p className="text-xs text-slate-500 font-mono">{c.whatsapp}</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => toggleContactStatus(c)}
                          className={cn(
                            "px-3 py-1.5 min-w-[60px] rounded-lg text-[10px] font-extrabold uppercase transition-all hover:scale-110 active:scale-90 border",
                            c.isActive 
                              ? "bg-green-500 text-white shadow-lg shadow-green-500/30 border-green-600/20" 
                              : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600/30"
                          )}
                        >
                          {c.isActive ? 'Aktif' : 'Nonaktif'}
                        </button>
                        <button 
                          onClick={() => deleteContact(c.id)}
                          className="inline-flex items-center justify-center p-2.5 min-w-[44px] min-h-[44px] text-red-500 hover:bg-red-500/10 rounded-xl transition-all hover:scale-110 active:scale-95"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <BaseModal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        className="max-w-md"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-500/10 rounded-2xl flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-[#F5F5F5]">Hapus Akun Pengguna?</h3>
              <p className="text-xs text-slate-500 dark:text-[#B4B4C8]">Tindakan ini tidak dapat dibatalkan</p>
            </div>
          </div>

          <p className="text-slate-600 dark:text-[#B4B4C8] text-sm leading-relaxed">
            Apakah Anda yakin ingin menghapus akun <span className="font-bold text-slate-900 dark:text-[#F5F5F5]">{userToDelete?.name}</span>? 
            Tindakan ini akan menghapus data user secara permanen. 
            Data yang dihapus tidak dapat dipulihkan lagi.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => setUserToDelete(null)}
              className="flex-1 px-4 py-2.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 shadow-lg shadow-brand-600/30 hover:shadow-brand-500/40 transition-all hover:scale-105 active:scale-95"
            >
              Batal
            </button>
            <button
              onClick={handleDeleteUser}
              disabled={!!isDeleting}
              className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-[#32324A] text-red-600 dark:text-red-500 font-bold rounded-xl hover:bg-red-500/10 hover:shadow-lg dark:hover:bg-red-500/10 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <div className="w-5 h-5 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" />
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Hapus
                </>
              )}
            </button>
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-[#3F3F5A]/20 text-center">
            <p className="text-[10px] text-slate-400 italic">Data dihapus dari sistem (Auth & Firestore).</p>
          </div>
        </div>
      </BaseModal>
    </div>
  );
}
