# SMART-ROOM: Sistem Manajemen Ruangan Terintegrasi

SMART-ROOM adalah aplikasi web modern yang dirancang untuk mengelola peminjaman dan penggunaan ruangan di lingkungan kampus secara efisien dan transparan. Dibangun dengan fokus pada kemudahan penggunaan, keamanan data, dan reliabilitas tinggi.

## Fitur Utama

- **Otentikasi Multi-Metode**: Login menggunakan Google Auth atau Email & Password dengan dukungan Reset Password via OTP & Email.
- **Manajemen Peran (Role-Based)**: Portal khusus untuk Mahasiswa, Dosen, dan Admin dengan hak akses dan fitur yang relevan.
- **Dashboard Interaktif**: Ringkasan aktivitas, status peminjaman, dan notifikasi terbaru secara real-time.
- **Peminjaman Ruangan**: Filter ruangan berdasarkan kapasitas, fasilitas, dan ketersediaan.
- **Sistem Pelaporan**: Fitur untuk melaporkan kendala di ruangan dengan dukungan unggah bukti foto.
- **Notifikasi Multi-Channel**: Pemberitahuan via Portal, Email, dan Integrasi WhatsApp.
- **Audit Logging**: Pencatatan riwayat aktivitas pengguna untuk keamanan administratif.

## Teknologi Utama

- **Frontend**: React 19, TypeScript, Vite.
- **Styling**: Tailwind CSS, Lucide Icons, Framer Motion (Animations).
- **Backend & Database**: Firebase (Authentication, Firestore, Storage).
- **Integrasi**: EmailJS (Notifikasi Email), Browser Image Compression.

## Panduan Penggunaan

### Bagi Pengguna Baru (Registration)
1. Klik "Mulai Sekarang" di halaman landing.
2. Pilih peran Anda (Mahasiswa/Dosen/Staf).
3. Masuk dengan Google atau daftar dengan email.
4. Lengkapi profil (NIM/NIP, Nomor WhatsApp) untuk verifikasi.

### Peminjaman Ruangan
1. Buka menu **Ruangan** dari dashboard.
2. Cari ruangan yang sesuai dengan kebutuhan.
3. Klik "Pesan Sekarang" dan tentukan jadwal serta durasi.
4. Pantau status peminjaman di menu **Pesanan Saya**.

## Struktur Proyek

- `/src/pages`: Halaman-halaman aplikasi (Landing, Auth, Dashboards).
- `/src/contexts`: Manajemen state global (Auth, Data, Theme).
- `/src/components`: Komponen UI yang dapat digunakan kembali.
- `/src/services`: Logika interaksi dengan API/Firebase.
- `/src/lib`: Konfigurasi library pihak ketiga.

## Pengembangan & Pengujian

### Prasyarat
- Node.js (v18 ke atas)
- Akun Firebase (untuk Firestore & Auth)

### Instalasi
```bash
npm install
```

### Menjalankan Mode Pengembangan
```bash
npm run dev
```

### Menjalankan Tes
```bash
npx vitest run
```

### Build Produksi
```bash
npm run build
```

---
Dikembangkan dengan ❤️ untuk kemudahan kolaborasi akademik.
