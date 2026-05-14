# Notification System - Quick Reference & Message Examples

## Message Categories & Examples

### 1️⃣ ACCOUNT SCENARIOS

#### Account Deleted

```
Title: Akun Anda Telah Dihapus
Message: Akun Anda tidak aktif lagi. Jangan khawatir! Anda dapat membuat akun
         baru kapan saja dengan mendaftar kembali. Klik tombol 'Daftar' di
         halaman login atau hubungi kami jika butuh bantuan.
Suggestion: Silakan buat akun baru dengan email yang sama atau berbeda.
Action Button: "Buat Akun Baru" → /daftar
```

#### Account Not Found

```
Title: Akun Tidak Ditemukan
Message: Email atau NIM yang Anda masukkan belum terdaftar. Apakah ini login
         pertama Anda? Silakan klik 'Daftar' untuk membuat akun baru.
         Pastikan Anda menggunakan email atau NIM yang benar.
Suggestion: Jika sudah terdaftar, periksa kembali email/NIM Anda.
Action Button: "Daftar Sekarang" → /daftar
```

#### Incomplete Profile

```
Title: Lengkapi Profil Anda
Message: Profil Anda belum lengkap. Informasi yang lengkap membantu kami
         memberikan pengalaman yang lebih baik. Silakan isi data yang
         masih kosong di halaman profil Anda.
Suggestion: Data profil membantu kami memberikan pengalaman yang dipersonalisasi.
Action Button: "Lengkapi Profil" → /profile
```

---

### 2️⃣ CLASS REMINDERS

#### 1 Hour Before Class

```
Title: Kelas Dimulai 1 Jam Lagi ⏰
Message: Halo! Kelas Anda "Pemrograman Web" di Lab Komputer A akan dimulai
         dalam 1 jam. Silakan pastikan Anda siap dan bersiaplah untuk hadir.
         Selamat belajar! 📚
Priority: CRITICAL (High-priority notification)
Badge: "Ingat" (Amber color)
```

#### 15 Minutes Before Class (Urgent)

```
Title: Kelas Dimulai 15 Menit Lagi ⏰
Message: Perhatian! Kelas "Pemrograman Web" di Lab Komputer A akan dimulai
         dalam 15 menit. Segera siapkan diri dan pastikan lokasi Anda
         sudah sesuai. ⏰
Priority: CRITICAL (Urgent notification)
Badge: "URGENT" (Red color)
```

---

### 3️⃣ BOOKING STATUS UPDATES

#### Booking Approved ✓

```
Title: Pesanan Kelas Disetujui
Message: Bagus! Pesanan kelas "Pemrograman Web" di Lab Komputer A telah
         disetujui. Semua detail sudah dikonfirmasi dan Anda siap untuk
         menghadiri kelas. Lihat detail lengkap di halaman pesanan Anda.
Badge: "Disetujui" (Green color)
Action Button: "Lihat Detail" → /bookings
```

#### Booking Rejected ✗

```
Title: Pesanan Kelas Ditolak
Message: Pesanan kelas "Pemrograman Web" tidak dapat disetujui.
         Silakan periksa kembali detail pesanan Anda dan coba buat
         pesanan baru dengan informasi yang berbeda, atau hubungi
         admin untuk penjelasan lebih lanjut.
Badge: "Ditolak" (Red color)
Action Button: "Lihat Pesanan" → /bookings
```

#### Booking Created

```
Title: Pesanan Kelas Berhasil Dibuat
Message: Selamat! Pesanan kelas "Pemrograman Web" di Lab Komputer A telah
         berhasil dibuat dan sedang menunggu persetujuan. Anda akan menerima
         pemberitahuan setelah admin meninjau. Terima kasih atas pesanan Anda! ✓
```

---

### 4️⃣ BOOKING CHANGES

#### Room Changed

```
Title: Lokasi Kelas Berubah
Message: Ruangan untuk kelas "Pemrograman Web" telah diubah.
         Lokasi baru: Lab Komputer B (sebelumnya: Lab Komputer A)
         Silakan perbarui agenda Anda.
Suggestion: Pastikan Anda mengunjungi ruangan yang benar.
Action Button: "Lihat Detail" → /bookings
```

#### Time Changed

```
Title: Jadwal Kelas Berubah
Message: Waktu untuk kelas "Pemrograman Web" telah diubah.
         Waktu baru: 14:00 - 16:00 (sebelumnya: 10:00 - 12:00)
         Harap perbarui jadwal Anda dan pastikan Anda dapat hadir
         pada waktu yang baru.
Suggestion: Periksa konflik jadwal dengan aktivitas lain Anda.
Action Button: "Lihat Detail" → /bookings
```

#### Booking Cancelled

```
Title: Pesanan Kelas Dibatalkan
Message: Pesanan kelas "Pemrograman Web" telah dibatalkan oleh sistem.
         Jika ini tidak diinginkan, Anda dapat membuat pesanan baru kapan saja.
         Hubungi kami jika memiliki pertanyaan.
Action Button: "Pesan Kelas Lain" → /rooms
```

---

### 5️⃣ ROOM UPDATES

#### Room Unavailable

