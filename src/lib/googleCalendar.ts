import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import {
  type Auth,
  GoogleAuthProvider,
  linkWithPopup,
  reauthenticateWithPopup,
  signInWithPopup,
} from 'firebase/auth';
import type { AgendaEvent, EventCategory } from '../types';
import { addDaysISO } from '../data/initialData';
import { ensureNativeGoogleInitialized, getGoogleWebClientId } from './firebase';

export const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const SESSION_STORAGE_KEY = 'atelier_google_calendar_session_v1';

const VALID_CATEGORIES: EventCategory[] = ['Faculdade', 'Estágio', 'Supervisão', 'Pessoal'];

export interface GoogleCalendarSession {
  accessToken: string;
  expiresAt: number;
  email?: string;
}

export interface GoogleSyncSummary {
  events: AgendaEvent[];
  pulledCount: number;
  updatedCount: number;
  pushedCount: number;
  removedCount: number;
}

export class GoogleCalendarApiError extends Error {
  status: number;
  reason?: string;

  constructor(message: string, status: number, reason?: string) {
    super(message);
    this.name = 'GoogleCalendarApiError';
    this.status = status;
    this.reason = reason;
  }
}

export function getStoredGoogleCalendarSession(): GoogleCalendarSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GoogleCalendarSession>;
    if (!parsed.accessToken || typeof parsed.expiresAt !== 'number') return null;
    if (Date.now() >= parsed.expiresAt) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return {
      accessToken: parsed.accessToken,
      expiresAt: parsed.expiresAt,
      email: parsed.email,
    };
  } catch {
    return null;
  }
}

export function saveGoogleCalendarSession(session: GoogleCalendarSession): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearGoogleCalendarSession(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function translateGoogleCalendarError(err: unknown): string {
  if (err instanceof GoogleCalendarApiError) {
    if (err.status === 401) {
      return 'A sessão do Google Agenda expirou. Clique em "Conectar Google Agenda" para renovar.';
    }
    if (err.status === 403) {
      if (err.reason === 'accessNotConfigured' || err.message.includes('Calendar API has not been used')) {
        return 'A Google Calendar API ainda não foi ativada no Google Cloud Console deste projeto.';
      }
      return 'Permissão do Google Agenda negada ou insuficiente. Reconecte e marque a permissão de agenda.';
    }
    return err.message;
  }

  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code ?? '')
      : '';
  const msg = err instanceof Error ? err.message : String(err);

  if (code === 'auth/popup-closed-by-user' || msg.includes('USER_CANCELLED')) {
    return 'Conexão com o Google Agenda cancelada.';
  }
  if (code === 'auth/popup-blocked') {
    return 'O navegador bloqueou a janela de autorização do Google. Permita pop-ups e tente novamente.';
  }
  if (code === 'auth/user-mismatch') {
    return 'Selecione a mesma conta Google usada para entrar no Atelier.';
  }
  if (code === 'auth/credential-already-in-use' || code === 'auth/email-already-in-use') {
    return 'Essa conta Google já está vinculada a outro cadastro no Atelier. Entre diretamente com Google para sincronizar.';
  }
  if (msg.includes('GOOGLE_WEB_CLIENT_ID_MISSING')) {
    return 'Web Client ID do Google não configurado. Verifique VITE_GOOGLE_WEB_CLIENT_ID no .env.';
  }
  if (msg.includes('GOOGLE_ACCESS_TOKEN_MISSING')) {
    return 'Não foi possível obter o token de acesso do Google Agenda. Tente novamente autorizando a permissão de agenda.';
  }
  if (msg.includes('FIREBASE_AUTH_REQUIRED')) {
    return 'Conecte o Firebase e entre na sua conta para sincronizar com o Google Agenda.';
  }
  return msg;
}

