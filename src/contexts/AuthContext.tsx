import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateEmail,
  updateProfile as updateAuthProfile,
  confirmPasswordReset,
  verifyPasswordResetCode,
  updatePassword,
  verifyBeforeUpdateEmail,
  sendEmailVerification,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  onSnapshot,
  Timestamp,
  deleteDoc,
} from "firebase/firestore";
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from "../lib/firebase";
import emailjs from "@emailjs/browser";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export type Role = "mahasiswa" | "dosen" | "admin" | "staff";

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: Role;
  nim?: string;
  whatsappNumber?: string;
  division?: string;
  photoURL?: string;
  profileCompleted?: boolean;
  notifPortal?: boolean;
  notifEmail?: boolean;
  notifWhatsApp?: boolean;
  reminderMinutes?: number;
  pendingEmail?: string;
  createdAt: any;
}

export interface ConflictInfo {
  email: string;
  role: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  pendingRegistration: {
    uid: string;
    email: string;
    name: string;
    photoURL: string;
    role?: Role;
  } | null;
  conflictInfo: ConflictInfo | null;
  loading: boolean;
  login: (
    intendedRole?: Role,
    existingUser?: FirebaseUser,
  ) => Promise<{ isNewUser: boolean }>;
  completeRegistration: (data: Partial<UserProfile>) => Promise<void>;
  emailLogin: (
    emailOrId: string,
    password: string,
    intendedRole?: Role,
  ) => Promise<void>;
  emailRegister: (
    emailOrId: string,
    password: string,
    name: string,
    intendedRole?: Role,
  ) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  resendVerification: () => Promise<void>;
  resetPassword: (
    email: string,
  ) => Promise<{ success: boolean; message: string; code?: string }>;
  confirmNewPassword: (
    code: string,
    password: string,
  ) => Promise<{ success: boolean; message: string; code?: string }>;
  verifyResetCode: (code: string) => Promise<{
    success: boolean;
    email?: string;
    message?: string;
    code?: string;
  }>;
  sendOTPReset: (
    email: string,
  ) => Promise<{ success: boolean; message: string }>;
  verifyOTPReset: (
    email: string,
    otp: string,
  ) => Promise<{ success: boolean; message: string }>;
  completeOTPReset: (
    email: string,
    otp: string,
    password: string,
  ) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  loginWithRedirect: (intendedRole?: Role) => Promise<void>;
  linkGoogle: () => Promise<FirebaseUser | undefined>;
}

