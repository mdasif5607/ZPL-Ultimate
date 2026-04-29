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
  increment
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

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
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
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
  accessExpiresAt?: Timestamp;
  createdAt: Timestamp;
}

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

export const incrementDailyUsage = async (userId: string) => {
  const date = new Date().toISOString().split('T')[0];
  const logId = `${userId}_${date}`;
  try {
    const docRef = doc(db, 'usageLogs', logId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      await setDoc(docRef, { userId, date, count: 1 });
    } else {
      await updateDoc(docRef, { count: increment(1) });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `usageLogs/${logId}`);
  }
};
