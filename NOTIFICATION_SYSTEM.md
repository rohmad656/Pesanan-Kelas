# User-Friendly Notification System Implementation Guide

## Overview

This notification system provides comprehensive, user-friendly messaging for common scenarios in your campus booking application:

1. **Account scenarios** (deleted, not found, incomplete profile)
2. **Class reminders** (1 hour before and 15 minutes before)
3. **Booking updates** (approvals, rejections, changes, cancellations)
4. **Room changes** (unavailable, updated information)

---

## Files Created

### Frontend Files

1. **`src/lib/notificationTemplates.ts`**
   - Contains all user-friendly notification templates
   - Organized by category (Account, Class, Booking, Room, System)
   - Includes priority levels and helper functions

2. **`src/lib/notificationService.ts`**
   - Client-side notification service
   - Methods to create notifications in Firestore
   - Helper methods for specific scenarios (booking approved, class reminder, etc.)

3. **`src/lib/accountMessages.ts`**
   - User-friendly account status messages
   - Maps Firebase error codes to friendly messages
   - Provides suggestions and action guidance

4. **`src/components/AccountStatusAlert.tsx`**
   - React component for displaying account status messages
   - Beautiful UI with icons and suggestions
   - Includes RegistrationHelper component for guiding new users

### Backend Files

1. **`src/lib/scheduledNotifications.ts`**
   - Backend service for automated notifications
   - Handles class reminders (1 hour and 15 minutes before)
   - Includes functions to monitor booking changes

---

## Integration Steps

### Step 1: Update Login Page

Add import in `src/pages/Login.tsx`:

```typescript
import {
  formatErrorForUser,
  getAccountStatusMessage,
} from "../lib/accountMessages";
import {
  AccountStatusAlert,
  RegistrationHelper,
} from "../components/AccountStatusAlert";
```

Show user-friendly error messages:

```typescript
const handleLoginError = (error: any) => {
  const message = formatErrorForUser(error.code);
  setErrorMessage(message);
  // Display AccountStatusAlert component with message
};
```

### Step 2: Update Register Page

In `src/pages/Register.tsx`:

```typescript
import { NotificationService } from "../lib/notificationService";

// After successful registration
const handleRegistrationSuccess = async (userId: string, userName: string) => {
  // Send welcome notification
  await NotificationService.sendWelcomeNotification(userId, userName);
};
```

### Step 3: Enable Backend Scheduled Tasks

Add to `server.ts`:

```typescript
import { setupScheduledNotifications } from "./src/lib/scheduledNotifications";

// In your server initialization
setupScheduledNotifications();
```

This starts:

- Class reminder checks every 5 minutes
- Automatic cleanup of old notifications daily

### Step 4: Add Notification Triggers

When booking status changes, add in your backend/admin function:

```typescript
import { NotificationService } from "../lib/notificationService";

// When booking is approved
await NotificationService.notifyBookingApproved(userId, {
  id: bookingId,
  roomName: booking.room.name,
  className: booking.class.name,
});

// When booking time changes
await NotificationService.notifyBookingTimeChanged(userId, {
  id: bookingId,
  className: booking.class.name,
  oldTime: oldTime,
  newTime: newTime,
});
```

### Step 5: Update Booking Schema (Firestore)

Add these fields to your `bookings` collection:

```typescript
{
  // ... existing fields
  reminderSent1Hour: boolean; // Track if 1-hour reminder sent
  reminderSent15Min: boolean; // Track if 15-min reminder sent
  lastReminder1HourAt: Timestamp; // When reminder was sent
  lastReminder15MinAt: Timestamp; // When reminder was sent
  userEmail: string; // For email notifications
  userPhone: string; // For WhatsApp notifications
}
```

---

## Usage Examples

### Displaying Account Status Messages

```typescript
import { AccountStatusAlert } from '../components/AccountStatusAlert';
import { formatErrorForUser } from '../lib/accountMessages';

function MyComponent() {
  const [error, setError] = useState<string | null>(null);

  if (error) {
    const message = formatErrorForUser(error);
    return (
      <AccountStatusAlert
        status="error"
        title={message.title}
        message={message.message}
        suggestion={message.suggestion}
        actionText={message.actionText}
        actionUrl={'/daftar'}
        onDismiss={() => setError(null)}
      />
    );
  }

  return <div>Your content here</div>;
}
```

### Showing Registration Helper

```typescript
import { RegistrationHelper } from '../components/AccountStatusAlert';

// For first-time users
<RegistrationHelper showFor="first-time-user" />

// For deleted accounts
<RegistrationHelper showFor="account-deleted" />

// For wrong credentials
<RegistrationHelper showFor="wrong-credentials" />
```

### Creating Notifications

```typescript
import { NotificationService } from "../lib/notificationService";

// Notify user about booking approval
await NotificationService.notifyBookingApproved(userId, {
  id: booking.id,
  roomName: "Lab Komputer A",
  className: "Pemrograman Web",
});

// Notify about class reminder
await NotificationService.notifyClassReminder(userId, {
  id: booking.id,
  roomName: "Lab Komputer A",
  className: "Pemrograman Web",
});

// Notify about room change
await NotificationService.notifyBookingRoomChanged(userId, {
  id: booking.id,
  oldRoom: "Lab Komputer A",
  newRoom: "Lab Komputer B",
  className: "Pemrograman Web",
});
```

---

## Notification Types & When They Appear

