import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType, auth } from '../../lib/firebase';
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

  useEffect(() => {
    fetchUsers();
  }, []);

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
          <p className="text-slate-600 dark:text-[#B4B4C8] text-sm">Kelola akun Mahasiswa, Dosen, dan Admin.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white dark:bg-[#27273A] dark:shadow-md border border-slate-200 dark:border-[#3F3F5A]/50 rounded-xl px-4 py-2 flex items-center md:flex-row gap-3">
            <Users className="w-5 h-5 text-brand-600 dark:text-brand-dark-accent" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Pengguna</span>
              <span className="text-lg font-extrabold text-slate-900 dark:text-[#F5F5F5] leading-none">{users.length}</span>
            </div>
          </div>

          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Cari nama, email, NIM..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white dark:bg-[#27273A] border border-slate-200 dark:border-[#3F3F5A]/50 rounded-xl text-sm focus:outline-none focus:border-brand-400 text-slate-900 dark:text-[#F5F5F5] w-64"
            />
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 border border-slate-200 dark:border-[#3F3F5A]/50 rounded-xl px-3 py-2">
            <Filter className="w-4 h-4 text-slate-500 dark:text-[#B4B4C8]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-sm text-slate-900 dark:text-[#F5F5F5] focus:outline-none"
            >
              <option value="semua">Semua Status</option>
              <option value="aktif">Status: AKTIF</option>
              <option value="nonaktif">Status: NONAKTIF</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 border border-slate-200 dark:border-[#3F3F5A]/50 rounded-xl px-3 py-2">
            <Filter className="w-4 h-4 text-slate-500 dark:text-[#B4B4C8]" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent text-sm text-slate-900 dark:text-[#F5F5F5] focus:outline-none capitalize"
            >
              <option value="semua">Semua Peran</option>
              <option value="mahasiswa">Mahasiswa</option>
              <option value="dosen">Dosen</option>
              <option value="admin">Admin/Staff</option>
            </select>
          </div>
        </div>
      </div>

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
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-brand-400 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm">Menghubungkan ke Auth & Firestore...</p>
                    </div>
                  </td>
                </tr>
              ) : currentUsers.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-[#32324A]/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-[#F5F5F5]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-[#32324A] flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
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
                          <p className={cn("truncate", user.isOrphan && "text-red-500 dark:text-red-400 font-medium")}>{user.name}</p>
                          {user.isOrphan && <AlertTriangle className="w-3 h-3 text-red-500" title="Akun ini telah dihapus tetapi datanya masih ada" />}
                        </div>
                        {user.division && (
                          <p className="text-[10px] text-slate-500 font-normal truncate uppercase tracking-tighter">{user.division}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm truncate max-w-[200px]">{user.email}</td>
                  <td className="px-6 py-4">
                    {user.nim ? (
                      <span className="text-xs font-mono bg-slate-100 dark:bg-[#1E1E2F] px-2 py-1 rounded text-slate-700 dark:text-[#F5F5F5]">
                        {user.nim}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-xs">Belum diisi</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {(user.whatsappNumber || user.whatsapp) ? (
                      <a 
                        href={`https://wa.me/${(user.whatsappNumber || user.whatsapp).replace(/\+/g, '')}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-green-600 dark:text-green-400 hover:underline text-sm"
                      >
                        {user.whatsappNumber || user.whatsapp}
                      </a>
                    ) : (
                      <span className="text-slate-400 italic text-xs">Belum diisi</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <select 
                      disabled={isUpdatingRole === user.id}
                      value={user.role === 'staff' ? 'admin' : user.role}
                      onChange={(e) => handleRoleChange(user, e.target.value)}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-[#32324A] border border-slate-200 dark:border-[#3F3F5A]/50 rounded-xl text-xs text-slate-900 dark:text-[#F5F5F5] focus:outline-none focus:border-brand-400 dark:border-brand-dark-accent capitalize disabled:opacity-50"
                    >
                      <option value="mahasiswa">Mahasiswa</option>
                      <option value="dosen">Dosen</option>
                      <option value="admin">Admin/Staff</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.isOrphan ? (
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                          <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">NONAKTIF</span>
                        </div>
                        <span className="text-[10px] text-slate-400 italic">Akun dihapus, data tersisa</span>
                      </div>
                    ) : user.lastLogin ? (
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 mb-0.5" title="User terverifikasi di system Auth">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-[10px] font-bold text-green-600 dark:text-green-500 uppercase tracking-wider">AKTIF</span>
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
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
                          <span className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">NONAKTIF</span>
                        </div>
                        <span className="text-[10px] text-slate-400 italic">Belum pernah login</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {auth.currentUser?.uid !== user.id && (
                      <button
                        onClick={() => setUserToDelete(user)}
                        disabled={isDeleting === user.id}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
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
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">Pencarian tidak ditemukan.</td>
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
              className="flex-1 px-4 py-2.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 shadow-lg shadow-brand-600/20 transition-all"
            >
              Batal
            </button>
            <button
              onClick={handleDeleteUser}
              disabled={!!isDeleting}
              className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-[#32324A] text-red-600 dark:text-red-500 font-bold rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
