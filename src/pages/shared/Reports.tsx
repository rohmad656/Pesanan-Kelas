import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { AlertTriangle, Plus, Loader2, CheckCircle2, Clock, MapPin, MessageCircle } from 'lucide-react';
import ReportIssueModal from '../../components/ReportIssueModal';

export default function Reports() {
  const { profile, user } = useAuth();
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [issueLimit, setIssueLimit] = useState(6);
  const [severityFilter, setSeverityFilter] = useState('all');

  useEffect(() => {
    if (!user) return;

    let q;
    if (severityFilter === 'all') {
      q = query(
        collection(db, 'issues'), 
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(issueLimit)
      );
    } else {
      q = query(
        collection(db, 'issues'), 
        where('userId', '==', user.uid),
        where('severity', '==', severityFilter),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const issuesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setIssues(issuesData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'issues');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, issueLimit, severityFilter]);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'in-progress': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      default: return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'resolved': return 'Selesai';
      case 'in-progress': return 'Diproses';
      default: return 'Dilaporkan';
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F5F5F5]">Laporan & Bantuan</h1>
          <p className="text-slate-600 dark:text-[#B4B4C8] text-sm">Riwayat laporan kerusakan fasilitas Anda.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-white dark:bg-[#27273A] p-1 rounded-xl border border-slate-200 dark:border-[#3F3F5A]/30 shadow-sm">
            {(['all', 'high', 'medium', 'low'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSeverityFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  severityFilter === s 
                    ? "bg-brand-600 text-white shadow-md shadow-brand-600/20" 
                    : "text-slate-500 dark:text-[#B4B4C8] hover:bg-slate-100 dark:hover:bg-[#32324A]"
                }`}
              >
                {s === 'all' ? 'Semua' : s === 'high' ? 'Darurat' : s === 'medium' ? 'Penting' : 'Normal'}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-700 text-white font-bold rounded-xl hover:bg-brand-dark-hover hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-brand-700/20 text-sm"
          >
            <Plus className="w-4 h-4" />
            Buat Laporan
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-brand-700 dark:text-brand-dark-accent" />
        </div>
      ) : issues.length === 0 ? (
        <div className="bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 rounded-3xl border border-slate-200 dark:border-[#3F3F5A]/30 p-12 text-center space-y-4">
          <div className="w-20 h-20 bg-slate-100 dark:bg-[#32324A] rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-[#F5F5F5]">Belum Ada Laporan</h3>
          <p className="text-slate-600 dark:text-[#B4B4C8] max-w-xs mx-auto">
            Anda belum pernah mengirimkan laporan kerusakan fasilitas. Klik tombol di atas untuk membuat laporan jika menemukan kendala.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {issues.map((issue) => (
            <div key={issue.id} className="bg-white dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20 rounded-2xl border border-slate-200 dark:border-[#3F3F5A]/30 p-5 hover:border-brand-300 dark:hover:border-brand-dark-accent transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-brand-100 dark:bg-[#32324A] rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-brand-700 dark:text-brand-dark-accent" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-[#F5F5F5] flex items-center gap-2">
                      {issue.roomName || 'Ruangan Tidak Diketahui'}
                      {issue.severity && (
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase flex items-center gap-1 ${
                          issue.severity === 'high' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 
                          issue.severity === 'medium' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20' :
                          'bg-green-500/10 text-green-500 border border-green-500/20'
                        }`}>
                          {issue.severity === 'high' ? '🚨 Darurat' : issue.severity === 'medium' ? '⚠️ Penting' : '✅ Normal'}
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock className="w-3 h-3" />
                      {issue.createdAt ? new Date(issue.createdAt.toMillis()).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
                    </div>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusStyle(issue.status)}`}>
                  {getStatusLabel(issue.status)}
                </span>
              </div>
              
              <p className="text-sm text-slate-600 dark:text-[#B4B4C8] line-clamp-3 mb-4">
                {issue.description}
              </p>

              {issue.status === 'resolved' && (
                <div className="pt-4 border-t border-slate-100 dark:border-[#3F3F5A]/30 flex items-center gap-2 text-xs text-green-600 dark:text-green-400 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Masalah telah diselesaikan oleh tim admin.
                </div>
              )}
            </div>
          ))}
        </div>
        
        {severityFilter === 'all' && issues.length >= issueLimit && (
          <div className="flex justify-center pt-6">
            <button 
              onClick={() => setIssueLimit(prev => prev + 6)}
              className="px-6 py-2 bg-white dark:bg-[#32324A] text-brand-600 dark:text-brand-dark-accent text-xs font-bold rounded-xl border border-slate-200 dark:border-[#3F3F5A]/50 hover:shadow-md transition-all flex items-center gap-2"
            >
              Muat Lebih Banyak Laporan
            </button>
          </div>
        )}
      </>
    )}

      <ReportIssueModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}
