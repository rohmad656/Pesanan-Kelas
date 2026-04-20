import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Plus, Edit2, Trash2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import BaseModal from '../../components/BaseModal';

export default function ManageRooms() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    building: '',
    floor: 1,
    capacity: 30,
    status: 'available',
    facilities: '',
    rules: '',
    imageUrl: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'rooms'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roomsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRooms(roomsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'rooms');
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const facilitiesArray = formData.facilities.split(',').map(f => f.trim()).filter(f => f);
    
    const roomData = {
      name: formData.name,
      building: formData.building,
      floor: Number(formData.floor),
      capacity: Number(formData.capacity),
      status: formData.status,
      facilities: facilitiesArray,
      rules: formData.rules,
      imageUrl: formData.imageUrl
    };

    try {
      if (editingRoom) {
        await updateDoc(doc(db, 'rooms', editingRoom.id), roomData);
      } else {
        await addDoc(collection(db, 'rooms'), {
          ...roomData,
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setEditingRoom(null);
      setFormData({ name: '', building: '', floor: 1, capacity: 30, status: 'available', facilities: '', rules: '', imageUrl: '' });
    } catch (error) {
      handleFirestoreError(error, editingRoom ? OperationType.UPDATE : OperationType.CREATE, 'rooms');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'rooms', deleteId));
      toast.success('Ruangan berhasil dihapus.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `rooms/${deleteId}`);
      toast.error('Gagal menghapus ruangan.');
    } finally {
      setDeleteId(null);
    }
  };

  const openEditModal = (room: any) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      building: room.building,
      floor: room.floor,
      capacity: room.capacity,
      status: room.status,
      facilities: room.facilities?.join(', ') || '',
      rules: room.rules || '',
      imageUrl: room.imageUrl || ''
    });
    setIsModalOpen(true);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F5F5F5]">Kelola Ruangan</h1>
          <p className="text-slate-600 dark:text-[#B4B4C8] text-sm">Tambah, ubah, atau hapus data ruangan.</p>
        </div>
        <button 
          onClick={() => {
            setEditingRoom(null);
            setFormData({ name: '', building: '', floor: 1, capacity: 30, status: 'available', facilities: '', rules: '', imageUrl: '' });
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-brand-dark-accent-light text-brand-dark-on-accent font-bold rounded-xl hover:bg-brand-dark-accent-hover hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Tambah Ruangan
        </button>
      </div>

      <div className="bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 rounded-2xl border border-slate-200 dark:border-[#3F3F5A]/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-slate-600 dark:text-[#B4B4C8]">
            <thead className="bg-brand-100 dark:bg-[#32324A] text-slate-900 dark:text-[#F5F5F5]">
              <tr>
                <th className="px-6 py-4 font-semibold">Nama Ruangan</th>
                <th className="px-6 py-4 font-semibold">Gedung / Lantai</th>
                <th className="px-6 py-4 font-semibold">Kapasitas</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#603770]/30">
              {rooms.map(room => (
                <tr key={room.id} className="hover:bg-slate-50 dark:hover:bg-[#32324A] transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-[#F5F5F5]">{room.name}</td>
                  <td className="px-6 py-4">{room.building} Lt. {room.floor}</td>
                  <td className="px-6 py-4">{room.capacity} Org</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      room.status === 'available' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'
                    }`}>
                      {room.status === 'available' ? 'Tersedia' : 'Perbaikan'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => openEditModal(room)} className="p-2 text-blue-600 dark:text-[#86d2ff] hover:bg-[#86d2ff]/10 hover:scale-110 active:scale-90 rounded-lg transition-all">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteId(room.id)} className="p-2 text-red-400 hover:bg-red-500/10 hover:scale-110 active:scale-90 rounded-lg transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {rooms.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">Belum ada data ruangan.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <BaseModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        className="max-w-sm"
      >
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-[#F5F5F5]">Hapus Ruangan?</h3>
            <p className="text-slate-600 dark:text-[#B4B4C8] text-sm mt-2">
              Apakah Anda yakin ingin menghapus ruangan ini? Tindakan ini tidak dapat diurungkan.
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setDeleteId(null)}
              className="flex-1 py-3 bg-slate-100 dark:bg-[#32324A] text-slate-600 dark:text-[#B4B4C8] font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-[#3F3F5A] transition-all"
            >
              Batal
            </button>
            <button 
              onClick={handleDelete}
              className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-500/20 transition-all"
            >
              Ya, Hapus
            </button>
          </div>
        </div>
      </BaseModal>

      {/* Add/Edit Modal */}
      <BaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRoom ? 'Edit Ruangan' : 'Tambah Ruangan Baru'}
        description={editingRoom ? 'Perbarui informasi ruangan terpilih' : 'Daftarkan ruangan baru ke dalam sistem'}
        className="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-[#B4B4C8]">Nama Ruangan</label>
              <input 
                type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#32324A] border border-slate-200 dark:border-[#3F3F5A]/50 rounded-xl text-slate-900 dark:text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-[#B4B4C8]">Gedung</label>
                <input 
                  type="text" required value={formData.building} onChange={(e) => setFormData({...formData, building: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#32324A] border border-slate-200 dark:border-[#3F3F5A]/50 rounded-xl text-slate-900 dark:text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-[#B4B4C8]">Lantai</label>
                <input 
                  type="number" required min="1" value={formData.floor} onChange={(e) => setFormData({...formData, floor: Number(e.target.value)})}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#32324A] border border-slate-200 dark:border-[#3F3F5A]/50 rounded-xl text-slate-900 dark:text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-[#B4B4C8]">Kapasitas (Orang)</label>
                <input 
                  type="number" required min="1" value={formData.capacity} onChange={(e) => setFormData({...formData, capacity: Number(e.target.value)})}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#32324A] border border-slate-200 dark:border-[#3F3F5A]/50 rounded-xl text-slate-900 dark:text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-[#B4B4C8]">Status</label>
                <select 
                  value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#32324A] border border-slate-200 dark:border-[#3F3F5A]/50 rounded-xl text-slate-900 dark:text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                >
                  <option value="available">Tersedia</option>
                  <option value="maintenance">Perbaikan</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-[#B4B4C8]">Fasilitas (Pisahkan dengan koma)</label>
              <input 
                type="text" value={formData.facilities} onChange={(e) => setFormData({...formData, facilities: e.target.value})}
                placeholder="AC, Proyektor, Papan Tulis..."
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#32324A] border border-slate-200 dark:border-[#3F3F5A]/50 rounded-xl text-slate-900 dark:text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-[#B4B4C8]">URL Gambar (Opsional)</label>
              <input 
                type="url" value={formData.imageUrl} onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                placeholder="https://example.com/image.jpg"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#32324A] border border-slate-200 dark:border-[#3F3F5A]/50 rounded-xl text-slate-900 dark:text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-[#B4B4C8]">Peraturan Ruangan</label>
              <textarea 
                value={formData.rules} onChange={(e) => setFormData({...formData, rules: e.target.value})}
                placeholder="Dilarang makan dan minum, rapikan kursi setelah selesai..."
                rows={3}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#32324A] border border-slate-200 dark:border-[#3F3F5A]/50 rounded-xl text-slate-900 dark:text-[#F5F5F5] placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all resize-none"
              ></textarea>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              type="button" onClick={() => setIsModalOpen(false)}
              className="flex-1 py-3 bg-slate-100 dark:bg-[#32324A] text-slate-600 dark:text-[#B4B4C8] font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-[#3F3F5A] transition-all"
            >
              Batal
            </button>
            <button 
              type="submit"
              className="flex-1 py-3 bg-brand-700 text-white font-bold rounded-xl hover:bg-brand-dark-hover shadow-lg shadow-brand-700/20 transition-all"
            >
              Simpan Ruangan
            </button>
          </div>
        </form>
      </BaseModal>
    </div>
  );
}
