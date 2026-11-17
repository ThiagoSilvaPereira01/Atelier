import { useState, useEffect, useCallback, useRef } from 'react';
import type { User, Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type {
  AppData,
  AppSettings,
  AgendaEvent,
  TaskItem,
  Transaction,
  Habit,
  Goal,
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
} from '../lib/firebase';

const LOCAL_DATA_KEY = 'raquel_psi_app_data_v1';

function loadLocalData(): AppData {
  try {
    const raw = localStorage.getItem(LOCAL_DATA_KEY);
    if (!raw) return createInitialData();
    const parsed = JSON.parse(raw) as Partial<AppData>;
    const defaults = createInitialData();
    return {
      ...defaults,
      ...parsed,
      settings: { ...defaults.settings, ...(parsed.settings ?? {}) },
    };
  } catch {
    return createInitialData();
  }
}

export function useAppData() {
  const [data, setData] = useState<AppData>(loadLocalData);
  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConfig | null>(getSavedFirebaseConfig);
  const [auth, setAuth] = useState<Auth | null>(null);
  const [db, setDb] = useState<Firestore | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(() => Boolean(getSavedFirebaseConfig()));
  const [syncStatus, setSyncStatus] = useState<'local' | 'syncing' | 'synced' | 'error'>('local');
  const [syncError, setSyncError] = useState<string | null>(null);
  const isRemoteUpdate = useRef(false);

  // Apply theme attribute to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', data.settings.theme);
  }, [data.settings.theme]);

  // Save to localStorage whenever data changes
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(data));
    } catch {
      // Ignore storage quota errors
    }
  }, [data]);

  // Initialize Firebase when config is present
  useEffect(() => {
    if (!firebaseConfig) {
      setAuth(null);
      setDb(null);
      setUser(null);
      setAuthLoading(false);
      setSyncStatus('local');
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
        if (!firebaseUser) {
          setSyncStatus('local');
          const clean = createInitialData();
          setData(clean);
          localStorage.removeItem(LOCAL_DATA_KEY);
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

    setSyncStatus('syncing');
    const unsubDoc = subscribeUserData(
      db,
      user.uid,
      (remoteData) => {
        if (remoteData) {
          isRemoteUpdate.current = true;
          const defaults = createInitialData();
          setData({
            ...defaults,
            ...remoteData,
            settings: { ...defaults.settings, ...(remoteData.settings ?? {}) },
          });
          setSyncStatus('synced');
          setSyncError(null);
        } else {
          // First time user logs in: create a clean workspace for this user
          const firstName =
            user.displayName?.trim().split(/\s+/)[0] ||
            user.email?.split('@')[0] ||
            'Raquel';
          const cleanUserData = createInitialData(firstName);
          isRemoteUpdate.current = true;
          setData(cleanUserData);
          saveUserData(db, user.uid, cleanUserData)
            .then(() => setSyncStatus('synced'))
            .catch((err) => {
              setSyncStatus('error');
              setSyncError(err.message);
            });
        }
      },
      (err) => {
        setSyncStatus('error');
        setSyncError(err.message);
      }
    );

    return () => unsubDoc();
  }, [db, user]);

  // Push local mutations to Firestore
  const commitUpdate = useCallback(
    (updater: (prev: AppData) => AppData) => {
      setData((prev) => {
        const next = updater(prev);
        if (db && user && !isRemoteUpdate.current) {
          setSyncStatus('syncing');
          saveUserData(db, user.uid, next)
            .then(() => {
              setSyncStatus('synced');
              setSyncError(null);
            })
            .catch((err) => {
              setSyncStatus('error');
              setSyncError(err.message);
            });
        }
        isRemoteUpdate.current = false;
        return next;
      });
    },
    [db, user]
  );

  const connectFirebase = useCallback(async (config: FirebaseConfig) => {
    await resetFirebaseClient();
    saveFirebaseConfig(config);
    setFirebaseConfig(config);
  }, []);

  const disconnectFirebase = useCallback(async () => {
    await resetFirebaseClient();
    clearFirebaseConfig();
    setFirebaseConfig(null);
    setUser(null);
    setSyncStatus('local');
    setSyncError(null);
  }, []);

  const updateSettings = useCallback(
    (partial: Partial<AppSettings>) => {
      commitUpdate((prev) => ({
        ...prev,
        settings: { ...prev.settings, ...partial },
      }));
    },
    [commitUpdate]
  );

  const addEvent = useCallback(
    (event: Omit<AgendaEvent, 'id'>) => {
      commitUpdate((prev) => ({
        ...prev,
        events: [...prev.events, { ...event, id: `ev-${Date.now()}` }],
      }));
    },
    [commitUpdate]
  );

  const deleteEvent = useCallback(
    (id: string) => {
      commitUpdate((prev) => ({
        ...prev,
        events: prev.events.filter((e) => e.id !== id),
      }));
    },
    [commitUpdate]
  );

  const addTask = useCallback(
    (task: Omit<TaskItem, 'id'>) => {
      commitUpdate((prev) => ({
        ...prev,
        tasks: [{ ...task, id: `t-${Date.now()}` }, ...prev.tasks],
      }));
    },
    [commitUpdate]
  );

  const toggleTask = useCallback(
    (id: string) => {
      commitUpdate((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
      }));
    },
    [commitUpdate]
  );

  const deleteTask = useCallback(
    (id: string) => {
      commitUpdate((prev) => ({
        ...prev,
        tasks: prev.tasks.filter((t) => t.id !== id),
      }));
    },
    [commitUpdate]
  );

  const addTransaction = useCallback(
    (tx: Omit<Transaction, 'id'>) => {
      commitUpdate((prev) => ({
        ...prev,
        transactions: [{ ...tx, id: `tx-${Date.now()}` }, ...prev.transactions],
      }));
    },
    [commitUpdate]
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      commitUpdate((prev) => ({
        ...prev,
        transactions: prev.transactions.filter((t) => t.id !== id),
      }));
    },
    [commitUpdate]
  );

  const addHabit = useCallback(
    (habit: Omit<Habit, 'id' | 'completedDates'>) => {
      commitUpdate((prev) => ({
        ...prev,
        habits: [...prev.habits, { ...habit, id: `h-${Date.now()}`, completedDates: [] }],
      }));
    },
    [commitUpdate]
  );

  const toggleHabitDate = useCallback(
    (habitId: string, dateISO: string) => {
      commitUpdate((prev) => ({
        ...prev,
        habits: prev.habits.map((h) => {
          if (h.id !== habitId) return h;
          const exists = h.completedDates.includes(dateISO);
          return {
            ...h,
            completedDates: exists
              ? h.completedDates.filter((d) => d !== dateISO)
              : [...h.completedDates, dateISO],
          };
        }),
      }));
    },
    [commitUpdate]
  );

  const deleteHabit = useCallback(
    (id: string) => {
      commitUpdate((prev) => ({
        ...prev,
        habits: prev.habits.filter((h) => h.id !== id),
      }));
    },
    [commitUpdate]
  );

  const addGoal = useCallback(
    (goal: Omit<Goal, 'id'>) => {
      commitUpdate((prev) => ({
        ...prev,
        goals: [...prev.goals, { ...goal, id: `g-${Date.now()}` }],
      }));
    },
    [commitUpdate]
  );

  const updateGoalProgress = useCallback(
    (id: string, progress: number) => {
      commitUpdate((prev) => ({
        ...prev,
        goals: prev.goals.map((g) => (g.id === id ? { ...g, progress } : g)),
      }));
    },
    [commitUpdate]
  );

  const deleteGoal = useCallback(
    (id: string) => {
      commitUpdate((prev) => ({
        ...prev,
        goals: prev.goals.filter((g) => g.id !== id),
      }));
    },
    [commitUpdate]
  );

  const addCourse = useCallback(
    (course: Omit<Course, 'id'>) => {
      commitUpdate((prev) => ({
        ...prev,
        courses: [...prev.courses, { ...course, id: `c-${Date.now()}` }],
      }));
    },
    [commitUpdate]
  );

  const updateCourse = useCallback(
    (id: string, partial: Partial<Course>) => {
      commitUpdate((prev) => ({
        ...prev,
        courses: prev.courses.map((c) => (c.id === id ? { ...c, ...partial } : c)),
      }));
    },
    [commitUpdate]
  );

  const deleteCourse = useCallback(
    (id: string) => {
      commitUpdate((prev) => ({
        ...prev,
        courses: prev.courses.filter((c) => c.id !== id),
      }));
    },
    [commitUpdate]
  );

  const addReading = useCallback(
    (reading: Omit<StudyReading, 'id'>) => {
      commitUpdate((prev) => ({
        ...prev,
        readings: [{ ...reading, id: `r-${Date.now()}` }, ...prev.readings],
      }));
    },
    [commitUpdate]
  );

  const updateReadingStatus = useCallback(
    (id: string, status: ReadingStatus) => {
      commitUpdate((prev) => ({
        ...prev,
        readings: prev.readings.map((r) => (r.id === id ? { ...r, status } : r)),
      }));
    },
    [commitUpdate]
  );

  const deleteReading = useCallback(
    (id: string) => {
      commitUpdate((prev) => ({
        ...prev,
        readings: prev.readings.filter((r) => r.id !== id),
      }));
    },
    [commitUpdate]
  );

  const resetToDemo = useCallback(() => {
    commitUpdate(() => createInitialData());
  }, [commitUpdate]);

  return {
    data,
    auth,
    user,
    authLoading,
    firebaseConfig,
    syncStatus,
    syncError,
    connectFirebase,
    disconnectFirebase,
    updateSettings,
    addEvent,
    deleteEvent,
    addTask,
    toggleTask,
    deleteTask,
    addTransaction,
    deleteTransaction,
    addHabit,
    toggleHabitDate,
    deleteHabit,
    addGoal,
    updateGoalProgress,
    deleteGoal,
    addCourse,
    updateCourse,
    deleteCourse,
    addReading,
    updateReadingStatus,
    deleteReading,
    resetToDemo,
  };
}
