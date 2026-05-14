/\*\*

- COPY-PASTE CODE SNIPPETS
- Ready-to-use implementations for common scenarios
  \*/

// ============================================================================
// 1. SETUP: Add to your server.ts
// ============================================================================

/\*
// At the top of server.ts
import { setupScheduledNotifications } from './src/lib/scheduledNotifications';

// In your app initialization (after Firebase setup)
app.listen(PORT, () => {
console.log(`Server running on port ${PORT}`);

// Initialize scheduled notifications
setupScheduledNotifications();
console.log('Scheduled notifications initialized');
});
\*/

// ============================================================================
// 2. LOGIN PAGE: Handle account not found with friendly message
// ============================================================================

/\*
// In src/pages/Login.tsx - Add to imports
import { AccountStatusAlert, RegistrationHelper } from '../components/AccountStatusAlert';
import { formatErrorForUser } from '../lib/accountMessages';

// Add state for error display
const [accountError, setAccountError] = useState<string | null>(null);
const [showHelper, setShowHelper] = useState(false);

// In your login handler, catch errors like this:
const handleLogin = async (emailOrId: string, password: string) => {
try {
await emailLogin(emailOrId, password, role);
// Success - navigate user
} catch (error: any) {
const message = formatErrorForUser(error.code);
setAccountError(error.code);
setShowHelper(true);
// Don't show toast - instead show AccountStatusAlert below
}
};

// In your JSX:
{accountError && (

  <div className="mb-6">
    <AccountStatusAlert
      status="error"
      title={formatErrorForUser(accountError).title}
      message={formatErrorForUser(accountError).message}
      suggestion={formatErrorForUser(accountError).suggestion}
      actionText={formatErrorForUser(accountError).actionText}
      actionUrl={formatErrorForUser(accountError).actionText?.includes('Daftar') ? '/daftar' : undefined}
      onDismiss={() => setAccountError(null)}
    />
  </div>
)}

{showHelper && (

  <div className="mt-6">
    <RegistrationHelper 
      showFor={
        accountError === 'auth/user-not-found' ? 'first-time-user' : 'wrong-credentials'
      }
      onActionClick={() => setShowHelper(false)}
    />
  </div>
)}
*/

// ============================================================================
// 3. REGISTER PAGE: Send welcome notification
// ============================================================================

/\*
// In src/pages/Register.tsx - Add to imports
import { NotificationService } from '../lib/notificationService';

// After successful registration
const handleRegistrationSuccess = async (userId: string, userName: string) => {
try {
// Show success message
toast.success('Akun berhasil dibuat! Selamat datang!');

    // Send welcome notification
    await NotificationService.sendWelcomeNotification(userId, userName);

    // Redirect to dashboard
    navigate('/dashboard-mahasiswa');

} catch (error) {
console.error('Error after registration:', error);
}
};
\*/

// ============================================================================
// 4. ADMIN BOOKING APPROVAL: Send approval notification
// ============================================================================

/\*
// In your admin booking management function
import { NotificationService } from '../lib/notificationService';

const approveBooking = async (bookingId: string) => {
try {
const bookingRef = doc(db, 'bookings', bookingId);
const bookingSnap = await getDoc(bookingRef);
const booking = bookingSnap.data();

    // Update booking status
    await updateDoc(bookingRef, {
      status: 'approved',
      approvedAt: serverTimestamp(),
    });

    // Send notification to user
    await NotificationService.notifyBookingApproved(booking.userId, {
      id: bookingId,
      roomName: booking.room.name,
      className: booking.class.name,
    });

    toast.success('Pesanan telah disetujui');

} catch (error) {
console.error('Error approving booking:', error);
toast.error('Gagal menyetujui pesanan');
}
};
\*/

// ============================================================================
// 5. ADMIN BOOKING REJECTION: Send rejection notification
// ============================================================================

/\*
// In your admin booking management function
import { NotificationService } from '../lib/notificationService';

const rejectBooking = async (bookingId: string, reason?: string) => {
try {
const bookingRef = doc(db, 'bookings', bookingId);
const bookingSnap = await getDoc(bookingRef);
const booking = bookingSnap.data();

    // Update booking status
    await updateDoc(bookingRef, {
      status: 'rejected',
      rejectionReason: reason || 'Tidak sesuai dengan kebijakan',
      rejectedAt: serverTimestamp(),
    });

    // Send notification to user
    await NotificationService.notifyBookingRejected(booking.userId, {
      id: bookingId,
      roomName: booking.room.name,
      className: booking.class.name,
    });

    toast.success('Pesanan telah ditolak');

} catch (error) {
console.error('Error rejecting booking:', error);
toast.error('Gagal menolak pesanan');
}
};
\*/