export async function connectGoogleCalendar(auth: Auth | null): Promise<GoogleCalendarSession> {
  if (Capacitor.isNativePlatform()) {
    const webClientId = getGoogleWebClientId();
    if (!webClientId) {
      throw new Error('GOOGLE_WEB_CLIENT_ID_MISSING');
    }
    await ensureNativeGoogleInitialized(webClientId);
    const response = await SocialLogin.login({
      provider: 'google',
      options: {
        scopes: ['email', 'profile', GOOGLE_CALENDAR_SCOPE],
        forceRefreshToken: true,
      },
    });
    if (response.result.responseType !== 'online' || !response.result.accessToken?.token) {
      throw new Error('GOOGLE_ACCESS_TOKEN_MISSING');
    }
    const session: GoogleCalendarSession = {
      accessToken: response.result.accessToken.token,
      expiresAt: Date.now() + 50 * 60_000,
      email: response.result.profile.email ?? undefined,
    };
    saveGoogleCalendarSession(session);
    return session;
  }

  if (!auth) {
    throw new Error('FIREBASE_AUTH_REQUIRED');
  }

  const provider = new GoogleAuthProvider();
  provider.addScope(GOOGLE_CALENDAR_SCOPE);
  const customParams: Record<string, string> = { prompt: 'consent' };
  if (auth.currentUser?.email) {
    customParams.login_hint = auth.currentUser.email;
  }
  provider.setCustomParameters(customParams);

  let result;
  if (auth.currentUser) {
    const hasGoogleProvider = auth.currentUser.providerData.some(
      (p) => p.providerId === 'google.com'
    );
    if (hasGoogleProvider) {
      result = await reauthenticateWithPopup(auth.currentUser, provider);
    } else {
      result = await linkWithPopup(auth.currentUser, provider);
    }
  } else {
    result = await signInWithPopup(auth, provider);
  }

  const credential = GoogleAuthProvider.credentialFromResult(result);
  const accessToken = credential?.accessToken;
  if (!accessToken) {
    throw new Error('GOOGLE_ACCESS_TOKEN_MISSING');
  }

  const session: GoogleCalendarSession = {
    accessToken,
    expiresAt: Date.now() + 50 * 60_000,
    email: result.user.email ?? undefined,
  };
  saveGoogleCalendarSession(session);
  return session;
}

interface GoogleEventDateTime {
  date?: string;
  dateTime?: string;
  timeZone?: string;
}

interface GoogleCalendarEventResource {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  updated?: string;
  start?: GoogleEventDateTime;
  end?: GoogleEventDateTime;
  extendedProperties?: {
    private?: Record<string, string>;
  };
}

interface GoogleEventsListResponse {
  items?: GoogleCalendarEventResource[];
  nextPageToken?: string;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function getLocalTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
  } catch {
    return 'America/Sao_Paulo';
  }
}

function dateToLocalISO(dt: Date): string {
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}

