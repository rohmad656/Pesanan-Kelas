/**
 * User-Friendly Notification Templates
 * Designed with clear, supportive messaging for common user scenarios
 */

export interface NotificationTemplate {
  type: string;
  title: string;
  message: string;
  icon?: string;
  actionUrl?: string;
}

export const NotificationTemplates = {
  // ========== ACCOUNT SCENARIOS ==========

  ACCOUNT_DELETED: {
    type: "account_deleted",
    title: "Akun Anda Telah Dihapus",
    message: `Akun Anda tidak aktif lagi. Jangan khawatir! Anda dapat membuat akun baru kapan saja dengan mendaftar kembali. Klik tombol 'Daftar' di halaman login atau hubungi kami jika butuh bantuan.`,
    actionUrl: "/daftar",
  },

  ACCOUNT_REACTIVATION_AVAILABLE: {
    type: "account_reactivation",
    title: "Buat Akun Baru",
    message: `Terakhir Anda login dengan akun yang telah dihapus. Silakan buat akun baru dengan email yang sama atau berbeda. Proses pendaftaran hanya membutuhkan beberapa langkah mudah.`,
    actionUrl: "/daftar",
  },

  NO_ACCOUNT_FOUND: {
    type: "no_account",
    title: "Akun Tidak Ditemukan",
    message: `Email atau NIM yang Anda masukkan belum terdaftar. Apakah ini login pertama Anda? Silakan klik 'Daftar' untuk membuat akun baru. Pastikan Anda menggunakan email atau NIM yang benar.`,
    actionUrl: "/daftar",
  },

  INCOMPLETE_PROFILE_REMINDER: {
    type: "incomplete_profile",
    title: "Lengkapi Profil Anda",
    message: `Profil Anda belum lengkap. Informasi yang lengkap membantu kami memberikan pengalaman yang lebih baik. Silakan isi data yang masih kosong di halaman profil Anda.`,
    actionUrl: "/profile",
  },

  // ========== CLASS REMINDER (1 HOUR BEFORE) ==========

  CLASS_REMINDER_1_HOUR: {
    type: "reminder",
    title: "Kelas Dimulai 1 Jam Lagi",
    message: `Halo! Kelas Anda akan dimulai dalam 1 jam. Silakan pastikan Anda siap dan bersiaplah untuk hadir. Jika ada perubahan, Anda akan mendapat notifikasi tambahan. Selamat belajar! 📚`,
    icon: "clock",
  },

  CLASS_REMINDER_15_MIN: {
    type: "reminder_urgent",
    title: "Kelas Dimulai 15 Menit Lagi",
    message: `Perhatian! Kelas Anda akan dimulai dalam 15 menit. Segera siapkan diri dan pastikan lokasi Anda sudah sesuai. Jangan sampai ketinggalan! ⏰`,
    icon: "alert",
  },

  // ========== BOOKING STATUS UPDATES ==========

  BOOKING_CREATED: {
    type: "booking",
    title: "Pesanan Kelas Berhasil Dibuat",
    message: `Selamat! Pesanan kelas Anda telah berhasil dibuat dan sedang menunggu persetujuan. Anda akan menerima pemberitahuan setelah admin meninjau. Terima kasih atas pesanan Anda! ✓`,
  },

  BOOKING_APPROVED: {
    type: "approved",
    title: "Pesanan Kelas Disetujui",
    message: `Bagus! Pesanan kelas Anda telah disetujui. Semua detail sudah dikonfirmasi dan Anda siap untuk menghadiri kelas. Lihat detail lengkap di halaman pesanan Anda.`,
    actionUrl: "/bookings",
  },

  BOOKING_REJECTED: {
    type: "rejected",
    title: "Pesanan Kelas Ditolak",
    message: `Pesanan kelas Anda tidak dapat disetujui. Silakan periksa kembali detail pesanan Anda dan coba buat pesanan baru dengan informasi yang berbeda, atau hubungi admin untuk penjelasan lebih lanjut.`,
    actionUrl: "/bookings",
  },

  // ========== BOOKING CHANGES ==========

  BOOKING_ROOM_CHANGED: {
    type: "booking_change",
    title: "Lokasi Kelas Berubah",
    message: `Ruangan untuk kelas Anda telah diubah. Silakan periksa detail terbaru di halaman pesanan Anda untuk mengetahui lokasi ruangan yang baru. Pastikan Anda memperbarui agenda Anda.`,
    actionUrl: "/bookings",
  },

  BOOKING_TIME_CHANGED: {
    type: "booking_change",
    title: "Jadwal Kelas Berubah",
    message: `Waktu untuk kelas Anda telah diubah. Harap perbarui jadwal Anda dan pastikan Anda dapat hadir pada waktu yang baru. Lihat detail lengkap di pesanan Anda.`,
    actionUrl: "/bookings",
  },

  BOOKING_CANCELLED: {
    type: "booking_cancelled",
    title: "Pesanan Kelas Dibatalkan",
    message: `Pesanan kelas Anda telah dibatalkan oleh sistem. Jika ini tidak diinginkan, Anda dapat membuat pesanan baru kapan saja. Hubungi kami jika memiliki pertanyaan.`,
    actionUrl: "/bookings",
  },

  BOOKING_CANCELLED_BY_ADMIN: {
    type: "booking_cancelled",
    title: "Pesanan Kelas Dibatalkan oleh Admin",
    message: `Admin telah membatalkan pesanan kelas Anda. Silakan hubungi admin untuk mengetahui alasan pembatalan, atau buat pesanan baru dengan detail yang berbeda.`,
    actionUrl: "/rooms",
  },

  // ========== ROOM UPDATES ==========

  ROOM_UNAVAILABLE: {
    type: "room_change",
    title: "Ruangan Tidak Tersedia",
    message: `Ruangan untuk kelas Anda tidak lagi tersedia pada jadwal yang dipilih. Silakan pilih jadwal atau ruangan lain. Kami minta maaf atas ketidaknyamanannya.`,
    actionUrl: "/rooms",
  },

  ROOM_UPDATED: {
    type: "room_change",
    title: "Informasi Ruangan Diperbarui",
    message: `Informasi tentang ruangan kelas Anda telah diperbarui. Silakan periksa detail terbaru seperti fasilitas, kapasitas, dan aturan penggunaan di halaman ruangan.`,
    actionUrl: "/rooms",
  },

  // ========== SYSTEM NOTIFICATIONS ==========

  WELCOME_NEW_USER: {
    type: "welcome",
    title: "Selamat Datang di Platform Kami!",
    message: `Halo! Terima kasih telah mendaftar. Sistem pemesanan kelas kami memudahkan Anda untuk memesan ruangan kapan saja. Jelajahi daftar kelas kami dan buat pesanan pertama Anda sekarang! 🎉`,
    actionUrl: "/rooms",
  },

  HELP_CENTER: {
    type: "info",
    title: "Butuh Bantuan?",
    message: `Ada pertanyaan? Tim kami siap membantu! Kunjungi Pusat Bantuan atau hubungi kami langsung. Kami berkomitmen untuk memberikan pengalaman terbaik bagi Anda.`,
    actionUrl: "/help",
  },

  VERIFICATION_REMINDER: {
    type: "info",
    title: "Verifikasi Email Anda",
    message: `Anda belum memverifikasi email Anda. Silakan periksa kotak masuk Anda dan klik link verifikasi untuk melengkapi pendaftaran. Jika tidak menemukan email, minta untuk dikirim ulang.`,
  },

  // ========== ERROR SCENARIOS ==========

  GENERIC_ERROR: {
    type: "error",
    title: "Terjadi Kesalahan",
    message: `Kami mengalami masalah teknis. Silakan coba lagi nanti. Jika masalah berlanjut, hubungi tim dukungan kami untuk bantuan lebih lanjut.`,
  },

  AUTHORIZATION_REQUIRED: {
    type: "error",
    title: "Anda Tidak Memiliki Akses",
    message: `Anda tidak memiliki izin untuk mengakses bagian ini. Jika Anda yakin ini adalah kesalahan, silakan hubungi admin atau dukungan kami.`,
  },
};

