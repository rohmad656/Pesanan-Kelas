/**
 * Notification Service
 * Handles creating and managing notifications in Firestore
 */

import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  NotificationPriority,
  getNotificationPriority,
} from "./notificationTemplates";

export interface NotificationPayload {
  type: string;
  title: string;
  message: string;
  userId?: string;
  targetRole?: "admin" | "staff" | "dosen" | "mahasiswa";
  bookingId?: string;
  roomId?: string;
  isRead?: boolean;
  priority?: number;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export class NotificationService {
  /**
   * Create a notification in Firestore
   */
  static async createNotification(payload: NotificationPayload) {
    try {
      const notificationData = {
        type: payload.type,
        title: payload.title,
        message: payload.message,
        userId: payload.userId || null,
        targetRole: payload.targetRole || null,
        bookingId: payload.bookingId || null,
        roomId: payload.roomId || null,
        isRead: payload.isRead ?? false,
        priority: payload.priority ?? getNotificationPriority(payload.type),
        actionUrl: payload.actionUrl || null,
        metadata: payload.metadata || {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(
        collection(db, "notifications"),
        notificationData,
      );
      console.log("Notification created:", docRef.id);
      return docRef.id;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  /**
   * Create notification for specific user
   */
  static async notifyUser(
    userId: string,
    payload: Omit<NotificationPayload, "userId">,
  ) {
    return this.createNotification({
      ...payload,
      userId,
    });
  }

  /**
   * Create notification for role-based users (broadcast to role)
   */
  static async notifyRole(
    role: "admin" | "staff" | "dosen" | "mahasiswa",
    payload: Omit<NotificationPayload, "targetRole">,
  ) {
    return this.createNotification({
      ...payload,
      targetRole: role,
    });
  }

  /**
   * Notify user about booking approval
   */
  static async notifyBookingApproved(
    userId: string,
    bookingDetails: {
      id: string;
      roomName: string;
      className: string;
    },
  ) {
    return this.notifyUser(userId, {
      type: "approved",
      title: "Pesanan Kelas Disetujui",
      message: `Pesanan untuk ${bookingDetails.className} di ${bookingDetails.roomName} telah disetujui. Semua detail sudah dikonfirmasi.`,
      bookingId: bookingDetails.id,
      actionUrl: "/bookings",
    });
  }

  /**
   * Notify user about booking rejection
   */
  static async notifyBookingRejected(
    userId: string,
    bookingDetails: {
      id: string;
      roomName: string;
      className: string;
    },
  ) {
    return this.notifyUser(userId, {
      type: "rejected",
      title: "Pesanan Kelas Ditolak",
      message: `Pesanan untuk ${bookingDetails.className} di ${bookingDetails.roomName} tidak dapat disetujui. Silakan coba lagi dengan detail yang berbeda.`,
      bookingId: bookingDetails.id,
      actionUrl: "/bookings",
    });
  }

  /**
   * Notify user about class in 1 hour
   */
  static async notifyClassReminder(
    userId: string,
    bookingDetails: {
      id: string;
      roomName: string;
      className: string;
    },
  ) {
    return this.notifyUser(userId, {
      type: "reminder",
      title: "Kelas Dimulai 1 Jam Lagi",
      message: `Halo! Kelas Anda "${bookingDetails.className}" di ${bookingDetails.roomName} akan dimulai dalam 1 jam. Silakan pastikan Anda siap dan bersiaplah untuk hadir. Selamat belajar! 📚`,
      bookingId: bookingDetails.id,
      priority: NotificationPriority.CRITICAL,
    });
  }

  /**
   * Notify user about class in 15 minutes
   */
  static async notifyClassUrgent(
    userId: string,
    bookingDetails: {
      id: string;
      roomName: string;
      className: string;
    },
  ) {
    return this.notifyUser(userId, {
      type: "reminder_urgent",
      title: "Kelas Dimulai 15 Menit Lagi",
      message: `Perhatian! Kelas "${bookingDetails.className}" di ${bookingDetails.roomName} akan dimulai dalam 15 menit. Segera siapkan diri dan pastikan lokasi Anda sudah sesuai. ⏰`,
      bookingId: bookingDetails.id,
      priority: NotificationPriority.CRITICAL,
    });
  }

  /**
   * Notify about booking room change
   */
  static async notifyBookingRoomChanged(
    userId: string,
    bookingDetails: {
      id: string;
      oldRoom: string;
      newRoom: string;
      className: string;
    },
  ) {
    return this.notifyUser(userId, {
      type: "booking_change",
      title: "Lokasi Kelas Berubah",
      message: `Lokasi kelas "${bookingDetails.className}" telah diubah dari ${bookingDetails.oldRoom} menjadi ${bookingDetails.newRoom}. Pastikan Anda memperbarui agenda Anda.`,
      bookingId: bookingDetails.id,
      actionUrl: "/bookings",
      priority: NotificationPriority.HIGH,
    });
  }

  /**
   * Notify about booking time change
   */
  static async notifyBookingTimeChanged(
    userId: string,
    bookingDetails: {
      id: string;
      className: string;
      oldTime: string;
      newTime: string;
    },
  ) {
    return this.notifyUser(userId, {
      type: "booking_change",
      title: "Jadwal Kelas Berubah",
      message: `Jadwal kelas "${bookingDetails.className}" telah diubah dari ${bookingDetails.oldTime} menjadi ${bookingDetails.newTime}. Harap perbarui jadwal Anda.`,
      bookingId: bookingDetails.id,
      actionUrl: "/bookings",
      priority: NotificationPriority.HIGH,
    });
  }

  /**
   * Notify about booking cancellation
   */
  static async notifyBookingCancelled(
    userId: string,
    bookingDetails: {
      id: string;
      className: string;
      reason?: string;
    },
  ) {
    const reasonText = bookingDetails.reason
      ? ` Alasan: ${bookingDetails.reason}`
      : "";
    return this.notifyUser(userId, {
      type: "booking_cancelled",
      title: "Pesanan Kelas Dibatalkan",
      message: `Pesanan kelas "${bookingDetails.className}" telah dibatalkan.${reasonText} Anda dapat membuat pesanan baru kapan saja.`,
      bookingId: bookingDetails.id,
      actionUrl: "/rooms",
      priority: NotificationPriority.HIGH,
    });
  }

  /**
   * Notify about room becoming unavailable
   */
  static async notifyRoomUnavailable(
    userId: string,
    roomDetails: {
      id: string;
      name: string;
      date: string;
    },
  ) {
    return this.notifyUser(userId, {
      type: "room_change",
      title: "Ruangan Tidak Tersedia",
      message: `Ruangan "${roomDetails.name}" tidak lagi tersedia pada ${roomDetails.date}. Silakan pilih jadwal atau ruangan lain.`,
      roomId: roomDetails.id,
      actionUrl: "/rooms",
    });
  }

  /**
   * Broadcast welcome notification to new user
   */
  static async sendWelcomeNotification(userId: string, userName: string) {
    return this.notifyUser(userId, {
      type: "welcome",
      title: "Selamat Datang di Platform Kami!",
      message: `Halo ${userName}! Terima kasih telah mendaftar. Sistem pemesanan kelas kami memudahkan Anda untuk memesan ruangan kapan saja. Jelajahi daftar kelas kami dan buat pesanan pertama Anda sekarang! 🎉`,
      actionUrl: "/rooms",
    });
  }

  /**
   * Notify about incomplete profile
   */
  static async notifyIncompleteProfile(userId: string, userName: string) {
    return this.notifyUser(userId, {
      type: "incomplete_profile",
      title: "Lengkapi Profil Anda",
      message: `Halo ${userName}! Profil Anda belum lengkap. Informasi yang lengkap membantu kami memberikan pengalaman yang lebih baik. Silakan isi data yang masih kosong di halaman profil Anda.`,
      actionUrl: "/profile",
      priority: NotificationPriority.HIGH,
    });
  }

  /**
   * Notify about verification email
   */
  static async notifyVerificationReminder(userId: string) {
    return this.notifyUser(userId, {
      type: "verification_reminder",
      title: "Verifikasi Email Anda",
      message: `Anda belum memverifikasi email Anda. Silakan periksa kotak masuk Anda dan klik link verifikasi untuk melengkapi pendaftaran. Jika tidak menemukan email, minta untuk dikirim ulang.`,
      actionUrl: "/profile",
    });
  }

  /**
   * Broadcast admin notification
   */
  static async notifyAdmin(payload: Omit<NotificationPayload, "targetRole">) {
    return this.notifyRole("admin", payload);
  }

  /**
   * Get unread notification count for user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", userId),
        where("isRead", "==", false),
      );
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error("Error getting unread count:", error);
      return 0;
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(userId: string) {
    try {
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", userId),
        where("isRead", "==", false),
      );
      const snapshot = await getDocs(q);

      for (const docSnapshot of snapshot.docs) {
        await updateDoc(doc(db, "notifications", docSnapshot.id), {
          isRead: true,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
      throw error;
    }
  }
}