// ============================================================================
// 6. BOOKING UPDATE: Notify about room change
// ============================================================================

/\*
// When a booking room is changed by admin
import { NotificationService } from '../lib/notificationService';

const changeBookingRoom = async (bookingId: string, newRoomId: string) => {
try {
const bookingRef = doc(db, 'bookings', bookingId);
const bookingSnap = await getDoc(bookingRef);
const booking = bookingSnap.data();

    // Get old and new room details
    const oldRoomRef = doc(db, 'rooms', booking.roomId);
    const newRoomRef = doc(db, 'rooms', newRoomId);
    const oldRoom = (await getDoc(oldRoomRef)).data();
    const newRoom = (await getDoc(newRoomRef)).data();

    // Update booking
    await updateDoc(bookingRef, {
      roomId: newRoomId,
      updatedAt: serverTimestamp(),
    });

    // Send notification to user
    await NotificationService.notifyBookingRoomChanged(booking.userId, {
      id: bookingId,
      oldRoom: oldRoom.name,
      newRoom: newRoom.name,
      className: booking.class.name,
    });

    toast.success('Ruangan telah diubah dan user telah diberitahu');

} catch (error) {
console.error('Error changing booking room:', error);
toast.error('Gagal mengubah ruangan');
}
};
\*/

// ============================================================================
// 7. BOOKING UPDATE: Notify about time change
// ============================================================================

/\*
// When a booking time is changed by admin
import { NotificationService } from '../lib/notificationService';
import { formatTime } from '../lib/utils'; // Create this helper

const changeBookingTime = async (bookingId: string, newTime: Timestamp) => {
try {
const bookingRef = doc(db, 'bookings', bookingId);
const bookingSnap = await getDoc(bookingRef);
const booking = bookingSnap.data();

    const oldTime = booking.scheduledTime.toDate();

    // Update booking
    await updateDoc(bookingRef, {
      scheduledTime: newTime,
      updatedAt: serverTimestamp(),
      reminderSent1Hour: false,  // Reset reminders
      reminderSent15Min: false,
    });

    // Send notification to user
    await NotificationService.notifyBookingTimeChanged(booking.userId, {
      id: bookingId,
      className: booking.class.name,
      oldTime: formatTime(oldTime),
      newTime: formatTime(newTime.toDate()),
    });

    toast.success('Jadwal telah diubah dan user telah diberitahu');

} catch (error) {
console.error('Error changing booking time:', error);
toast.error('Gagal mengubah jadwal');
}
};
\*/

// ============================================================================
// 8. BOOKING CANCELLATION: Notify user
// ============================================================================

/\*
// When cancelling a booking
import { NotificationService } from '../lib/notificationService';

const cancelBooking = async (bookingId: string, reason?: string) => {
try {
const bookingRef = doc(db, 'bookings', bookingId);
const bookingSnap = await getDoc(bookingRef);
const booking = bookingSnap.data();

    // Update booking status
    await updateDoc(bookingRef, {
      status: 'cancelled',
      cancellationReason: reason,
      cancelledAt: serverTimestamp(),
    });

    // Send notification to user
    await NotificationService.notifyBookingCancelled(booking.userId, {
      id: bookingId,
      className: booking.class.name,
      reason: reason || 'Ruangan tidak tersedia',
    });

    toast.success('Pesanan telah dibatalkan dan user telah diberitahu');

} catch (error) {
console.error('Error cancelling booking:', error);
toast.error('Gagal membatalkan pesanan');
}
};
\*/

// ============================================================================
// 9. PROFILE INCOMPLETE REMINDER: Check and notify
// ============================================================================

/\*
// Call this when user logs in or as scheduled task
import { NotificationService } from '../lib/notificationService';

const checkAndNotifyIncompleteProfile = async (userId: string, userProfile: any) => {
const requiredFields = ['name', 'nim', 'email', 'whatsappNumber'];
const missingFields = requiredFields.filter(field => !userProfile[field]);

if (missingFields.length > 0) {
await NotificationService.notifyIncompleteProfile(userId, userProfile.name);
}
};
\*/

// ============================================================================
// 10. DISPLAY UNREAD NOTIFICATION COUNT IN UI
// ============================================================================

