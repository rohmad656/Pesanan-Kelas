import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { collection, addDoc, serverTimestamp, getDocs, query, where, runTransaction, doc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Search, Filter, MapPin, Users, CheckCircle, XCircle, Building, Info, Loader2, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import ReportIssueModal from '../../components/ReportIssueModal';

export default function Rooms() {
  const { profile } = useAuth();
  const { rooms, loadingRooms } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterCapacity, setFilterCapacity] = useState('');
  const [filterFloor, setFilterFloor] = useState('');
  const [filterFacility, setFilterFacility] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [infoRoom, setInfoRoom] = useState<any | null>(null);
  const [reportRoom, setReportRoom] = useState<any | null>(null);
  const [bookingReason, setBookingReason] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedSks, setSelectedSks] = useState<2 | 3>(2);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [roomActiveBookings, setRoomActiveBookings] = useState<any[]>([]);
  const [loadingRoomBookings, setLoadingRoomBookings] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  React.useEffect(() => {
    const roomId = infoRoom?.id || selectedRoom?.id;
    if (roomId) {
      setActiveRoomId(roomId);
      setLoadingRoomBookings(true);
      
      const q = query(
        collection(db, 'bookings'), 
        where('roomId', '==', roomId),
        where('status', 'in', ['pending', 'approved'])
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const active = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a: any, b: any) => {
            const startA = new Date(a.start_at || a.startTime).getTime();
            const startB = new Date(b.start_at || b.startTime).getTime();
            return startA - startB;
          });
        setRoomActiveBookings(active);
        setLoadingRoomBookings(false);
      }, (error) => {
        console.error("Error listening to room bookings:", error);
        setLoadingRoomBookings(false);
      });

      return () => unsubscribe();
    } else {
      setRoomActiveBookings([]);
      setActiveRoomId(null);
    }
  }, [infoRoom?.id, selectedRoom?.id]);

  // SKS Time Slots Configuration
  const SKS_START_TIMES = [
    "06:30", "07:20", "08:10", "09:00", "09:50", "10:40", "11:30",
    "12:30", "13:20", "14:10", "15:00", "15:50", "16:40",
    "18:30", "19:20", "20:10"
  ];

  const getSlotEndTime = (startTime: string, sks: number) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    // 1 SKS = 50 minutes
    date.setMinutes(date.getMinutes() + (sks * 50));
    return format(date, 'HH:mm');
  };

  const generateSlots = () => {
    return SKS_START_TIMES.map(start => ({
      start,
      end: getSlotEndTime(start, selectedSks)
    }));
  };

  const checkSlotConflict = (slotStart: string, slotEnd: string) => {
    if (!selectedDate) return false;
    
    const newStart = new Date(`${selectedDate}T${slotStart}`).getTime();
    const newEnd = new Date(`${selectedDate}T${slotEnd}`).getTime();

    return roomActiveBookings.some(b => {
      const bStart = new Date(b.start_at || b.startTime).getTime();
      const bEnd = new Date(b.end_at || b.endTime).getTime();
      return bStart < newEnd && bEnd > newStart;
    });
  };

  // Auto-check availability when time changes
  React.useEffect(() => {
    if (selectedDate && selectedSlot) {
      setIsCheckingAvailability(true);
      const timer = setTimeout(() => {
        setIsCheckingAvailability(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [selectedDate, selectedSlot, selectedSks]);

  // Scroll Lock for Modals
  React.useEffect(() => {
    if (infoRoom || selectedRoom || showSuccessModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [infoRoom, selectedRoom, showSuccessModal]);

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          room.building.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCapacity = filterCapacity ? room.capacity >= Number(filterCapacity) : true;
    const matchesFloor = filterFloor ? room.floor === Number(filterFloor) : true;
    const matchesFacility = filterFacility ? room.facilities?.some((f: string) => f.toLowerCase().includes(filterFacility.toLowerCase())) : true;

    return matchesSearch && matchesCapacity && matchesFloor && matchesFacility;
  }).sort((a, b) => {
    if (sortBy === 'capacity-asc') return a.capacity - b.capacity;
    if (sortBy === 'capacity-desc') return b.capacity - a.capacity;
    if (sortBy === 'location') return a.building.localeCompare(b.building);
    return a.name.localeCompare(b.name);
  });

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom || !profile || !selectedDate || !selectedSlot || !bookingReason) return;

    if (!profile.profileCompleted && profile.role !== 'admin') {
      toast.error('Lengkapi profil Anda terlebih dahulu sebelum melakukan pemesanan.');
      return;
    }

    setIsBooking(true);
    try {
      const slot = generateSlots().find(s => s.start === selectedSlot);
      if (!slot) throw new Error('Slot tidak valid.');

      const startTime = `${selectedDate}T${slot.start}:00`;
      const endTime = `${selectedDate}T${slot.end}:00`;

      const newStart = new Date(startTime).getTime();
      const newEnd = new Date(endTime).getTime();

      if (newStart >= newEnd) {
        toast.error('Waktu mulai harus sebelum waktu selesai.');
        setIsBooking(false);
        return;
      }

      // Use Firestore Transaction for Atomic Booking
      await runTransaction(db, async (transaction) => {
        // 1. "Lock" the room document by reading it
        const roomRef = doc(db, 'rooms', selectedRoom.id);
        await transaction.get(roomRef);

        // 2. Re-validate conflicts inside the transaction block
        // Note: getDocs inside runTransaction will re-run on retry
        const q = query(
          collection(db, 'bookings'), 
          where('roomId', '==', selectedRoom.id),
          where('status', 'in', ['pending', 'approved'])
        );
        const querySnapshot = await getDocs(q);
        
        let hasConflict = false;
        let conflictEndStr = '';
        let isDuplicate = false;

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const existingStartStr = data.start_at || data.startTime;
          const existingEndStr = data.end_at || data.endTime;
          
          if (existingStartStr && existingEndStr) {
            const existingStart = new Date(existingStartStr).getTime();
            const existingEnd = new Date(existingEndStr).getTime();

            if (existingStart < newEnd && existingEnd > newStart) {
              if (data.userId === profile.uid) {
                isDuplicate = true;
              }
              hasConflict = true;
              conflictEndStr = new Date(existingEndStr).toLocaleTimeString('id-ID', { timeStyle: 'short' });
            }
          }
        });

        if (isDuplicate) {
          throw new Error('Ruangan dan jam ini sudah Anda booking sebelumnya.');
        }

        if (hasConflict) {
          throw new Error(`Slot ini sudah diambil, silakan pilih waktu lain. (Terisi sampai ${conflictEndStr})`);
        }

        // 3. Perform writes
        const bookingRef = doc(collection(db, 'bookings'));
        transaction.set(bookingRef, {
          roomId: selectedRoom.id,
          roomName: selectedRoom.name,
          userId: profile.uid,
          userName: profile.name,
          userRole: profile.role,
          start_at: new Date(startTime).toISOString(),
          end_at: new Date(endTime).toISOString(),
          status: 'pending',
          reason: bookingReason,
          createdAt: serverTimestamp()
        });

        const notificationRef = doc(collection(db, 'notifications'));
        transaction.set(notificationRef, {
          targetRole: 'admin',
          title: 'Pemesanan Baru',
          message: `${profile.name} mengajukan peminjaman ${selectedRoom.name}.`,
          type: 'info',
          isRead: false,
          createdAt: serverTimestamp()
        });

        // 4. Update room to trigger transaction collision for other concurrent bookings
        transaction.update(roomRef, { 
          lastBookingUpdate: serverTimestamp() 
        });
      });

      setSelectedRoom(null);
      setBookingReason('');
      setSelectedSlot(null);
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 3000);
    } catch (error: any) {
      if (error.message && (error.message.includes('Slot ini') || error.message.includes('sudah Anda booking'))) {
        toast.error(error.message);
      } else {
        handleFirestoreError(error, OperationType.CREATE, 'bookings');
        toast.error('Gagal mengajukan pemesanan.');
      }
    } finally {
      setIsBooking(false);
    }
  };

  if (loadingRooms) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="h-8 w-48 bg-slate-200 dark:bg-[#3F3F5A] rounded animate-pulse mb-2"></div>
            <div className="h-4 w-64 bg-slate-200 dark:bg-[#3F3F5A] rounded animate-pulse"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-full md:w-64 bg-slate-200 dark:bg-[#3F3F5A] rounded-xl animate-pulse"></div>
            <div className="h-10 w-10 bg-slate-200 dark:bg-[#3F3F5A] rounded-xl animate-pulse"></div>
            <div className="h-10 w-40 bg-slate-200 dark:bg-[#3F3F5A] rounded-xl animate-pulse"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white dark:bg-[#27273A] rounded-2xl border border-slate-200 dark:border-[#3F3F5A]/30 overflow-hidden h-[380px] animate-pulse">
              <div className="h-48 bg-slate-200 dark:bg-[#32324A]"></div>
              <div className="p-5 space-y-4">
                <div className="h-6 w-3/4 bg-slate-200 dark:bg-[#3F3F5A] rounded"></div>
                <div className="h-4 w-1/2 bg-slate-200 dark:bg-[#3F3F5A] rounded"></div>
                <div className="h-4 w-full bg-slate-200 dark:bg-[#3F3F5A] rounded"></div>
                <div className="h-10 w-full bg-slate-200 dark:bg-[#3F3F5A] rounded mt-4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F5F5F5]">Cari Ruangan</h1>
          <p className="text-slate-600 dark:text-[#B4B4C8] text-sm">Temukan dan pesan ruangan untuk kegiatan Anda.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-[#B4B4C8]" />
            <input 
              type="text"
              placeholder="Cari nama atau gedung..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 border border-slate-200 dark:border-[#3F3F5A]/50 rounded-xl text-slate-900 dark:text-[#F5F5F5] placeholder:text-slate-600 dark:text-[#B4B4C8]/50 focus:outline-none focus:border-brand-400 dark:border-brand-dark-accent focus:ring-1 focus:ring-brand-dark-accent-light transition-all w-full md:w-64"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 border rounded-xl hover:scale-105 active:scale-95 transition-all ${showFilters ? 'bg-brand-dark-accent-light text-brand-dark-on-accent border-brand-400 dark:border-brand-dark-accent' : 'bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 border-slate-200 dark:border-[#3F3F5A]/50 text-slate-600 dark:text-[#B4B4C8] hover:text-brand-700 dark:text-brand-dark-accent hover:border-brand-400 dark:border-brand-dark-accent'}`}
          >
            <Filter className="w-5 h-5" />
          </button>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="p-2 bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 border border-slate-200 dark:border-[#3F3F5A]/50 rounded-xl text-slate-900 dark:text-[#F5F5F5] focus:outline-none focus:border-brand-400 dark:border-brand-dark-accent focus:ring-1 focus:ring-brand-dark-accent-light transition-all"
          >
            <option value="name">Nama (A-Z)</option>
            <option value="location">Lokasi</option>
            <option value="capacity-asc">Kapasitas (Kecil-Besar)</option>
            <option value="capacity-desc">Kapasitas (Besar-Kecil)</option>
          </select>
        </div>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 border border-slate-200 dark:border-[#3F3F5A]/50 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-[#B4B4C8]">Kapasitas Min.</label>
                <input
                  type="number"
                  value={filterCapacity}
                  onChange={(e) => setFilterCapacity(e.target.value)}
                  placeholder="Contoh: 30"
                  className="w-full px-3 py-2 bg-brand-100 dark:bg-[#32324A] border border-slate-200 dark:border-[#3F3F5A]/50 rounded-lg text-slate-900 dark:text-[#F5F5F5] focus:outline-none focus:border-brand-400 dark:border-brand-dark-accent"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-[#B4B4C8]">Lantai</label>
                <input
                  type="number"
                  value={filterFloor}
                  onChange={(e) => setFilterFloor(e.target.value)}
                  placeholder="Contoh: 1"
                  className="w-full px-3 py-2 bg-brand-100 dark:bg-[#32324A] border border-slate-200 dark:border-[#3F3F5A]/50 rounded-lg text-slate-900 dark:text-[#F5F5F5] focus:outline-none focus:border-brand-400 dark:border-brand-dark-accent"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-[#B4B4C8]">Fasilitas</label>
                <input
                  type="text"
                  value={filterFacility}
                  onChange={(e) => setFilterFacility(e.target.value)}
                  placeholder="Contoh: Proyektor"
                  className="w-full px-3 py-2 bg-brand-100 dark:bg-[#32324A] border border-slate-200 dark:border-[#3F3F5A]/50 rounded-lg text-slate-900 dark:text-[#F5F5F5] focus:outline-none focus:border-brand-400 dark:border-brand-dark-accent"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        layout
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <AnimatePresence mode="popLayout">
          {filteredRooms.map(room => (
            <motion.div 
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
              key={room.id} 
              className="bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 rounded-2xl border border-slate-200 dark:border-[#3F3F5A]/30 overflow-hidden flex flex-col hover:border-brand-400 dark:border-brand-dark-accent/50 transition-colors"
            >
              <div className="h-48 bg-brand-100 dark:bg-[#32324A] relative">
                {room.imageUrl ? (
                  <img src={room.imageUrl} alt={room.name} className="w-full h-full object-cover opacity-80" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600 dark:text-[#B4B4C8]">
                    <Building className="w-12 h-12 opacity-20" />
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    room.status === 'available' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {room.status === 'available' ? 'Tersedia' : 'Perbaikan'}
                  </span>
                </div>
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-slate-900 dark:text-[#F5F5F5] mb-1">{room.name}</h3>
                <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-[#B4B4C8] mb-4">
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {room.building} Lt. {room.floor}</span>
                  <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {room.capacity} Org</span>
                </div>
                
                <div className="mb-4 flex-1">
                  <p className="text-xs text-slate-600 dark:text-[#B4B4C8] font-medium mb-2 uppercase tracking-wider">Fasilitas:</p>
                  <div className="flex flex-wrap gap-2">
                    {room.facilities?.map((fas: string, idx: number) => (
                      <span key={idx} className="px-2 py-1 bg-brand-100 dark:bg-[#32324A] rounded-md text-xs text-brand-700 dark:text-brand-dark-accent">
                        {fas}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 mt-auto">
                  <button 
                    onClick={() => setInfoRoom(room)}
                    className="flex-1 py-2.5 bg-brand-100 dark:bg-[#32324A] text-brand-700 dark:text-brand-dark-accent font-bold rounded-xl hover:bg-brand-dark-hover hover:scale-[1.02] active:scale-[0.98] transition-all text-sm"
                  >
                    Info Lebih Lanjut
                  </button>
                  <button 
                    onClick={() => setSelectedRoom(room)}
                    disabled={room.status !== 'available'}
                    className="flex-1 py-2.5 bg-brand-dark-accent-light text-brand-dark-on-accent font-bold rounded-xl hover:bg-brand-dark-accent-hover hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm"
                  >
                    Pesan
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredRooms.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-600 dark:text-[#B4B4C8] bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 rounded-2xl border border-slate-200 dark:border-[#3F3F5A]/30">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Tidak ada ruangan yang ditemukan.</p>
          </div>
        )}
      </motion.div>

      {/* Info Modal */}
      <AnimatePresence>
        {infoRoom && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 w-[95vw] max-w-lg rounded-2xl shadow-xl border border-slate-200 dark:border-[#3F3F5A]/50 overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-slate-200 dark:border-[#3F3F5A]/30 flex justify-between items-center shrink-0">
                <h2 className="text-xl font-bold text-slate-900 dark:text-[#F5F5F5]">Detail {infoRoom.name}</h2>
                <button onClick={() => setInfoRoom(null)} className="text-slate-600 dark:text-[#B4B4C8] hover:text-slate-900 dark:text-[#F5F5F5] hover:scale-110 active:scale-90 transition-all">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 space-y-6 overflow-y-auto">
                {infoRoom.imageUrl ? (
                  <img src={infoRoom.imageUrl} alt={infoRoom.name} className="w-full h-48 object-cover rounded-xl" />
                ) : (
                  <div className="w-full h-48 bg-brand-100 dark:bg-[#32324A] rounded-xl flex items-center justify-center text-slate-600 dark:text-[#B4B4C8]">
                    <Building className="w-16 h-16 opacity-20" />
                  </div>
                )}
                
                <div className="flex gap-2 mb-4">
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                    infoRoom.status === 'available' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    Status: {infoRoom.status === 'available' ? 'Tersedia' : 'Perbaikan'}
                  </span>
                  <button 
                    onClick={() => {
                      setReportRoom(infoRoom);
                      setInfoRoom(null);
                    }}
                    className="flex items-center gap-1 text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors ml-auto"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    Laporkan Masalah
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 dark:text-[#B4B4C8]">
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider mb-1">Gedung / Lantai</span>
                    <span className="text-slate-900 dark:text-[#F5F5F5] text-base">{infoRoom.building} Lt. {infoRoom.floor}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider mb-1">Kapasitas</span>
                    <span className="text-slate-900 dark:text-[#F5F5F5] text-base">{infoRoom.capacity} Orang</span>
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-[#B4B4C8] mb-2">Fasilitas</span>
                  <div className="flex flex-wrap gap-2">
                    {infoRoom.facilities?.map((fas: string, idx: number) => (
                      <span key={idx} className="px-3 py-1.5 bg-brand-100 dark:bg-[#32324A] rounded-lg text-sm text-brand-700 dark:text-brand-dark-accent">
                        {fas}
                      </span>
                    ))}
                    {(!infoRoom.facilities || infoRoom.facilities.length === 0) && (
                      <span className="text-sm text-slate-600 dark:text-[#B4B4C8]">Tidak ada data fasilitas.</span>
                    )}
                  </div>
                </div>

                {infoRoom.rules && (
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-[#B4B4C8] mb-2">Peraturan Ruangan</span>
                    <div className="p-4 bg-brand-100 dark:bg-[#32324A]/50 border border-brand-300 dark:border-brand-dark-accent/30 rounded-xl flex gap-3 items-start">
                      <Info className="w-5 h-5 text-brand-700 dark:text-brand-dark-accent shrink-0 mt-0.5" />
                      <p className="text-sm text-slate-600 dark:text-[#B4B4C8] whitespace-pre-wrap">{infoRoom.rules}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-200 dark:border-[#3F3F5A]/30 shrink-0">
                <button 
                  onClick={() => {
                    setSelectedRoom(infoRoom);
                    setInfoRoom(null);
                  }}
                  disabled={infoRoom.status !== 'available'}
                  className="w-full py-2.5 bg-brand-dark-accent-light text-brand-dark-on-accent font-bold rounded-xl hover:bg-brand-dark-accent-hover hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  Pesan Ruangan Ini
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Booking Modal */}
      <AnimatePresence>
        {selectedRoom && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 w-[95vw] max-w-lg rounded-2xl shadow-xl border border-slate-200 dark:border-[#3F3F5A]/50 overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-slate-200 dark:border-[#3F3F5A]/30 flex justify-between items-center shrink-0">
                <h2 className="text-xl font-bold text-slate-900 dark:text-[#F5F5F5]">Pesan {selectedRoom.name}</h2>
                <button onClick={() => setSelectedRoom(null)} className="text-slate-600 dark:text-[#B4B4C8] hover:text-slate-900 dark:text-[#F5F5F5] hover:scale-110 active:scale-90 transition-all">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleBooking} className="flex flex-col overflow-hidden flex-1">
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                  {!profile?.profileCompleted && profile?.role !== 'admin' && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                        Profil Anda belum lengkap. Silakan lengkapi data diri di halaman Profil agar dapat mengajukan pemesanan.
                      </p>
                    </div>
                  )}
                  {selectedRoom.rules && (
                    <div className="p-4 bg-brand-100 dark:bg-[#32324A]/50 border border-brand-300 dark:border-brand-dark-accent/30 rounded-xl flex gap-3 items-start">
                      <Info className="w-5 h-5 text-brand-700 dark:text-brand-dark-accent shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-brand-700 dark:text-brand-dark-accent mb-1">Peraturan Ruangan</h4>
                        <p className="text-sm text-slate-600 dark:text-[#B4B4C8] whitespace-pre-wrap">{selectedRoom.rules}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-[#B4B4C8]">Pilih Tanggal</label>
                      <input 
                        type="date" 
                        required
                        min={format(new Date(), 'yyyy-MM-dd')}
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full px-3 py-2 bg-brand-100 dark:bg-[#32324A] border border-slate-200 dark:border-[#3F3F5A]/50 rounded-lg text-slate-900 dark:text-[#F5F5F5] focus:outline-none focus:border-brand-400 dark:border-brand-dark-accent"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-[#B4B4C8]">Jumlah SKS</label>
                      <div className="flex gap-2">
                        {[2, 3].map((sks) => (
                          <button
                            key={sks}
                            type="button"
                            onClick={() => {
                              setSelectedSks(sks as 2 | 3);
                              setSelectedSlot(null);
                            }}
                            className={cn(
                              "flex-1 py-2 rounded-lg font-bold border transition-all",
                              selectedSks === sks
                                ? "bg-brand-dark-accent-light text-brand-dark-on-accent border-brand-400"
                                : "bg-brand-100 dark:bg-[#32324A] text-slate-600 dark:text-[#B4B4C8] border-slate-200 dark:border-[#3F3F5A]/50"
                            )}
                          >
                            {sks} SKS
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-[#B4B4C8]">Pilih Slot Waktu</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                        {generateSlots().map((slot) => {
                          const isConflict = checkSlotConflict(slot.start, slot.end);
                          return (
                            <button
                              key={slot.start}
                              type="button"
                              disabled={isConflict}
                              onClick={() => setSelectedSlot(slot.start)}
                              className={cn(
                                "py-2 px-1 rounded-lg text-[11px] font-medium border transition-all flex flex-col items-center justify-center",
                                isConflict
                                  ? "bg-slate-100 dark:bg-[#2A2A3C] text-slate-400 border-slate-200 dark:border-[#3F3F5A]/30 cursor-not-allowed opacity-50"
                                  : selectedSlot === slot.start
                                    ? "bg-brand-dark-accent-light text-brand-dark-on-accent border-brand-400 shadow-lg shadow-brand-dark-accent-light/20"
                                    : "bg-white dark:bg-[#32324A] text-slate-700 dark:text-[#F5F5F5] border-slate-200 dark:border-[#3F3F5A]/50 hover:border-brand-400"
                              )}
                            >
                              <span className="font-bold">{slot.start}</span>
                              <span className="opacity-60 text-[9px]">{slot.end}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {selectedDate && selectedSlot && (
                    <div className="p-3 bg-slate-50 dark:bg-[#32324A]/30 border border-slate-200 dark:border-[#3F3F5A]/30 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-[#B4B4C8]">Status Ketersediaan:</p>
                          {isCheckingAvailability && <Loader2 className="w-3 h-3 animate-spin text-brand-600" />}
                        </div>
                      </div>
                      {isCheckingAvailability ? (
                        <div className="flex items-center gap-2 text-slate-400 text-sm font-medium animate-pulse">
                          <Clock className="w-4 h-4" />
                          Memeriksa ketersediaan...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-green-500 dark:text-green-400 text-sm font-medium">
                          <CheckCircle className="w-4 h-4" />
                          Slot tersedia untuk dipesan.
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-[#B4B4C8]">Alasan Pemesanan</label>
                    <textarea 
                      required
                      rows={3}
                      value={bookingReason}
                      onChange={(e) => setBookingReason(e.target.value)}
                      placeholder="Contoh: Kelas pengganti mata kuliah RPL..."
                      className="w-full px-3 py-2 bg-brand-100 dark:bg-[#32324A] border border-slate-200 dark:border-[#3F3F5A]/50 rounded-lg text-slate-900 dark:text-[#F5F5F5] placeholder:text-slate-600 dark:text-[#B4B4C8]/50 focus:outline-none focus:border-brand-400 dark:border-brand-dark-accent resize-none"
                    ></textarea>
                  </div>
                </div>

                <div className="p-6 border-t border-slate-200 dark:border-[#3F3F5A]/30 flex gap-3 shrink-0 bg-white dark:bg-[#27273A]">
                  <button 
                    type="button"
                    onClick={() => setSelectedRoom(null)}
                    className="flex-1 py-2.5 bg-transparent border border-brand-dark-border-strong text-slate-600 dark:text-[#B4B4C8] font-bold rounded-xl hover:bg-brand-100 dark:bg-[#32324A] hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    disabled={isBooking || (!profile?.profileCompleted && profile?.role !== 'admin')}
                    className="flex-1 py-2.5 bg-brand-dark-accent-light text-brand-dark-on-accent font-bold rounded-xl hover:bg-brand-dark-accent-hover hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                  >
                    {isBooking ? <><Loader2 className="w-5 h-5 animate-spin" /> Memproses...</> : 'Ajukan Pesanan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
          >
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 p-8 rounded-3xl border border-brand-400 dark:border-brand-dark-accent/50 shadow-2xl shadow-brand-dark-accent-light/20 flex flex-col items-center text-center max-w-sm w-[90vw]"
            >
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-[#F5F5F5] mb-2">Booking Berhasil!</h3>
              <p className="text-slate-600 dark:text-[#B4B4C8]">Pesanan Anda telah diajukan dan sedang menunggu verifikasi admin.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Modal */}
      <ReportIssueModal 
        isOpen={!!reportRoom}
        onClose={() => setReportRoom(null)}
        initialRoomId={reportRoom?.id}
        initialRoomName={reportRoom?.name}
      />
    </div>
  );
}
