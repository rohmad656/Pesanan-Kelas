import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { AlertTriangle, CheckCircle } from 'lucide-react';

export default function AuditReports() {
  const [issues, setIssues] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'issues'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const issuesData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      issuesData.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
      setIssues(issuesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'issues');
    });

    return () => unsubscribe();
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
                      <h4 className="font-semibold text-slate-900 dark:text-[#F5F5F5]">Ruangan: {issue.roomId}</h4>
                      <p className="text-sm text-slate-600 dark:text-[#B4B4C8] mt-1">{issue.description}</p>
                      <p className="text-xs text-slate-600 dark:text-[#B4B4C8]/70 mt-2">
                        Dilaporkan oleh: {issue.userName || issue.userId}
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
    </div>
  );
}