// Helper: get dashboard route based on role
const getDashboardRoute = (role: Role | string): string => {
  switch (role) {
    case "staff":
      return "/dashboard-staff";
    case "dosen":
      return "/dashboard-dosen";
    case "admin":
      return "/dashboard-admin";
    default:
      return "/dashboard-mahasiswa";
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    // Initial profile from local storage for instant UI feedback
    const saved = localStorage.getItem("user_profile");
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [pendingRegistration, setPendingRegistration] = useState<{
    uid: string;
    email: string;
    name: string;
    photoURL: string;
    role?: Role;
  } | null>(null);
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    // Handle Redirect Results (Optional but helpful for slow iFrame popup issues)
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          // Resolve role after redirect
          const intendedRoleRaw = localStorage.getItem("intended_role");
          const intendedRole = (intendedRoleRaw as Role) || "mahasiswa";
          await login(intendedRole, result.user);
          localStorage.removeItem("intended_role");
        }
      })
      .catch((e) => console.error("Redirect login result failed:", e));

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        // Listen to profile changes in real-time
        const docRef = doc(db, "users", currentUser.uid);
        unsubscribeProfile = onSnapshot(
          docRef,
          async (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as UserProfile & {
                deleted?: boolean;
              };
              if (data.deleted) {
                signOut(auth);
                setProfile(null);
                setUser(null);
                localStorage.removeItem("user_profile");
                toast.error("Akun Anda telah dihapus oleh administrator.");
              } else {
                // --- PENDING EMAIL SYNC AUTO-CHECK ---
                if (
                  data.pendingEmail &&
                  currentUser.email !== data.pendingEmail
                ) {
                  const lastReload = parseInt(
                    localStorage.getItem("last_auth_reload") || "0",
                  );
                  if (Date.now() - lastReload > 30000) {
                    currentUser
                      .reload()
                      .then(() => {
                        localStorage.setItem(
                          "last_auth_reload",
                          Date.now().toString(),
                        );
                      })
                      .catch((e) =>
                        console.warn("Background auth reload failed:", e),
                      );
                  }
                }

                // --- DETECT ROLE CHANGE & REFRESH TOKEN ---
                const oldProfileRaw = localStorage.getItem("user_profile");
                if (oldProfileRaw) {
                  try {
                    const oldData = JSON.parse(oldProfileRaw);
                    if (
                      data.role &&
                      oldData.role &&
                      oldData.role !== data.role
                    ) {
                      currentUser
                        .getIdToken(true)
                        .then(() => {
                          toast.success(
                            `Role Anda diperbarui menjadi ${data.role.toUpperCase()}!`,
                            {
                              duration: 6000,
                              icon: "✨",
                            },
                          );
                        })
                        .catch((e) => {
                          console.error("Token refresh failed:", e);
                          toast.error(
                            "Role Anda diperbarui. Silakan login ulang untuk sinkronisasi.",
                          );
                        });
                    }
                  } catch (e) {
                    console.warn("Role detection skip:", e);
                  }
                }

                // --- AUTO SYNC NEWLY VERIFIED EMAIL ---
                if (
                  currentUser.email &&
                  currentUser.email !== data.email &&
                  currentUser.email === data.pendingEmail
                ) {
                  updateDoc(docRef, {
                    email: currentUser.email,
                    pendingEmail: null,
                    updatedAt: serverTimestamp(),
                  })
                    .then(() => {
                      toast.success(
                        `Email Anda berhasil diperbarui ke ${currentUser.email}!`,
                      );
                    })
                    .catch((e) =>
                      console.error("Sync verified email failed:", e),
                    );
                }

                setProfile(data as UserProfile);
                localStorage.setItem("user_profile", JSON.stringify(data));
              }
            } else {
              setProfile(null);
            }
            setLoading(false);
          },
          (error) => {
            handleFirestoreError(
              error,
              OperationType.GET,
              `users/${currentUser.uid}`,
            );
            setLoading(false);
          },
        );
      } else {
        setUser(null);
        setProfile(null);
        localStorage.removeItem("user_profile");
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const formatEmail = (emailOrId: string) => {
    return emailOrId.includes("@") ? emailOrId : `${emailOrId}@campus.ac.id`;
  };

  const emailLogin = async (
    emailOrId: string,
    password: string,
    intendedRole?: Role,
  ) => {
    let emailToUse = emailOrId;

    if (!emailOrId.includes("@")) {
      try {
        const res = await fetch(
          `/api/auth/lookup-email?nim=${encodeURIComponent(emailOrId)}`,
        );
        if (res.ok) {
          const data = await res.json();
          emailToUse = data.email;
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

    try {
      const docRef = doc(db, "users", result.user.uid);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        await signOut(auth);
        const error: any = new Error(
          "Akun belum terdaftar di database. Silakan hubungi admin.",
        );
        error.code = "custom/user-not-found";
        throw error;
      }

      const userData = docSnap.data() as UserProfile;

      if (intendedRole && userData.role !== intendedRole) {
        const isStaffAdminMismatch =
          intendedRole === "admin" &&
          (userData.role === "admin" || userData.role === "staff");
        if (!isStaffAdminMismatch) {
          toast.error(
            `Akses Ditolak: Anda terdaftar sebagai ${userData.role.toUpperCase()}. Gunakan portal yang sesuai atau hubungi Admin untuk perubahan peran.`,
          );
        }
      }

      setProfile(userData);
      localStorage.setItem("user_profile", JSON.stringify(userData));
      toast.success("Login berhasil!");

      await Promise.all([
        updateDoc(docRef, {
          lastLogin: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
        setDoc(doc(collection(db, "audit_logs")), {
          action: "LOGIN",
          performedBy: result.user.uid,
          timestamp: serverTimestamp(),
          details: `User ${result.user.email} logged in with role ${userData.role} (intended: ${intendedRole || "not specified"})`,
        }).catch((e) => console.warn("Failed to log login event:", e)),
      ]);
    } catch (error: any) {
      if (error.code === "custom/user-not-found") throw error;
      handleFirestoreError(
        error,
        OperationType.GET,
        `users/${result.user.uid}`,
      );
    }
  };

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
        const res = await fetch(
          `/api/auth/check-email?email=${encodeURIComponent(emailOrId)}`,
        );
        if (res.ok) {
          const checkData = await res.json();
          if (!checkData.available) {
            setConflictInfo({ email: emailOrId, role: checkData.role });
            const error: any = new Error(
              `Email ${emailOrId} sudah terdaftar sebagai ${checkData.role?.toUpperCase()}. Silakan Login menggunakan profil ${checkData.role?.toUpperCase()}, atau ajukan perubahan peran jika salah.`,
            );
            error.code = "custom/email-already-in-use";
            throw error;
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

    // ✅ FIX: Role detection yang benar — intendedRole dipakai sebagai prioritas utama
    // Domain detection hanya override jika domain student terdeteksi (security)
    let finalRole: Role = intendedRole || "mahasiswa";

    // Security: domain student UIN paksa jadi mahasiswa
    if (email.endsWith("@student.uin-malang.ac.id")) {
      finalRole = "mahasiswa";
    }
    // Domain dosen UIN: override jika bukan student
    else if (
      email.endsWith("@uin-malang.ac.id") &&
      !intendedRole // hanya override jika user tidak pilih role sendiri
    ) {
      finalRole = "dosen";
    }
    // Admin khusus
    if (
      email === "gama96954@gmail.com" ||
      (intendedRole === "admin" && email.includes("admin"))
    ) {
      finalRole = "admin";
    }

    // Peringatan jika role terdeteksi berbeda dari yang dipilih
    if (intendedRole && finalRole !== intendedRole) {
      toast.error(
        `Terdeteksi sebagai ${finalRole.toUpperCase()}. Dialihkan ke portal yang sesuai.`,
      );
    }

    // Send verification email for manual registration
    try {
      const { sendEmailVerification } = await import("firebase/auth");
      await sendEmailVerification(currentUser);
      toast.success(
        "Email verifikasi telah dikirim. Silakan cek kotak masuk Anda.",
      );
    } catch (e) {
      console.warn("Failed to send verification email:", e);
    }

    const newProfile: any = {
      uid: currentUser.uid,
      email: currentUser.email || email,
      name: name,
      role: finalRole,
      profileCompleted: false,
      notifPortal: true,
      notifEmail: true,
      notifWhatsApp: false,
      reminderMinutes: 30,
      createdAt: serverTimestamp(),
    };

    if (!emailOrId.includes("@")) {
      newProfile.nim = emailOrId;
    }

    try {
      await setDoc(doc(db, "users", currentUser.uid), newProfile);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.CREATE,
        `users/${currentUser.uid}`,
      );
    }
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!auth.currentUser || !profile) return;

    try {
      const docRef = doc(db, "users", auth.currentUser.uid);

      if (data.email && data.email !== profile.email) {
        const res = await fetch(
          `/api/auth/check-email?email=${encodeURIComponent(data.email)}&excludeUid=${auth.currentUser.uid}`,
        );
        if (res.ok) {
          const checkData = await res.json();
          if (!checkData.available) {
            throw new Error("Email sudah digunakan oleh akun lain.");
          }
        }

        await verifyBeforeUpdateEmail(auth.currentUser, data.email);
        data.pendingEmail = data.email;
        toast.success(
          `Permintaan ubah email terkirim ke ${data.email}. Silakan verifikasi email baru Anda sebelum perubahan diterapkan.`,
        );
        delete data.email;
      }

      if (data.nim && data.nim !== profile.nim) {
        const res = await fetch(
          `/api/auth/check-nim?nim=${encodeURIComponent(data.nim)}&excludeUid=${auth.currentUser.uid}`,
        );
        if (res.ok) {
          const checkData = await res.json();
          if (!checkData.available) {
            throw new Error("NIM/NIP sudah digunakan oleh akun lain.");
          }
        }
      }

      if (data.name && data.name !== profile.name) {
        await updateAuthProfile(auth.currentUser, { displayName: data.name });
      }

      const updatedProfile = { ...profile, ...data };
      const hasBaseFields = !!(
        updatedProfile.name &&
        updatedProfile.email &&
        updatedProfile.nim &&
        updatedProfile.whatsappNumber &&
        updatedProfile.role
      );
      const isCompleted = hasBaseFields;

      try {
        await setDoc(doc(collection(db, "audit_logs")), {
          action: "UPDATE_PROFILE",
          performedBy: auth.currentUser.uid,
          timestamp: serverTimestamp(),
          details: `User ${profile.email} updated profile. Fields: ${Object.keys(data).join(", ")}`,
        }).catch((e) => console.warn("Audit update fail:", e));

        await setDoc(
          docRef,
          {
            ...data,
            profileCompleted: isCompleted,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      } catch (error) {
        handleFirestoreError(
          error,
          OperationType.UPDATE,
          `users/${auth.currentUser.uid}`,
        );
      }
    } catch (error: any) {
      console.error("Update profile failed", error);
      if (error.code === "auth/requires-recent-login") {
        throw new Error(
          "Sesi Anda telah berakhir. Silakan keluar dan masuk kembali untuk mengubah email.",
        );
      }
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const formattedEmail = formatEmail(email);

      try {
        const response = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formattedEmail,
            continueUrl: window.location.origin + "/login?mode=resetPassword",
          }),
        });

        const res = await response.json();
        if (response.ok) {
          return {
            success: true,
            message: res.message || "Link reset sudah dikirim.",
          };
        }

        console.warn(
          "Backend reset attempt failed. Falling back to client-side SDK.",
        );
        throw new Error("FALLBACK_TO_CLIENT");
      } catch (backendError: any) {
        const actionCodeSettings = {
          url: window.location.origin + "/login?mode=resetPassword",
          handleCodeInApp: true,
        };
        await sendPasswordResetEmail(auth, formattedEmail, actionCodeSettings);
        return { success: true, message: "Link reset sudah dikirim." };
      }
    } catch (error: any) {
      console.error("Reset password failed:", error);
      let message = "Gagal mengirim link reset. Periksa kembali email Anda.";

      if (
        error.message.includes("auth/user-not-found") ||
        error.code === "auth/user-not-found"
      ) {
        message = "Akun dengan email ini tidak ditemukan.";
      } else if (
        error.message.includes("auth/invalid-email") ||
        error.code === "auth/invalid-email"
      ) {
        message = "Format email tidak valid.";
      } else if (
        error.message.includes("auth/too-many-requests") ||
        error.code === "auth/too-many-requests"
      ) {
        message = "Terlalu banyak permintaan. Silakan coba lagi nanti.";
      }

      return { success: false, message, code: error.code };
    }
  };

  const confirmNewPassword = async (code: string, password: string) => {
    try {
      await confirmPasswordReset(auth, code, password);
      return { success: true, message: "Password berhasil diubah." };
    } catch (error: any) {
      return { success: false, message: error.message, code: error.code };
    }
  };

  const verifyResetCode = async (code: string) => {
    try {
      const email = await verifyPasswordResetCode(auth, code);
      return { success: true, email };
    } catch (error: any) {
      return { success: false, message: error.message, code: error.code };
    }
  };

  const sendOTPReset = async (email: string) => {
    try {
      const response = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Backend returned non-JSON response:", text);
        return {
          success: false,
          message:
            "Server sedang sibuk atau API belum aktif. Silakan hubungi admin.",
        };
      }

      const data = await response.json();
      return {
        success: data.success,
        message: data.message,
        resolvedEmail: data.resolvedEmail,
      };
    } catch (error: any) {
      console.error("OTP Request failed:", error);
      return {
        success: false,
        message: "Koneksi ke server gagal. Pastikan API Auth sudah aktif.",
      };
    }
  };

  const verifyOTPReset = async (email: string, otp: string) => {
    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        return {
          success: false,
          message: "Gagal verifikasi: Layanan server tidak tersedia.",
        };
      }

      const data = await response.json();
      return { success: data.success, message: data.message };
    } catch (error: any) {
      console.error("OTP Verification failed:", error);
      return {
        success: false,
        message: "Terjadi kesalahan koneksi saat verifikasi.",
      };
    }
  };

  const completeOTPReset = async (
    email: string,
    otp: string,
    newPassword: string,
  ) => {
    try {
      const response = await fetch("/api/auth/otp/complete-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        return {
          success: false,
          message: "Gagal update password: Masalah pada server.",
        };
      }

      const data = await response.json();
      return { success: data.success, message: data.message };
    } catch (error: any) {
      console.error("OTP Reset Complete failed:", error);
      return {
        success: false,
        message: "Terjadi kesalahan saat memperbarui password.",
      };
    }
  };

  const navigate = useNavigate();

  const login = async (intendedRole?: Role, existingUser?: FirebaseUser) => {
    try {
      let currentUser = existingUser;

      if (!currentUser) {
        // ✅ FIX: Tangkap error popup ditutup user (auth/popup-closed-by-user)
        // agar tidak menyebabkan loading tak berujung
        try {
          const result = await signInWithPopup(auth, googleProvider);
          currentUser = result.user;
        } catch (popupError: any) {
          // Jika user menutup popup, lempar error biasa (bukan crash)
          if (
            popupError.code === "auth/popup-closed-by-user" ||
            popupError.code === "auth/cancelled-popup-request"
          ) {
            // Tidak perlu toast error, cukup return tanpa melanjutkan
            throw popupError;
          }
          throw popupError;
        }
      }

      const docRef = doc(db, "users", currentUser.uid);
      const docSnap = await getDoc(docRef);

      let isNewUser = false;
      let userData: UserProfile;

      if (!docSnap.exists()) {
        const email = currentUser.email || "";

        // --- PREVENT DUPLICATE PROFILES VIA EMAIL COLLISION ---
        const qEmail = query(
          collection(db, "users"),
          where("email", "==", email),
        );
        const emailSnap = await getDocs(qEmail);

        if (!emailSnap.empty) {
          console.warn(
            "[AUTH] Profile with this email exists under different UID. Redirecting to link flow.",
          );
          await signOut(auth);
          const error: any = new Error(
            `Email ${email} sudah terdaftar melalui NIM. Silakan login menggunakan NIM/Sandi, lalu buka halaman Profil untuk menghubungkan Akun Google agar bisa login dengan Google lain kali.`,
          );
          error.code = "auth/email-already-in-use-firestore";
          throw error;
        }

        isNewUser = true;

        // ✅ FIX: Role detection untuk Google login — intendedRole sebagai prioritas
        let finalRole: Role = intendedRole || "mahasiswa";

        // Domain student UIN paksa jadi mahasiswa (security)
        if (email.endsWith("@student.uin-malang.ac.id")) {
          finalRole = "mahasiswa";
        }
        // Domain dosen UIN jika tidak ada intendedRole
        else if (email.endsWith("@uin-malang.ac.id") && !intendedRole) {
          finalRole = "dosen";
        }

        // Admin khusus
        if (email === "gama96954@gmail.com") {
          finalRole = "admin";
        }

        userData = {
          uid: currentUser.uid,
          email: email,
          name: currentUser.displayName || "User Baru",
          role: finalRole,
          nim: "",
          whatsappNumber: "",
          photoURL: currentUser.photoURL || "",
          profileCompleted: false,
          notifPortal: true,
          notifEmail: true,
          notifWhatsApp: false,
          reminderMinutes: 30,
          createdAt: serverTimestamp(),
        };

        await Promise.all([
          setDoc(docRef, userData),
          setDoc(doc(collection(db, "audit_logs")), {
            action: "REGISTER_AUTO",
            performedBy: currentUser.uid,
            timestamp: serverTimestamp(),
            details: `User ${email} automatically registered via Google Login as ${finalRole}`,
          }).catch((e) => console.warn("Failed to log auto-reg event:", e)),
        ]);

        toast.success(`Berhasil terdaftar sebagai ${finalRole.toUpperCase()}!`);
      } else {
        userData = docSnap.data() as UserProfile;

        if (intendedRole && userData.role !== intendedRole) {
          const isStaffAdminMismatch =
            intendedRole === "admin" &&
            (userData.role === "admin" || userData.role === "staff");
          if (!isStaffAdminMismatch) {
            toast.error(
              `Akses Ditolak: Anda terdaftar sebagai ${userData.role.toUpperCase()}. Gunakan portal yang sesuai atau hubungi Admin untuk perubahan peran.`,
            );
          }
        } else {
          toast.success("Login berhasil!");
        }

        await Promise.all([
          updateDoc(docRef, {
            lastLogin: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }),
          setDoc(doc(collection(db, "audit_logs")), {
            action: "LOGIN",
            performedBy: currentUser.uid,
            timestamp: serverTimestamp(),
            details: `User ${currentUser.email} logged in with role ${userData.role}`,
          }).catch((e) => console.warn("Failed to log login event:", e)),
        ]);
      }

      setProfile(userData);
      localStorage.setItem("user_profile", JSON.stringify(userData));
      setPendingRegistration(null);

      // ✅ FIX: Navigasi dilakukan SETELAH profile di-set, menggunakan helper getDashboardRoute
      // sehingga semua role (termasuk staff) diarahkan ke dashboard yang benar
      navigate(getDashboardRoute(userData.role));

      return { isNewUser };
    } catch (error: any) {
      console.error("Login failed", error);
      throw error;
    }
  };

  const completeRegistration = async (data: Partial<UserProfile>) => {
    if (!pendingRegistration) throw new Error("No pending registration found");

    const email = pendingRegistration.email;

    if (data.nim) {
      try {
        const res = await fetch(
          `/api/auth/check-nim?nim=${encodeURIComponent(data.nim)}`,
        );
        if (res.ok) {
          const checkData = await res.json();
          if (!checkData.available) {
            throw new Error(
              `Data ${data.nim} sudah terdaftar di sistem. Gunakan NIM/NIP lain atau hubungi admin.`,
            );
          }
        }
      } catch (e: any) {
        if (e.message.includes("terdaftar")) throw e;
        console.warn("NIM check failed, proceeding:", e);
      }
    }

    let initialRole = data.role || "mahasiswa";
    // ✅ FIX: staff tetap staff, tidak dikonversi ke admin secara paksa
    let finalRole: Role = initialRole as Role;

    if (email.endsWith("@student.uin-malang.ac.id")) {
      finalRole = "mahasiswa";
    } else {
      try {
        const mappingRef = doc(db, "role_mappings", email);
        const mappingSnap = await getDoc(mappingRef);
        if (mappingSnap.exists()) {
          const mappedRole = mappingSnap.data().role;
          finalRole = mappedRole as Role;
        } else if (
          finalRole === ("admin" as any) &&
          email !== "gama96954@gmail.com"
        ) {
          finalRole = email.endsWith("@uin-malang.ac.id")
            ? "dosen"
            : "mahasiswa";
        }
      } catch (e) {
        console.warn("Failed to check role mapping:", e);
      }
    }

    const newProfile: UserProfile = {
      uid: pendingRegistration.uid,
      email: email,
      name: data.name || pendingRegistration.name,
      role: finalRole,
      nim: data.nim || "",
      whatsappNumber: data.whatsappNumber || (data as any).whatsapp || "",
      division: data.division || "",
      photoURL: pendingRegistration.photoURL,
      profileCompleted: true,
      notifPortal: true,
      notifEmail: true,
      notifWhatsApp: false,
      reminderMinutes: 30,
      createdAt: serverTimestamp(),
    };

    await Promise.all([
      setDoc(doc(db, "users", pendingRegistration.uid), newProfile),
      setDoc(doc(collection(db, "audit_logs")), {
        action: "REGISTER_COMPLETE",
        performedBy: pendingRegistration.uid,
        timestamp: serverTimestamp(),
        details: `User ${email} completed registration with NIM ${data.nim || "N/A"} as ${finalRole}`,
      }).catch((e) =>
        console.warn("Failed to log registration completion:", e),
      ),
    ]);

    setProfile(newProfile);
    setPendingRegistration(null);
  };

  const logout = async () => {
    try {
      localStorage.removeItem("user_profile");
      localStorage.removeItem("user_role_last_session");
      localStorage.removeItem("intended_role");
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
      await signOut(auth).catch(() => {});
    }
  };

  const resendVerification = async () => {
    if (!auth.currentUser) return;
    try {
      await sendEmailVerification(auth.currentUser);
      toast.success(
        "Email verifikasi telah dikirim ulang. Silakan cek kotak masuk Anda.",
      );
    } catch (error: any) {
      console.error("Resend verification failed", error);
      if (error.code === "auth/too-many-requests") {
        throw new Error(
          "Terlalu banyak permintaan. Silakan tunggu beberapa saat lagi.",
        );
      }
      throw error;
    }
  };

  const loginWithRedirect = async (intendedRole?: Role) => {
    if (intendedRole) localStorage.setItem("intended_role", intendedRole);
    await signInWithRedirect(auth, googleProvider);
  };

  const linkGoogle = async () => {
    if (!auth.currentUser) return;
    try {
      const { linkWithPopup } = await import("firebase/auth");
      const result = await linkWithPopup(auth.currentUser, googleProvider);
      toast.success("Akun Google berhasil dihubungkan!");
      return result.user;
    } catch (error: any) {
      if (error.code === "auth/credential-already-in-use") {
        throw new Error("Akun Google ini sudah terhubung dengan profil lain.");
      }
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        pendingRegistration,
        conflictInfo,
        loading,
        login,
        completeRegistration,
        emailLogin,
        emailRegister,
        updateUserProfile,
        resendVerification,
        resetPassword,
        confirmNewPassword,
        verifyResetCode,
        sendOTPReset,
        verifyOTPReset,
        completeOTPReset,
        logout,
        loginWithRedirect,
        linkGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