```
Title: Ruangan Tidak Tersedia
Message: Ruangan "Lab Komputer A" untuk tanggal 15 Mei 2026 tidak lagi
         tersedia pada jadwal yang dipilih. Silakan pilih jadwal atau
         ruangan lain. Kami minta maaf atas ketidaknyamanannya.
Action Button: "Lihat Ruangan Lain" → /rooms
```

#### Room Information Updated

```
Title: Informasi Ruangan Diperbarui
Message: Informasi tentang ruangan "Lab Komputer A" telah diperbarui.
         Silakan periksa detail terbaru seperti fasilitas, kapasitas,
         dan aturan penggunaan di halaman ruangan.
Action Button: "Lihat Ruangan" → /rooms
```

---

### 6️⃣ SYSTEM NOTIFICATIONS

#### Welcome New User

```
Title: Selamat Datang di Platform Kami! 🎉
Message: Halo Budi! Terima kasih telah mendaftar. Sistem pemesanan kelas kami
         memudahkan Anda untuk memesan ruangan kapan saja. Jelajahi daftar
         kelas kami dan buat pesanan pertama Anda sekarang!
Action Button: "Jelajahi Kelas" → /rooms
```

#### Verification Reminder

```
Title: Verifikasi Email Anda
Message: Anda belum memverifikasi email Anda. Silakan periksa kotak masuk
         Anda dan klik link verifikasi untuk melengkapi pendaftaran.
         Jika tidak menemukan email, minta untuk dikirim ulang.
Suggestion: Link verifikasi berlaku selama 24 jam.
Action Button: "Kirim Ulang Verifikasi" → /profile
```

---

## UI Component Examples

### Account Status Alert Component

```
┌─────────────────────────────────────────────────┐
│ ❌ Akun Tidak Ditemukan                         │
│ ───────────────────────────────────────────────│
│ Email atau NIM yang Anda masukkan belum        │
│ terdaftar di sistem kami.                      │
│                                                 │
│ 💡 Pertama kali login? Silakan daftar dengan   │
│ email atau NIM Anda.                           │
│                                                 │
│ [Daftar Sekarang]  [Tutup]                    │
└─────────────────────────────────────────────────┘
```

### Registration Helper Component

```
┌──────────────────────────────────────────────────┐
│ 👤 Pertama Kali Menggunakan?                    │
│ ────────────────────────────────────────────────│
│ Selamat datang! Silakan daftar untuk membuat   │
│ akun baru.                                      │
│                                                  │
│ Langkah-langkah:                               │
│ ① Masukkan email atau NIM Anda                 │
│ ② Buat password yang kuat                      │
│ ③ Lengkapi informasi profil                    │
│ ④ Verifikasi email Anda                        │
│                                                  │
│ [Mulai Daftar]                                │
└──────────────────────────────────────────────────┘
```

### Notification Card

```
┌──────────────────────────────────────────────────┐
│ 🔔 Pesanan Kelas Disetujui          [DISETUJUI] │
│ ────────────────────────────────────────────────│
│                                                  │
│ Bagus! Pesanan kelas "Pemrograman Web" di Lab  │
│ Komputer A telah disetujui. Semua detail sudah │
│ dikonfirmasi dan Anda siap untuk menghadiri    │
│ kelas. Lihat detail lengkap di halaman pesanan │
│ Anda.                                           │
│                                                  │
│ [Mark as read] [Delete]                        │
└──────────────────────────────────────────────────┘
```

### Class Reminder Notification (Critical)

```
┌──────────────────────────────────────────────────┐
│ ⏰ Kelas Dimulai 1 Jam Lagi          [INGAT]    │
│ ────────────────────────────────────────────────│
│                                                  │
│ Halo! Kelas Anda "Pemrograman Web" di Lab     │
│ Komputer A akan dimulai dalam 1 jam. Silakan  │
│ pastikan Anda siap dan bersiaplah untuk hadir.│
│ Selamat belajar! 📚                           │
│                                                  │
│ [Lihat Detail]     [Mark as read]             │
└──────────────────────────────────────────────────┘
```

---

## Integration Checklist

- [ ] Copy all notification service files to your project
- [ ] Update Firestore schema with reminder tracking fields
- [ ] Add `setupScheduledNotifications()` to server.ts
- [ ] Integrate `AccountStatusAlert` component in Login page
- [ ] Integrate `RegistrationHelper` in Register page
- [ ] Add notification creation calls in booking admin functions
- [ ] Test account scenarios
- [ ] Test booking notifications
- [ ] Test class reminders
- [ ] Configure email/WhatsApp (optional)
- [ ] Update Firestore security rules
- [ ] Deploy and monitor

---

## Key Features

✅ **User-Friendly Language**

- Clear, supportive tone
- No technical jargon
- Action-oriented messages

✅ **Comprehensive Coverage**

- Account issues
- Class reminders (1hr & 15min)
- Booking updates
- Room changes

✅ **Automated Delivery**

- Scheduled reminders
- Real-time notifications
- Email/WhatsApp capable

✅ **Easy Customization**

- Edit message templates
- Add new notification types
- Customize delivery channels

---

## Support & Resources

- Implementation Guide: `NOTIFICATION_SYSTEM.md`
- Templates: `src/lib/notificationTemplates.ts`
- Services: `src/lib/notificationService.ts`
- Components: `src/components/AccountStatusAlert.tsx`
- Backend: `src/lib/scheduledNotifications.ts`
