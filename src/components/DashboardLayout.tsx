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
  Moon,
  Sun
} from 'lucide-react';
import { cn } from '../lib/utils';
import { collection, query, where, onSnapshot, writeBatch, doc, serverTimestamp, updateDoc, or } from 'firebase/firestore';
import { db } from '../lib/firebase';

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
    const q = query(
      collection(db, 'notifications'), 
      or(
        where('userId', '==', profile.uid),
        where('targetRole', '==', profile.role)
      )
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any))
          .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.isRead).length);
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
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
    navigate('/pesanan');
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
            <p className="text-xs text-slate-600 dark:text-[#B4B4C8] mt-1 capitalize">{profile?.role} Portal</p>
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
            className="flex items-center gap-3 px-4 py-3 mb-2 border-l-4 border-transparent rounded-xl hover:rounded-r-xl hover:rounded-l-sm hover:border-slate-300 dark:hover:border-[#4A4A6A] hover:bg-slate-100 dark:hover:bg-[#2A2A3D] transition-all cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-brand-200 dark:bg-brand-dark-accent-light text-brand-900 dark:text-white flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
              {profile?.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-slate-900 dark:text-[#F5F5F5] group-hover:text-brand-700 dark:group-hover:text-brand-dark-accent transition-colors">{profile?.name}</p>
              <p className="text-xs text-slate-500 dark:text-[#B4B4C8] truncate">Kelola Profil</p>
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
            
            <button className="relative p-2 text-slate-600 dark:text-[#B4B4C8] hover:text-brand-700 dark:hover:text-brand-dark-accent hover:bg-brand-50 dark:hover:bg-[#32324A] rounded-full transition-colors group">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-[#27273A]">
                  {unreadCount}
                </span>
              )}
              
              {/* Notification Dropdown */}
              <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 border border-slate-200 dark:border-[#3F3F5A]/50 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 origin-top-right z-50 text-left">
                <div className="p-3 border-b border-slate-200 dark:border-[#3F3F5A]/30 flex justify-between items-center">
                  <h3 className="font-semibold text-slate-900 dark:text-[#F5F5F5] text-sm">Notifikasi</h3>
                  {unreadCount > 0 && (
                    <span onClick={markAllRead} className="text-xs text-brand-600 dark:text-brand-dark-accent font-medium cursor-pointer hover:underline">
                      Tandai semua dibaca
                    </span>
                  )}
                </div>
                <div className="p-2 max-h-80 overflow-y-auto space-y-1">
                  
                  {notifications.length === 0 ? (
                    <p className="text-center text-sm text-slate-500 py-4">Belum ada notifikasi</p>
                  ) : (
                    notifications.map(notif => {
                      let icon = '🔔';
                      let bgClass = '';
                      if (notif.type === 'reminder') { icon = '⏰'; bgClass = 'bg-blue-100 dark:bg-blue-800/50 text-blue-600 dark:text-blue-400'; }
                      if (notif.type === 'approved') { icon = '✅'; bgClass = 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'; }
                      if (notif.type === 'rejected') { icon = '❌'; bgClass = 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'; }

                      return (
                        <div 
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className={cn(
                            "p-3 rounded-lg cursor-pointer transition-colors flex gap-3 items-start",
                            notif.isRead 
                              ? "opacity-75 hover:bg-slate-50 dark:hover:bg-[#32324A]/30" 
                              : "bg-brand-50/50 dark:bg-[#32324A]/50 border border-brand-100 dark:border-brand-800/30 hover:bg-brand-100/50 dark:hover:bg-[#32324A]"
                          )}
                        >
                          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5", bgClass)}>
                            <span className="text-lg">{icon}</span>
                          </div>
                          <div>
                            <p className={cn("text-sm text-slate-900 dark:text-[#F5F5F5]", notif.isRead ? "font-medium" : "font-bold")}>
                              {notif.title}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-[#B4B4C8] mt-1">{notif.message}</p>
                            {notif.meta && (
                              <p className="text-[10px] text-slate-500 dark:text-[#B4B4C8]/70 mt-1 font-medium bg-white/50 dark:bg-black/20 inline-block px-2 py-0.5 rounded">
                                {notif.meta}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}

                </div>
                <div className="p-2 border-t border-slate-200 dark:border-[#3F3F5A]/30 text-center">
                  <Link to="/pesanan" className="text-xs text-brand-600 dark:text-brand-dark-accent font-bold hover:underline">Lihat Semua Pesanan</Link>
                </div>
              </div>
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-8 relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
