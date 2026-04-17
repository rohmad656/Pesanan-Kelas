import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const configPath = path.join(__dirname, "firebase-applet-config.json");
let firestoreDatabaseId: string | undefined;

if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  firestoreDatabaseId = config.firestoreDatabaseId;
  if (!admin.apps.length) {
    console.log(`Initializing Firebase Admin for project: ${config.projectId}`);
    // On Cloud Run, we can usually omit credentials to use applicationDefault()
    admin.initializeApp({
      projectId: config.projectId,
    });
  }
}

const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
} as const;

type OperationType = typeof OperationType[keyof typeof OperationType];

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: "Backend Service Account",
    operationType,
    path
  };
  
  if (errInfo.error.includes("PERMISSION_DENIED")) {
    console.error("CRITICAL: Backend Service Account has insufficient permissions to access Firestore.");
    console.error("This is likely an IAM permission issue. Please ensure the Cloud Run service account has the 'Cloud Datastore User' role on the project.");
    console.error(`Project ID: ${admin.app().options.projectId}`);
    console.error(`Database ID: ${firestoreDatabaseId || "(default)"}`);
    console.error("To fix this, go to Google Cloud Console > IAM & Admin > IAM and add 'Cloud Datastore User' role to your service account.");
  }
  
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

// Helper to get Firestore instance with correct databaseId
const getDb = () => {
  const app = admin.app();
  if (firestoreDatabaseId) {
    return getFirestore(app, firestoreDatabaseId);
  }
  return getFirestore(app);
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/admin/delete-user", async (req, res) => {
    const { uid, adminToken } = req.body;

    if (!uid || !adminToken) {
      return res.status(400).json({ error: "Missing uid or adminToken" });
    }

    try {
      const db = getDb();
      // Verify admin token
      const decodedToken = await admin.auth().verifyIdToken(adminToken);
      
      // Check if the requester is actually an admin or staff in Firestore
      const userDoc = await db.collection("users").doc(decodedToken.uid).get();
      const userData = userDoc.data();

      if (!userData || (userData.role !== "admin" && userData.role !== "staff")) {
        return res.status(403).json({ error: "Unauthorized: Admin or Staff role required" });
      }

      // Check if target user exists and their details for logging
      const targetUserDoc = await db.collection("users").doc(uid).get();
      const targetUserData = targetUserDoc.data();

      // Delete from Auth
      await admin.auth().deleteUser(uid);

      // Soft delete in Firestore
      await db.collection("users").doc(uid).update({
        deleted: true,
        deletedAt: admin.firestore.FieldValue.serverTimestamp(),
        deletedBy: decodedToken.uid
      });

      // Log the action
      await db.collection("audit_logs").add({
        action: "DELETE_USER",
        targetUid: uid,
        performedBy: decodedToken.uid,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: `User ${targetUserData?.email || uid} soft-deleted by ${userData.role} ${decodedToken.uid}`
      });

      // Send a notification if target user can still see (unlikely if deleted, but for audit)
      // Actually, standard is to email them.
      console.log(`[EMAIL] To: ${targetUserData?.email} | Subject: Akun Dinonaktifkan | Body: Akun Anda telah dinonaktifkan oleh administrator.`);

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Notification for Password Change
  app.post("/api/notify-password-changed", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    // Simulate sending email
    console.log(`[EMAIL NOTIFICATION] To: ${email} | Subject: Kata Sandi Diubah | Body: Keamanan Akun: Sandi Anda telah berhasil diubah. Jika ini bukan Anda, segera hubungi admin.`);
    
    // Also add to audit logs if possible
    try {
      const db = getDb();
      await db.collection("audit_logs").add({
        action: "PASSWORD_CHANGED",
        targetEmail: email,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: `Password changed for user ${email}`
      });
    } catch (e) {
      console.error("Failed to log password change to audit logs:", e);
    }

    res.json({ success: true });
  });

  // Reminder Service
  const startReminderService = () => {
    const db = getDb();
    console.log(`Reminder service started (Database: ${firestoreDatabaseId || "(default)"})...`);

    setInterval(async () => {
      try {
        const now = new Date();
        // Check for approved bookings
        const bookingsSnap = await db.collection("bookings")
          .where("status", "==", "approved")
          .get();

        for (const bookingDoc of bookingsSnap.docs) {
          try {
            const booking = bookingDoc.data();
            const userId = booking.userId;
            
            if (!userId) continue;

            // Fetch user preferences
            const userDoc = await db.collection("users").doc(userId).get();
            if (!userDoc.exists) continue;
            
            const user = userDoc.data();
            if (!user || user.deleted) continue;

            const reminderMinutes = user.reminderMinutes || 30;
            const startTimeStr = booking.start_at || booking.startTime;
            if (!startTimeStr) continue;

            const startTime = new Date(startTimeStr);
            const reminderTime = new Date(startTime.getTime() - reminderMinutes * 60000);

            // If now is past reminderTime and within 1 hour of startTime
            // and reminder hasn't been sent
            if (now >= reminderTime && now < startTime && (!booking.remindersSent || !booking.remindersSent.includes("scheduled_reminder"))) {
              
              console.log(`Sending reminder to ${user.name} for booking ${bookingDoc.id}`);

              // 1. Portal Notification
              if (user.notifPortal !== false) {
                await db.collection("notifications").add({
                  userId,
                  title: "Pengingat Jadwal",
                  message: `Jadwal pemakaian ruangan ${booking.roomName} akan dimulai dalam ${reminderMinutes} menit.`,
                  type: "reminder",
                  isRead: false,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                  meta: `/bookings`
                });
              }

              // 2. Email Placeholder
              if (user.notifEmail !== false) {
                console.log(`[EMAIL] To: ${user.email} | Subject: Pengingat Jadwal | Body: Ruangan ${booking.roomName} akan dimulai dalam ${reminderMinutes} menit.`);
              }

              // 3. WhatsApp Placeholder
              if (user.notifWhatsApp) {
                console.log(`[WHATSAPP] To: ${user.whatsapp} | Message: Halo ${user.name}, ruangan ${booking.roomName} siap digunakan dalam ${reminderMinutes} menit.`);
              }

              // Mark as sent
              await bookingDoc.ref.update({
                remindersSent: admin.firestore.FieldValue.arrayUnion("scheduled_reminder")
              });
            }
          } catch (innerError) {
            console.error(`Error processing booking ${bookingDoc.id}:`, innerError);
          }
        }
      } catch (error: any) {
        // In some sandboxed environments, the service account might not have full Firestore access.
        // We gracefully ignore permission errors here to avoid flooding logs.
        if (error.message?.includes('PERMISSION_DENIED')) {
          return;
        }
        console.error("Reminder service error:", error);
      }
    }, 60000); // Check every minute
  };

  startReminderService();

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
