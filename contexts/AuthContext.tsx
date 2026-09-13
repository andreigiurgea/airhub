import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User as FirebaseUser, UserCredential } from 'firebase/auth';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import {
  doc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  getDoc,
  onSnapshot,
} from 'firebase/firestore';
import { logger } from '@/lib/logger';
import { checkOutFromDropzone } from '@/lib/dropzoneService';

export interface WaiverInfo {
  required: boolean;
  text?: string;
  version?: string;
  dropzoneName?: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkWaiverForDropzone: (dropzoneId: string) => Promise<WaiverInfo>;
  acceptWaiver: (dropzoneId: string, version: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const waiverUnsubsRef = useRef<(() => void)[]>([]);

  const clearWaiverListeners = () => {
    waiverUnsubsRef.current.forEach((u) => u());
    waiverUnsubsRef.current = [];
  };

  const getCustomerDoc = async (uid: string) => {
    const snap = await getDocs(
      query(collection(db, 'customers'), where('accountId', '==', uid))
    );
    if (snap.empty) return null;
    return { id: snap.docs[0].id, data: snap.docs[0].data() };
  };

  // Derive a stable version string from the waiver document data
  const deriveVersion = (data: Record<string, any>): string => {
    if (data.version) return String(data.version);
    if (data.updatedAt?.toMillis) return String(data.updatedAt.toMillis());
    if (data.createdAt?.toMillis) return String(data.createdAt.toMillis());
    // last resort: fingerprint from text content
    return String(data.text?.length ?? 0) + '_' + String((data.text ?? '').slice(0, 64));
  };

  // Attach real-time listeners to all dropzone waivers the user is checked into.
  // If any waiver is created or updated, auto-checkout the customer.
  const attachWaiverListeners = async (uid: string) => {
    clearWaiverListeners();
    try {
      const dropzonesSnap = await getDocs(collection(db, 'dropzones'));
      dropzonesSnap.docs.forEach((dzDoc) => {
        const dropzoneId = dzDoc.id;
        const waiverRef = doc(db, 'dropzones', dropzoneId, 'settings', 'waiver');

        let initialVersion: string | null = null;
        let initialized = false;

        const unsub = onSnapshot(waiverRef, async (snap) => {
          if (!snap.exists()) {
            initialized = true;
            return;
          }
          const data = snap.data();
          const version = deriveVersion(data);

          if (!initialized) {
            initialVersion = version;
            initialized = true;
            return;
          }

          // Waiver was created or updated while user is logged in
          if (version !== initialVersion) {
            initialVersion = version;
            logger.log(`Waiver updated at ${dropzoneId}, checking if user is checked in`);
            try {
              // Check if user is currently checked into this dropzone
              const customerDoc = await getCustomerDoc(uid);
              if (
                customerDoc?.data?.currentDropzone?.dropzoneId === dropzoneId
              ) {
                logger.log(`Auto-checking out user from ${dropzoneId} due to waiver update`);
                await checkOutFromDropzone(uid);
              }
            } catch (err) {
              logger.error('Error during waiver-triggered checkout:', err);
            }
          }
        });

        waiverUnsubsRef.current.push(unsub);
      });
    } catch (err) {
      logger.error('Error attaching waiver listeners:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      if (firebaseUser) {
        attachWaiverListeners(firebaseUser.uid);
      } else {
        clearWaiverListeners();
      }
    });
    return () => {
      unsubscribe();
      clearWaiverListeners();
    };
  }, []);

  // Check whether a dropzone has a waiver the user hasn't signed yet.
  // Does NOT require an `active` flag — if the document exists and has text, it counts.
  const checkWaiverForDropzone = async (dropzoneId: string): Promise<WaiverInfo> => {
    try {
      const waiverSnap = await getDoc(
        doc(db, 'dropzones', dropzoneId, 'settings', 'waiver')
      );

      if (!waiverSnap.exists()) return { required: false };

      const waiverData = waiverSnap.data();
      if (!waiverData?.text) return { required: false };

      const version = deriveVersion(waiverData);

      // Fetch dropzone name
      const dzSnap = await getDoc(doc(db, 'dropzones', dropzoneId));
      const dropzoneName = dzSnap.exists()
        ? (dzSnap.data().name ?? dropzoneId)
        : dropzoneId;

      if (!user) {
        return { required: true, text: waiverData.text, version, dropzoneName };
      }

      const customerDoc = await getCustomerDoc(user.uid);
      if (!customerDoc) {
        return { required: true, text: waiverData.text, version, dropzoneName };
      }

      const signedWaivers: Record<string, string> =
        customerDoc.data.signedWaivers ?? {};

      if (signedWaivers[dropzoneId] === version) {
        return { required: false };
      }

      return { required: true, text: waiverData.text, version, dropzoneName };
    } catch (err) {
      logger.error('Error checking waiver:', err);
      // Fail open — don't block check-in on network errors
      return { required: false };
    }
  };

  const acceptWaiver = async (dropzoneId: string, version: string) => {
    if (!user) throw new Error('Not authenticated');
    const customerDoc = await getCustomerDoc(user.uid);
    if (!customerDoc) throw new Error('Customer record not found');

    const signedWaivers = {
      ...(customerDoc.data.signedWaivers ?? {}),
      [dropzoneId]: version,
    };
    await updateDoc(doc(db, 'customers', customerDoc.id), {
      signedWaivers,
      updatedAt: serverTimestamp(),
    });
  };

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign in');
    }
  };

  const signUp = async (email: string, password: string) => {
    let userCredential: UserCredential | undefined;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await userCredential.user.getIdToken(true);

      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0');
      const clientId = `C${timestamp.toString().slice(-4)}${randomSuffix}`;

      const retryWithBackoff = async (fn: () => Promise<void>, maxRetries = 3) => {
        for (let i = 0; i < maxRetries; i++) {
          try {
            await fn();
            return;
          } catch (err: any) {
            if (i === maxRetries - 1) throw err;
            await new Promise((r) => setTimeout(r, Math.pow(2, i) * 500));
          }
        }
      };

      await retryWithBackoff(async () => {
        await setDoc(doc(db, 'customers', clientId), {
          customerId: clientId,
          email: userCredential!.user.email ?? '',
          firstName: '',
          lastName: '',
          nickname: '',
          phone: '',
          dateOfBirth: '',
          weight: 0,
          height: 0,
          address: '',
          license: '',
          type: 'fun_jumper',
          status: 'Active',
          role: null,
          lastJump: '',
          emergency: { name: '', phone: '' },
          stats: {
            totalJumps: 0,
            licenses: [],
            jumpTypes: { belly: 0, freefly: 0, wingsuit: 0 },
            certifications: [],
          },
          signedWaivers: {},
          accountId: userCredential!.user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
    } catch (error: any) {
      if (userCredential) {
        try {
          await userCredential.user.delete();
        } catch {}
      }
      if (error.message?.includes('Missing or insufficient permissions')) {
        throw new Error('Please update Firebase security rules.');
      }
      throw new Error(error.message || 'Failed to create account');
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign out');
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, signUp, signOut, checkWaiverForDropzone, acceptWaiver }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
