import React, { useState, useRef } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression';

interface ImageUploadProps {
  onUpload: (url: string) => void;
  currentUrl?: string;
  folder?: string;
  label?: string;
}

export default function ImageUpload({ onUpload, currentUrl, folder = 'rooms', label = 'Foto Ruangan' }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast.error('Hanya file .jpg, .jpeg, dan .png yang diizinkan.');
      return;
    }

    try {
      setUploading(true);
      setProgress(5); // Start progress indication

      let fileToUpload = file;

      // Only compress if file is larger than 1MB to save time and battery
      if (file.size > 1.2 * 1024 * 1024) {
        setProgress(15);
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1280,
          useWebWorker: true,
        };
        try {
          fileToUpload = await imageCompression(file, options);
          setProgress(30);
        } catch (compErr) {
          console.warn("Compression failed, uploading original:", compErr);
          fileToUpload = file;
        }
      } else {
        setProgress(25); // Skip compression fast-track
      }

      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const storageRef = ref(storage, `${folder}/${fileName}`);
      const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Map bytes transferred to remaining progress 30% -> 100%
          const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 70 + 30;
          setProgress(p);
        },
        (error: any) => {
          console.error('Upload error:', error);
          if (error.code === 'storage/unauthorized') {
            toast.error('Gagal: Izin penyimpanan ditolak. Hubungi admin.');
          } else {
            toast.error('Gagal mengunggah gambar. Pastikan koneksi stabil.');
          }
          setUploading(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          onUpload(downloadURL);
          setUploading(false);
          setProgress(0);
          toast.success('Gambar berhasil diunggah.');
        }
      );
    } catch (compressionError) {
      console.error('Compression error:', compressionError);
      toast.error('Gagal memproses gambar.');
      setUploading(false);
    }
  };

  const removeImage = () => {
    onUpload('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-[#B4B4C8]">
          {label}
        </label>
        {currentUrl && !uploading && (
          <button
            type="button"
            onClick={removeImage}
            className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 font-bold transition-colors"
          >
            <X className="w-3 h-3" /> Hapus Foto
          </button>
        )}
      </div>

      <div 
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`relative group cursor-pointer border-2 border-dashed rounded-2xl transition-all overflow-hidden flex flex-col items-center justify-center min-h-[180px] ${
          currentUrl 
            ? 'border-brand-500/50 bg-brand-50/5' 
            : 'border-slate-300 dark:border-[#3F3F5A]/50 hover:border-brand-500 dark:hover:border-brand-500 bg-slate-50 dark:bg-[#32324A]'
        }`}
      >
        {currentUrl && !uploading ? (
          <div className="absolute inset-0 w-full h-full">
            <img 
              src={currentUrl} 
              alt="Preview" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Error+Loading+Image';
              }}
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
              <Upload className="w-5 h-5 text-white" />
              <p className="text-white text-[10px] font-bold uppercase tracking-widest">
                Ganti Gambar
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center space-y-3">
            {uploading ? (
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
                  <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-brand-600">
                    {Math.round(progress)}%
                  </span>
                </div>
                <div className="w-40 bg-slate-200 dark:bg-[#1E1E2F] rounded-full h-2 overflow-hidden border border-slate-300 dark:border-white/5">
                  <div 
                    className="h-full bg-brand-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(var(--brand-500),0.3)]" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-[10px] text-brand-500 font-bold uppercase tracking-widest animate-pulse">
                  {progress < 30 ? 'Memproses...' : 'Mengunggah...'}
                </p>
              </div>
            ) : (
              <>
                <div className="w-14 h-14 bg-white dark:bg-[#1E1E2F] rounded-full flex items-center justify-center mx-auto shadow-sm group-hover:scale-110 group-hover:bg-brand-50 dark:group-hover:bg-brand-500/10 transition-all border border-slate-100 dark:border-white/5">
                  <ImageIcon className="w-7 h-7 text-slate-400 group-hover:text-brand-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-slate-600 dark:text-[#F5F5F5] uppercase tracking-wide">
                    Pilih atau Seret Foto
                  </p>
                  <p className="text-[9px] text-slate-400 font-medium">
                    JPG, JPEG, PNG • MAKS 5MB
                  </p>
                </div>
              </>
            )}
          </div>
        )}
        
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".jpg,.jpeg,.png"
          className="hidden"
        />
      </div>
    </div>
  );
}
