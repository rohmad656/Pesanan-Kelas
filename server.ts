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
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
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
    console.error("CRITICAL: Backend Service Account has insufficient permissions to access Firestore. This may be due to IAM propagation delays or project mismatch. Please ensure the service account has 'Cloud Datastore User' role.");
  }
  
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // We don't throw here to avoid crashing the server/loop, but we log it as requested
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
      
      // Check if the requester is actually an admin in Firestore
      const userDoc = await db.collection("users").doc(decodedToken.uid).get();
      const userData = userDoc.data();

      if (!userData || userData.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized: Admin role required" });
      }

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
        details: `User ${uid} soft-deleted by admin ${decodedToken.uid}`
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: error.message });
    }
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
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, "bookings");
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
