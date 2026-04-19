import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updateEmail, updateProfile as updateAuthProfile, confirmPasswordReset, verifyPasswordResetCode, updatePassword } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, updateDoc, onSnapshot, Timestamp, deleteDoc } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import emailjs from '@emailjs/browser';
import toast from 'react-hot-toast';

export type Role = 'mahasiswa' | 'dosen' | 'staff' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: Role;
  nim?: string;
  whatsapp?: string;
  division?: string;
  photoURL?: string;
  profileCompleted?: boolean;
  notifPortal?: boolean;
  notifEmail?: boolean;
  notifWhatsApp?: boolean;
  reminderMinutes?: number;
  createdAt: any;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  pendingRegistration: { uid: string, email: string, name: string, photoURL: string, role?: Role } | null;
  loading: boolean;
  login: (intendedRole?: Role, existingUser?: FirebaseUser) => Promise<{ isNewUser: boolean }>;
  completeRegistration: (data: Partial<UserProfile>) => Promise<void>;
  emailLogin: (emailOrId: string, password: string) => Promise<void>;
  emailRegister: (emailOrId: string, password: string, name: string, role: Role) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string; code?: string }>;
  confirmNewPassword: (code: string, password: string) => Promise<{ success: boolean; message: string; code?: string }>;
  verifyResetCode: (code: string) => Promise<{ success: boolean; email?: string; message?: string; code?: string }>;
  sendOTPReset: (email: string) => Promise<{ success: boolean; message: string }>;
  verifyOTPReset: (email: string, otp: string) => Promise<{ success: boolean; message: string }>;
  completeOTPReset: (email: string, otp: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        // Listen to profile changes in real-time
        const docRef = doc(db, 'users', currentUser.uid);
        unsubscribeProfile = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile & { deleted?: boolean };
            if (data.deleted) {
              // If user is soft-deleted, sign them out
              signOut(auth);
              setProfile(null);
              setUser(null);
              localStorage.removeItem('user_profile');
              toast.error('Akun Anda telah dihapus oleh administrator.');
            } else {
              setProfile(data as UserProfile);
              localStorage.setItem('user_profile', JSON.stringify(data));
            }
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
          setLoading(false);
        });
      } else {
        setUser(null);
        setProfile(null);
        localStorage.removeItem('user_profile');
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
    return emailOrId.includes('@') ? emailOrId : `${emailOrId}@campus.ac.id`;
  };

  const emailLogin = async (emailOrId: string, password: string) => {
    let emailToUse = emailOrId;
    
    // Support multi-identifier login (Email or NIM/NIP)
    if (!emailOrId.includes('@')) {
      // Search by nim
      const q = query(collection(db, 'users'), where('nim', '==', emailOrId));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        emailToUse = querySnapshot.docs[0].data().email;
      } else {
        // Fallback to default campus email format
        emailToUse = `${emailOrId}@campus.ac.id`;
      }
    } else {
      // Even if it's an email, check if it's a secondary email or if it matches a profile
      const q = query(collection(db, 'users'), where('email', '==', emailOrId));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        emailToUse = querySnapshot.docs[0].data().email;
      }
    }

    const result = await signInWithEmailAndPassword(auth, emailToUse, password);
    toast.success('Login berhasil! Menyiapkan dasbor...');

    try {
      const docRef = doc(db, 'users', result.user.uid);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        await signOut(auth);
        const error: any = new Error("Akun belum terdaftar di database. Silakan hubungi admin.");
        error.code = 'custom/user-not-found';
        throw error;
      }
      
      const userData = docSnap.data() as UserProfile;
      setProfile(userData);
      localStorage.setItem('user_profile', JSON.stringify(userData));

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
          details: `User ${result.user.email} logged in with role ${userData.role}`
        }).catch(e => console.warn("Failed to log login event:", e))
      ]);
    } catch (error: any) {
      if (error.code === 'custom/user-not-found') throw error;
      handleFirestoreError(error, OperationType.GET, `users/${result.user.uid}`);
    }
  };

  const emailRegister = async (emailOrId: string, password: string, name: string, role: Role) => {
    // Check if NIM already exists
    if (!emailOrId.includes('@')) {
      const q = query(collection(db, 'users'), where('nim', '==', emailOrId), where('deleted', '!=', true));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const error: any = new Error(`NIM/NIP ${emailOrId} sudah terdaftar. Silakan masuk menggunakan email terkait.`);
        error.code = 'custom/nim-already-in-use';
        throw error;
      }
    } else {
      // If email provided, check if that email is used as a NIM elsewhere (rare but safe)
      const q = query(collection(db, 'users'), where('email', '==', emailOrId), where('deleted', '!=', true));
      const snap = await getDocs(q);
      if (!snap.empty) {
        throw new Error('Email ini sudah terdaftar.');
      }
    }

    const email = formatEmail(emailOrId);
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const currentUser = result.user;
    
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
      role: role,
      profileCompleted: false,
      notifPortal: true,
      notifEmail: true,
      notifWhatsApp: false,
      reminderMinutes: 30,
      createdAt: serverTimestamp(),
    };
    
    if (!emailOrId.includes('@')) {
      newProfile.nim = emailOrId;
    }
    
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
      
      // If updating email, also update in Firebase Auth
      if (data.email && data.email !== profile.email) {
        // Check if email is already used by another user in Firestore
        const q = query(collection(db, 'users'), where('email', '==', data.email));
        const snap = await getDocs(q);
        if (!snap.empty) {
          throw new Error('Email sudah digunakan oleh akun lain.');
        }
        await updateEmail(auth.currentUser, data.email);
      }

      // If updating nim, check uniqueness
      if (data.nim && data.nim !== profile.nim) {
        const q = query(collection(db, 'users'), where('nim', '==', data.nim));
        const snap = await getDocs(q);
        if (!snap.empty) {
          throw new Error('NIM/NIP sudah digunakan oleh akun lain.');
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
        updatedProfile.whatsapp &&
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
      return { success: data.success, message: data.message };
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
      
      toast.success('Login berhasil! Menyiapkan dasbor...');
      
      const docRef = doc(db, 'users', currentUser.uid);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        // Store pending registration info instead of creating doc immediately
        setPendingRegistration({
          uid: currentUser.uid,
          email: currentUser.email || '',
          name: currentUser.displayName || '',
          photoURL: currentUser.photoURL || '',
          role: intendedRole,
        });
        return { isNewUser: true };
      }
      
      // Update last login and Log login event in parallel
      const userData = docSnap.data() as UserProfile;
      setProfile(userData);
      localStorage.setItem('user_profile', JSON.stringify(userData));

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
      
      setPendingRegistration(null);
      return { isNewUser: false };
    } catch (error: any) {
      console.error("Login failed", error);
      throw error;
    }
  };

  const completeRegistration = async (data: Partial<UserProfile>) => {
    if (!pendingRegistration) throw new Error("No pending registration found");

    const email = pendingRegistration.email;
    
    // NIM Uniqueness Check
    if (data.nim) {
      const q = query(collection(db, 'users'), where('nim', '==', data.nim), where('deleted', '!=', true));
      const snap = await getDocs(q);
      if (!snap.empty) {
        throw new Error(`Data ${data.nim} sudah terdaftar di sistem. Gunakan NIM/NIP lain atau hubungi admin.`);
      }
    }

    let finalRole: Role = data.role || 'mahasiswa';

    // Domain-based role detection (Security)
    if (email.endsWith('@student.uin-malang.ac.id')) {
      finalRole = 'mahasiswa';
    } else {
      try {
        const mappingRef = doc(db, 'role_mappings', email);
        const mappingSnap = await getDoc(mappingRef);
        if (mappingSnap.exists()) {
          finalRole = mappingSnap.data().role;
        } else if (finalRole === 'admin' && email !== "gama96954@gmail.com") {
          finalRole = email.endsWith('@uin-malang.ac.id') ? 'dosen' : 'mahasiswa';
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
      nim: data.nim || '',
      whatsapp: data.whatsapp || '',
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
        details: `User ${email} completed registration with NIM ${data.nim || 'N/A'} as ${finalRole}`
      }).catch(e => console.warn("Failed to log registration completion:", e))
    ]);

    setProfile(newProfile);
    setPendingRegistration(null);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      pendingRegistration, 
      loading, 
      login, 
      completeRegistration, 
      emailLogin, 
      emailRegister, 
      updateUserProfile, 
      resetPassword, 
      confirmNewPassword, 
      verifyResetCode, 
      sendOTPReset,
      verifyOTPReset,
      completeOTPReset,
      logout 
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
