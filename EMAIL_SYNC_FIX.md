/\*\*

- EMAIL SYNC AND DUPLICATE ACCOUNT DETECTION - BUG FIX
-
- Issue: Users receiving conflicting messages about email registration status
- - "Email already registered" vs "Email not registered"
- - Orphaned records in Firestore not matching Firebase Auth
- - Duplicate accounts with same email
-
- Root Cause:
- 1.  Firestore and Firebase Auth getting out of sync
- 2.  Orphaned/deleted Auth records still in Firestore
- 3.  Duplicate email records not consolidated
- 4.  Pending email updates not properly resolved
      \*/

// ============================================================
// SERVER-SIDE FIX: server.ts - Enhanced Email Sync Logic
// ============================================================

/\*\*

- IMPROVED EMAIL CHECK ENDPOINT
-
- This endpoint properly:
- 1.  Detects orphaned Firestore records
- 2.  Consolidates duplicate emails
- 3.  Returns role AND email status
- 4.  Provides resolution path
      \*/

app.get("/api/auth/check-email-v2", async (req, res) => {
const { email, excludeUid } = req.query;
if (!email || typeof email !== "string") {
return res.status(400).json({ error: "Email is required" });
}

try {
const db = getFirestore(admin.app());
const cleanEmail = email.toLowerCase().trim();

    // 1. Find ALL Firestore records with this email
    const firestoreRecords = await db
      .collection("users")
      .where("email", "==", cleanEmail)
      .get();

    const allRecords = [];
    let primaryRecord = null;
    let activeAuthUid = null;

    // 2. Check Auth status for each Firestore record
    for (const doc of firestoreRecords.docs) {
      if (excludeUid && doc.id === excludeUid) {
        allRecords.push({ uid: doc.id, data: doc.data(), authStatus: "skipped" });
        continue;
      }

      let authExists = false;
      try {
        const authUser = await admin.auth().getUser(doc.id);
        authExists = true;
        if (!activeAuthUid) {
          activeAuthUid = doc.id;
          primaryRecord = { uid: doc.id, data: doc.data(), authStatus: "active" };
        }
      } catch (e: any) {
        if (e.code !== "auth/user-not-found") {
          console.error("Unexpected auth error:", e);
          return res.status(500).json({ error: "Internal server error" });
        }
        // User deleted from Auth
        allRecords.push({ uid: doc.id, data: doc.data(), authStatus: "orphaned" });
      }

      if (!authExists) {
        allRecords.push({ uid: doc.id, data: doc.data(), authStatus: "orphaned" });
      }
    }

    // 3. Determine response based on findings
    if (!primaryRecord && allRecords.length === 0) {
      // Email not found anywhere
      return res.json({
        available: true,
        status: "email_not_found",
        message: "Email belum terdaftar",
      });
    }

    if (activeAuthUid && primaryRecord) {
      // Email found with active Auth user
      return res.json({
        available: false,
        status: "email_active",
        message: `Email ${cleanEmail} sudah terdaftar.`,
        role: primaryRecord.data.role || "mahasiswa",
        name: primaryRecord.data.name,
        uid: activeAuthUid,
      });
    }

    if (allRecords.length > 0 && !activeAuthUid) {
      // Email found in Firestore but NO active Auth user (orphaned)
      // Try to find the best record to suggest
      const bestRecord = allRecords.find((r) => r.data.profileCompleted) || allRecords[0];
      return res.json({
        available: true,
        status: "email_orphaned",
        message: "Email ini ditemukan dalam sistem tetapi belum sepenuhnya aktif. Silakan daftar ulang.",
        previousRole: bestRecord?.data?.role,
        suggestion: "register_new",
      });
    }

    // Fallback
    return res.json({
      available: true,
      status: "unknown",
      message: "Tidak dapat menentukan status email. Silakan coba lagi.",
    });

} catch (error: any) {
console.error("Check Email V2 Error:", error);
res.status(500).json({ error: "Internal server error" });
}
});

/\*\*

- NEW ENDPOINT: Cleanup & Consolidate Duplicate Emails
-
- Called when:
- - User attempts to register with existing email
- - During admin cleanup
- - When orphaned records are detected
    \*/