### Account Scenarios

| Type                          | When                                     | Message                              |
| ----------------------------- | ---------------------------------------- | ------------------------------------ |
| `ACCOUNT_DELETED`             | User tries to login with deleted account | Clear guidance to create new account |
| `ACCOUNT_NOT_FOUND`           | First time user tries to login           | Registration guidance                |
| `NO_ACCOUNT_FOUND`            | Email not in system                      | Registration guidance                |
| `INCOMPLETE_PROFILE_REMINDER` | Profile missing required info            | Action to complete profile           |

### Class Reminders

| Type                    | When                    | Priority |
| ----------------------- | ----------------------- | -------- |
| `CLASS_REMINDER_1_HOUR` | 1 hour before class     | CRITICAL |
| `CLASS_REMINDER_15_MIN` | 15 minutes before class | CRITICAL |

### Booking Updates

| Type                   | When                   | Action URL |
| ---------------------- | ---------------------- | ---------- |
| `BOOKING_APPROVED`     | Admin approves booking | /bookings  |
| `BOOKING_REJECTED`     | Admin rejects booking  | /bookings  |
| `BOOKING_ROOM_CHANGED` | Room changed           | /bookings  |
| `BOOKING_TIME_CHANGED` | Time changed           | /bookings  |
| `BOOKING_CANCELLED`    | Booking cancelled      | /rooms     |

---

## Customization

### Change Message Text

Edit `src/lib/notificationTemplates.ts`:

```typescript
export const NotificationTemplates = {
  CLASS_REMINDER_1_HOUR: {
    type: "reminder",
    title: "Your Custom Title",
    message: "Your custom message here",
  },
  // ...
};
```

### Add New Notification Type

```typescript
// In notificationTemplates.ts
export const NotificationTemplates = {
  // ... existing
  MY_CUSTOM_NOTIFICATION: {
    type: "custom",
    title: "Custom Notification",
    message: "Custom message here",
    actionUrl: "/custom-page",
  },
};

// In notificationService.ts
static async notifyCustomEvent(userId: string, details: any) {
  return this.notifyUser(userId, {
    type: 'custom',
    title: 'Custom Notification',
    message: `Your custom message with ${details.name}`,
    actionUrl: '/custom-page',
  });
}
```

### Customize Email Notifications

In `src/lib/scheduledNotifications.ts`, update `sendEmailNotification()`:

```typescript
import emailjs from "@emailjs/browser";

async function sendEmailNotification(
  email: string,
  title: string,
  message: string,
  reminderType: string,
) {
  try {
    await emailjs.send("YOUR_SERVICE_ID", "YOUR_TEMPLATE_ID", {
      to_email: email,
      subject: title,
      message: message,
    });
  } catch (error) {
    console.error("Error sending email:", error);
  }
}
```

### Customize WhatsApp Notifications

In `src/lib/scheduledNotifications.ts`, update `sendWhatsAppNotification()`:

```typescript
import twilio from "twilio";

async function sendWhatsAppNotification(
  phoneNumber: string,
  title: string,
  message: string,
) {
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
  );

  await client.messages.create({
    from: "whatsapp:+1234567890",
    to: `whatsapp:${phoneNumber}`,
    body: `${title}\n\n${message}`,
  });
}
```

---

## Firestore Rules for Notifications

Update `firestore.rules`:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Notifications collection
    match /notifications/{notification} {
      // Users can read their own notifications
      allow read: if request.auth.uid == resource.data.userId;

      // Users can update their own notifications (mark as read)
      allow update: if request.auth.uid == resource.data.userId &&
                       request.resource.data.diff(resource.data).affectedKeys()
                         .hasOnly(['isRead', 'updatedAt']);

      // Users can delete their own notifications
      allow delete: if request.auth.uid == resource.data.userId;

      // Admin and staff can create notifications
      allow create: if request.auth.token.role in ['admin', 'staff'];
    }
  }
}
```

---

## Best Practices

✅ **DO:**

- Use consistent, supportive tone in all messages
- Provide clear action buttons with next steps
- Include suggestion text with helpful hints
- Test messages before deploying
- Monitor notification delivery rates
- Clean up old notifications regularly

❌ **DON'T:**

- Use technical jargon in user-facing messages
- Send duplicate notifications for same event
- Overwhelm users with too many notifications
- Ignore notification preferences
- Use all caps or exclamation marks excessively

---

## Testing

Test account scenarios:

```typescript
// Test in browser console
// 1. Try logging in with non-existent email
// 2. Try registering and check welcome notification
// 3. Create a booking and modify it to trigger notifications
// 4. Wait for class reminders to trigger (adjust time if needed)
```

---

## Troubleshooting

**Class reminders not sending?**

- Check that `setupScheduledNotifications()` is called in server.ts
- Verify booking has `scheduledTime` field
- Check browser console for errors

**Notifications not appearing?**

- Clear Firestore and check permissions
- Verify `userId` matches current user
- Check notification query in Notifications.tsx

**Messages not updating?**

- Clear cache and rebuild
- Verify template changes in notificationTemplates.ts
- Restart development server

---

## Support & Contact

For implementation help or questions, refer to:

- Notification templates: `src/lib/notificationTemplates.ts`
- Service methods: `src/lib/notificationService.ts`
- UI components: `src/components/AccountStatusAlert.tsx`
- Backend setup: `src/lib/scheduledNotifications.ts`
