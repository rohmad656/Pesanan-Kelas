/**
 * User-Friendly Account Status Messages
 * Clear guidance for common account scenarios
 */

export const AccountStatusMessages = {
  ACCOUNT_NOT_FOUND: {
    title: "Akun Tidak Ditemukan",
    message:
      "Email atau NIM yang Anda masukkan belum terdaftar di sistem kami.",
    actionText: "Buat Akun Baru",
    suggestion:
      "Pertama kali login? Silakan daftar dengan email atau NIM Anda.",
  },

  ACCOUNT_DISABLED: {
    title: "Akun Tidak Aktif",
    message: "Akun Anda telah dinonaktifkan oleh admin atau sistem.",
    actionText: "Hubungi Dukungan",
    suggestion:
      "Silakan hubungi tim dukungan kami untuk informasi lebih lanjut atau buat akun baru.",
  },

  ACCOUNT_DELETED: {
    title: "Akun Telah Dihapus",
    message: "Akun Anda tidak lagi aktif dalam sistem.",
    actionText: "Buat Akun Baru",
    suggestion:
      "Anda dapat membuat akun baru dengan email yang sama atau berbeda. Proses pendaftaran hanya membutuhkan beberapa langkah mudah.",
  },

  INVALID_CREDENTIALS: {
    title: "Email atau Password Salah",
    message:
      "Kombinasi email/NIM dan password yang Anda masukkan tidak sesuai.",
    actionText: "Coba Lagi",
    suggestion:
      'Pastikan email/NIM dan password sudah benar. Jika lupa password, gunakan opsi "Lupa Password".',
  },

  WRONG_ROLE: {
    title: "Role Akun Tidak Sesuai",
    message: "Akun Anda terdaftar sebagai role yang berbeda dari yang dipilih.",
    actionText: "Ubah Role",
    suggestion:
      "Silakan pilih role yang sesuai dengan akun Anda atau hubungi admin untuk perubahan role.",
  },

  EMAIL_NOT_VERIFIED: {
    title: "Email Belum Diverifikasi",
    message: "Silakan verifikasi email Anda sebelum melanjutkan.",
    actionText: "Kirim Ulang Verifikasi",
    suggestion:
      "Periksa kotak masuk Anda untuk link verifikasi, atau minta untuk dikirim ulang.",
  },

  PROFILE_INCOMPLETE: {
    title: "Profil Belum Lengkap",
    message: "Silakan lengkapi profil Anda untuk melanjutkan.",
    actionText: "Lengkapi Profil",
    suggestion:
      "Informasi yang lengkap membantu kami memberikan pengalaman yang lebih baik.",
  },

  REGISTRATION_SUCCESS: {
    title: "Pendaftaran Berhasil!",
    message: "Selamat, akun Anda telah berhasil dibuat.",
    actionText: "Masuk Sekarang",
    suggestion:
      "Silakan login dengan email/NIM dan password Anda untuk mulai menggunakan aplikasi.",
  },

  PASSWORD_RESET_SENT: {
    title: "Email Reset Password Dikirim",
    message: "Kami telah mengirimkan instruksi reset password ke email Anda.",
    actionText: "Periksa Email",
    suggestion:
      "Silakan periksa kotak masuk atau folder spam untuk link reset password. Link akan berlaku selama 1 jam.",
  },

  PASSWORD_RESET_SUCCESS: {
    title: "Password Berhasil Diubah",
    message: "Password Anda telah berhasil diubah.",
    actionText: "Kembali ke Login",
    suggestion: "Silakan login dengan password baru Anda.",
  },

  SESSION_EXPIRED: {
    title: "Sesi Anda Telah Berakhir",
    message: "Anda telah logout karena inaktivitas yang lama.",
    actionText: "Login Kembali",
    suggestion: "Silakan login kembali untuk melanjutkan menggunakan aplikasi.",
  },

  NETWORK_ERROR: {
    title: "Kesalahan Jaringan",
    message: "Terjadi masalah koneksi dengan server kami.",
    actionText: "Coba Lagi",
    suggestion:
      "Periksa koneksi internet Anda dan coba lagi. Jika masalah berlanjut, hubungi dukungan kami.",
  },

  GENERIC_ERROR: {
    title: "Terjadi Kesalahan",
    message: "Kami mengalami masalah teknis. Silakan coba lagi nanti.",
    actionText: "Coba Lagi",
    suggestion:
      "Jika masalah berlanjut, hubungi tim dukungan kami untuk bantuan.",
  },
};

/**
 * Get account status message by key
 */
export const getAccountStatusMessage = (
  key: keyof typeof AccountStatusMessages,
) => {
  return AccountStatusMessages[key] || AccountStatusMessages.GENERIC_ERROR;
};

/**
 * Format error message for user display
 */
export const formatErrorForUser = (
  errorCode: string,
): (typeof AccountStatusMessages)[keyof typeof AccountStatusMessages] => {
  // Map Firebase error codes to user-friendly messages
  const errorMap: Record<string, keyof typeof AccountStatusMessages> = {
    "auth/user-not-found": "ACCOUNT_NOT_FOUND",
    "auth/wrong-password": "INVALID_CREDENTIALS",
    "auth/invalid-email": "INVALID_CREDENTIALS",
    "auth/user-disabled": "ACCOUNT_DISABLED",
    "auth/email-already-in-use": "ACCOUNT_NOT_FOUND",
    "auth/weak-password": "INVALID_CREDENTIALS",
    "auth/operation-not-allowed": "GENERIC_ERROR",
    "auth/too-many-requests": "GENERIC_ERROR",
    "auth/requires-recent-login": "SESSION_EXPIRED",
    "firestore/permission-denied": "GENERIC_ERROR",
  };

  const messageKey = errorMap[errorCode] || "GENERIC_ERROR";
  return getAccountStatusMessage(messageKey);
};

/**
 * Account action buttons configuration
 */
export const AccountActions = {
  LOGIN: {
    label: "Masuk",
    route: "/login",
  },
  REGISTER: {
    label: "Daftar",
    route: "/daftar",
  },
  FORGOT_PASSWORD: {
    label: "Lupa Password?",
    route: "/login?tab=reset",
  },
  COMPLETE_PROFILE: {
    label: "Lengkapi Profil",
    route: "/profile",
  },
  HELP: {
    label: "Hubungi Dukungan",
    route: "/help",
  },
};