/\*
// In any component where you want to show unread count
import { useEffect, useState } from 'react';
import { NotificationService } from '../lib/notificationService';
import { useAuth } from '../contexts/AuthContext';

function NotificationBadge() {
const { profile } = useAuth();
const [unreadCount, setUnreadCount] = useState(0);

useEffect(() => {
if (!profile) return;

    const checkUnreadCount = async () => {
      const count = await NotificationService.getUnreadCount(profile.uid);
      setUnreadCount(count);
    };

    checkUnreadCount();

    // Check every 30 seconds
    const interval = setInterval(checkUnreadCount, 30000);
    return () => clearInterval(interval);

}, [profile]);

return (
<div className="relative">
<button className="p-2 hover:bg-gray-100 rounded-lg">
<BellIcon className="w-6 h-6" />
</button>
{unreadCount > 0 && (
<span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
{unreadCount > 99 ? '99+' : unreadCount}
</span>
)}
</div>
);
}
\*/

// ============================================================================
// 11. CREATE CUSTOM NOTIFICATION TEMPLATE
// ============================================================================

/\*
// Add to notificationTemplates.ts
export const NotificationTemplates = {
// ... existing templates

CUSTOM_ANNOUNCEMENT: {
type: "custom_announcement",
title: "Pengumuman Penting",
message: "Anda memiliki pengumuman penting dari admin. Silakan baca pengumuman terbaru di halaman beranda.",
actionUrl: "/",
},
};

// In notificationService.ts
static async notifyCustomAnnouncement(userId: string, announcementTitle: string) {
return this.notifyUser(userId, {
type: 'custom_announcement',
title: announcementTitle,
message: `${announcementTitle}. Silakan baca pengumuman lengkap di halaman beranda.`,
actionUrl: '/',
});
}
\*/

// ============================================================================
// 12. BATCH SEND NOTIFICATIONS TO ROLE
// ============================================================================

/\*
// Send notification to all users of a specific role
import { NotificationService } from '../lib/notificationService';
import { collection, query, where, getDocs } from 'firebase/firestore';

const notifyAllMahasiswa = async (title: string, message: string) => {
try {
// Get all mahasiswa users
const q = query(collection(db, 'users'), where('role', '==', 'mahasiswa'));
const snapshot = await getDocs(q);

    // Send notification to each
    const promises = snapshot.docs.map(doc =>
      NotificationService.notifyUser(doc.id, {
        type: 'announcement',
        title,
        message,
      })
    );

    await Promise.all(promises);
    console.log(`Notified ${snapshot.size} mahasiswa`);

} catch (error) {
console.error('Error notifying all mahasiswa:', error);
}
};
\*/

// ============================================================================
// 13. EMAIL NOTIFICATION HELPER (EmailJS)
// ============================================================================

/\*
// Add to package.json dependencies
"@emailjs/browser": "^4.4.1"

// Add to env.local
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key

// Create helper function
import emailjs from '@emailjs/browser';

export const sendNotificationEmail = async (
email: string,
title: string,
message: string
) => {
try {
await emailjs.send(
import.meta.env.VITE_EMAILJS_SERVICE_ID,
import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
{
to_email: email,
subject: title,
message: message,
},
import.meta.env.VITE_EMAILJS_PUBLIC_KEY
);
} catch (error) {
console.error('Error sending email:', error);
}
};
\*/

// ============================================================================
// 14. FIRESTORE INDEX RECOMMENDATIONS
// ============================================================================

/\*
// Create these indexes in Firestore for better performance

1. Notifications by userId and isRead (for unread count)
   - Collection: notifications
   - Fields: userId (Ascending), isRead (Ascending), createdAt (Descending)

2. Bookings for reminder check
   - Collection: bookings
   - Fields: status (Ascending), scheduledTime (Ascending)

3. Bookings by userId (for personal booking list)
   - Collection: bookings
   - Fields: userId (Ascending), createdAt (Descending)

4. Users by role (for batch notifications)
   - Collection: users
   - Fields: role (Ascending), createdAt (Descending)
     \*/

// ============================================================================
// 15. TESTING: Simulate notifications locally
// ============================================================================

/\*
// In your browser console for testing
import { NotificationService } from './src/lib/notificationService';

// Test creating a notification
await NotificationService.notifyUser('USER_ID', {
type: 'reminder',
title: 'Test Reminder',
message: 'This is a test notification',
});

// Test getting unread count
await NotificationService.getUnreadCount('USER_ID');

// Test marking all as read
await NotificationService.markAllAsRead('USER_ID');
\*/

export default {};