/**
 * Get template by type
 */
export const getNotificationTemplate = (
  type: string,
): NotificationTemplate | null => {
  return (
    (NotificationTemplates as Record<string, NotificationTemplate>)[
      type.toUpperCase()
    ] || null
  );
};

/**
 * Generate personalized notification message
 */
export const generateNotificationMessage = (
  templateType: string,
  variables?: Record<string, string>,
): NotificationTemplate | null => {
  const template = getNotificationTemplate(templateType);
  if (!template || !variables) return template;

  // Replace variables in message (e.g., {{name}}, {{roomName}})
  let message = template.message;
  Object.entries(variables).forEach(([key, value]) => {
    message = message.replace(new RegExp(`{{${key}}}`, "g"), value);
  });

  return {
    ...template,
    message,
  };
};

/**
 * Notification categories for UI organization
 */
export const NotificationCategories = {
  BOOKING: [
    "booking",
    "approved",
    "rejected",
    "booking_change",
    "booking_cancelled",
  ],
  CLASS: ["reminder", "reminder_urgent"],
  ACCOUNT: [
    "account_deleted",
    "account_reactivation",
    "no_account",
    "incomplete_profile",
  ],
  ROOM: ["room_change", "room_unavailable"],
  SYSTEM: ["welcome", "info", "help_center", "verification_reminder"],
  ERROR: ["error", "authorization_required"],
};

/**
 * Notification priority levels
 */
export const NotificationPriority = {
  CRITICAL: 3, // Account issues, urgent reminders
  HIGH: 2, // Booking changes, approvals
  MEDIUM: 1, // Updates, info
  LOW: 0, // General notifications
};

export const getNotificationPriority = (type: string): number => {
  if (NotificationCategories.CLASS.includes(type))
    return NotificationPriority.CRITICAL;
  if (
    ["booking_change", "booking_cancelled", "room_unavailable"].includes(type)
  )
    return NotificationPriority.HIGH;
  if (["approved", "rejected"].includes(type)) return NotificationPriority.HIGH;
  if (["account_deleted", "incomplete_profile"].includes(type))
    return NotificationPriority.HIGH;
  return NotificationPriority.MEDIUM;
};
