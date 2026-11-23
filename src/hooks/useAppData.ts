import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import type { User, Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type {
  AppData,
  AppSettings,
  AgendaEvent,
  TaskItem,
  Transaction,
  Course,
  StudyReading,
  ReadingStatus,
  FirebaseConfig,
} from '../types';
import { createInitialData } from '../data/initialData';
import {
  getSavedFirebaseConfig,
  saveFirebaseConfig,
  clearFirebaseConfig,
  initFirebaseClient,
  resetFirebaseClient,
  subscribeAuth,
  subscribeUserData,
  saveUserData,
  saveUserDataPatch,
  consumePendingRegistrationName,
  type AppDataPatch,
} from '../lib/firebase';
import {
  clearGoogleCalendarSession,
  connectGoogleCalendar,
  createGoogleEvent,
  deleteGoogleEvent,
  getStoredGoogleCalendarSession,
  GoogleCalendarApiError,
  syncWithGoogleCalendar,
  translateGoogleCalendarError,
  updateGoogleEvent,
} from '../lib/googleCalendar';
import { syncAndroidWidgets } from '../lib/androidWidgets';

const LOCAL_DATA_KEY = 'raquel_psi_app_data_v1';
const USER_CACHE_KEY_PREFIX = 'raquel_psi_user_cache_v1_';
const GOOGLE_AUTO_SYNC_INTERVAL_MS = 2 * 60_000;
const GOOGLE_AUTO_SYNC_COOLDOWN_MS = 30_000;

function getUserCacheKey(uid: string): string {
  return `${USER_CACHE_KEY_PREFIX}${uid}`;
}

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeTasks(tasks: TaskItem[] | undefined): TaskItem[] {
  if (!Array.isArray(tasks)) return [];
  return tasks.map((t) =>
    (t.category as string) === 'Estágio' ? { ...t, category: 'Monitoria' } : t
  );
}

function normalizeAppData(
  parsed: Partial<AppData> | null | undefined,
  fallbackUserName?: string
): AppData {
  const defaults = createInitialData(fallbackUserName);
  if (!parsed || typeof parsed !== 'object') return defaults;
  return {
    ...defaults,
    events: Array.isArray(parsed.events) ? parsed.events : [],
    tasks: normalizeTasks(parsed.tasks),
    transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
    courses: Array.isArray(parsed.courses) ? parsed.courses : [],
    readings: Array.isArray(parsed.readings) ? parsed.readings : [],
    settings: { ...defaults.settings, ...(parsed.settings ?? {}) },
  };
}

function hasMeaningfulData(appData: AppData): boolean {
  return (
    appData.events.length > 0 ||
    appData.tasks.length > 0 ||
    appData.transactions.length > 0 ||
    appData.courses.length > 0 ||
    appData.readings.length > 0
  );
}

function readStoredAppData(storageKey: string): AppData | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return normalizeAppData(parsed);
  } catch {
    return null;
  }
}

function loadInitialData(): AppData {
  // In Firebase mode, never bootstrap writable state from the shared local-only key;
  // wait for Firestore to deliver the authenticated user's document.
  if (getSavedFirebaseConfig()) {
    return createInitialData();
  }
  return readStoredAppData(LOCAL_DATA_KEY) ?? createInitialData();
}

