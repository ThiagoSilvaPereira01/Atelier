import { initializeApp, getApps, deleteApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  type Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { getFirestore, type Firestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import type { AppData, FirebaseConfig } from '../types';

const CONFIG_STORAGE_KEY = 'raquel_psi_firebase_config';

export function getEnvFirebaseConfig(): FirebaseConfig | null {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;

  if (!apiKey || !projectId) return null;

  return {
    apiKey,
    authDomain: authDomain || `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: appId || '',
  };
}

export function getSavedFirebaseConfig(): FirebaseConfig | null {
  const envConfig = getEnvFirebaseConfig();
  if (envConfig) return envConfig;

  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FirebaseConfig;
    if (parsed.apiKey && parsed.projectId) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function saveFirebaseConfig(config: FirebaseConfig): void {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
}

export function clearFirebaseConfig(): void {
  localStorage.removeItem(CONFIG_STORAGE_KEY);
}

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

export function initFirebaseClient(config: FirebaseConfig): {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
} {
  if (appInstance && authInstance && dbInstance) {
    return { app: appInstance, auth: authInstance, db: dbInstance };
  }

  const existing = getApps();
  if (existing.length > 0) {
    appInstance = existing[0];
  } else {
    appInstance = initializeApp(config);
  }

  authInstance = getAuth(appInstance);
  dbInstance = getFirestore(appInstance);
  return { app: appInstance, auth: authInstance, db: dbInstance };
}

export async function resetFirebaseClient(): Promise<void> {
  if (appInstance) {
    await deleteApp(appInstance);
    appInstance = null;
    authInstance = null;
    dbInstance = null;
  }
}

export async function loginWithEmail(auth: Auth, email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function registerWithEmail(auth: Auth, email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function loginWithGoogle(auth: Auth) {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

export async function logoutFirebase(auth: Auth) {
  return signOut(auth);
}

export function subscribeAuth(auth: Auth, callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export function subscribeUserData(
  db: Firestore,
  uid: string,
  onData: (data: AppData | null) => void,
  onError: (error: Error) => void
) {
  const ref = doc(db, 'users', uid, 'app', 'state');
  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        onData(snap.data() as AppData);
      } else {
        onData(null);
      }
    },
    (err) => onError(err)
  );
}

export async function loadUserDataOnce(db: Firestore, uid: string): Promise<AppData | null> {
  const ref = doc(db, 'users', uid, 'app', 'state');
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as AppData) : null;
}

export async function saveUserData(db: Firestore, uid: string, data: AppData): Promise<void> {
  const ref = doc(db, 'users', uid, 'app', 'state');
  await setDoc(ref, data, { merge: true });
}
