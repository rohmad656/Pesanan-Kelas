import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, writeBatch, serverTimestamp, orderBy, limit, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { AlertTriangle, CheckCircle, Clock, ShieldCheck, User } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AuditReports() {
  const [issues, setIssues] = useState<any[]>([]);
  const [loginLogs, setLoginLogs] = useState<any[]>([]);
  const [logLimit, setLogLimit] = useState(10);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  useEffect(() => {
    // Listen to issues
    const qIssues = query(collection(db, 'issues'), orderBy('createdAt', 'desc'));
    const unsubscribeIssues = onSnapshot(qIssues, (snapshot) => {
      const issuesData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      setIssues(issuesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'issues');
    });

    return () => {
      unsubscribeIssues();
    };
  }, []);

  useEffect(() => {
    setIsLoadingLogs(true);
    // Listen to login audit logs
    let qLoginLogs = query(
      collection(db, 'audit_logs'), 
      where('action', '==', 'LOGIN'), 
      orderBy('timestamp', 'desc'), 
      limit(logLimit)
    );
    
    // Note: Firestore doesn't support complex "contains" filters easily on unstructured details strings
    // but the system already appends role to details: "logged in with role ..."
    // For a cleaner implementation, we filter the results in memory if roleFilter is set,
    // although a dedicated 'role' field in audit_logs would be better in the long run.
    
    const unsubscribeLogins = onSnapshot(qLoginLogs, (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      
      // Filter by role if needed
      const filtered = roleFilter === 'all' 
        ? logsData 
        : logsData.filter(log => {
            const roleMatch = roleFilter.toLowerCase();
            if (roleMatch === 'admin') {
              return log.details?.toLowerCase().includes(`role admin`) || log.details?.toLowerCase().includes(`role staff`);
            }
            return log.details?.toLowerCase().includes(`role ${roleMatch}`);
          });
        
      setLoginLogs(filtered);
      setIsLoadingLogs(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'audit_logs');
      setIsLoadingLogs(false);
    });

    return () => {
      unsubscribeLogins();
    };
  }, [logLimit, roleFilter]);

  const handleResolve = async (issue: any) => {
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'issues', issue.id), { status: 'resolved' });
      
      if (issue.userId) {
        batch.set(doc(collection(db, 'notifications')), {
          userId: issue.userId,
          title: '✅ Laporan Selesai Diperbaiki',
          message: `Laporan kerusakan di ${issue.roomName || issue.roomId} telah diselesaikan oleh admin. Terima kasih!`,
          type: 'approved',
          isRead: false,
          createdAt: serverTimestamp(),
          meta: '/laporan'
        });
      }
      
      await batch.commit();
      toast.success('Laporan berhasil diselesaikan');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `issues/${issue.id}`);
    }
  };

  const getLogTypeColor = (details: string = '') => {
    const detailsLower = details.toLowerCase();
    if (detailsLower.includes('role admin') || detailsLower.includes('role staff')) return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20';
    if (detailsLower.includes('role dosen')) return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
    return 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40';
  };

  return (
    <div className="animate-fade-in space-y-8 max-w-6xl mx-auto pb-12">
      <div className="bg-gradient-to-br from-brand-50 to-white dark:from-[#32324A] dark:to-[#1E1E2F] p-8 rounded-3xl border border-slate-200 dark:border-[#3F3F5A]/30 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-200 dark:bg-brand-900/20 blur-3xl opacity-50 -mr-16 -mt-16 rounded-full" />
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-[#F5F5F5] mb-2">Laporan & Pusat Audit</h1>
        <p className="text-slate-600 dark:text-[#B4B4C8] text-sm font-medium">Monitoring integritas sistem, keamanan login, dan laporan fasilitas kampus.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Monitoring Fasilitas */}
        <div className="bg-white dark:bg-[#27273A] dark:shadow-xl dark:shadow-black/20 rounded-2xl border border-slate-200 dark:border-[#3F3F5A]/30 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-[#3F3F5A]/30 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-[#F5F5F5] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Monitoring Fasilitas
            </h3>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{issues.length} Laporan</span>
          </div>
          
          <div className="p-0">
            {issues.length === 0 ? (
              <div className="text-center py-20 text-slate-600 dark:text-[#B4B4C8]">
                <div className="w-16 h-16 bg-slate-100 dark:bg-[#32324A] rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 opacity-20" />
                </div>
                <p className="font-semibold italic">Semua fasilitas dalam kondisi baik.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-[#3F3F5A]/20">
                {issues.map((issue) => (
                  <div key={issue.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-slate-50/50 dark:hover:bg-[#32324A]/20 transition-all duration-300">
                    <div className="flex gap-5">
                      <div className={`mt-1 shrink-0 p-3 rounded-xl ${issue.status === 'resolved' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                        {issue.status === 'resolved' ? <CheckCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-bold text-slate-900 dark:text-[#F5F5F5] text-lg">Ruangan: {issue.roomName || issue.roomId}</h4>
                          {issue.severity && (
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                              issue.severity === 'high' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 
                              issue.severity === 'medium' ? 'bg-orange-500 text-white' : 
                              'bg-blue-500 text-white'
                            }`}>
                              {issue.severity === 'high' ? 'Darurat' : issue.severity === 'medium' ? 'Penting' : 'Minor'}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-[#B4B4C8] leading-relaxed">{issue.description}</p>
                        <div className="flex items-center gap-3 mt-4 text-[11px] font-medium text-slate-400">
                          <span className="flex items-center gap-1"><User className="w-3 h-3" /> {issue.userName || issue.userId}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {issue.createdAt ? new Date(issue.createdAt.toMillis()).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}</span>
                        </div>
                      </div>
                    </div>
                    
                    {issue.status !== 'resolved' && (
                      <button 
                        onClick={() => handleResolve(issue)}
                        className="px-6 py-3 rounded-xl bg-slate-900 dark:bg-[#32324A] text-white dark:text-brand-dark-accent hover:bg-brand-600 dark:hover:bg-[#3F3F5A] hover:scale-105 active:scale-95 transition-all text-xs font-bold shadow-lg shadow-slate-200 dark:shadow-none whitespace-nowrap"
                      >
                        Tandai Selesai
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Login Audit Section */}
        <div className="bg-white dark:bg-[#27273A] dark:shadow-xl dark:shadow-black/20 rounded-2xl border border-slate-200 dark:border-[#3F3F5A]/30 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-[#3F3F5A]/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-brand-700 dark:text-brand-dark-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-[#F5F5F5]">Audit Jejak Digital</h3>
                  <p className="text-xs text-slate-500 font-medium">Monitoring aktivitas login dan integritas sesi pengguna.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select 
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="text-xs font-bold uppercase bg-slate-50 dark:bg-[#1E1E2F] border-none rounded-lg px-3 py-2 text-slate-600 dark:text-[#B4B4C8] focus:ring-2 focus:ring-brand-500 cursor-pointer"
                >
                  <option value="all">Semua Peran</option>
                  <option value="mahasiswa">Mahasiswa</option>
                  <option value="dosen">Dosen</option>
                  <option value="admin">Admin/Staff</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <span className="text-[10px] font-black uppercase text-slate-400 mr-2">Tampilkan:</span>
              {[10, 50, 100].map(val => (
                <button
                  key={val}
                  onClick={() => setLogLimit(val)}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                    logLimit === val 
                      ? 'bg-brand-600 text-white shadow-md' 
                      : 'bg-slate-100 dark:bg-[#32324A] text-slate-500 hover:bg-slate-200 dark:hover:bg-[#3F3F5A]'
                  }`}
                >
                  {val} Log
                </button>
              ))}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-[#32324A]/50 text-slate-400 border-b border-slate-100 dark:border-[#3F3F5A]/20">
                <tr>
                  <th className="px-8 py-4 font-black uppercase tracking-wider text-[10px]">Waktu Akses</th>
                  <th className="px-8 py-4 font-black uppercase tracking-wider text-[10px]">Identitas Digital (UID)</th>
                  <th className="px-8 py-4 font-black uppercase tracking-wider text-[10px] text-right">Parameter Login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-[#3F3F5A]/10">
                {isLoadingLogs ? (
                  <tr>
                    <td colSpan={3} className="px-8 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-bold text-slate-400 animate-pulse uppercase">Sinkronisasi Data...</span>
                      </div>
                    </td>
                  </tr>
                ) : loginLogs.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-8 py-12 text-center text-slate-500 italic">Data audit tidak ditemukan untuk kriteria ini.</td>
                  </tr>
                ) : (
                  loginLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-brand-50/10 dark:hover:bg-brand-dark-accent/10 transition-colors group">
                      <td className="px-8 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3 text-slate-600 dark:text-[#B4B4C8]">
                          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                          <span className="font-mono text-xs font-medium">
                            {log.timestamp ? new Date(log.timestamp.toMillis()).toLocaleString('id-ID', {
                              dateStyle: 'medium',
                              timeStyle: 'medium'
                            }) : '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#1E1E2F] flex items-center justify-center border border-slate-200 dark:border-[#3F3F5A]/50">
                            <User className="w-4 h-4 opacity-40" />
                          </div>
                          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 select-all hover:text-brand-600 dark:hover:text-brand-dark-accent transition-colors">
                            {log.performedBy}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <span className={`inline-block px-3 py-1 rounded-lg text-[10px] font-bold transition-all group-hover:scale-105 ${getLogTypeColor(log.details)}`}>
                          {log.details || 'Auth: Selesai'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-[#32324A]/30 border-t border-slate-100 dark:border-[#3F3F5A]/20 flex justify-center">
            {logLimit >= 50 ? (
              <button 
                onClick={() => setLogLimit(10)}
                className="text-[10px] font-black uppercase text-brand-600 dark:text-brand-dark-accent hover:underline flex items-center gap-1"
              >
                Tampilkan Lebih Sedikit (Ringkas)
              </button>
            ) : loginLogs.length >= 10 ? (
              <button 
                onClick={() => setLogLimit(50)}
                className="text-[10px] font-black uppercase text-brand-600 dark:text-brand-dark-accent hover:underline flex items-center gap-1"
              >
                Muat Lebih Banyak Data (50 Log)
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
