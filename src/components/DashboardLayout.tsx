import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Search, 
  CalendarDays, 
  FileText, 
  LogOut, 
  Users,
  Building,
  Menu,
  X,
  Bell,
  User,
  HelpCircle,
  AlertCircle,
  Moon,
  Sun
} from 'lucide-react';
import { cn } from '../lib/utils';
import { collection, query, where, onSnapshot, writeBatch, doc, serverTimestamp, updateDoc, or } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

import { useData } from '../contexts/DataContext';

export default function DashboardLayout() {
  const { profile, logout } = useAuth();
  const { loadingRooms, loadingBookings } = useData();
  const { theme, toggleTheme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Set role-based theme colors
  useEffect(() => {
    const root = document.documentElement;
    if (profile?.role === 'dosen') {
      // Blue / Navy theme
      const accent = '#3b82f6'; // Blue 500
      root.style.setProperty('--brand-50', '#eff6ff');
      root.style.setProperty('--brand-100', '#dbeafe');
      root.style.setProperty('--brand-200', '#bfdbfe');
      root.style.setProperty('--brand-300', '#93c5fd');
      root.style.setProperty('--brand-400', '#60a5fa');
      root.style.setProperty('--brand-500', accent);
      root.style.setProperty('--brand-600', accent);
      root.style.setProperty('--brand-700', '#1d4ed8');
      root.style.setProperty('--brand-800', '#1e40af');
      root.style.setProperty('--brand-900', '#1e3a8a');
      
      root.style.setProperty('--brand-dark-accent', accent);
      root.style.setProperty('--brand-dark-accent-light', '#bfdbfe');
      root.style.setProperty('--brand-dark-on-accent', '#1e3a8a');
      root.style.setProperty('--brand-dark-accent-hover', '#60a5fa');
      root.style.setProperty('--brand-dark-hover', '#1e40af');
      root.style.setProperty('--brand-dark-border-strong', accent);
    } else if (profile?.role === 'admin') {
      // Emerald / Teal theme
      const accent = '#10b981'; // Emerald 500
      root.style.setProperty('--brand-50', '#ecfdf5');
      root.style.setProperty('--brand-100', '#d1fae5');
      root.style.setProperty('--brand-200', '#a7f3d0');
      root.style.setProperty('--brand-300', '#6ee7b7');
      root.style.setProperty('--brand-400', '#34d399');
      root.style.setProperty('--brand-500', accent);
      root.style.setProperty('--brand-600', accent);
      root.style.setProperty('--brand-700', '#047857');
      root.style.setProperty('--brand-800', '#065f46');
      root.style.setProperty('--brand-900', '#064e3b');
      
      root.style.setProperty('--brand-dark-accent', accent);
      root.style.setProperty('--brand-dark-accent-light', '#a7f3d0');
      root.style.setProperty('--brand-dark-on-accent', '#064e3b');
      root.style.setProperty('--brand-dark-accent-hover', '#34d399');
      root.style.setProperty('--brand-dark-hover', '#065f46');
      root.style.setProperty('--brand-dark-border-strong', accent);
    } else {
      // Mahasiswa (Purple theme)
      const accent = '#8b5cf6'; // Violet 500
      root.style.setProperty('--brand-50', '#faf5ff');
      root.style.setProperty('--brand-100', '#f3e8ff');
      root.style.setProperty('--brand-200', '#e9d5ff');
      root.style.setProperty('--brand-300', '#d8b4fe');
      root.style.setProperty('--brand-400', '#c084fc');
      root.style.setProperty('--brand-500', accent);
      root.style.setProperty('--brand-600', accent);
      root.style.setProperty('--brand-700', '#7e22ce');
      root.style.setProperty('--brand-800', '#6b21a8');
      root.style.setProperty('--brand-900', '#581c87');
      
      root.style.setProperty('--brand-dark-accent', accent);
      root.style.setProperty('--brand-dark-accent-light', '#d1a6ff');
      root.style.setProperty('--brand-dark-on-accent', '#3a0a67');
      root.style.setProperty('--brand-dark-accent-hover', '#c084fc');
      root.style.setProperty('--brand-dark-hover', '#4a1f76');
      root.style.setProperty('--brand-dark-border-strong', accent);
    }

    // Cleanup on unmount (reset to base neutral theme)
    return () => {
      root.style.removeProperty('--brand-50');
      root.style.removeProperty('--brand-100');
      root.style.removeProperty('--brand-200');
      root.style.removeProperty('--brand-300');
      root.style.removeProperty('--brand-400');
      root.style.removeProperty('--brand-500');
      root.style.removeProperty('--brand-600');
      root.style.removeProperty('--brand-700');
      root.style.removeProperty('--brand-800');
      root.style.removeProperty('--brand-900');
      
      root.style.removeProperty('--brand-dark-accent');
      root.style.removeProperty('--brand-dark-accent-light');
      root.style.removeProperty('--brand-dark-on-accent');
      root.style.removeProperty('--brand-dark-accent-hover');
      root.style.removeProperty('--brand-dark-hover');
      root.style.removeProperty('--brand-dark-border-strong');
    };
  }, [profile?.role]);

  // Close sidebar on route change on mobile
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch notifications based on role and userId
  useEffect(() => {
    if (!profile) return;
    
    // Listen to notifications where targetRole is current role OR userId is current user
    let q;
    if (profile.role === 'admin' || profile.role === 'staff') {
      q = query(
        collection(db, 'notifications'),
        or(
          where('userId', '==', profile.uid),
          where('targetRole', '==', 'admin')
        )
      );
    } else {
      q = query(
        collection(db, 'notifications'), 
        or(
          where('userId', '==', profile.uid),
          where('targetRole', '==', profile.role)
        )
      );
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          // Show toast for new, unread notifications created recently (last 10s)
          // to avoid spamming on initial component load or old unread notifs
          if (!data.isRead && data.createdAt) {
            const now = Date.now();
            const createdAt = data.createdAt.toMillis?.() || now;
            if (now - createdAt < 10000) {
              toast(data.title, {
                icon: '🔔',
                duration: 4000,
              });
            }
          }
        }
      });

      if (!snapshot.empty) {
        const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any))
          .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.isRead).length);
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    }, (error) => {
      console.error("Notification listener error:", error);
    });
    return () => unsubscribe();
  }, [profile]);

  const markAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (unreadCount === 0) return;
    const batch = writeBatch(db);
    notifications.filter(n => !n.isRead).forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { isRead: true });
    });
    await batch.commit();
  };

  const handleNotificationClick = async (notif: any) => {
    if (!notif.isRead) {
      await updateDoc(doc(db, 'notifications', notif.id), { isRead: true });
    }
    // Navigate to the module if meta path is provided, otherwise to general messages
    if (notif.meta) {
      navigate(notif.meta);
    } else {
      navigate('/pesan');
    }
  };

  const handleLogout = async () => {
    setTheme('dark');
    await logout();
    navigate('/login');
  };

  const getNavItems = () => {
    if (!profile) return [];
    
    let items = [];
    switch (profile.role) {
      case 'mahasiswa':
        items = [
          { name: 'Beranda', path: '/dashboard', icon: LayoutDashboard },
          { name: 'Cari Ruangan', path: '/ruangan', icon: Search },
          { name: 'Pesanan Saya', path: '/pesanan', icon: CalendarDays },
          { name: 'Laporan', path: '/laporan', icon: FileText },
        ];
        break;
      case 'dosen':
        items = [
          { name: 'Beranda', path: '/dashboard', icon: LayoutDashboard },
          { name: 'Pesan Ruangan', path: '/ruangan', icon: Search },
          { name: 'Status Booking', path: '/pesanan', icon: CalendarDays },
          { name: 'Laporan', path: '/laporan', icon: FileText },
        ];
        break;
      case 'admin':
        items = [
          { name: 'Verifikasi', path: '/dashboard', icon: LayoutDashboard },
          { name: 'Kelola Ruangan', path: '/admin/ruangan', icon: Building },
          { name: 'Manajemen Pengguna', path: '/admin/users', icon: Users },
          { name: 'Laporan & Audit', path: '/admin/laporan', icon: FileText },
        ];
        break;
      default:
        items = [];
    }
    
    // Add common items
    if (profile.role !== 'admin') {
      items.push({ name: 'Bantuan', path: '/bantuan', icon: HelpCircle });
    }
    
    return items;
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#1E1E2F] text-slate-900 dark:text-[#F5F5F5] flex overflow-hidden transition-colors duration-200">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed md:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 border-r border-slate-200 dark:border-[#3F3F5A]/30 flex flex-col transition-transform duration-300 ease-in-out",
          isSidebarOpen ? "translate-x-0 active" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-brand-700 dark:text-brand-dark-accent tracking-tight">CampusBook</h1>
            <p className="text-xs text-slate-600 dark:text-[#B4B4C8] mt-1 capitalize">
              {profile?.role === 'admin' || profile?.role === 'staff' ? 'Admin/Staff' : profile?.role} Portal
            </p>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-slate-500 dark:text-[#B4B4C8] hover:text-brand-700 dark:hover:text-brand-dark-accent transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 transition-all duration-200 group border-l-4",
                  isActive 
                    ? "bg-brand-50 dark:bg-[#32324A] text-brand-700 dark:text-brand-dark-accent border-brand-600 dark:border-[#9D8DF1] rounded-r-xl rounded-l-sm shadow-sm" 
                    : "border-transparent text-slate-600 dark:text-[#B4B4C8] hover:bg-slate-100 dark:hover:bg-[#2A2A3D] hover:text-slate-900 dark:hover:text-[#F5F5F5] hover:border-slate-300 dark:hover:border-[#4A4A6A] rounded-xl hover:rounded-r-xl hover:rounded-l-sm"
                )}
              >
                <Icon className={cn(
                  "w-5 h-5 transition-colors",
                  isActive ? "text-brand-600 dark:text-brand-dark-accent" : "text-slate-400 dark:text-[#6A6A8A] group-hover:text-brand-600 dark:group-hover:text-brand-dark-accent"
                )} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-[#3F3F5A]/30">
          <Link 
            to="/profil"
            className="flex items-center gap-3 px-4 py-3 mb-2 border-l-4 border-transparent rounded-xl hover:rounded-r-xl hover:rounded-l-sm hover:border-slate-300 dark:hover:border-[#4A4A6A] hover:bg-slate-100 dark:hover:bg-[#2A2A3D] transition-all cursor-pointer group relative"
          >
            <div className="w-8 h-8 rounded-full bg-brand-200 dark:bg-brand-dark-accent-light text-brand-900 dark:text-white flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
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
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-slate-900 dark:text-[#F5F5F5] group-hover:text-brand-700 dark:group-hover:text-brand-dark-accent transition-colors">{profile?.name}</p>
              <p className="text-xs text-slate-500 dark:text-[#B4B4C8] truncate">
                {profile?.profileCompleted ? 'Kelola Profil' : 'Lengkapi Profil ⚠️'}
              </p>
            </div>
          </Link>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-l-4 border-transparent hover:rounded-r-xl hover:rounded-l-sm hover:border-red-200 dark:hover:border-red-900/50 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all group"
          >
            <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="font-medium">Keluar</span>
          </button>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 w-full max-w-sm rounded-2xl shadow-xl border border-slate-200 dark:border-[#3F3F5A]/50 overflow-hidden p-6 text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-[#F5F5F5] mb-2">Konfirmasi Keluar</h3>
              <p className="text-slate-600 dark:text-[#B4B4C8] text-sm mb-6">Apakah Anda yakin ingin keluar dari akun Anda? Anda perlu masuk kembali untuk mengakses layanan.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2.5 bg-transparent border border-slate-200 dark:border-[#3F3F5A]/30 text-slate-600 dark:text-[#B4B4C8] font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-[#32324A] transition-all"
                >
                  Batal
                </button>
                <button 
                  onClick={handleLogout}
                  className="flex-1 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all"
                >
                  Ya, Keluar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen">
        <header className="h-16 shrink-0 bg-white/80 dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20/50 backdrop-blur-md border-b border-slate-200 dark:border-[#3F3F5A]/30 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 transition-colors duration-200">
          <div className="flex items-center">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="mr-4 p-2 -ml-2 rounded-lg text-slate-600 dark:text-[#B4B4C8] hover:text-brand-700 dark:hover:text-brand-dark-accent hover:bg-brand-50 dark:hover:bg-[#32324A] transition-colors md:hidden"
              aria-label="Buka menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-[#F5F5F5] truncate">
              {navItems.find(item => item.path === location.pathname)?.name || 'Dashboard'}
            </h2>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={toggleTheme}
              className="p-2 text-slate-600 dark:text-[#B4B4C8] hover:text-brand-700 dark:hover:text-brand-dark-accent hover:bg-brand-50 dark:hover:bg-[#32324A] rounded-full transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            <div className="relative inline-block group">
              <button 
                className="p-2 text-slate-600 dark:text-[#B4B4C8] hover:text-brand-700 dark:hover:text-brand-dark-accent hover:bg-brand-50 dark:hover:bg-[#32324A] rounded-full transition-colors relative"
                aria-label="Notifikasi"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-[#27273A]">
                    {unreadCount}
                  </span>
                )}
              </button>
              
              {/* Notification Dropdown with Technical Solution positioning */}
              <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-[#27273A] dark:shadow-2xl dark:shadow-black/40 border border-slate-200 dark:border-[#3F3F5A]/50 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 origin-top-right z-[60] text-left">
                {/* Animation Container (Suggested slide-down) */}
                <div className="transform translate-y-[-10px] group-hover:translate-y-0 transition-transform duration-300 ease-out">
                  <div className="p-3 border-b border-slate-200 dark:border-[#3F3F5A]/30 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-900 dark:text-[#F5F5F5] text-sm">Notifikasi</h3>
                    {unreadCount > 0 && (
                      <span onClick={markAllRead} className="text-xs text-brand-600 dark:text-brand-dark-accent font-medium cursor-pointer hover:underline">
                        Tandai semua dibaca
                      </span>
                    )}
                  </div>
                  <div className="p-2 max-h-80 overflow-y-auto space-y-1 custom-scrollbar">
                    {notifications.length === 0 ? (
                      <p className="text-center text-sm text-slate-500 py-4">Belum ada notifikasi</p>
                    ) : (
                      notifications.map(notif => {
                        let IconComponent = Bell;
                        let iconColorClass = 'text-slate-600 dark:text-[#B4B4C8]';
                        let badgeColorClass = 'bg-slate-500';
                        let badgeText = '';

                        // Category: Booking
                        if (['booking', 'approved', 'rejected', 'reminder'].includes(notif.type)) {
                          IconComponent = CalendarDays;
                          iconColorClass = 'text-blue-500 dark:text-blue-400';
                          if (notif.type === 'approved') {
                            badgeColorClass = 'bg-green-500';
                            badgeText = 'Disetujui';
                          } else if (notif.type === 'rejected') {
                            badgeColorClass = 'bg-red-500';
                            badgeText = 'Ditolak';
                          } else if (notif.type === 'reminder') {
                            badgeColorClass = 'bg-amber-500';
                            badgeText = 'Ingat';
                          }
                        } 
                        // Category: Laporan / Issue
                        else if (['issue', 'laporan', 'report'].includes(notif.type)) {
                          IconComponent = AlertCircle;
                          iconColorClass = 'text-amber-500 dark:text-amber-400';
                          if (notif.title.toLowerCase().includes('selesai') || notif.message.toLowerCase().includes('selesai')) {
                            badgeColorClass = 'bg-green-500';
                            badgeText = 'Selesai';
                          }
                        }
                        // Category: Info
                        else {
                          IconComponent = Bell;
                          iconColorClass = 'text-brand-500 dark:text-brand-dark-accent';
                        }

                        return (
                          <div 
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={cn(
                              "p-3 rounded-lg cursor-pointer transition-colors flex gap-3 items-start relative group/item",
                              notif.isRead 
                                ? "opacity-75 hover:bg-slate-50 dark:hover:bg-[#32324A]/30" 
                                : "bg-brand-50/50 dark:bg-[#32324A]/50 border border-brand-100 dark:border-brand-800/30 hover:bg-brand-100/50 dark:hover:bg-[#32324A]"
                            )}
                          >
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 bg-slate-100 dark:bg-[#1E1E2F] border border-slate-200 dark:border-[#3F3F5A]/50 transition-transform group-hover/item:scale-110", iconColorClass)}>
                              <IconComponent className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <p className={cn("text-sm text-slate-900 dark:text-[#F5F5F5] truncate font-bold")}>
                                  {notif.title}
                                </p>
                                {badgeText && (
                                  <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full text-white font-extrabold uppercase tracking-wider", badgeColorClass)}>
                                    {badgeText}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] leading-relaxed text-slate-600 dark:text-[#B4B4C8] mt-1 line-clamp-2">
                                {notif.message}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                {notif.meta && (
                                  <span className="text-[9px] text-brand-600 dark:text-brand-dark-accent font-bold bg-brand-50 dark:bg-brand-dark-accent/10 px-2 py-0.5 rounded lowercase italic">
                                    {notif.meta}
                                  </span>
                                )}
                                <span className="text-[8px] text-slate-400 dark:text-[#B4B4C8]/40 ml-auto">
                                  {notif.createdAt ? new Date(notif.createdAt.toMillis()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                              </div>
                            </div>
                            {!notif.isRead && (
                              <div className="absolute top-3 right-3 w-2 h-2 bg-brand-500 rounded-full shadow-lg shadow-brand-500/50"></div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="p-2 border-t border-slate-200 dark:border-[#3F3F5A]/30 text-center">
                    <Link to="/pesan" className="text-xs text-brand-600 dark:text-brand-dark-accent font-bold hover:underline">Baca Semua Pesan</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto flex flex-col focus:outline-none relative">
          {/* Profile Completion Prompt */}
          {profile && !profile.profileCompleted && location.pathname !== '/profil' && (
            <div className="bg-brand-50/50 dark:bg-brand-dark-accent-light/5 border-b border-brand-200 dark:border-brand-dark-accent-light/20 px-4 md:px-8 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-brand-100 dark:bg-brand-dark-accent-light/10 p-2 rounded-full">
                  <AlertCircle className="w-5 h-5 text-brand-600 dark:text-brand-dark-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Profil Anda Belum Lengkap</p>
                  <p className="text-xs text-slate-500 dark:text-[#B4B4C8]">Lengkapi NIM dan No. WhatsApp untuk menggunakan fitur pemesanan ruangan.</p>
                </div>
              </div>
              <Link 
                to="/profil"
                className="px-4 py-1.5 bg-brand-600 dark:bg-brand-dark-accent text-white dark:text-brand-dark-on-accent text-xs font-bold rounded-lg hover:shadow-lg transition-all whitespace-nowrap"
              >
                Lengkapi Sekarang
              </Link>
            </div>
          )}
          <div className="p-4 md:p-8 flex-1">
            <Outlet />
          </div>
          <footer className="px-4 md:px-8 py-4 border-t border-slate-200 dark:border-[#3F3F5A]/30 text-[10px] text-slate-400 dark:text-[#B4B4C8]/30 text-center mt-auto">
            © 2026 CampusBook • Modern Academic Experience • Made with ❤️ for Campus Innovation
          </footer>
        </div>
      </main>
    </div>
  );
}