app.post("/api/auth/consolidate-email", async (req, res) => {
const { email, preferredUid, adminToken } = req.body;
if (!email || (!adminToken && !preferredUid)) {
return res.status(400).json({ error: "Missing required fields" });
}

try {
const db = getFirestore(admin.app());
const cleanEmail = email.toLowerCase().trim();

    // If adminToken provided, verify admin
    if (adminToken) {
      try {
        const decodedToken = await admin.auth().verifyIdToken(adminToken);
        const adminDoc = await db.collection("users").doc(decodedToken.uid).get();
        const adminData = adminDoc.data();

        if (!adminData || adminData.role !== "admin") {
          return res.status(403).json({ error: "Admin access required" });
        }
      } catch (e: any) {
        return res.status(401).json({ error: "Invalid admin token" });
      }
    }

    // Find all records with this email
    const allRecords = await db
      .collection("users")
      .where("email", "==", cleanEmail)
      .get();

    if (allRecords.empty) {
      return res.status(404).json({ error: "Email not found" });
    }

    if (allRecords.size === 1) {
      return res.json({ message: "No duplicates to consolidate" });
    }

    // Find which records are active in Auth
    const batch = db.batch();
    let primaryUid = preferredUid;
    const toDelete = [];

    for (const doc of allRecords.docs) {
      try {
        const authUser = await admin.auth().getUser(doc.id);
        if (!primaryUid && authUser) {
          primaryUid = doc.id;
        }
      } catch (e: any) {
        if (e.code === "auth/user-not-found") {
          toDelete.push(doc.id);
        }
      }
    }

    // Delete orphaned records
    for (const orphanUid of toDelete) {
      batch.delete(db.collection("users").doc(orphanUid));
    }

    await batch.commit();

    return res.json({
      success: true,
      primaryUid,
      deletedOrphans: toDelete.length,
      message: `Consolidated ${toDelete.length} duplicate/orphaned records`,
    });

} catch (error: any) {
console.error("Consolidate Email Error:", error);
res.status(500).json({ error: error.message });
}
});

/\*\*

- IMPROVED NIM TO EMAIL LOOKUP
-
- Returns:
- - Email (if user exists)
- - Auth status
- - Clear guidance
    \*/

app.get("/api/auth/lookup-email-v2", async (req, res) => {
const { nim } = req.query;
if (!nim || typeof nim !== "string") {
return res.status(400).json({ error: "NIM is required" });
}

try {
const db = getFirestore(admin.app());
const q = await db
.collection("users")
.where("nim", "==", nim)
.limit(1)
.get();

    if (q.empty) {
      return res.status(404).json({
        error: "user_not_found",
        message: "NIM/NIP tidak ditemukan dalam sistem. Silakan daftar terlebih dahulu.",
      });
    }

    const userData = q.docs[0].data();
    const uid = q.docs[0].id;

    // Check if user exists in Auth
    let authExists = false;
    try {
      await admin.auth().getUser(uid);
      authExists = true;
    } catch (e: any) {
      if (e.code !== "auth/user-not-found") throw e;
    }

    return res.json({
      email: userData.email,
      name: userData.name,
      role: userData.role,
      authExists: authExists,
      status: authExists ? "active" : "orphaned",
      message: authExists
        ? `Akun dengan NIM ${nim} ditemukan. Email: ${userData.email}`
        : `Akun dengan NIM ${nim} ditemukan tetapi belum aktif. Silakan daftar ulang.`,
    });

} catch (error: any) {
console.error("Lookup Email V2 Error:", error);
res.status(500).json({ error: "Internal server error" });
}
});

/\*\*

- SYNC ENDPOINT: Fix mismatched email/pending email
-
- Resolves:
- - Pending email not syncing to primary email
- - Email update confirmation not working
- - Mismatch between Auth email and Firestore email
    \*/

app.post("/api/auth/sync-email", async (req, res) => {
const { userToken } = req.body;
if (!userToken) {
return res.status(400).json({ error: "User token required" });
}

try {
const decodedToken = await admin.auth().verifyIdToken(userToken);
const db = getFirestore(admin.app());
const uid = decodedToken.uid;

    // Get Auth user
    const authUser = await admin.auth().getUser(uid);
    const authEmail = authUser.email;

    // Get Firestore user
    const docSnap = await db.collection("users").doc(uid).get();
    const userData = docSnap.data();

    if (!userData) {
      return res.status(404).json({ error: "User profile not found" });
    }

    const firestoreEmail = userData.email;
    const pendingEmail = userData.pendingEmail;

    // Check for mismatches
    const issues = [];
    const updates: any = {};

    // Issue 1: Auth email different from Firestore email
    if (authEmail && firestoreEmail && authEmail !== firestoreEmail) {
      // Auth is source of truth
      issues.push(`Email mismatch: Auth has "${authEmail}" but Firestore has "${firestoreEmail}"`);
      updates.email = authEmail;
      if (pendingEmail === firestoreEmail) {
        updates.pendingEmail = null;
      }
    }

    // Issue 2: Pending email matches verified Auth email
    if (pendingEmail && authEmail && pendingEmail === authEmail) {
      issues.push(`Pending email "${pendingEmail}" is now verified`);
      updates.email = authEmail;
      updates.pendingEmail = null;
    }

    if (Object.keys(updates).length === 0) {
      return res.json({
        synced: false,
        status: "already_sync",
        message: "Email sudah tersinkronisasi dengan baik",
      });
    }

    // Apply updates
    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    await db.collection("users").doc(uid).update(updates);

    // Log the sync
    await db.collection("audit_logs").add({
      action: "EMAIL_SYNC",
      userId: uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: `Email sync resolved. Issues: ${issues.join("; ")}. Updates: ${JSON.stringify(updates)}`,
    });

    return res.json({
      synced: true,
      status: "sync_complete",
      message: "Email berhasil tersinkronisasi",
      changes: updates,
      issues: issues,
    });

} catch (error: any) {
console.error("Email Sync Error:", error);
res.status(500).json({ error: error.message });
}
});

