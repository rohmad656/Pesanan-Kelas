import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';

export type Role = 'mahasiswa' | 'dosen' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: Role;
  identifier?: string;
  createdAt: any;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (role: Role, isRegistering?: boolean) => Promise<void>;
  emailLogin: (emailOrId: string, password: string) => Promise<void>;
  emailRegister: (emailOrId: string, password: string, name: string, role: Role) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const docRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUser(currentUser);
            setProfile(docSnap.data() as UserProfile);
          } else {
            // User exists in Auth but not in Firestore yet.
            // It might be in the process of being created by the login function.
            setUser(currentUser);
            // We don't set profile to null here because the login function might be setting it.
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
          setUser(null);
          setProfile(null);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const formatEmail = (emailOrId: string) => {
    return emailOrId.includes('@') ? emailOrId : `${emailOrId}@campus.ac.id`;
  };

  const emailLogin = async (emailOrId: string, password: string) => {
    const email = formatEmail(emailOrId);
    const result = await signInWithEmailAndPassword(auth, email, password);
    try {
      const docRef = doc(db, 'users', result.user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      } else {
        await signOut(auth);
        const error: any = new Error("Akun belum terdaftar. Silakan daftar terlebih dahulu.");
        error.code = 'custom/user-not-found';
        throw error;
      }
    } catch (error: any) {
      if (error.code === 'custom/user-not-found') throw error;
      handleFirestoreError(error, OperationType.GET, `users/${result.user.uid}`);
    }
  };

  const emailRegister = async (emailOrId: string, password: string, name: string, role: Role) => {
    const email = formatEmail(emailOrId);
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const currentUser = result.user;
    
    const newProfile: any = {
      uid: currentUser.uid,
      email: currentUser.email || email,
      name: name,
      role: role,
      createdAt: serverTimestamp(),
    };
    
    if (!emailOrId.includes('@')) {
      newProfile.identifier = emailOrId;
    }
    
    try {
      await setDoc(doc(db, 'users', currentUser.uid), newProfile);
      setProfile(newProfile as UserProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${currentUser.uid}`);
    }
  };

  const resetPassword = async (email: string) => {
    const formattedEmail = formatEmail(email);
    await sendPasswordResetEmail(auth, formattedEmail);
  };

  const login = async (selectedRole: Role, isRegistering: boolean = false) => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const currentUser = result.user;
      
      const docRef = doc(db, 'users', currentUser.uid);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        const newProfile: Partial<UserProfile> = {
          uid: currentUser.uid,
          email: currentUser.email || '',
          name: currentUser.displayName || 'Unknown User',
          role: selectedRole,
          createdAt: serverTimestamp(),
        };
        
        // Non-blocking write to speed up login
        setDoc(docRef, newProfile).catch(err => {
          console.error("Failed to write user profile in background:", err);
        });
        
        setProfile(newProfile as UserProfile);
      } else {
        setProfile(docSnap.data() as UserProfile);
      }
    } catch (error) {
      console.error("Login failed", error);
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, emailLogin, emailRegister, resetPassword, logout }}>
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
