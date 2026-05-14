/**
 * Scheduled Notification Service
 * Handles automated notifications like class reminders
 * This runs on the backend to ensure reliability
 */

import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";

const db = getFirestore();

interface ClassReminder {
  bookingId: string;
  userId: string;
  className: string;
  roomName: string;
  classTime: Timestamp;
  reminderSent1Hour: boolean;
  reminderSent15Min: boolean;
  lastChecked: Timestamp;
}

/**
 * Check for upcoming classes and send reminders
 * Call this periodically (every 5-10 minutes) to check for classes
 */
export async function checkAndSendClassReminders() {
  try {
    const now = new Date();

    // Get bookings happening in the next 2 hours
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const oneHourFromNow = new Date(now.getTime() + 1 * 60 * 60 * 1000);
    const fifteenMinFromNow = new Date(now.getTime() + 15 * 60 * 1000);

    // Query bookings with status "approved" and time within next 2 hours
    const snapshot = await db
      .collection("bookings")
      .where("status", "==", "approved")
      .where("scheduledTime", ">=", Timestamp.fromDate(now))
      .where("scheduledTime", "<=", Timestamp.fromDate(twoHoursFromNow))
      .get();

    console.log(`Found ${snapshot.size} bookings to check for reminders`);

    for (const doc of snapshot.docs) {
      const booking = doc.data();
      const classTime = booking.scheduledTime.toDate();

      // 1-hour reminder
      if (
        classTime <= oneHourFromNow &&
        classTime > now &&
        !booking.reminderSent1Hour
      ) {
        await sendClassReminder(doc.id, booking, "1hour");
        await db.collection("bookings").doc(doc.id).update({
          reminderSent1Hour: true,
          lastReminder1HourAt: Timestamp.now(),
        });
        console.log(`Sent 1-hour reminder for booking ${doc.id}`);
      }

      // 15-minute reminder
      if (
        classTime <= fifteenMinFromNow &&
        classTime > now &&
        !booking.reminderSent15Min
      ) {
        await sendClassReminder(doc.id, booking, "15min");
        await db.collection("bookings").doc(doc.id).update({
          reminderSent15Min: true,
          lastReminder15MinAt: Timestamp.now(),
        });
        console.log(`Sent 15-minute reminder for booking ${doc.id}`);
      }
    }
  } catch (error) {
    console.error("Error checking and sending class reminders:", error);
  }
}

/**
 * Send class reminder notification
 */
async function sendClassReminder(
  bookingId: string,
  booking: any,
  reminderType: "1hour" | "15min",
) {
  try {
    let title = "";
    let message = "";

    if (reminderType === "1hour") {
      title = "Kelas Dimulai 1 Jam Lagi";
      message = `Halo! Kelas Anda "${booking.className}" di ${booking.roomName} akan dimulai dalam 1 jam. Silakan pastikan Anda siap dan bersiaplah untuk hadir. Selamat belajar! 📚`;
    } else {
      title = "Kelas Dimulai 15 Menit Lagi";
      message = `Perhatian! Kelas "${booking.className}" di ${booking.roomName} akan dimulai dalam 15 menit. Segera siapkan diri dan pastikan lokasi Anda sudah sesuai. ⏰`;
    }

    // Create notification in Firestore
    await db.collection("notifications").add({
      type: reminderType === "1hour" ? "reminder" : "reminder_urgent",
      title,
      message,
      userId: booking.userId,
      bookingId,
      roomId: booking.roomId,
      isRead: false,
      priority: 3, // CRITICAL priority
      actionUrl: "/bookings",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Send email notification if enabled
    if (booking.userEmail) {
      await sendEmailNotification(
        booking.userEmail,
        title,
        message,
        reminderType,
      );
    }

    // Send WhatsApp notification if enabled and number available
    if (booking.userPhone) {
      await sendWhatsAppNotification(
        booking.userPhone,
        title,
        message,
        reminderType,
      );
    }
  } catch (error) {
    console.error(
      `Error sending ${reminderType} reminder for booking ${bookingId}:`,
      error,
    );
  }
}

/**
 * Send email notification
 */
async function sendEmailNotification(
  email: string,
  title: string,
  message: string,
  reminderType: string,
) {
  try {
    // TODO: Implement email sending (EmailJS, SendGrid, etc.)
    console.log(`[EMAIL] To: ${email}, Subject: ${title}`);
    console.log(`[EMAIL] Body: ${message}`);
  } catch (error) {
    console.error("Error sending email notification:", error);
  }
}

/**
 * Send WhatsApp notification
 */
async function sendWhatsAppNotification(
  phoneNumber: string,
  title: string,
  message: string,
  reminderType: string,
) {
  try {
    // TODO: Implement WhatsApp sending (Twilio, WhatsApp Business API, etc.)
    console.log(`[WHATSAPP] To: ${phoneNumber}`);
    console.log(`[WHATSAPP] Message: ${title}\n${message}`);
  } catch (error) {
    console.error("Error sending WhatsApp notification:", error);
  }
}

/**
 * Monitor booking changes and send notifications
 */
export async function monitorBookingChanges() {
  try {
    // This function can be used with Firestore triggers or scheduled functions
    // to monitor changes to bookings and send notifications about:
    // - Booking updates (room change, time change)
    // - Booking cancellations
    // - Room availability changes

    console.log("Booking change monitoring active");
  } catch (error) {
    console.error("Error in booking change monitoring:", error);
  }
}

/**
 * Clean up old notifications (older than 30 days)
 */
export async function cleanupOldNotifications() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const snapshot = await db
      .collection("notifications")
      .where("createdAt", "<", Timestamp.fromDate(thirtyDaysAgo))
      .limit(500) // Batch delete to avoid too large operations
      .get();

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Deleted ${snapshot.size} old notifications`);
  } catch (error) {
    console.error("Error cleaning up old notifications:", error);
  }
}

/**
 * Setup scheduled tasks
 * This should be called once when the server starts
 */
export function setupScheduledNotifications() {
  // Check for class reminders every 5 minutes
  setInterval(
    () => {
      checkAndSendClassReminders();
    },
    5 * 60 * 1000,
  ); // 5 minutes

  // Clean up old notifications daily
  setInterval(
    () => {
      cleanupOldNotifications();
    },
    24 * 60 * 60 * 1000,
  ); // 24 hours

  console.log("Scheduled notification tasks set up successfully");
}
