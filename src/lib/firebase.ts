import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { initializeApp, getApps, deleteApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  type Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { getFirestore, type Firestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import type { AppData, FirebaseConfig } from '../types';

declare const __GOOGLE_WEB_CLIENT_ID__: string;

const CONFIG_STORAGE_KEY = 'raquel_psi_firebase_config';

let pendingRegistrationName: string | null = null;

export function setPendingRegistrationName(name: string): void {
  const trimmed = name.trim();
  pendingRegistrationName = trimmed || null;
}

export function consumePendingRegistrationName(): string | null {
  const value = pendingRegistrationName;
  pendingRegistrationName = null;
  return value;
}

export function clearPendingRegistrationName(): void {
  pendingRegistrationName = null;
}

export function translateAuthError(err: unknown): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code ?? '')
      : '';
  const msg = err instanceof Error ? err.message : String(err);

  if (code === 'USER_CANCELLED' || msg.includes('USER_CANCELLED') || msg.includes('auth/popup-closed-by-user')) {
    return 'Login com Google cancelado.';
  }
  if (msg.includes('GOOGLE_WEB_CLIENT_ID_MISSING')) {
    return 'Web Client ID do Google não configurado. Adicione VITE_GOOGLE_WEB_CLIENT_ID no .env ou google-services.json no Android.';
  }
  if (msg.includes('GOOGLE_ID_TOKEN_MISSING')) {
    return 'Não foi possível obter o token de autenticação do Google.';
  }
  if (msg.includes('NoCredentialException') || msg.includes('No credentials available')) {
    return 'Nenhuma conta Google disponível ou autorizada neste aparelho. Verifique a configuração SHA-1 no Firebase Console.';
  }
  if (msg.includes('Account reauth failed') || msg.includes('[16]')) {
    return 'Falha ao autenticar sua conta Google no aparelho. Verifique o SHA-1 e a tela de consentimento OAuth no Firebase/Google Cloud.';
  }
  if (msg.includes('auth/account-exists-with-different-credential')) {
    return 'Já existe uma conta cadastrada com esse e-mail usando outro método de login.';
  }
  if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
    return 'E-mail ou senha incorretos.';
  }
  if (msg.includes('auth/user-not-found')) {
    return 'Nenhuma conta encontrada com esse e-mail.';
  }
  if (msg.includes('auth/email-already-in-use')) {
    return 'Esse e-mail já está cadastrado. Tente entrar.';
  }
  if (msg.includes('auth/weak-password')) {
    return 'A senha precisa ter pelo menos 6 caracteres.';
  }
  if (msg.includes('auth/invalid-email')) {
    return 'Digite um e-mail válido.';
  }
  if (msg.includes('auth/operation-not-allowed')) {
    return 'Login por e-mail/senha ainda não foi ativado no Firebase Console.';
  }
  return msg;
}

/** Recursively removes keys with `undefined` values because Firestore rejects `undefined` fields. */
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) {
        out[k] = stripUndefined(v);
      }
    }
    return out as T;
  }
  return value;
}

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

let socialLoginInitialized = false;

export function getGoogleWebClientId(): string {
  const fromEnv = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID;
  if (fromEnv) return fromEnv;
  if (typeof __GOOGLE_WEB_CLIENT_ID__ !== 'undefined') return __GOOGLE_WEB_CLIENT_ID__;
  return '';
}

export async function ensureNativeGoogleInitialized(webClientId: string): Promise<void> {
  if (socialLoginInitialized) return;
  await SocialLogin.initialize({
    google: {
      webClientId,
      mode: 'online',
      skipAuthOnlyAuthorizationAfterSignIn: true,
    },
  });
  socialLoginInitialized = true;
}

export async function loginWithGoogle(auth: Auth) {
  if (Capacitor.isNativePlatform()) {
    const webClientId = getGoogleWebClientId();
    if (!webClientId) {
      throw new Error('GOOGLE_WEB_CLIENT_ID_MISSING');
    }
    await ensureNativeGoogleInitialized(webClientId);
    const response = await SocialLogin.login({
      provider: 'google',
      options: {},
    });
    if (response.result.responseType !== 'online' || !response.result.idToken) {
      throw new Error('GOOGLE_ID_TOKEN_MISSING');
    }
    const credential = GoogleAuthProvider.credential(response.result.idToken);
    return signInWithCredential(auth, credential);
  }
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

export async function logoutFirebase(auth: Auth) {
  try {
    sessionStorage.removeItem('atelier_google_calendar_session_v1');
  } catch {
    // Ignore storage errors
  }
  if (Capacitor.isNativePlatform()) {
    try {
      const webClientId = getGoogleWebClientId();
      if (webClientId) {
        await ensureNativeGoogleInitialized(webClientId);
        await SocialLogin.logout({ provider: 'google' });
      }
    } catch {
      // Ignore native Google logout errors when signed in via email/password
    }
  }
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
  await setDoc(ref, stripUndefined(data), { merge: true });
}
