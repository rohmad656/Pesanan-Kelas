import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import nodemailer from "nodemailer";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin State
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
let firestoreDatabaseId: string | undefined;

// Pre-read config if available for databaseId and fallback projectId
let config: any = null;
if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  firestoreDatabaseId = config.firestoreDatabaseId;
}

if (!admin.apps.length) {
  try {
    console.log(`Initializing Firebase Admin with explicit credentials for project: ${process.env.FIREBASE_PROJECT_ID}`);
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Penting: Replace \\n dengan \n agar format private key terbaca dengan benar di cloud server
        privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
      }),
      databaseURL: "https://gen-lang-client-0805267122-default-rtdb.firebaseio.com"
    });
  } catch (error: any) {
    console.error("!!! FATAL FIREBASE INITIALIZATION ERROR !!!");
    console.error(error.message);
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

// Email Helper Logic
async function sendMail({ to, subject, html, templateParams }: { to: string, subject: string, html: string, templateParams?: Record<string, any> }) {
  // Support both standard and VITE_ prefixed env variables for server flexibility
  const serviceId = process.env.EMAILJS_SERVICE_ID || process.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID || process.env.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY || process.env.VITE_EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY || process.env.VITE_EMAILJS_PRIVATE_KEY;
  
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  console.log(`[DEBUG] Attempting to send email to ${to}...`);

  // 1. Priority: EmailJS REST API (If configured)
  if (serviceId && templateId && publicKey) {
    try {
      console.log(`[DEBUG] Using EmailJS with ServiceID: ${serviceId}`);
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: serviceId,
          template_id: templateId,
          user_id: publicKey,
          accessToken: privateKey,
          template_params: {
            to_email: to,
            subject: subject,
            message: html.replace(/<[^>]*>?/gm, ''),
            ...templateParams
          }
        })
      });

      if (response.ok) {
        console.log(`[DEBUG] EmailJS sent successfully to ${to}`);
        return { messageId: 'emailjs-success' };
      } else {
        const errorText = await response.text();
        console.error("EmailJS API Error Status:", response.status);
        console.error("EmailJS API Error Detail:", errorText);
        
        if (response.status === 403 && errorText.includes("Private Key")) {
          throw new Error("EMAILJS_CONFIG_ERROR: 'Strict Mode' aktif di EmailJS. Silakan masukkan Private Key di panel Secrets.");
        }
        if (response.status === 403 && errorText.includes("non-browser environments")) {
          throw new Error("EMAILJS_CONFIG_ERROR: Aktifkan 'Allow API access from non-browser environments' di Dashboard EmailJS > Account > Security.");
        }
        // Fallthrough to SMTP if EmailJS fails explicitly
      }
    } catch (e: any) {
      console.error("EmailJS fetch failed execution:", e.message);
    }
  }

  // 2. Secondary: SMTP Logic (Nodemailer)
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    return await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Portal Kampus'}" <${process.env.SMTP_FROM_EMAIL || SMTP_USER}>`,
      to,
      subject,
      text: html.replace(/<[^>]*>?/gm, ''), // Fallback text for old clients
      html,
    });
  } else {
    // Fallback/Simulation Log
    console.log(`[SMTP SIMULATION] Logic is ready. Configure SMTP environment variables to send for real.`);
    console.log(`[SMTP EMAIL] To: ${to} | Subject: ${subject} | Body Excerpt: ${html.substring(0, 100)}...`);
    return { messageId: 'simulated-id' };
  }
}

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
      try {
        await admin.auth().deleteUser(uid);
      } catch (authError: any) {
        // If user already deleted from Auth, we continue with Firestore cleanup
        if (authError.code !== 'auth/user-not-found') throw authError;
      }

      // Hard delete in Firestore as requested
      await db.collection("users").doc(uid).delete();

      // Log the action (Audit log is kept even if profile is gone)
      await db.collection("audit_logs").add({
        action: "DELETE_USER_HARD",
        targetUid: uid,
        targetEmail: targetUserData?.email || "Unknown",
        performedBy: decodedToken.uid,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: `Account ${targetUserData?.email || uid} permanently deleted from Auth & Firestore by ${userData.role} ${decodedToken.uid}`
      });

      // Simulation of email notice (Optional)
      console.log(`[EMAIL NOTICE] Account ${targetUserData?.email} has been permanently removed by administrative action.`);

      res.json({ success: true, message: "User permanently deleted" });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // User Management Endpoints
  app.get("/api/admin/users", async (req, res) => {
    const { adminToken } = req.query;
    if (!adminToken || typeof adminToken !== 'string') {
      return res.status(401).json({ error: "Missing authorization token" });
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(adminToken);
      const db = getDb();
      
      // Verify requester is admin/staff
      const requesterDoc = await db.collection("users").doc(decodedToken.uid).get();
      const requesterData = requesterDoc.data();

      if (!requesterData || (requesterData.role !== "admin" && requesterData.role !== "staff")) {
        return res.status(403).json({ error: "Unauthorized: Access denied" });
      }

      // 1. Fetch from Auth (Admin SDK)
      const authUsersResult = await admin.auth().listUsers();
      const authUsers = authUsersResult.users;

      // 2. Fetch from Firestore
      const usersSnap = await db.collection("users").where("deleted", "!=", true).get();
      const firestoreUsersMap: Record<string, any> = {};
      usersSnap.docs.forEach(doc => {
        firestoreUsersMap[doc.id] = doc.data();
      });

      // 3. Merge
      const mergedUsers = authUsers
        .filter(u => !firestoreUsersMap[u.uid]?.deleted) // Skip soft-deleted
        .map(u => {
          const profile = firestoreUsersMap[u.uid] || {};
          return {
            id: u.uid,
            uid: u.uid,
            email: u.email,
            name: profile.name || u.displayName || 'No Name',
            role: profile.role || u.customClaims?.role || 'mahasiswa',
            photoURL: profile.photoURL || u.photoURL,
            lastLogin: u.metadata.lastSignInTime,
            createdAt: profile.createdAt || u.metadata.creationTime,
            nim: profile.nim,
            whatsappNumber: profile.whatsappNumber || profile.whatsapp,
            division: profile.division,
            profileCompleted: profile.profileCompleted || false
          };
        });

      res.json({ users: mergedUsers });
    } catch (error: any) {
      console.error("Error fetching merged users:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/update-user-role", async (req, res) => {
    const { targetUid, newRole, adminToken } = req.body;
    if (!targetUid || !newRole || !adminToken) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(adminToken);
      const db = getDb();

      // Verify requester is admin
      const requesterDoc = await db.collection("users").doc(decodedToken.uid).get();
      const requesterData = requesterDoc.data();

      if (!requesterData || requesterData.role !== "admin") {
        return res.status(403).json({ error: "Only admins can change roles" });
      }

      // Update Firestore
      await db.collection("users").doc(targetUid).update({
        role: newRole,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update Auth Custom Claims for security rules performance
      await admin.auth().setCustomUserClaims(targetUid, { role: newRole });

      // Log action
      await db.collection("audit_logs").add({
        action: "UPDATE_USER_ROLE",
        targetUid,
        performedBy: decodedToken.uid,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: `Role updated to ${newRole} for user ${targetUid}`
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating user role:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // NIM to Email Lookup (For login support)
  app.get("/api/auth/lookup-email", async (req, res) => {
    const { nim } = req.query;
    if (!nim || typeof nim !== 'string') {
      return res.status(400).json({ error: "NIM is required" });
    }

    try {
      const db = getDb();
      const q = await db.collection("users").where("nim", "==", nim).where("deleted", "!=", true).limit(1).get();
      
      if (q.empty) {
        return res.status(404).json({ error: "User not found" });
      }

      const userData = q.docs[0].data();
      res.json({ email: userData.email });
    } catch (error: any) {
      console.error("Lookup Email Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Password Reset Endpoint (Backend Auth + SMTP + Audit)
  app.post("/api/auth/reset-password", async (req, res) => {
    const { email, continueUrl } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
      // 1. Generate Link
      const actionCodeSettings = {
        url: continueUrl || `${req.protocol}://${req.get("host")}/login?mode=resetPassword`,
        handleCodeInApp: true,
      };
      
      const link = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);

      // 2. Send Email via SMTP
      await sendMail({
        to: email,
        subject: "Atur Ulang Kata Sandi - Portal Kampus",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #4f46e5;">Atur Ulang Kata Sandi</h2>
            <p>Halo,</p>
            <p>Kami menerima permintaan untuk mengatur ulang kata sandi akun Anda di <strong>Portal Kampus</strong>.</p>
            <p>Klik tombol di bawah ini untuk melanjutkan:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${link}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Atur Ulang Sandi</a>
            </div>
            <p style="color: #666; font-size: 14px;">Link ini berlaku selama 1 jam. Jika Anda tidak merasa melakukan permintaan ini, abaikan email ini.</p>
            <hr style="margin: 30px 0; border: 0; border-top: 1px solid #eee;" />
            <p style="color: #999; font-size: 12px;">© 2026 Portal Kampus</p>
          </div>
        `
      });

      // 3. Audit Activity (Firestore Role)
      const db = getDb();
      await db.collection("audit_logs").add({
        action: "PASSWORD_RESET_REQUESTED",
        targetEmail: email,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: `Password reset link generated and sent via backend SMTP to ${email}`
      });

      res.json({ success: true, message: "Email reset password sudah dikirim." });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: "Gagal kirim email reset password." });
    }
  });

  // --- HARDENED OTP PASSWORD RESET ---
  
  // 1. Request OTP
  app.post("/api/auth/otp/request", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
      const db = getDb();
      
      // Check if user exists in Auth first
      try {
        await admin.auth().getUserByEmail(email);
      } catch (e: any) {
        if (e.code === 'auth/user-not-found') {
          return res.status(404).json({ success: false, message: "Akun dengan email ini tidak ditemukan." });
        }
        throw e;
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
      
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
      
      // Store in Firestore (Overwrite existing if any)
      await db.collection("otp_resets").doc(email).set({
        email,
        hashedOtp,
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        attempts: 0,
        isVerified: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Send Email
      await sendMail({
        to: email,
        subject: "Kode OTP Atur Ulang Sandi - Portal Kampus",
        templateParams: {
          otp_code: otp,
          to_email: email
        },
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #4f46e5;">Kode Verifikasi (OTP)</h2>
            <p>Halo,</p>
            <p>Gunakan kode di bawah ini untuk mengatur ulang kata sandi Anda di <strong>Portal Kampus</strong>:</p>
            <div style="text-align: center; margin: 30px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 12px; color: #4f46e5; border: 2px dashed #4f46e5; padding: 10px 20px; border-radius: 10px;">${otp}</span>
            </div>
            <p style="color: #666; font-size: 14px;">Kode ini berlaku selama <strong>5 menit</strong>. Jangan bagikan kode ini kepada siapapun.</p>
            <hr style="margin: 30px 0; border: 0; border-top: 1px solid #eee;" />
            <p style="color: #999; font-size: 12px;">© 2026 Portal Kampus</p>
          </div>
        `
      });

      // Audit log
      await db.collection("audit_logs").add({
        action: "OTP_REQUESTED",
        targetEmail: email,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: `6-digit OTP generated and sent to ${email}`
      });

      res.json({ success: true, message: "OTP telah dikirim ke email Anda." });
    } catch (error: any) {
      console.error("!!! OTP REQUEST CRITICAL ERROR !!!");
      console.error("Error Name:", error.name);
      console.error("Error Message:", error.message);
      console.error("Error Stack:", error.stack);
      
      // Check if it's a Firebase Auth error
      if (error.code) {
        console.error("Firebase Error Code:", error.code);
      }

      if (error.message.includes("identitytoolkit.googleapis.com")) {
        return res.status(503).json({
          success: false,
          message: "Layanan Autentikasi (Identity Toolkit API) belum aktif. Silakan hubungi admin untuk mengaktifkannya di Google Cloud Console.",
          link: "https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=352507716087"
        });
      }
      
      res.status(500).json({ 
        success: false, 
        message: "Gagal memproses permintaan OTP.",
        debug: process.env.NODE_ENV !== 'production' ? error.message : undefined 
      });
    }
  });

  // 2. Verify OTP
  app.post("/api/auth/otp/verify", async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });

    try {
      const db = getDb();
      const otpDoc = await db.collection("otp_resets").doc(email).get();

      if (!otpDoc.exists) {
        return res.status(404).json({ success: false, message: "Data OTP tidak ditemukan." });
      }

      const data = otpDoc.data()!;
      const hashedInput = crypto.createHash('sha256').update(otp).digest('hex');

      // Check expiry
      if (Date.now() > data.expiresAt.toDate().getTime()) {
        await db.collection("otp_resets").doc(email).delete();
        return res.status(400).json({ success: false, message: "OTP sudah kadaluarsa. Silakan minta kode baru." });
      }

      // Check attempts (Rate limiting: max 3)
      if (data.attempts >= 3) {
        await db.collection("otp_resets").doc(email).delete();
        return res.status(400).json({ success: false, message: "Terlalu banyak percobaan. Silakan minta kode baru." });
      }

      if (data.hashedOtp !== hashedInput) {
        await db.collection("otp_resets").doc(email).update({
          attempts: admin.firestore.FieldValue.increment(1)
        });
        return res.status(400).json({ success: false, message: "Kode OTP salah." });
      }

      // Valid: Mark as verified
      await db.collection("otp_resets").doc(email).update({
        isVerified: true
      });

      res.json({ success: true, message: "OTP berhasil diverifikasi." });
    } catch (error: any) {
      console.error("OTP Verify Error:", error);
      res.status(500).json({ success: false, message: "Gagal memproses verifikasi OTP." });
    }
  });

  // 3. Complete Password Reset
  app.post("/api/auth/otp/complete-reset", async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ error: "Email, OTP, and newPassword are required" });

    try {
      const db = getDb();
      const otpDoc = await db.collection("otp_resets").doc(email).get();

      if (!otpDoc.exists) {
        return res.status(400).json({ success: false, message: "Sesi reset tidak valid." });
      }

      const data = otpDoc.data()!;
      const hashedInput = crypto.createHash('sha256').update(otp).digest('hex');

      // Verification double check
      if (!data.isVerified || data.hashedOtp !== hashedInput || Date.now() > data.expiresAt.toDate().getTime()) {
        return res.status(400).json({ success: false, message: "Verifikasi tidak valid atau sesinya sudah berakhir." });
      }

      // Update password using Admin SDK
      const authUser = await admin.auth().getUserByEmail(email);
      await admin.auth().updateUser(authUser.uid, {
        password: newPassword
      });

      // Delete OTP doc (Single Use)
      await db.collection("otp_resets").doc(email).delete();

      // Audit log
      await db.collection("audit_logs").add({
        action: "PASSWORD_CHANGED_OTP",
        targetUid: authUser.uid,
        targetEmail: email,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: `Password updated successfully via OTP flow for ${email}`
      });

      // Send confirmation email
      await sendMail({
        to: email,
        subject: "Kata Sandi Berhasil Diperbarui - Portal Kampus",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #10b981;">Berhasil Diperbarui</h2>
            <p>Halo,</p>
            <p>Kata sandi akun Anda di <strong>Portal Kampus</strong> baru saja berhasil diubah.</p>
            <p>Jika Anda tidak merasa melakukan perubahan ini, segera hubungi tim bantuan kampus.</p>
            <hr style="margin: 30px 0; border: 0; border-top: 1px solid #eee;" />
            <p style="color: #999; font-size: 12px;">© 2026 Portal Kampus</p>
          </div>
        `
      });

      res.json({ success: true, message: "Kata sandi Anda berhasil diperbarui. Silakan login." });
    } catch (error: any) {
      console.error("OTP Reset Complete Error:", error);
      res.status(500).json({ success: false, message: "Gagal memperbarui kata sandi." });
    }
  });

  // Notification for Password Change
  app.post("/api/notify-password-changed", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    // Send Success Notification
    await sendMail({
      to: email,
      subject: "Kata Sandi Berhasil Diubah - Keamanan Akun",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; padding: 20px;">
          <h3 style="color: #059669;">Sandi Anda Berhasil Diubah</h3>
          <p>Halo,</p>
          <p>Keamanan Akun: Kata sandi Anda untuk <strong>Portal Kampus</strong> telah berhasil diubah pada <strong>${new Date().toLocaleString('id-ID')}</strong>.</p>
          <p>Jika ini bukan Anda, segera hubungi administrator untuk mengamankan akun Anda.</p>
          <hr />
          <p style="color: #999; font-size: 12px;">Pesan otomatis dari Sistem Keamanan Portal Kampus</p>
        </div>
      `
    });
    
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
    const { createServer } = await import("vite");
    const vite = await createServer({
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
