import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, where, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../../lib/firebase';
import { Filter, Trash2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const roleOrder: Record<string, number> = {
  admin: 1,
  staff: 2,
  dosen: 3,
  mahasiswa: 4
};

export default function ManageUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>('semua');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    // Filter out soft-deleted users
    const q = query(collection(db, 'users'), where('deleted', '!=', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      setUsers(usersData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });

    return () => unsubscribe();
  }, []);

  const handleRoleChange = async (user: any, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', user.id), { 
        role: newRole,
        updatedAt: serverTimestamp()
      });
      
      // Notify user about role change
      try {
        await setDoc(doc(collection(db, 'notifications')), {
          userId: user.id,
          title: 'Pembaruan Peran',
          message: `Peran akun Anda telah diubah menjadi ${newRole.toUpperCase()}.`,
          type: 'info',
          isRead: false,
          createdAt: serverTimestamp()
        });
      } catch (e) {
        console.warn("Failed to send notification:", e);
      }

      toast.success(`Peran ${user.name} berhasil diubah menjadi ${newRole}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
    }
  };

  const handleDeleteUser = async (user: any) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus akun ${user.name}? Tindakan ini akan menonaktifkan akun.`)) {
      return;
    }

    setIsDeleting(user.id);
    try {
      const adminToken = await auth.currentUser?.getIdToken();
      if (!adminToken) throw new Error('Sesi tidak valid');

      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid: user.id, adminToken }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal menghapus pengguna');
      }

      // Notify and Audit locally (Server also does this but we reinforce for UI)
      toast.success('Pengguna berhasil dinonaktifkan (Soft Delete)');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Gagal menghapus pengguna');
    } finally {
      setIsDeleting(user.id === isDeleting ? null : isDeleting);
    }
  };

  const filteredAndSortedUsers = users
    .filter(user => roleFilter === 'semua' || user.role === roleFilter)
    .sort((a, b) => {
      const orderA = roleOrder[a.role] || 99;
      const orderB = roleOrder[b.role] || 99;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return (a.name || '').localeCompare(b.name || '');
    });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F5F5F5]">Manajemen Pengguna</h1>
          <p className="text-slate-600 dark:text-[#B4B4C8] text-sm">Kelola akun Mahasiswa, Dosen, dan Admin.</p>
        </div>
        
        <div className="flex items-center gap-2">
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
              <option value="admin">Admin</option>
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
                <th className="px-6 py-4 font-semibold">Login Terakhir</th>
                <th className="px-6 py-4 font-semibold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#603770]/30">
              {filteredAndSortedUsers.map(user => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-[#32324A] transition-colors">
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
                      <div>
                        {user.name}
                        {user.division && (
                          <p className="text-[10px] text-slate-500 font-normal">{user.division}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">{user.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    {user.nim ? (
                      <span className="text-sm font-mono bg-slate-100 dark:bg-[#1E1E2F] px-2 py-1 rounded text-slate-700 dark:text-[#F5F5F5]">
                        {user.nim}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-xs">Belum diisi</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {user.whatsapp ? (
                      <a 
                        href={`https://wa.me/${user.whatsapp.replace(/\+/g, '')}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
                      >
                        {user.whatsapp}
                      </a>
                    ) : (
                      <span className="text-slate-400 italic text-xs">Belum diisi</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <select 
                      value={user.role}
                      onChange={(e) => handleRoleChange(user, e.target.value)}
                      className="px-3 py-1.5 bg-brand-100 dark:bg-[#32324A] border border-slate-200 dark:border-[#3F3F5A]/50 rounded-lg text-slate-900 dark:text-[#F5F5F5] focus:outline-none focus:border-brand-400 dark:border-brand-dark-accent capitalize"
                    >
                      <option value="mahasiswa">Mahasiswa</option>
                      <option value="dosen">Dosen</option>
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-slate-500 whitespace-nowrap">
                      {user.lastLogin ? new Date(user.lastLogin.toMillis()).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      }) : <span className="italic text-slate-400">Belum pernah login</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {auth.currentUser?.uid !== user.id && (
                      <button
                        onClick={() => handleDeleteUser(user)}
                        disabled={isDeleting === user.id}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                        title="Hapus Akun"
                      >
                        {isDeleting === user.id ? (
                          <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredAndSortedUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">Belum ada data pengguna.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
