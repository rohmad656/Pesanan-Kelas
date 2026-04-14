import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Filter } from 'lucide-react';

const roleOrder: Record<string, number> = {
  admin: 1,
  dosen: 2,
  mahasiswa: 3
};

export default function ManageUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>('semua');

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });

    return () => unsubscribe();
  }, []);

  const handleRoleChange = async (id: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', id), { role: newRole });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${id}`);
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
              <option value="admin">Admin</option>
              <option value="dosen">Dosen</option>
              <option value="mahasiswa">Mahasiswa</option>
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
                <th className="px-6 py-4 font-semibold">Peran (Role)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#603770]/30">
              {filteredAndSortedUsers.map(user => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-[#32324A] transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-[#F5F5F5]">{user.name}</td>
                  <td className="px-6 py-4">{user.email}</td>
                  <td className="px-6 py-4">
                    <select 
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="px-3 py-1.5 bg-brand-100 dark:bg-[#32324A] border border-slate-200 dark:border-[#3F3F5A]/50 rounded-lg text-slate-900 dark:text-[#F5F5F5] focus:outline-none focus:border-brand-400 dark:border-brand-dark-accent capitalize"
                    >
                      <option value="mahasiswa">Mahasiswa</option>
                      <option value="dosen">Dosen</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
              {filteredAndSortedUsers.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center">Belum ada data pengguna.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