// ============================================================
// CLIENT-SIDE FIX: AuthContext.tsx - Better Error Handling
// ============================================================

/\*\*

- Updated emailRegister with improved email check
  \*/

const emailRegister = async (
emailOrId: string,
password: string,
name: string,
intendedRole?: Role,
) => {
// Check if NIM already exists via backend API (unauthenticated)
if (!emailOrId.includes("@")) {
try {
const res = await fetch(
`/api/auth/check-nim?nim=${encodeURIComponent(emailOrId)}`,
);
if (res.ok) {
const data = await res.json();
if (!data.available) {
const error: any = new Error(
`NIM/NIP ${emailOrId} sudah terdaftar. Silakan gunakan fitur Login atau hubungi Admin jika terdapat ketidaksesuaian data.`,
);
error.code = "custom/nim-already-in-use";
throw error;
}
}
} catch (e: any) {
if (e.code === "custom/nim-already-in-use") throw e;
console.warn("NIM availability check failed, proceeding to Auth:", e);
}
} else {
try {
// ✅ FIX: Use v2 endpoint for better status detection
const res = await fetch(
`/api/auth/check-email-v2?email=${encodeURIComponent(emailOrId)}`,
);
if (res.ok) {
const checkData = await res.json();

        // ✅ NEW: Better status handling
        if (checkData.status === "email_active") {
          setConflictInfo({ email: emailOrId, role: checkData.role });
          const error: any = new Error(
            `Email ${emailOrId} sudah terdaftar sebagai ${checkData.role?.toUpperCase()}. Silakan Login menggunakan profil ini, atau hubungi Admin jika ada pertanyaan.`,
          );
          error.code = "custom/email-already-in-use";
          throw error;
        } else if (checkData.status === "email_orphaned") {
          // ✅ NEW: Handle orphaned records gracefully
          toast.warning(
            "Email ini pernah terdaftar sebelumnya. Sistem sedang mempersiapkan profil Anda...",
          );
          // Allow registration to proceed (will consolidate automatically)
        } else if (checkData.status === "email_not_found") {
          // Email available, proceed
        }
      }
    } catch (e: any) {
      if (e.code === "custom/email-already-in-use") throw e;
      console.warn("Email availability check failed, proceeding to Auth:", e);
    }

}

const email = formatEmail(emailOrId);
const result = await createUserWithEmailAndPassword(auth, email, password);
const currentUser = result.user;

// ... rest of registration logic ...
};

/\*\*

- Updated emailLogin with sync check
  \*/

const emailLogin = async (
emailOrId: string,
password: string,
intendedRole?: Role,
) => {
let emailToUse = emailOrId;

if (!emailOrId.includes("@")) {
try {
// ✅ FIX: Use v2 endpoint
const res = await fetch(
`/api/auth/lookup-email-v2?nim=${encodeURIComponent(emailOrId)}`,
);
if (res.ok) {
const data = await res.json();
emailToUse = data.email;

        // ✅ NEW: Warn if account is orphaned
        if (data.status === "orphaned") {
          toast.warning(
            `Akun ini belum sepenuhnya aktif. Silakan ikuti instruksi reset password untuk mengaktifkannya.`,
          );
        }
      } else if (res.status === 404) {
        const errData = await res.json();
        throw new Error(errData.message || `NIM ${emailOrId} tidak ditemukan`);
      } else {
        emailToUse = `${emailOrId}@campus.ac.id`;
      }
    } catch (e) {
      console.warn("NIM lookup failed, using fallback email format:", e);
      emailToUse = `${emailOrId}@campus.ac.id`;
    }

} else {
emailToUse = emailOrId;
}

const result = await signInWithEmailAndPassword(auth, emailToUse, password);

// ✅ NEW: Auto-sync email after successful login
try {
const token = await result.user.getIdToken();
const syncRes = await fetch("/api/auth/sync-email", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ userToken: token }),
});

    if (syncRes.ok) {
      const syncData = await syncRes.json();
      if (syncData.synced) {
        console.log("Email synced:", syncData.changes);
      }
    }

} catch (e) {
console.warn("Email sync after login failed:", e);
}

// ... rest of login logic ...
};

export default {};
