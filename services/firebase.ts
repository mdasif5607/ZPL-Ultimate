import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  User,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  addDoc,
  serverTimestamp,
  Timestamp,
  increment,
  getDocFromServer,
  enableIndexedDbPersistence
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Enable Persistence
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
      console.warn("Firestore Persistence: Multiple tabs open, persistence enabled in only one tab.");
    } else if (err.code == 'unimplemented') {
      console.warn("Firestore Persistence: Browser does not support persistence.");
    }
  });
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  let errMsg = error instanceof Error ? error.message : String(error);
  
  if (errMsg.includes('client is offline') || errMsg.includes('unavailable')) {
    errMsg = "FIRESTORE CONNECTION ERROR: backend unreachable.\n\n" +
             "POSSIBLE CAUSES:\n" +
             "1. Authorized Domains: Add 'ais-dev-vpbt3harx5gun6jcjphjny-767779968473.asia-southeast1.run.app' to Firebase Console > Auth > Settings > Authorized Domains.\n" +
             "2. Private Database: Check if your IP is blocked by Firebase Firewall.\n" +
             "3. Local Network: Check if 'firestore.googleapis.com' is blocked by your ISP or a VPN.\n" +
             "4. Browser Extensions: Disable Ad-blockers or Privacy shields.\n\n" +
             "Original error: " + errMsg;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Login Error', error);
    throw error;
  }
};

export const signUpWithEmail = async (email: string, pass: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error) {
    console.error('Sign Up Error', error);
    throw error;
  }
};

export const loginWithEmail = async (email: string, pass: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error) {
    console.error('Login Error', error);
    throw error;
  }
};

export const logout = () => signOut(auth);

// User Profile Helpers
export interface UserProfile {
  uid: string;
  email: string;
  role: 'user' | 'admin';
  status?: 'active' | 'suspended';
  accessExpiresAt?: Timestamp;
  dailyLimit?: number;
  createdAt: Timestamp;
}

export const setUserStatus = async (uid: string, status: 'active' | 'suspended') => {
  try {
    await updateDoc(doc(db, 'users', uid), { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { uid, ...docSnap.data() } as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
    return null;
  }
};

export const createUserProfile = async (user: User) => {
  const profile: Partial<UserProfile> = {
    email: user.email || '',
    role: 'user',
    createdAt: serverTimestamp() as any
  };
  
  try {
    await setDoc(doc(db, 'users', user.uid), profile, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
};

// Access Request Helpers
export interface AccessRequest {
  id?: string;
  userId: string;
  userEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Timestamp;
}

export const requestAccess = async (user: User) => {
  try {
    await addDoc(collection(db, 'accessRequests'), {
      userId: user.uid,
      userEmail: user.email,
      status: 'pending',
      requestedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'accessRequests');
  }
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
  try {
    const q = query(collection(db, 'users'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as UserProfile[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
    return [];
  }
};

export const revokeAccess = async (uid: string) => {
  try {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, {
      accessExpiresAt: null
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
};

export const grantAccess = async (uid: string, days: number) => {
  try {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + days);
    await updateDoc(doc(db, 'users', uid), {
      accessExpiresAt: Timestamp.fromDate(expiry)
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
};

export const updateUserLimit = async (uid: string, limit: number) => {
  try {
    await updateDoc(doc(db, 'users', uid), {
      dailyLimit: Math.max(1, limit)
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
};

// Usage Tracking
export const getDailyUsage = async (userId: string): Promise<number> => {
  const date = new Date().toISOString().split('T')[0];
  const logId = `${userId}_${date}`;
  try {
    const docSnap = await getDoc(doc(db, 'usageLogs', logId));
    return docSnap.exists() ? docSnap.data().count : 0;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `usageLogs/${logId}`);
    return 0;
  }
};

export const incrementDailyUsage = async (userId: string, count: number = 1) => {
  const date = new Date().toISOString().split('T')[0];
  const logId = `${userId}_${date}`;
  try {
    const docRef = doc(db, 'usageLogs', logId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      await setDoc(docRef, { userId, date, count: count });
    } else {
      await updateDoc(docRef, { count: increment(count) });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `usageLogs/${logId}`);
  }
};

export const testFirestoreConnection = async () => {
  try {
    // Attempt to get a document directly from server to bypass cache
    await getDocFromServer(doc(db, '_diagnostics', 'connection_test'));
    return { success: true };
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      return { success: true, message: "Connected (Rules active)" };
    }
    return { success: false, error: error.message, code: error.code };
  }
};

// Test connection on startup
testFirestoreConnection().then(result => {
  if (!result.success && result.code !== 'permission-denied') {
    console.warn("Firestore Connectivity Warning:", result.error);
  }
});