function dateToLocalHHmm(dt: Date): string {
  return `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
}

function toLocalRFC3339(dt: Date): string {
  const offsetMin = -dt.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  const offH = pad2(Math.floor(abs / 60));
  const offM = pad2(abs % 60);
  return `${dateToLocalISO(dt)}T${dateToLocalHHmm(dt)}:00${sign}${offH}:${offM}`;
}

function addOneDayISO(dateISO: string): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const dt = new Date(y, m - 1, d + 1);
  return dateToLocalISO(dt);
}

function buildGooglePayload(ev: AgendaEvent): Record<string, unknown> {
  const timeZone = getLocalTimeZone();
  let start: GoogleEventDateTime;
  let end: GoogleEventDateTime;

  if (ev.allDay) {
    start = { date: ev.date };
    end = { date: addOneDayISO(ev.date) };
  } else {
    const [y, m, d] = ev.date.split('-').map(Number);
    const [sh, sm] = (ev.time || '09:00').split(':').map((n) => Number(n) || 0);
    const startDt = new Date(y, m - 1, d, sh, sm, 0);

    let endDt: Date;
    if (ev.endTime && /^\d{2}:\d{2}$/.test(ev.endTime)) {
      const [eh, em] = ev.endTime.split(':').map((n) => Number(n) || 0);
      endDt = new Date(y, m - 1, d, eh, em, 0);
      if (endDt.getTime() <= startDt.getTime()) {
        endDt = new Date(y, m - 1, d + 1, eh, em, 0);
      }
    } else {
      endDt = new Date(startDt.getTime() + 60 * 60_000);
    }

    start = { dateTime: toLocalRFC3339(startDt), timeZone };
    end = { dateTime: toLocalRFC3339(endDt), timeZone };
  }

  return {
    summary: ev.title,
    location: ev.location ?? '',
    description: ev.notes ?? '',
    start,
    end,
    extendedProperties: {
      private: {
        atelierId: ev.id,
        atelierCategory: ev.category,
      },
    },
  };
}

function parseCategoryFromGoogle(
  item: GoogleCalendarEventResource,
  existingCategory?: EventCategory
): { category: EventCategory; cleanTitle: string } {
  const rawTitle = (item.summary || 'Sem título').trim();
  const privateCat = item.extendedProperties?.private?.atelierCategory as EventCategory | undefined;
  if (privateCat && VALID_CATEGORIES.includes(privateCat)) {
    return { category: privateCat, cleanTitle: rawTitle };
  }

  const prefixMatch = rawTitle.match(/^\[(Faculdade|Estágio|Supervisão|Pessoal)\]\s*(.+)$/i);
  if (prefixMatch) {
    const matched = VALID_CATEGORIES.find(
      (c) => c.toLowerCase() === prefixMatch[1].toLowerCase()
    );
    if (matched) {
      return { category: matched, cleanTitle: prefixMatch[2].trim() || rawTitle };
    }
  }

  return { category: existingCategory ?? 'Pessoal', cleanTitle: rawTitle };
}

function parseGoogleEventToAgenda(
  item: GoogleCalendarEventResource,
  existing?: AgendaEvent
): Omit<AgendaEvent, 'id'> | null {
  if (!item.id || item.status === 'cancelled') return null;

  let date: string;
  let time: string;
  let endTime: string | undefined;
  let allDay = false;

  if (item.start?.dateTime) {
    const startDt = new Date(item.start.dateTime);
    if (Number.isNaN(startDt.getTime())) return null;
    date = dateToLocalISO(startDt);
    time = dateToLocalHHmm(startDt);
    if (item.end?.dateTime) {
      const endDt = new Date(item.end.dateTime);
      if (!Number.isNaN(endDt.getTime())) {
        endTime = dateToLocalHHmm(endDt);
      }
    }
  } else if (item.start?.date) {
    date = item.start.date.slice(0, 10);
    time = '00:00';
    allDay = true;
  } else {
    return null;
  }

  const { category, cleanTitle } = parseCategoryFromGoogle(item, existing?.category);

  return {
    title: cleanTitle,
    date,
    time,
    endTime,
    allDay: allDay || undefined,
    category,
    location: item.location?.trim() || undefined,
    notes: item.description?.trim() || undefined,
    googleEventId: item.id,
    googleHtmlLink: item.htmlLink || undefined,
    googleUpdated: item.updated || undefined,
    source: existing?.source ?? 'google',
  };
}

async function googleApiFetch<T>(
  url: string,
  accessToken: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  if (!res.ok) {
    const errObj =
      json && typeof json === 'object' && 'error' in json
        ? (json as { error?: { message?: string; errors?: Array<{ reason?: string }> } }).error
        : undefined;
    const message = errObj?.message || `Erro HTTP ${res.status} ao comunicar com o Google Agenda.`;
    const reason = errObj?.errors?.[0]?.reason;
    if (res.status === 401) {
      clearGoogleCalendarSession();
    }
    throw new GoogleCalendarApiError(message, res.status, reason);
  }

  return json as T;
}

export async function fetchGooglePrimaryEvents(
  accessToken: string,
  timeMinDateISO: string,
  timeMaxDateISO: string
): Promise<GoogleCalendarEventResource[]> {
  const [minY, minM, minD] = timeMinDateISO.split('-').map(Number);
  const [maxY, maxM, maxD] = timeMaxDateISO.split('-').map(Number);
  const timeMin = new Date(minY, minM - 1, minD, 0, 0, 0).toISOString();
  const timeMax = new Date(maxY, maxM - 1, maxD, 23, 59, 59).toISOString();

  const allItems: GoogleCalendarEventResource[] = [];
  let pageToken: string | undefined;
  let guard = 0;

  do {
    const params = new URLSearchParams({
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
      timeMin,
      timeMax,
    });
    if (pageToken) params.set('pageToken', pageToken);

    const data = await googleApiFetch<GoogleEventsListResponse>(
      `${GOOGLE_CALENDAR_API_BASE}?${params.toString()}`,
      accessToken
    );

    if (data.items) {
      allItems.push(...data.items);
    }
    pageToken = data.nextPageToken;
    guard += 1;
  } while (pageToken && guard < 10);

  return allItems;
}

export async function createGoogleEvent(
  accessToken: string,
  ev: AgendaEvent
): Promise<{ googleEventId: string; googleHtmlLink?: string; googleUpdated?: string }> {
  const created = await googleApiFetch<GoogleCalendarEventResource>(
    GOOGLE_CALENDAR_API_BASE,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify(buildGooglePayload(ev)),
    }
  );
  return {
    googleEventId: created.id,
    googleHtmlLink: created.htmlLink,
    googleUpdated: created.updated,
  };
}

export async function updateGoogleEvent(
  accessToken: string,
  googleEventId: string,
  ev: AgendaEvent
): Promise<{ googleHtmlLink?: string; googleUpdated?: string }> {
  const updated = await googleApiFetch<GoogleCalendarEventResource>(
    `${GOOGLE_CALENDAR_API_BASE}/${encodeURIComponent(googleEventId)}`,
    accessToken,
    {
      method: 'PATCH',
      body: JSON.stringify(buildGooglePayload(ev)),
    }
  );
  return {
    googleHtmlLink: updated.htmlLink,
    googleUpdated: updated.updated,
  };
}

export async function deleteGoogleEvent(
  accessToken: string,
  googleEventId: string
): Promise<void> {
  try {
    await googleApiFetch<void>(
      `${GOOGLE_CALENDAR_API_BASE}/${encodeURIComponent(googleEventId)}`,
      accessToken,
      { method: 'DELETE' }
    );
  } catch (err) {
    if (err instanceof GoogleCalendarApiError && (err.status === 404 || err.status === 410)) {
      return;
    }
    throw err;
  }
}

export async function syncWithGoogleCalendar(
  accessToken: string,
  localEvents: AgendaEvent[],
  createEventId: () => string
): Promise<GoogleSyncSummary> {
  const windowStart = addDaysISO(-60);
  const windowEnd = addDaysISO(180);

  const remoteItems = await fetchGooglePrimaryEvents(accessToken, windowStart, windowEnd);

  const localByGoogleId = new Map<string, AgendaEvent>();
  const localById = new Map<string, AgendaEvent>();
  for (const ev of localEvents) {
    localById.set(ev.id, ev);
    if (ev.googleEventId) {
      localByGoogleId.set(ev.googleEventId, ev);
    }
  }

  const matchedLocalIds = new Set<string>();
  const nextEvents: AgendaEvent[] = [];
  let pulledCount = 0;
  let updatedCount = 0;
  let pushedCount = 0;
  let removedCount = 0;

  // 1. Merge remote Google events into Atelier
  for (const item of remoteItems) {
    if (!item.id || item.status === 'cancelled') continue;

    const privateAtelierId = item.extendedProperties?.private?.atelierId;
    const existing =
      localByGoogleId.get(item.id) ??
      (privateAtelierId ? localById.get(privateAtelierId) : undefined);

    const parsed = parseGoogleEventToAgenda(item, existing);
    if (!parsed) continue;

    if (existing) {
      matchedLocalIds.add(existing.id);
      const changed =
        existing.title !== parsed.title ||
        existing.date !== parsed.date ||
        existing.time !== parsed.time ||
        existing.endTime !== parsed.endTime ||
        Boolean(existing.allDay) !== Boolean(parsed.allDay) ||
        (existing.location ?? '') !== (parsed.location ?? '') ||
        (existing.notes ?? '') !== (parsed.notes ?? '') ||
        existing.googleEventId !== parsed.googleEventId;
      if (changed) updatedCount += 1;
      nextEvents.push({
        ...existing,
        ...parsed,
        id: existing.id,
      });
    } else {
      pulledCount += 1;
      nextEvents.push({
        ...parsed,
        id: createEventId(),
        source: 'google',
      });
    }
  }

  // 2. Handle local events not present in the remote pull
  for (const ev of localEvents) {
    if (matchedLocalIds.has(ev.id)) continue;

    if (ev.googleEventId) {
      const inWindow = ev.date >= windowStart && ev.date <= windowEnd;
      if (inWindow) {
        // Deleted in Google Calendar inside the synced window
        removedCount += 1;
      } else {
        // Outside synced window: keep as-is
        nextEvents.push(ev);
      }
      continue;
    }

    // Local-only Atelier event without googleEventId -> push to Google Calendar
    const created = await createGoogleEvent(accessToken, ev);
    pushedCount += 1;
    nextEvents.push({
      ...ev,
      googleEventId: created.googleEventId,
      googleHtmlLink: created.googleHtmlLink,
      googleUpdated: created.googleUpdated,
      source: ev.source ?? 'atelier',
    });
  }

  return {
    events: nextEvents,
    pulledCount,
    updatedCount,
    pushedCount,
    removedCount,
  };
}
