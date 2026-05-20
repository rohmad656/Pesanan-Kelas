import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updateEmail, updateProfile as updateAuthProfile, confirmPasswordReset, verifyPasswordResetCode, updatePassword, verifyBeforeUpdateEmail, sendEmailVerification, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, updateDoc, onSnapshot, Timestamp, deleteDoc } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import emailjs from '@emailjs/browser';
import toast from 'react-hot-toast';

export type Role = 'mahasiswa' | 'dosen' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: Role | 'staff'; // Keep staff in type for legacy data compatibility
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
  pendingRegistration: { uid: string, email: string, name: string, photoURL: string, role?: Role } | null;
  conflictInfo: ConflictInfo | null;
  loading: boolean;
  login: (intendedRole?: Role, existingUser?: FirebaseUser) => Promise<{ isNewUser: boolean }>;
  completeRegistration: (data: Partial<UserProfile>) => Promise<void>;
  emailLogin: (emailOrId: string, password: string, intendedRole?: Role) => Promise<void>;
  emailRegister: (emailOrId: string, password: string, name: string, intendedRole?: Role) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  resendVerification: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string; code?: string }>;
  confirmNewPassword: (code: string, password: string) => Promise<{ success: boolean; message: string; code?: string }>;
  verifyResetCode: (code: string) => Promise<{ success: boolean; email?: string; message?: string; code?: string }>;
  sendOTPReset: (email: string) => Promise<{ success: boolean; message: string }>;
  verifyOTPReset: (email: string, otp: string) => Promise<{ success: boolean; message: string }>;
  completeOTPReset: (email: string, otp: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  loginWithRedirect: (intendedRole?: Role) => Promise<void>;
  linkGoogle: () => Promise<FirebaseUser | undefined>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    // Initial profile from local storage for instant UI feedback
    const saved = localStorage.getItem('user_profile');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [pendingRegistration, setPendingRegistration] = useState<{ uid: string, email: string, name: string, photoURL: string, role?: Role } | null>(null);
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const unsubscribeProfileRef = useRef<(() => void) | null>(null);

  useEffect(() => {

    // Handle Redirect Results (Optional but helpful for slow iFrame popup issues)
    getRedirectResult(auth).then(async (result) => {
      if (result?.user) {
        // Resolve role after redirect
        const intendedRoleRaw = localStorage.getItem('intended_role');
        const intendedRole = intendedRoleRaw as Role || 'mahasiswa';
        await login(intendedRole, result.user);
        localStorage.removeItem('intended_role');
      }
    }).catch(e => console.error("Redirect login result failed:", e));

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        // Listen to profile changes in real-time
        const docRef = doc(db, 'users', currentUser.uid);
        unsubscribeProfileRef.current = onSnapshot(docRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile & { deleted?: boolean };
            if (data.deleted) {
              // ... existing logout logic ...
              signOut(auth);
              setProfile(null);
              setUser(null);
              localStorage.removeItem('user_profile');
              toast.error('Akun Anda telah dihapus oleh administrator.');
            } else {
              // --- PENDING EMAIL SYNC AUTO-CHECK ---
              // If there's a pending email, reload auth periodically to catch its verification
              if (data.pendingEmail && currentUser.email !== data.pendingEmail) {
                // Only reload if we haven't reloaded in the last 30 seconds to avoid spamming Auth
                const lastReload = parseInt(localStorage.getItem('last_auth_reload') || '0');
                if (Date.now() - lastReload > 30000) {
                   currentUser.reload().then(() => {
                     localStorage.setItem('last_auth_reload', Date.now().toString());
                     console.log("[AUTH] Reloaded user to check verification status");
                   }).catch(e => console.warn("Background auth reload failed:", e));
                }
              }

              // --- DETECT ROLE CHANGE & REFRESH TOKEN ---
              const oldProfileRaw = localStorage.getItem('user_profile');
              if (oldProfileRaw) {
                try {
                  const oldData = JSON.parse(oldProfileRaw);
                  if (data.role && oldData.role && oldData.role !== data.role) {
                    console.log(`[AUTH] Role change detected: ${oldData.role} -> ${data.role}`);
                    // Refresh Auth Token to pick up new Custom Claims from backend
                    currentUser.getIdToken(true).then(() => {
                      toast.success(`Role Anda diperbarui menjadi ${data.role.toUpperCase()}!`, {
                        duration: 6000,
                        icon: '✨'
                      });
                    }).catch(e => {
                      console.error("Token refresh failed:", e);
                      toast.error("Role Anda diperbarui. Silakan login ulang untuk sinkronisasi.");
                    });
                  }
                } catch (e) {
                  console.warn("Role detection skip:", e);
                }
              }

              // --- AUTO SYNC NEWLY VERIFIED EMAIL ---
              // If Auth email (verified) != Firestore email, and it matches pendingEmail
              if (currentUser.email && currentUser.email !== data.email && currentUser.email === data.pendingEmail) {
                 updateDoc(docRef, {
                   email: currentUser.email,
                   pendingEmail: null, // Clear pending after sync
                   updatedAt: serverTimestamp()
                 }).then(() => {
                   toast.success(`Email Anda berhasil diperbarui ke ${currentUser.email}!`);
                 }).catch(e => console.error("Sync verified email failed:", e));
              }

              setProfile(data as UserProfile);
              localStorage.setItem('user_profile', JSON.stringify(data));

              if (data.profileCompleted === false) {
                setPendingRegistration({
                  uid: currentUser.uid,
                  email: data.email || currentUser.email || '',
                  name: data.name || currentUser.displayName || '',
                  photoURL: data.photoURL || currentUser.photoURL || '',
                  role: data.role
                });
              }
            }
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, (error) => {
          if (error.message.includes('permission') || error.message.includes('insufficient')) {
            console.warn("[AUTH] Profile snapshot permission denied (usually happens during logout or account deletion):", error.message);
          } else {
            handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
          }
          setLoading(false);
        });
      } else {
        setUser(null);
        setProfile(null);
        setPendingRegistration(null);
        localStorage.removeItem('user_profile');
        if (unsubscribeProfileRef.current) {
          unsubscribeProfileRef.current();
          unsubscribeProfileRef.current = null;
        }
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfileRef.current) unsubscribeProfileRef.current();
    };
  }, []);

  const formatEmail = (emailOrId: string) => {
    return emailOrId.includes('@') ? emailOrId : `${emailOrId}@campus.ac.id`;
  };

  const emailLogin = async (emailOrId: string, password: string, intendedRole?: Role) => {
    let emailToUse = emailOrId;
    
    // Support multi-identifier login (Email or NIM/NIP)
    if (!emailOrId.includes('@')) {
      try {
        // Use backend API for unauthenticated NIM-to-Email lookup
        const res = await fetch(`/api/auth/lookup-email?nim=${encodeURIComponent(emailOrId)}`);
        if (res.ok) {
          const data = await res.json();
          emailToUse = data.email;
        } else {
          // If not found in our mapping, fallback to default campus email format
          emailToUse = `${emailOrId}@campus.ac.id`;
        }
      } catch (e) {
        console.warn("NIM lookup failed, using fallback email format:", e);
        emailToUse = `${emailOrId}@campus.ac.id`;
      }
    } else {
      // Even if it's an email, check if it's a secondary email or if it matches a profile via backend or direct
      // In this case, we prefer to just use the email provided for direct Auth login
      emailToUse = emailOrId;
    }

    const result = await signInWithEmailAndPassword(auth, emailToUse, password);
    
    try {
      const docRef = doc(db, 'users', result.user.uid);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        // --- SYNC FIX: Auth exists but Firestore profile missing (Hard Delete Sync) ---
        // Instead of signing out and throwing error, we set pendingRegistration
        // so the user can be redirected to /daftar to recreate their profile.
        setPendingRegistration({
          uid: result.user.uid,
          email: result.user.email || emailToUse,
          name: result.user.displayName || 'User',
          photoURL: result.user.photoURL || '',
          role: intendedRole
        });
        
        // We throw a specific code so the UI can optionally show a nice message
        const error: any = new Error("Data profil Anda tidak ditemukan. Silakan lengkapi pendaftaran ulang.");
        error.code = 'custom/need-registration';
        throw error;
      }
      
      const userData = docSnap.data() as UserProfile;

      // ROLE VALIDATION (Post-Login Context Check)
      if (intendedRole && userData.role !== intendedRole) {
        // Admins and staff are allowed to log in from any portal/tab
        if (userData.role !== 'admin' && userData.role !== 'staff') {
          const msg = `Gagal Masuk: Portal ini untuk ${intendedRole.toUpperCase()}, tetapi akun Anda memiliki peran ${userData.role.toUpperCase()}. Silakan gunakan portal yang tepat.`;
          toast.error(msg, { duration: 5000 });
          
          // Log the unauthorized portal attempt
          setDoc(doc(collection(db, 'audit_logs')), {
            action: 'LOGIN_PORTAL_MISMATCH',
            performedBy: result.user.uid,
            timestamp: serverTimestamp(),
            details: `User ${result.user.email} tried to access ${intendedRole} portal with ${userData.role} role.`
          }).catch(e => console.warn("Log mismatch fail:", e));

          const error: any = new Error(msg);
          error.code = 'custom/role-mismatch';
          error.actualRole = userData.role;
          throw error;
        }
      }

      setProfile(userData);
      localStorage.setItem('user_profile', JSON.stringify(userData));
      toast.success('Login berhasil!');

      // Update last login and Log login event in parallel
      await Promise.all([
        updateDoc(docRef, { 
          lastLogin: serverTimestamp(),
          updatedAt: serverTimestamp() 
        }),
        setDoc(doc(collection(db, 'audit_logs')), {
          action: 'LOGIN',
          performedBy: result.user.uid,
          timestamp: serverTimestamp(),
          details: `User ${result.user.email} logged in with role ${userData.role} (intended: ${intendedRole || 'not specified'})`
        }).catch(e => console.warn("Failed to log login event:", e))
      ]);
    } catch (error: any) {
      if (error.code?.startsWith('custom/')) throw error;
      handleFirestoreError(error, OperationType.GET, `users/${result.user.uid}`);
    }
  };

  const emailRegister = async (emailOrId: string, password: string, name: string, intendedRole?: Role) => {
    // Check if Email already exists via backend API
    const email = formatEmail(emailOrId);
    
    try {
      const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const checkData = await res.json();
        if (!checkData.available) {
          // If Firestore profile exists, throw conflict
          if (checkData.uid) { // Assume backend returns UID if it truly exists
            setConflictInfo({ email: email, role: checkData.role });
            const error: any = new Error(`Email ${email} sudah terdaftar sebagai ${checkData.role?.toUpperCase()}.`);
            error.code = 'custom/email-already-in-use';
            throw error;
          }
        }
      }
    } catch (e: any) {
      if (e.code?.startsWith('custom/')) throw e;
    }

    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      // ... continue normal registration ...
    } catch (err: any) {
      // SYNC FIX: If Auth says email-already-in-use but our check above didn't find a Firestore profile
      // This means a "Zombie Account" (Auth exists, Firestore doesn't)
      if (err.code === 'auth/email-already-in-use') {
        console.warn("[AUTH] Email exists in Auth but missing from Firestore. Re-syncing...");
        try {
          // Try to login with same password to sync
          await emailLogin(email, password, intendedRole);
          return; // Login flow will pick up the need-registration logic
        } catch (loginErr: any) {
          // If login fails (wrong password for zombie account), we must ask user to resolve with admin or password reset
          if (loginErr.code === 'auth/wrong-password' || loginErr.code === 'auth/invalid-credential') {
             const error: any = new Error("Akun ini sudah terdaftar sebelumnya namun data profil belum lengkap. Silakan Login menggunakan Sandi Anda atau gunakan fitur Lupa Sandi untuk memulihkan akses.");
             error.code = 'custom/auth-exists-profile-missing';
             throw error;
          }
          throw err; // Throw original already-in-use
        }
      }
      throw err;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("Auth failed");
    
    // Automatic Role Detection for Email Registration (Source of Truth)
    let finalRole: Role = intendedRole || 'mahasiswa';
    if (email.endsWith('@uin-malang.ac.id') && !email.endsWith('@student.uin-malang.ac.id')) {
      finalRole = 'dosen';
    }
    if (email === "gama96954@gmail.com" || (intendedRole === 'admin' && email.includes('admin'))) {
      finalRole = 'admin';
    }
    
    // Force student role for student emails (Security)
    if (email.endsWith('@student.uin-malang.ac.id')) {
      finalRole = 'mahasiswa';
    }

    // Send verification email for manual registration
    try {
      const { sendEmailVerification } = await import('firebase/auth');
      await sendEmailVerification(currentUser);
      toast.success('Email verifikasi telah dikirim. Silakan cek kotak masuk Anda.');
    } catch (e) {
      console.warn("Failed to send verification email:", e);
    }

    const newProfile: any = {
      uid: currentUser.uid,
      email: currentUser.email || email,
      name: name,
      role: finalRole,
      nim: '',
      whatsappNumber: '',
      profileCompleted: false,
      notifPortal: true,
      notifEmail: true,
      notifWhatsApp: false,
      reminderMinutes: 30,
      createdAt: serverTimestamp(),
    };
    
    try {
      await setDoc(doc(db, 'users', currentUser.uid), newProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${currentUser.uid}`);
    }
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!auth.currentUser || !profile) return;

    try {
      const docRef = doc(db, 'users', auth.currentUser.uid);
      
      // If updating email, use secure verification flow
      if (data.email && data.email !== profile.email) {
        // Use backend API for safe check
        const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(data.email)}&excludeUid=${auth.currentUser.uid}`);
        if (res.ok) {
          const checkData = await res.json();
          if (!checkData.available) {
            throw new Error('Email sudah digunakan oleh akun lain.');
          }
        }
        
        // Use verifyBeforeUpdateEmail instead of updateEmail for better security and flow
        await verifyBeforeUpdateEmail(auth.currentUser, data.email);
        
        // Save the pending email in Firestore so we can show it in the UI
        data.pendingEmail = data.email;
        
        toast.success(`Permintaan ubah email terkirim ke ${data.email}. Silakan verifikasi email baru Anda sebelum perubahan diterapkan.`);
        
        // Remove primary email from the firestore update data for now 
        delete data.email;
      }

      // If updating nim, check uniqueness
      if (data.nim && data.nim !== profile.nim) {
        // Use backend API for safe check
        const res = await fetch(`/api/auth/check-nim?nim=${encodeURIComponent(data.nim)}&excludeUid=${auth.currentUser.uid}`);
        if (res.ok) {
          const checkData = await res.json();
          if (!checkData.available) {
            throw new Error('NIM/NIP sudah digunakan oleh akun lain.');
          }
        }
      }

      // If updating name, also update in Auth display name
      if (data.name && data.name !== profile.name) {
        await updateAuthProfile(auth.currentUser, { displayName: data.name });
      }

      // Check if profile is now completed
      const updatedProfile = { ...profile, ...data };
      
      // Required fields for all roles
      const hasBaseFields = !!(
        updatedProfile.name && 
        updatedProfile.email && 
        updatedProfile.nim && 
        updatedProfile.whatsappNumber &&
        updatedProfile.role
      );

      // Division is only required for non-students if it was already part of the schema, 
      // but based on the request, we just need NIM + WA + Email.
      // We'll stick to the core fields requested for "profileCompleted".
      const isCompleted = hasBaseFields;

      try {
        // Log the profile update for audit (Reinforced)
        await setDoc(doc(collection(db, 'audit_logs')), {
          action: 'UPDATE_PROFILE',
          performedBy: auth.currentUser.uid,
          timestamp: serverTimestamp(),
          details: `User ${profile.email} updated profile. Fields: ${Object.keys(data).join(', ')}`
        }).catch(e => console.warn("Audit update fail:", e));

        // Use setDoc with merge: true as requested for profile updates
        await setDoc(docRef, {
          ...data,
          profileCompleted: isCompleted,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
      }
    } catch (error: any) {
      console.error("Update profile failed", error);
      if (error.code === 'auth/requires-recent-login') {
        throw new Error('Sesi Anda telah berakhir. Silakan keluar dan masuk kembali untuk mengubah email.');
      }
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const formattedEmail = formatEmail(email);
      
      try {
        // ATTEMPT 1: Backend Professional Flow (Custom SMTP + Audit Logs)
        const response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: formattedEmail,
            continueUrl: window.location.origin + '/login?mode=resetPassword'
          })
        });
        
        const res = await response.json();
        if (response.ok) {
          return { success: true, message: res.message || "Link reset sudah dikirim." };
        }
        
        // If backend fails (e.g., Service Account not set or API disabled), move to fallback
        console.warn("Backend reset attempt failed. Falling back to client-side SDK.");
        throw new Error("FALLBACK_TO_CLIENT");
      } catch (backendError: any) {
        // ATTEMPT 2: Client-side Fallback (Firebase standard delivery)
        const actionCodeSettings = {
          url: window.location.origin + '/login?mode=resetPassword',
          handleCodeInApp: true,
        };
        await sendPasswordResetEmail(auth, formattedEmail, actionCodeSettings);
        return { success: true, message: "Link reset sudah dikirim." };
      }
    } catch (error: any) {
      console.error("Reset password failed:", error);
      let message = "Gagal mengirim link reset. Periksa kembali email Anda.";
      
      if (error.message.includes('auth/user-not-found') || error.code === 'auth/user-not-found') {
        message = "Akun dengan email ini tidak ditemukan.";
      } else if (error.message.includes('auth/invalid-email') || error.code === 'auth/invalid-email') {
        message = "Format email tidak valid.";
      } else if (error.message.includes('auth/too-many-requests') || error.code === 'auth/too-many-requests') {
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
        return { success: false, message: "Server sedang sibuk atau API belum aktif. Silakan hubungi admin." };
      }

      const data = await response.json();
      return { success: data.success, message: data.message, resolvedEmail: data.resolvedEmail };
    } catch (error: any) {
      console.error("OTP Request failed:", error);
      return { success: false, message: "Koneksi ke server gagal. Pastikan API Auth sudah aktif." };
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
        return { success: false, message: "Gagal verifikasi: Layanan server tidak tersedia." };
      }

      const data = await response.json();
      return { success: data.success, message: data.message };
    } catch (error: any) {
      console.error("OTP Verification failed:", error);
      return { success: false, message: "Terjadi kesalahan koneksi saat verifikasi." };
    }
  };

  const completeOTPReset = async (email: string, otp: string, newPassword: string) => {
    try {
      const response = await fetch("/api/auth/otp/complete-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        return { success: false, message: "Gagal update password: Masalah pada server." };
      }

      const data = await response.json();
      return { success: data.success, message: data.message };
    } catch (error: any) {
      console.error("OTP Reset Complete failed:", error);
      return { success: false, message: "Terjadi kesalahan saat memperbarui password." };
    }
  };

  const login = async (intendedRole?: Role, existingUser?: FirebaseUser) => {
    try {
      let currentUser = existingUser;
      
      if (!currentUser) {
        const result = await signInWithPopup(auth, googleProvider);
        currentUser = result.user;
      }
      
      const docRef = doc(db, 'users', currentUser.uid);
      const docSnap = await getDoc(docRef);
      
      let isNewUser = false;
      let userData: UserProfile;

      if (!docSnap.exists()) {
        const email = currentUser.email || '';
        
        // --- PREVENT DUPLICATE PROFILES VIA EMAIL COLLISION ---
        // Check if an existing profile uses this email under a DIFFERENT UID
        // (e.g., a NIM user who updated email but hasn't linked Google yet)
        const checkRes = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email)}&excludeUid=${currentUser.uid}`);
        let hasConflict = false;
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (!checkData.available && checkData.uid) {
            hasConflict = true;
          }
        }
        
        if (hasConflict) {
          console.warn("[AUTH] Profile with this email exists under different UID. Redirecting to link flow.");
          await signOut(auth);
          const error: any = new Error(`Email ${email} sudah terdaftar melalui NIM. Silakan login menggunakan NIM/Sandi, lalu buka halaman Profil untuk menghubungkan Akun Google agar bisa login dengan Google lain kali.`);
          error.code = 'auth/email-already-in-use-firestore';
          throw error;
        }

        isNewUser = true;
        // 1. Automatic Record Creation for New Users
        
        // Initial role selection logic (Default to mahasiswa, detect dosen/admin via domain)
        let finalRole: Role = 'mahasiswa';
        if (email.endsWith('@uin-malang.ac.id') && !email.endsWith('@student.uin-malang.ac.id')) {
          finalRole = 'dosen';
        }
        // Special case for specified admin
        if (email === "gama96954@gmail.com") {
          finalRole = 'admin';
        }

        // If newly registered, we can trust the intendedRole if it feels right,
        // but domain detection is stronger. We'll use intendedRole as hint if not detected.
        if (finalRole === 'mahasiswa' && intendedRole && intendedRole !== 'mahasiswa') {
           // If they chose Staf/Dosen and domain doesn't strictly forbid it (non-campus email)
           if (!email.endsWith('@student.uin-malang.ac.id')) {
             finalRole = intendedRole;
           }
        }

        userData = {
          uid: currentUser.uid,
          email: email,
          name: currentUser.displayName || 'User Baru',
          role: finalRole,
          nim: '', 
          whatsappNumber: '', 
          photoURL: currentUser.photoURL || '',
          profileCompleted: false, 
          notifPortal: true,
          notifEmail: true,
          notifWhatsApp: false,
          reminderMinutes: 30,
          createdAt: serverTimestamp(),
        };

        await Promise.all([
          setDoc(docRef, userData),
          setDoc(doc(collection(db, 'audit_logs')), {
            action: 'REGISTER_AUTO',
            performedBy: currentUser.uid,
            timestamp: serverTimestamp(),
            details: `User ${email} automatically registered via Google Login as ${finalRole}`
          }).catch(e => console.warn("Failed to log auto-reg event:", e))
        ]);
        
        toast.success(`Berhasil terdaftar sebagai ${finalRole.toUpperCase()}!`);
      } else {
        userData = docSnap.data() as UserProfile;

        // ROLE VALIDATION (Post-Login Context Check)
        if (intendedRole && userData.role !== intendedRole) {
          if (userData.role !== 'admin' && userData.role !== 'staff') {
            const msg = `Gagal Masuk: Portal ini untuk ${intendedRole.toUpperCase()}, tetapi akun Anda memiliki peran ${userData.role.toUpperCase()}. Silakan gunakan portal yang tepat.`;
            toast.error(msg, { duration: 5000 });
            
            const err: any = new Error(msg);
            err.code = 'custom/role-mismatch';
            err.actualRole = userData.role;
            throw err;
          } else {
            toast.success('Login berhasil!');
          }
        } else {
          toast.success('Login berhasil!');
        }

        // Update last login and Log login event in parallel
        await Promise.all([
          updateDoc(docRef, { 
            lastLogin: serverTimestamp(),
            updatedAt: serverTimestamp() 
          }),
          setDoc(doc(collection(db, 'audit_logs')), {
            action: 'LOGIN',
            performedBy: currentUser.uid,
            timestamp: serverTimestamp(),
            details: `User ${currentUser.email} logged in with role ${userData.role}`
          }).catch(e => console.warn("Failed to log login event:", e))
        ]);
      }
      
      setProfile(userData);
      localStorage.setItem('user_profile', JSON.stringify(userData));
      
      setPendingRegistration(null);
      return { isNewUser };
    } catch (error: any) {
      console.error("Login failed", error);
      throw error;
    }
  };

  const completeRegistration = async (data: Partial<UserProfile>) => {
    if (!pendingRegistration || !auth.currentUser) throw new Error("Sesi pendaftaran tidak valid.");

    let email = pendingRegistration.email;
    let pendingEmail = null;

    // Handle Email Change during Registration (Common for NIM-based registration)
    if (data.email && data.email !== pendingRegistration.email) {
      try {
        // Use verifyBeforeUpdateEmail for security
        await verifyBeforeUpdateEmail(auth.currentUser, data.email);
        toast.success(`Permintaan verifikasi email dikirim ke ${data.email}. Silakan cek kotak masuk Anda.`);
        
        // We save the NEW email as pendingEmail in Firestore
        pendingEmail = data.email;
        // The current Auth email is still pendingRegistration.email
        email = pendingRegistration.email;
      } catch (e: any) {
        console.warn("Email update during registration skipped or failed:", e);
      }
    }
    
    // NIM Uniqueness Check via Server (Safe for authenticated non-staff)
    if (data.nim) {
      try {
        const res = await fetch(`/api/auth/check-nim?nim=${encodeURIComponent(data.nim)}&excludeUid=${auth.currentUser.uid}`);
        if (res.ok) {
          const checkData = await res.json();
          if (!checkData.available) {
            throw new Error(`Data ${data.nim} sudah terdaftar di sistem. Gunakan NIM/NIP lain atau hubungi admin.`);
          }
        }
      } catch (e: any) {
        if (e.message.includes('terdaftar')) throw e;
        console.warn("NIM check failed, proceeding:", e);
      }
    }

    // Initial role selection
    let initialRole = data.role || 'mahasiswa';
    // Mapping staff to admin internally
    let finalRole: Role = initialRole === 'staff' ? 'admin' : (initialRole as Role);

    // SECURITY: Force student domain to mahasiswa role
    if (email.endsWith('@student.uin-malang.ac.id')) {
      finalRole = 'mahasiswa';
    } else {
      // Check admin defined mappings for overrides
      try {
        const mappingRef = doc(db, 'role_mappings', email);
        const mappingSnap = await getDoc(mappingRef);
        if (mappingSnap.exists()) {
          const mappedRole = mappingSnap.data().role;
          finalRole = (mappedRole === 'staff' || mappedRole === 'admin') ? 'admin' : mappedRole;
        } else {
           // For non-student non-campus emails, we respect their choice during registration
           // as long as it isn't 'admin' unless explicitly mapped above or via domain.
           if (finalRole === 'admin' && !email.endsWith('@uin-malang.ac.id') && email !== "gama96954@gmail.com") {
              // Default to dosen or mahasiswa for safer non-admin emails if no mapping
              finalRole = 'mahasiswa';
           }
        }
      } catch (e) {
        console.warn("Role mapping verification skipped:", e);
      }
    }

    const newProfile: UserProfile = {
      uid: pendingRegistration.uid,
      email: email,
      pendingEmail: pendingEmail as any,
      name: data.name || pendingRegistration.name,
      role: finalRole,
      nim: data.nim || '',
      whatsappNumber: data.whatsappNumber || (data as any).whatsapp || '',
      division: data.division || '',
      photoURL: pendingRegistration.photoURL,
      profileCompleted: true, // Since they are filling the form now
      notifPortal: true,
      notifEmail: true,
      notifWhatsApp: false,
      reminderMinutes: 30,
      createdAt: serverTimestamp(),
    };

    await Promise.all([
      setDoc(doc(db, 'users', pendingRegistration.uid), newProfile),
      setDoc(doc(collection(db, 'audit_logs')), {
        action: 'REGISTER_COMPLETE',
        performedBy: pendingRegistration.uid,
        timestamp: serverTimestamp(),
        details: `User ${email}${pendingEmail ? ` (Pending: ${pendingEmail})` : ''} completed registration with NIM ${data.nim || 'N/A'} as ${finalRole}`
      }).catch(e => console.warn("Failed to log registration completion:", e))
    ]);

    // Send Welcome Email if verified (Google or just finished registration)
    const isVerified = auth.currentUser.emailVerified || auth.currentUser.providerData.some(p => p.providerId === 'google.com');
    if (isVerified) {
      fetch('/api/auth/welcome-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newProfile.email,
          name: newProfile.name,
          role: newProfile.role
        })
      }).catch(err => console.warn("Failed to trigger welcome email notification:", err));
    }

    setProfile(newProfile);
    setPendingRegistration(null);
    localStorage.setItem('user_profile', JSON.stringify(newProfile));
  };

  const logout = async () => {
    try {
      localStorage.removeItem('user_profile');
      localStorage.removeItem('user_role_last_session');
      localStorage.removeItem('intended_role');
      setPendingRegistration(null);
      if (unsubscribeProfileRef.current) {
        unsubscribeProfileRef.current();
        unsubscribeProfileRef.current = null;
      }
      await signOut(auth).catch(() => {});
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback for safety
      setPendingRegistration(null);
      await signOut(auth).catch(() => {});
    }
  };

  const resendVerification = async () => {
    if (!auth.currentUser) return;
    try {
      if (profile?.pendingEmail) {
        await verifyBeforeUpdateEmail(auth.currentUser, profile.pendingEmail);
        toast.success(`Email verifikasi perubahan telah dikirim ulang ke ${profile.pendingEmail}. Silakan cek kotak masuk Anda.`);
      } else {
        await sendEmailVerification(auth.currentUser);
        toast.success('Email verifikasi telah dikirim ulang. Silakan cek kotak masuk Anda.');
      }
    } catch (error: any) {
      console.error("Resend verification failed", error);
      if (error.code === 'auth/too-many-requests') {
        throw new Error('Terlalu banyak permintaan. Silakan tunggu beberapa saat lagi.');
      }
      throw error;
    }
  };

  const loginWithRedirect = async (intendedRole?: Role) => {
    if (intendedRole) localStorage.setItem('intended_role', intendedRole);
    await signInWithRedirect(auth, googleProvider);
  };

  const linkGoogle = async () => {
    if (!auth.currentUser) return;
    try {
      const { linkWithPopup } = await import('firebase/auth');
      const result = await linkWithPopup(auth.currentUser, googleProvider);
      toast.success('Akun Google berhasil dihubungkan!');
      return result.user;
    } catch (error: any) {
      if (error.code === 'auth/credential-already-in-use') {
        throw new Error('Akun Google ini sudah terhubung dengan profil lain.');
      }
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
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
      linkGoogle
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
