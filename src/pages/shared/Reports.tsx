import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { AlertTriangle, Plus, Loader2, CheckCircle2, Clock, MapPin, MessageCircle } from 'lucide-react';
import ReportIssueModal from '../../components/ReportIssueModal';

export default function Reports() {
  const { profile, user } = useAuth();
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'issues'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

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
  }, [user]);

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
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-2.5 bg-brand-700 text-white font-bold rounded-xl hover:bg-brand-dark-hover hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-brand-700/20"
        >
          <Plus className="w-5 h-5" />
          Buat Laporan Baru
        </button>
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
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                          issue.severity === 'high' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
                        }`}>
                          {issue.severity}
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
      )}

      <ReportIssueModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}