export function useAppData() {
  const [data, setData] = useState<AppData>(loadInitialData);
  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConfig | null>(getSavedFirebaseConfig);
  const [auth, setAuth] = useState<Auth | null>(null);
  const [db, setDb] = useState<Firestore | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(() => Boolean(getSavedFirebaseConfig()));
  const [syncStatus, setSyncStatus] = useState<'local' | 'syncing' | 'synced' | 'error'>('local');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState<boolean>(() =>
    Boolean(getStoredGoogleCalendarSession())
  );
  const [googleCalendarSyncing, setGoogleCalendarSyncing] = useState<boolean>(false);
  const [googleCalendarError, setGoogleCalendarError] = useState<string | null>(null);
  const [googleCalendarMessage, setGoogleCalendarMessage] = useState<string | null>(null);
  const [googleLastCheckedAt, setGoogleLastCheckedAt] = useState<string | undefined>(undefined);
  const [firestoreReadyUid, setFirestoreReadyUid] = useState<string | null>(null);
  const dataRef = useRef(data);
  const firestoreReadyUidRef = useRef<string | null>(null);
  const googleSyncInFlightRef = useRef(false);
  const lastGoogleSyncAttemptRef = useRef(0);
  const pendingGoogleMutationCountRef = useRef(0);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Apply theme attribute to document root and sync native status bar
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', data.settings.theme);

    if (!Capacitor.isNativePlatform()) return;

    const isDark = data.settings.theme === 'dark';
    const bgColor =
      data.settings.theme === 'dark'
        ? '#121316'
        : data.settings.theme === 'light'
        ? '#fafafa'
        : '#fbf6f2';

    StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }).catch(() => {});
    StatusBar.setBackgroundColor({ color: bgColor }).catch(() => {});
  }, [data.settings.theme]);

  const isWorkspaceDataReady = !firebaseConfig || (user !== null && firestoreReadyUid === user.uid);

  // Save to localStorage and sync Android home-screen widgets only when workspace data is ready
  useEffect(() => {
    if (!isWorkspaceDataReady) return;

    try {
      const storageKey = firebaseConfig && user ? getUserCacheKey(user.uid) : LOCAL_DATA_KEY;
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch {
      // Ignore storage quota errors
    }
    syncAndroidWidgets(data);
  }, [data, isWorkspaceDataReady, firebaseConfig, user]);

  // Initialize Firebase when config is present
  useEffect(() => {
    if (!firebaseConfig) {
      setAuth(null);
      setDb(null);
      setUser(null);
      setAuthLoading(false);
      setSyncStatus('local');
      firestoreReadyUidRef.current = null;
      setFirestoreReadyUid(null);
      const local = readStoredAppData(LOCAL_DATA_KEY) ?? createInitialData();
      dataRef.current = local;
      setData(local);
      return;
    }

    setAuthLoading(true);
    try {
      const client = initFirebaseClient(firebaseConfig);
      setAuth(client.auth);
      setDb(client.db);

      const unsubAuth = subscribeAuth(client.auth, (firebaseUser) => {
        setUser(firebaseUser);
        setAuthLoading(false);
        if (firebaseUser) {
          firestoreReadyUidRef.current = null;
          setFirestoreReadyUid(null);
          setSyncStatus('syncing');
          setSyncError(null);
        } else {
          setSyncStatus('local');
          setSyncError(null);
          firestoreReadyUidRef.current = null;
          setFirestoreReadyUid(null);
          clearGoogleCalendarSession();
          setGoogleCalendarConnected(false);
          setGoogleCalendarError(null);
          setGoogleCalendarMessage(null);
          setGoogleLastCheckedAt(undefined);
          // Clear in-memory view only; do NOT delete LOCAL_DATA_KEY so local-mode data isn't destroyed
          const clean = createInitialData();
          dataRef.current = clean;
          setData(clean);
        }
      });

      return () => unsubAuth();
    } catch (err) {
      setAuthLoading(false);
      setSyncStatus('error');
      setSyncError(err instanceof Error ? err.message : 'Erro ao iniciar Firebase');
    }
  }, [firebaseConfig]);

  // Subscribe to Firestore when user is signed in
  useEffect(() => {
    if (!db || !user) return;

    const activeUid = user.uid;
    firestoreReadyUidRef.current = null;

    const unsubDoc = subscribeUserData(
      db,
      activeUid,
      (remoteData, meta) => {
        if (remoteData) {
          const merged = normalizeAppData(remoteData);
          dataRef.current = merged;
          setData(merged);
          firestoreReadyUidRef.current = activeUid;
          setFirestoreReadyUid(activeUid);
          setSyncStatus('synced');
          setSyncError(null);
        } else {
          // Never initialize an empty document from a local cache miss while offline/connecting
          if (meta.fromCache) {
            setSyncStatus('syncing');
            return;
          }

          // Confirmed by server that this user has no document yet
          const pendingName = consumePendingRegistrationName();
          const firstName =
            pendingName?.split(/\s+/)[0] ||
            user.displayName?.trim().split(/\s+/)[0] ||
            user.email?.split('@')[0] ||
            'Raquel';

          const legacyLocal = readStoredAppData(LOCAL_DATA_KEY);
          const shouldMigrateLegacy = Boolean(legacyLocal && hasMeaningfulData(legacyLocal));
          const initialUserData: AppData = shouldMigrateLegacy && legacyLocal
            ? {
                ...legacyLocal,
                settings: {
                  ...legacyLocal.settings,
                  userName:
                    legacyLocal.settings.userName && legacyLocal.settings.userName !== 'Raquel'
                      ? legacyLocal.settings.userName
                      : firstName,
                },
              }
            : createInitialData(firstName);

          dataRef.current = initialUserData;
          setData(initialUserData);
          firestoreReadyUidRef.current = activeUid;
          setFirestoreReadyUid(activeUid);
          saveUserData(db, activeUid, initialUserData)
            .then(() => {
              if (shouldMigrateLegacy) {
                try {
                  localStorage.removeItem(LOCAL_DATA_KEY);
                } catch {
                  // Ignore storage errors
                }
              }
              setSyncStatus('synced');
              setSyncError(null);
            })
            .catch((err) => {
              setSyncStatus('error');
              setSyncError(err instanceof Error ? err.message : 'Erro ao criar espaço');
            });
        }
      },
      (err) => {
        // Keep firestoreReadyUidRef as null so accidental writes cannot overwrite cloud data
        const cached = readStoredAppData(getUserCacheKey(activeUid));
        if (cached) {
          dataRef.current = cached;
          setData(cached);
        }
        setSyncStatus('error');
        setSyncError(err.message);
      }
    );

    return () => unsubDoc();
  }, [db, user]);

  // Push local mutations to Firestore outside React's state updater
  const commitUpdate = useCallback(
    (updater: (prev: AppData) => AppData, buildPatch?: (next: AppData) => AppDataPatch): boolean => {
      if (firebaseConfig && (!db || !user || firestoreReadyUidRef.current !== user.uid)) {
        setSyncStatus('error');
        setSyncError('Aguarde o carregamento dos dados na nuvem antes de fazer alterações.');
        return false;
      }

      const next = updater(dataRef.current);
      dataRef.current = next;
      setData(next);

      if (db && user) {
        setSyncStatus('syncing');
        const savePromise = buildPatch
          ? saveUserDataPatch(db, user.uid, buildPatch(next))
          : saveUserData(db, user.uid, next);
        savePromise
          .then(() => {
            setSyncStatus('synced');
            setSyncError(null);
          })
          .catch((err) => {
            setSyncStatus('error');
            setSyncError(err instanceof Error ? err.message : 'Erro ao sincronizar');
          });
      }
      return true;
    },
    [firebaseConfig, db, user]
  );

  const connectFirebase = useCallback(async (config: FirebaseConfig) => {
    await resetFirebaseClient();
    saveFirebaseConfig(config);
    setFirebaseConfig(config);
  }, []);

  const disconnectFirebase = useCallback(async () => {
    await resetFirebaseClient();
    clearFirebaseConfig();
    firestoreReadyUidRef.current = null;
    setFirestoreReadyUid(null);
    setFirebaseConfig(null);
    setUser(null);
    setSyncStatus('local');
    setSyncError(null);
  }, []);

  const updateSettings = useCallback(
    (partial: Partial<AppSettings>) => {
      commitUpdate(
        (prev) => ({
          ...prev,
          settings: { ...prev.settings, ...partial },
        }),
        () => ({ settings: partial })
      );
    },
    [commitUpdate]
  );

  const handleGoogleBackgroundError = useCallback((err: unknown) => {
    if (err instanceof GoogleCalendarApiError && err.status === 401) {
      clearGoogleCalendarSession();
      setGoogleCalendarConnected(false);
    }
    setGoogleCalendarError(translateGoogleCalendarError(err));
  }, []);

  const runGoogleSync = useCallback(
    async (accessToken: string, email?: string, options?: { silent?: boolean }) => {
      if (firebaseConfig && (!user || firestoreReadyUidRef.current !== user.uid)) return;
      if (googleSyncInFlightRef.current) return;
      const silent = Boolean(options?.silent);
      googleSyncInFlightRef.current = true;
      lastGoogleSyncAttemptRef.current = Date.now();
      setGoogleCalendarSyncing(true);
      if (!silent) {
        setGoogleCalendarError(null);
        setGoogleCalendarMessage(null);
      }
      try {
        const result = await syncWithGoogleCalendar(accessToken, dataRef.current.events, () =>
          createId('ev')
        );
        const nowISO = new Date().toISOString();
        const hasChanges =
          result.pulledCount > 0 ||
          result.pushedCount > 0 ||
          result.updatedCount > 0 ||
          result.removedCount > 0;

        setGoogleLastCheckedAt(nowISO);
        setGoogleCalendarConnected(true);
        setGoogleCalendarError(null);

        if (!silent || hasChanges) {
          const settingsPatch: Partial<AppSettings> = {
            googleCalendarLastSyncAt: nowISO,
            ...(email ? { googleCalendarEmail: email } : {}),
          };
          commitUpdate(
            (prev) => ({
              ...prev,
              events: result.events,
              settings: {
                ...prev.settings,
                ...settingsPatch,
              },
            }),
            (next) => ({
              events: next.events,
              settings: settingsPatch,
            })
          );
        }

        const parts: string[] = [];
        if (result.pulledCount > 0) parts.push(`${result.pulledCount} importado(s)`);
        if (result.pushedCount > 0) parts.push(`${result.pushedCount} enviado(s)`);
        if (result.updatedCount > 0) parts.push(`${result.updatedCount} atualizado(s)`);
        if (result.removedCount > 0) parts.push(`${result.removedCount} removido(s)`);

        if (!silent) {
          setGoogleCalendarMessage(
            parts.length > 0
              ? `Google Agenda sincronizado: ${parts.join(', ')}.`
              : 'Google Agenda já está em dia!'
          );
        } else if (hasChanges) {
          setGoogleCalendarMessage(`Sincronização automática: ${parts.join(', ')}.`);
        }
      } catch (err) {
        if (err instanceof GoogleCalendarApiError && err.status === 401) {
          clearGoogleCalendarSession();
          setGoogleCalendarConnected(false);
          setGoogleCalendarError(translateGoogleCalendarError(err));
        } else if (!silent || (typeof navigator !== 'undefined' && navigator.onLine && !(err instanceof TypeError))) {
          setGoogleCalendarError(translateGoogleCalendarError(err));
        }
      } finally {
        googleSyncInFlightRef.current = false;
        setGoogleCalendarSyncing(false);
      }
    },
    [commitUpdate, firebaseConfig, user]
  );

  const connectAndSyncGoogleCalendar = useCallback(async () => {
    setGoogleCalendarSyncing(true);
    setGoogleCalendarError(null);
    setGoogleCalendarMessage(null);
    try {
      const session = await connectGoogleCalendar(auth);
      setGoogleCalendarConnected(true);
      await runGoogleSync(session.accessToken, session.email);
    } catch (err) {
      setGoogleCalendarSyncing(false);
      setGoogleCalendarError(translateGoogleCalendarError(err));
    }
  }, [auth, runGoogleSync]);

  const syncGoogleCalendarNow = useCallback(async () => {
    const session = getStoredGoogleCalendarSession();
    if (!session) {
      await connectAndSyncGoogleCalendar();
      return;
    }
    await runGoogleSync(session.accessToken, session.email);
  }, [connectAndSyncGoogleCalendar, runGoogleSync]);

  const syncGoogleCalendarSilent = useCallback(
    async (force = false) => {
      if (firebaseConfig && (!user || firestoreReadyUidRef.current !== user.uid)) return;
      const autoSyncEnabled = dataRef.current.settings.googleCalendarAutoSync ?? true;
      if (!autoSyncEnabled) return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      if (googleSyncInFlightRef.current || pendingGoogleMutationCountRef.current > 0) return;

      const session = getStoredGoogleCalendarSession();
      if (!session) {
        setGoogleCalendarConnected(false);
        return;
      }

      if (!force && Date.now() - lastGoogleSyncAttemptRef.current < GOOGLE_AUTO_SYNC_COOLDOWN_MS) {
        return;
      }

      await runGoogleSync(session.accessToken, session.email, { silent: true });
    },
    [runGoogleSync, firebaseConfig, user]
  );

  const googleCalendarAutoSync = data.settings.googleCalendarAutoSync ?? true;
  const dataLoading = Boolean(firebaseConfig && user && firestoreReadyUid !== user.uid && syncStatus !== 'error');

  // Automatic background synchronization with Google Calendar while connected
  useEffect(() => {
    if (!googleCalendarConnected || !googleCalendarAutoSync || !isWorkspaceDataReady) return;

    const initialTimerId = window.setTimeout(() => {
      void syncGoogleCalendarSilent();
    }, 0);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void syncGoogleCalendarSilent();
      }
    }, GOOGLE_AUTO_SYNC_INTERVAL_MS);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        void syncGoogleCalendarSilent();
      }
    };

    const handleOnline = () => {
      void syncGoogleCalendarSilent();
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      window.clearTimeout(initialTimerId);
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [
    googleCalendarConnected,
    googleCalendarAutoSync,
    isWorkspaceDataReady,
    syncGoogleCalendarSilent,
  ]);

  const disconnectGoogleCalendar = useCallback(() => {
    clearGoogleCalendarSession();
    setGoogleCalendarConnected(false);
    setGoogleCalendarError(null);
    setGoogleCalendarMessage('Sessão do Google Agenda desconectada.');
  }, []);

  const addEvent = useCallback(
    (event: Omit<AgendaEvent, 'id'>) => {
      const newEvent: AgendaEvent = {
        ...event,
        id: createId('ev'),
        source: event.source ?? 'atelier',
      };
      const committed = commitUpdate(
        (prev) => ({
          ...prev,
          events: [...prev.events, newEvent],
        }),
        (next) => ({ events: next.events })
      );
      if (!committed) return;

      const session = getStoredGoogleCalendarSession();
      if (session && !newEvent.googleEventId) {
        pendingGoogleMutationCountRef.current += 1;
        createGoogleEvent(session.accessToken, newEvent)
          .then((created) => {
            commitUpdate(
              (prev) => ({
                ...prev,
                events: prev.events.map((e) =>
                  e.id === newEvent.id
                    ? {
                        ...e,
                        googleEventId: created.googleEventId,
                        googleHtmlLink: created.googleHtmlLink,
                        googleUpdated: created.googleUpdated,
                      }
                    : e
                ),
              }),
              (next) => ({ events: next.events })
            );
          })
          .catch(handleGoogleBackgroundError)
          .finally(() => {
            pendingGoogleMutationCountRef.current = Math.max(
              0,
              pendingGoogleMutationCountRef.current - 1
            );
          });
      }
    },
    [commitUpdate, handleGoogleBackgroundError]
  );

  const deleteEvent = useCallback(
    (id: string) => {
      const target = dataRef.current.events.find((e) => e.id === id);
      const committed = commitUpdate(
        (prev) => ({
          ...prev,
          events: prev.events.filter((e) => e.id !== id),
        }),
        (next) => ({ events: next.events })
      );
      if (!committed) return;

      const session = getStoredGoogleCalendarSession();
      if (session && target?.googleEventId) {
        pendingGoogleMutationCountRef.current += 1;
        deleteGoogleEvent(session.accessToken, target.googleEventId)
          .catch(handleGoogleBackgroundError)
          .finally(() => {
            pendingGoogleMutationCountRef.current = Math.max(
              0,
              pendingGoogleMutationCountRef.current - 1
            );
          });
      }
    },
    [commitUpdate, handleGoogleBackgroundError]
  );

  const updateEvent = useCallback(
    (id: string, partial: Partial<AgendaEvent>) => {
      let updatedEvent: AgendaEvent | null = null;
      const committed = commitUpdate(
        (prev) => ({
          ...prev,
          events: prev.events.map((e) => {
            if (e.id !== id) return e;
            updatedEvent = { ...e, ...partial };
            return updatedEvent;
          }),
        }),
        (next) => ({ events: next.events })
      );
      if (!committed) return;

      const session = getStoredGoogleCalendarSession();
      if (session && updatedEvent) {
        const ev = updatedEvent as AgendaEvent;
        if (ev.googleEventId) {
          pendingGoogleMutationCountRef.current += 1;
          updateGoogleEvent(session.accessToken, ev.googleEventId, ev)
            .then((res) => {
              commitUpdate(
                (prev) => ({
                  ...prev,
                  events: prev.events.map((e) =>
                    e.id === id
                      ? {
                          ...e,
                          googleHtmlLink: res.googleHtmlLink ?? e.googleHtmlLink,
                          googleUpdated: res.googleUpdated ?? e.googleUpdated,
                        }
                      : e
                  ),
                }),
                (next) => ({ events: next.events })
              );
            })
            .catch(handleGoogleBackgroundError)
            .finally(() => {
              pendingGoogleMutationCountRef.current = Math.max(
                0,
                pendingGoogleMutationCountRef.current - 1
              );
            });
        }
      }
    },
    [commitUpdate, handleGoogleBackgroundError]
  );

  const addTask = useCallback(
    (task: Omit<TaskItem, 'id'>) => {
      commitUpdate(
        (prev) => ({
          ...prev,
          tasks: [{ ...task, id: createId('t') }, ...prev.tasks],
        }),
        (next) => ({ tasks: next.tasks })
      );
    },
    [commitUpdate]
  );

  const toggleTask = useCallback(
    (id: string) => {
      commitUpdate(
        (prev) => ({
          ...prev,
          tasks: prev.tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
        }),
        (next) => ({ tasks: next.tasks })
      );
    },
    [commitUpdate]
  );

  const deleteTask = useCallback(
    (id: string) => {
      commitUpdate(
        (prev) => ({
          ...prev,
          tasks: prev.tasks.filter((t) => t.id !== id),
        }),
        (next) => ({ tasks: next.tasks })
      );
    },
    [commitUpdate]
  );

  const updateTask = useCallback(
    (id: string, partial: Partial<TaskItem>) => {
      commitUpdate(
        (prev) => ({
          ...prev,
          tasks: prev.tasks.map((t) => (t.id === id ? { ...t, ...partial } : t)),
        }),
        (next) => ({ tasks: next.tasks })
      );
    },
    [commitUpdate]
  );

  const addTransaction = useCallback(
    (tx: Omit<Transaction, 'id'>) => {
      commitUpdate(
        (prev) => ({
          ...prev,
          transactions: [{ ...tx, id: createId('tx') }, ...prev.transactions],
        }),
        (next) => ({ transactions: next.transactions })
      );
    },
    [commitUpdate]
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      commitUpdate(
        (prev) => ({
          ...prev,
          transactions: prev.transactions.filter((t) => t.id !== id),
        }),
        (next) => ({ transactions: next.transactions })
      );
    },
    [commitUpdate]
  );

  const updateTransaction = useCallback(
    (id: string, partial: Partial<Transaction>) => {
      commitUpdate(
        (prev) => ({
          ...prev,
          transactions: prev.transactions.map((t) => (t.id === id ? { ...t, ...partial } : t)),
        }),
        (next) => ({ transactions: next.transactions })
      );
    },
    [commitUpdate]
  );

  const addCourse = useCallback(
    (course: Omit<Course, 'id'>) => {
      commitUpdate(
        (prev) => ({
          ...prev,
          courses: [...prev.courses, { ...course, id: createId('c') }],
        }),
        (next) => ({ courses: next.courses })
      );
    },
    [commitUpdate]
  );

  const updateCourse = useCallback(
    (id: string, partial: Partial<Course>) => {
      commitUpdate(
        (prev) => ({
          ...prev,
          courses: prev.courses.map((c) => (c.id === id ? { ...c, ...partial } : c)),
        }),
        (next) => ({ courses: next.courses })
      );
    },
    [commitUpdate]
  );

  const deleteCourse = useCallback(
    (id: string) => {
      commitUpdate(
        (prev) => ({
          ...prev,
          courses: prev.courses.filter((c) => c.id !== id),
        }),
        (next) => ({ courses: next.courses })
      );
    },
    [commitUpdate]
  );

  const addReading = useCallback(
    (reading: Omit<StudyReading, 'id'>) => {
      commitUpdate(
        (prev) => ({
          ...prev,
          readings: [{ ...reading, id: createId('r') }, ...prev.readings],
        }),
        (next) => ({ readings: next.readings })
      );
    },
    [commitUpdate]
  );

  const updateReadingStatus = useCallback(
    (id: string, status: ReadingStatus) => {
      commitUpdate(
        (prev) => ({
          ...prev,
          readings: prev.readings.map((r) => (r.id === id ? { ...r, status } : r)),
        }),
        (next) => ({ readings: next.readings })
      );
    },
    [commitUpdate]
  );

  const deleteReading = useCallback(
    (id: string) => {
      commitUpdate(
        (prev) => ({
          ...prev,
          readings: prev.readings.filter((r) => r.id !== id),
        }),
        (next) => ({ readings: next.readings })
      );
    },
    [commitUpdate]
  );

  const resetToDemo = useCallback(() => {
    commitUpdate(() => createInitialData());
  }, [commitUpdate]);

  const exportBackup = useCallback((): string => {
    return JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        data: dataRef.current,
      },
      null,
      2
    );
  }, []);

  const importBackup = useCallback(
    (rawJson: string): { ok: boolean; error?: string } => {
      try {
        const parsed = JSON.parse(rawJson) as { data?: Partial<AppData> } & Partial<AppData>;
        const candidate = parsed && typeof parsed === 'object' && parsed.data ? parsed.data : parsed;
        if (!candidate || typeof candidate !== 'object') {
          return { ok: false, error: 'Arquivo de backup inválido.' };
        }
        const hasKnownKey =
          Array.isArray(candidate.events) ||
          Array.isArray(candidate.tasks) ||
          Array.isArray(candidate.transactions) ||
          Array.isArray(candidate.courses) ||
          Array.isArray(candidate.readings) ||
          Boolean(candidate.settings);
        if (!hasKnownKey) {
          return { ok: false, error: 'O arquivo não contém dados válidos do Atelier.' };
        }
        const normalized = normalizeAppData(candidate);
        const committed = commitUpdate(() => normalized);
        if (!committed) {
          return { ok: false, error: 'Aguarde a conexão com o Firebase antes de restaurar o backup.' };
        }
        return { ok: true };
      } catch {
        return { ok: false, error: 'Não foi possível ler o arquivo JSON de backup.' };
      }
    },
    [commitUpdate]
  );

  return {
    data,
    auth,
    user,
    authLoading,
    dataLoading,
    firebaseConfig,
    syncStatus,
    syncError,
    googleCalendarConnected,
    googleCalendarSyncing,
    googleCalendarError,
    googleCalendarMessage,
    googleCalendarAutoSync,
    googleCalendarLastSyncAt: googleLastCheckedAt ?? data.settings.googleCalendarLastSyncAt,
    connectAndSyncGoogleCalendar,
    syncGoogleCalendarNow,
    syncGoogleCalendarSilent,
    disconnectGoogleCalendar,
    connectFirebase,
    disconnectFirebase,
    updateSettings,
    addEvent,
    updateEvent,
    deleteEvent,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addCourse,
    updateCourse,
    deleteCourse,
    addReading,
    updateReadingStatus,
    deleteReading,
    resetToDemo,
    exportBackup,
    importBackup,
  };
}
