import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, writeBatch, serverTimestamp, orderBy, limit, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { AlertTriangle, CheckCircle, Clock, ShieldCheck, User } from 'lucide-react';

export default function AuditReports() {
  const [issues, setIssues] = useState<any[]>([]);
  const [loginLogs, setLoginLogs] = useState<any[]>([]);

  useEffect(() => {
    // Listen to issues
    const qIssues = query(collection(db, 'issues'), orderBy('createdAt', 'desc'));
    const unsubscribeIssues = onSnapshot(qIssues, (snapshot) => {
      const issuesData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      setIssues(issuesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'issues');
    });

    // Listen to login audit logs
    const qLoginLogs = query(collection(db, 'audit_logs'), where('action', '==', 'LOGIN'), orderBy('timestamp', 'desc'), limit(50));
    const unsubscribeLogins = onSnapshot(qLoginLogs, (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      setLoginLogs(logsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'audit_logs');
    });

    return () => {
      unsubscribeIssues();
      unsubscribeLogins();
    };
  }, []);

  const handleResolve = async (issue: any) => {
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'issues', issue.id), { status: 'resolved' });
      
      if (issue.userId) {
        batch.set(doc(collection(db, 'notifications')), {
          userId: issue.userId,
          title: 'Laporan Selesai',
          message: `Laporan Anda untuk ruangan ${issue.roomId} telah diselesaikan.`,
          type: 'approved',
          isRead: false,
          createdAt: serverTimestamp()
        });
      }
      
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `issues/${issue.id}`);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F5F5F5]">Laporan & Audit Perawatan</h1>
        <p className="text-slate-600 dark:text-[#B4B4C8] text-sm">Pantau laporan kerusakan fasilitas dan riwayat penggunaan ruangan.</p>
      </div>

      <div className="bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 rounded-2xl border border-slate-200 dark:border-[#3F3F5A]/30 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-[#3F3F5A]/30">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-[#F5F5F5]">Monitoring Fasilitas</h3>
        </div>
        
        <div className="p-0">
          {issues.length === 0 ? (
            <div className="text-center py-12 text-slate-600 dark:text-[#B4B4C8]">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Tidak ada laporan kerusakan saat ini.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#603770]/30">
              {issues.map((issue) => (
                <div key={issue.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-[#32324A] transition-colors">
                  <div className="flex gap-4">
                    <div className={`mt-1 ${issue.status === 'resolved' ? 'text-green-400' : 'text-red-400'}`}>
                      {issue.status === 'resolved' ? <CheckCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-900 dark:text-[#F5F5F5]">Ruangan: {issue.roomName || issue.roomId}</h4>
                        {issue.severity && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            issue.severity === 'high' ? 'bg-red-500/10 text-red-500' : 
                            issue.severity === 'medium' ? 'bg-orange-500/10 text-orange-500' : 
                            'bg-blue-500/10 text-blue-500'
                          }`}>
                            {issue.severity === 'high' ? 'Tinggi' : issue.severity === 'medium' ? 'Sedang' : 'Rendah'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-[#B4B4C8] mt-1">{issue.description}</p>
                      <p className="text-xs text-slate-600 dark:text-[#B4B4C8]/70 mt-2">
                        Dilaporkan oleh: {issue.userName || issue.userId} • {issue.createdAt ? new Date(issue.createdAt.toMillis()).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                      </p>
                    </div>
                  </div>
                  
                  {issue.status !== 'resolved' && (
                    <button 
                      onClick={() => handleResolve(issue)}
                      className="px-4 py-2 rounded-lg bg-brand-100 dark:bg-[#32324A] text-brand-700 dark:text-brand-dark-accent hover:bg-brand-dark-hover hover:scale-105 active:scale-95 transition-all text-sm font-medium whitespace-nowrap"
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
      <div className="bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 rounded-2xl border border-slate-200 dark:border-[#3F3F5A]/30 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-[#3F3F5A]/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-700 dark:text-brand-dark-accent" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-[#F5F5F5]">Audit Login Terbaru</h3>
          </div>
          <span className="text-xs text-slate-500 bg-slate-100 dark:bg-[#32324A] px-2 py-1 rounded-full">
            50 Log Terakhir
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-[#32324A] text-slate-900 dark:text-[#F5F5F5]">
              <tr>
                <th className="px-6 py-3 font-semibold">Waktu</th>
                <th className="px-6 py-3 font-semibold">User ID</th>
                <th className="px-6 py-3 font-semibold text-right">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#3F3F5A]/30">
              {loginLogs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-500 italic">Belum ada riwayat login.</td>
                </tr>
              ) : (
                loginLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-[#32324A]/30">
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-[#B4B4C8]">
                        <Clock className="w-3.5 h-3.5 opacity-60" />
                        {log.timestamp ? new Date(log.timestamp.toMillis()).toLocaleString('id-ID', {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        }) : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 opacity-60" />
                        <span className="font-mono text-[10px] bg-slate-100 dark:bg-[#1E1E2F] px-1.5 py-0.5 rounded text-slate-600 dark:text-[#F5F5F5]">
                          {log.performedBy}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span className="text-xs text-slate-500 dark:text-[#B4B4C8]/70">
                        {log.details || 'Login Berhasil'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
