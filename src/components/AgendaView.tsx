import React, { useState, useRef, useMemo } from 'react';
import {
  Calendar,
  Plus,
  Trash2,
  MapPin,
  Clock,
  ExternalLink,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Bell,
  RefreshCw,
  Cloud,
  CloudOff,
  Pencil,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import type { AgendaEvent, EventCategory, TaskItem } from '../types';
import { getTodayISO } from '../data/initialData';

interface AgendaViewProps {
  events: AgendaEvent[];
  tasks: TaskItem[];
  onAdd: (event: Omit<AgendaEvent, 'id'>) => void;
  onUpdate: (id: string, partial: Partial<AgendaEvent>) => void;
  onDelete: (id: string) => void;
  onToggleTask: (id: string) => void;
  googleConnected: boolean;
  googleSyncing: boolean;
  googleError: string | null;
  googleMessage: string | null;
  googleLastSyncAt?: string;
  googleEmail?: string;
  onConnectGoogle: () => Promise<void>;
  onSyncGoogle: () => Promise<void>;
  onDisconnectGoogle: () => void;
}

const CATEGORIES: EventCategory[] = ['Faculdade', 'Estágio', 'Supervisão', 'Pessoal'];
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface CalendarCell {
  iso: string;
  day: number;
  inMonth: boolean;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toISODate(year: number, monthIndex: number, day: number): string {
  const d = new Date(year, monthIndex, day);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function buildMonthGrid(year: number, monthIndex: number): CalendarCell[] {
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const totalNeeded = firstWeekday + daysInMonth;
  const totalCells = Math.ceil(totalNeeded / 7) * 7;

  const cells: CalendarCell[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayOffset = i - firstWeekday + 1;
    const d = new Date(year, monthIndex, dayOffset);
    cells.push({
      iso: toISODate(d.getFullYear(), d.getMonth(), d.getDate()),
      day: d.getDate(),
      inMonth: d.getMonth() === monthIndex && d.getFullYear() === year,
    });
  }
  return cells;
}

function formatLongDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(dt);
}

function formatSyncTimestamp(iso?: string): string | null {
  if (!iso) return null;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return null;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dt);
}

function formatEventTimeLabel(ev: AgendaEvent, showDate?: boolean): string {
  const datePrefix = showDate ? `${ev.date.split('-').reverse().join('/')} · ` : '';
  if (ev.allDay) {
    return `${datePrefix}Dia inteiro`;
  }
  const timeRange = ev.endTime ? `${ev.time} – ${ev.endTime}` : ev.time;
  return showDate ? `${ev.date.split('-').reverse().join('/')} às ${timeRange}` : timeRange;
}

function computeStartEndCompact(ev: AgendaEvent): { start: string; end: string; allDay: boolean } {
  const [y, m, d] = ev.date.split('-').map(Number);
  if (ev.allDay) {
    const start = `${y}${pad2(m)}${pad2(d)}`;
    const next = new Date(y, m - 1, d + 1);
    const end = `${next.getFullYear()}${pad2(next.getMonth() + 1)}${pad2(next.getDate())}`;
    return { start, end, allDay: true };
  }

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

  const fmt = (dt: Date) =>
    `${dt.getFullYear()}${pad2(dt.getMonth() + 1)}${pad2(dt.getDate())}T${pad2(dt.getHours())}${pad2(dt.getMinutes())}00`;
  return { start: fmt(startDt), end: fmt(endDt), allDay: false };
}

function toGoogleCalendarUrl(ev: AgendaEvent): string {
  if (ev.googleHtmlLink) return ev.googleHtmlLink;

  const { start, end } = computeStartEndCompact(ev);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: `${start}/${end}`,
  });
  if (ev.location) params.set('location', ev.location);
  if (ev.notes) params.set('details', ev.notes);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildIcsContent(events: AgendaEvent[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Atelier//Psicologia & Rotina//PT',
  ];
  for (const ev of events) {
    const { start, end, allDay } = computeStartEndCompact(ev);
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.googleEventId || ev.id}@atelier.app`);
    if (allDay) {
      lines.push(`DTSTART;VALUE=DATE:${start}`);
      lines.push(`DTEND;VALUE=DATE:${end}`);
    } else {
      lines.push(`DTSTART:${start}`);
      lines.push(`DTEND:${end}`);
    }
    lines.push(`SUMMARY:[${ev.category}] ${ev.title}`);
    if (ev.location) lines.push(`LOCATION:${ev.location}`);
    if (ev.notes) lines.push(`DESCRIPTION:${ev.notes}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function parseIcsDateTime(raw: string): { date: string; time: string; allDay: boolean } | null {
  if (raw.length < 8) return null;
  const y = Number(raw.slice(0, 4));
  const m = Number(raw.slice(4, 6));
  const d = Number(raw.slice(6, 8));
  if (!y || !m || !d) return null;

  const tMatch = raw.match(/T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!tMatch) {
    return { date: `${y}-${pad2(m)}-${pad2(d)}`, time: '00:00', allDay: true };
  }

  const hh = Number(tMatch[1]);
  const mm = Number(tMatch[2]);
  const isUtc = Boolean(tMatch[4]);

  if (isUtc) {
    const dt = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
    return {
      date: `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`,
      time: `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`,
      allDay: false,
    };
  }

  return {
    date: `${y}-${pad2(m)}-${pad2(d)}`,
    time: `${pad2(hh)}:${pad2(mm)}`,
    allDay: false,
  };
}

function parseIcsEvents(content: string): Omit<AgendaEvent, 'id'>[] {
  const normalized = content.replace(/\r?\n[ \t]/g, '');
  const blocks = normalized.split('BEGIN:VEVENT').slice(1);
  const imported: Omit<AgendaEvent, 'id'>[] = [];

  for (const block of blocks) {
    const body = block.split('END:VEVENT')[0] || '';
    const getField = (name: string): string => {
      const regex = new RegExp(`^${name}(?:;[^:]*)?:(.*)$`, 'm');
      const match = body.match(regex);
      return match ? match[1].trim() : '';
    };

    const rawSummary = getField('SUMMARY');
    const dtstart = getField('DTSTART');
    const dtend = getField('DTEND');
    if (!rawSummary || dtstart.length < 8) continue;

    const parsedStart = parseIcsDateTime(dtstart);
    if (!parsedStart) continue;
    const parsedEnd = dtend ? parseIcsDateTime(dtend) : null;

    let category: EventCategory = 'Pessoal';
    let title = rawSummary;
    const catMatch = rawSummary.match(/^\[(Faculdade|Estágio|Supervisão|Pessoal)\]\s*(.+)$/i);
    if (catMatch) {
      const found = CATEGORIES.find((c) => c.toLowerCase() === catMatch[1].toLowerCase());
      if (found) {
        category = found;
        title = catMatch[2].trim() || rawSummary;
      }
    }

    const location = getField('LOCATION') || undefined;
    const notes = getField('DESCRIPTION') || undefined;

    imported.push({
      title,
      date: parsedStart.date,
      time: parsedStart.time,
      endTime: !parsedStart.allDay && parsedEnd && !parsedEnd.allDay ? parsedEnd.time : undefined,
      allDay: parsedStart.allDay || undefined,
      category,
      location,
      notes,
      source: 'atelier',
    });
  }

  return imported;
}

function EventRow({
  ev,
  showDate,
  onUpdate,
  onDelete,
}: {
  ev: AgendaEvent;
  showDate?: boolean;
  onUpdate: (id: string, partial: Partial<AgendaEvent>) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(ev.title);
  const [editDate, setEditDate] = useState(ev.date);
  const [editTime, setEditTime] = useState(ev.time);
  const [editEndTime, setEditEndTime] = useState(ev.endTime ?? '');
  const [editCategory, setEditCategory] = useState<EventCategory>(ev.category);
  const [editLocation, setEditLocation] = useState(ev.location ?? '');
  const [editNotes, setEditNotes] = useState(ev.notes ?? '');

  const startEdit = () => {
    setEditTitle(ev.title);
    setEditDate(ev.date);
    setEditTime(ev.time);
    setEditEndTime(ev.endTime ?? '');
    setEditCategory(ev.category);
    setEditLocation(ev.location ?? '');
    setEditNotes(ev.notes ?? '');
    setEditing(true);
  };

  const saveEdit = () => {
    if (!editTitle.trim() || !editDate) return;
    onUpdate(ev.id, {
      title: editTitle.trim(),
      date: editDate,
      time: ev.allDay ? '00:00' : editTime || '09:00',
      endTime: ev.allDay ? undefined : editEndTime || undefined,
      category: editCategory,
      location: editLocation.trim() || undefined,
      notes: editNotes.trim() || undefined,
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <div
        style={{
          background: 'var(--bg-card-soft)',
          padding: '12px',
          borderRadius: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div className="form-grid">
          <input
            className="input"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Título"
          />
          <input
            type="date"
            className="input"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
          />
          {!ev.allDay && (
            <>
              <input
                type="time"
                className="input"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
              />
              <input
                type="time"
                className="input"
                value={editEndTime}
                onChange={(e) => setEditEndTime(e.target.value)}
                title="Horário de término (opcional)"
              />
            </>
          )}
          <select
            className="select"
            value={editCategory}
            onChange={(e) => setEditCategory(e.target.value as EventCategory)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="form-grid">
          <input
            className="input"
            value={editLocation}
            onChange={(e) => setEditLocation(e.target.value)}
            placeholder="Local ou link (opcional)"
          />
          <input
            className="input"
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            placeholder="Observações (opcional)"
          />
          <div style={{ display: 'flex', gap: '6px' }}>
            <button type="button" className="btn btn-primary" onClick={saveEdit}>
              <Check size={15} /> Salvar
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>
              <X size={15} /> Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="list-row" style={{ flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: '190px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600 }}>{ev.title}</span>
          <span className="pill pill-accent">{ev.category}</span>
          {ev.googleEventId && (
            <span className="pill pill-success" title="Sincronizado com o Google Agenda">
              <Cloud size={11} /> Google
            </span>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            gap: '14px',
            flexWrap: 'wrap',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            marginTop: '4px',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={13} /> {formatEventTimeLabel(ev, showDate)}
          </span>
          {ev.location && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={13} /> {ev.location}
            </span>
          )}
        </div>
        {ev.notes && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {ev.notes}
          </p>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <a
          href={toGoogleCalendarUrl(ev)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost"
          style={{ padding: '5px 10px', fontSize: '0.74rem', textDecoration: 'none' }}
          title={
            ev.googleHtmlLink
              ? 'Abrir este evento no Google Agenda'
              : 'Abrir evento pronto no Google Agenda'
          }
        >
          <ExternalLink size={13} /> Google Agenda
        </a>
        <button className="btn-icon" onClick={startEdit} title="Editar">
          <Pencil size={15} />
        </button>
        <button className="btn-icon" onClick={() => onDelete(ev.id)} title="Excluir">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

export const AgendaView: React.FC<AgendaViewProps> = ({
  events,
  tasks,
  onAdd,
  onUpdate,
  onDelete,
  onToggleTask,
  googleConnected,
  googleSyncing,
  googleError,
  googleMessage,
  googleLastSyncAt,
  googleEmail,
  onConnectGoogle,
  onSyncGoogle,
  onDisconnectGoogle,
}) => {
  const todayISO = getTodayISO();
  const [todayYear, todayMonth] = todayISO.split('-').map(Number);

  const [viewYear, setViewYear] = useState(todayYear);
  const [viewMonth, setViewMonth] = useState(todayMonth - 1); // 0-indexed
  const [selectedDate, setSelectedDate] = useState(todayISO);

  const [filter, setFilter] = useState<EventCategory | 'Todas'>('Todas');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayISO);
  const [time, setTime] = useState('14:00');
  const [endTime, setEndTime] = useState('');
  const [category, setCategory] = useState<EventCategory>('Faculdade');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('pt-BR', {
        month: 'long',
        year: 'numeric',
      }).format(new Date(viewYear, viewMonth, 1)),
    [viewYear, viewMonth]
  );

  const calendarCells = useMemo(
    () => buildMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();
    for (const ev of events) {
      if (filter !== 'Todas' && ev.category !== filter) continue;
      const list = map.get(ev.date) ?? [];
      list.push(ev);
      map.set(ev.date, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.time.localeCompare(b.time));
    }
    return map;
  }, [events, filter]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskItem[]>();
    for (const t of tasks) {
      if (!t.dueDate) continue;
      const list = map.get(t.dueDate) ?? [];
      list.push(t);
      map.set(t.dueDate, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => Number(a.completed) - Number(b.completed));
    }
    return map;
  }, [tasks]);

  const selectedEvents = eventsByDate.get(selectedDate) ?? [];
  const selectedTasks = tasksByDate.get(selectedDate) ?? [];
  const lastSyncLabel = formatSyncTimestamp(googleLastSyncAt);

  const handleSelectDay = (cell: CalendarCell) => {
    setSelectedDate(cell.iso);
    setDate(cell.iso);
    if (!cell.inMonth) {
      const [y, m] = cell.iso.split('-').map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    }
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    setViewYear(todayYear);
    setViewMonth(todayMonth - 1);
    setSelectedDate(todayISO);
    setDate(todayISO);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      date,
      time,
      endTime: endTime || undefined,
      category,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      source: 'atelier',
    });
    setSelectedDate(date);
    setTitle('');
    setEndTime('');
    setLocation('');
    setNotes('');
  };

  const handleExportIcs = () => {
    const ics = buildIcsContent(events);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'atelier-agenda.ics';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportIcs = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseIcsEvents(text);

    const existingKeys = new Set(
      events.map((ev) => `${ev.date}|${ev.time}|${ev.title.trim().toLowerCase()}`)
    );
    let addedCount = 0;
    let skippedCount = 0;

    for (const ev of parsed) {
      const key = `${ev.date}|${ev.time}|${ev.title.trim().toLowerCase()}`;
      if (existingKeys.has(key)) {
        skippedCount += 1;
        continue;
      }
      existingKeys.add(key);
      onAdd(ev);
      addedCount += 1;
    }

    setImportFeedback(
      addedCount > 0
        ? `${addedCount} evento(s) importado(s)${skippedCount > 0 ? ` (${skippedCount} duplicado(s) ignorado(s))` : ''}!`
        : skippedCount > 0
        ? `Todos os ${skippedCount} evento(s) do arquivo já estavam na agenda.`
        : 'Nenhum evento válido encontrado no arquivo .ics.'
    );
    e.target.value = '';
    window.setTimeout(() => setImportFeedback(null), 4500);
  };

  const filtered = events
    .filter((ev) => filter === 'Todas' || ev.category === filter)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="date-eyebrow">Calendário & Compromissos</p>
          <h1 className="page-title">Agenda</h1>
          <p className="page-subtitle">
            Visualize os dias do mês com seus compromissos e tarefas em um só lugar.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".ics,text/calendar"
            style={{ display: 'none' }}
            onChange={handleImportIcs}
          />
          <button
            className="btn btn-ghost"
            onClick={() => fileInputRef.current?.click()}
            title="Importar arquivo .ics exportado do Google Agenda"
          >
            <Upload size={15} /> Importar .ics
          </button>
          <button
            className="btn btn-ghost"
            onClick={handleExportIcs}
            disabled={events.length === 0}
            title="Baixar arquivo .ics para importar no Google Agenda"
          >
            <Download size={15} /> Exportar .ics
          </button>
        </div>
      </header>

      {/* Sincronização com Google Agenda */}
      <section className="card" style={{ marginBottom: '20px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <Cloud size={18} style={{ color: 'var(--accent)' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, fontSize: '0.94rem' }}>
                  Sincronização com Google Agenda
                </span>
                <span className={`pill ${googleConnected ? 'pill-success' : 'pill-neutral'}`}>
                  {googleConnected ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {googleConnected
                  ? `Agenda principal${googleEmail ? ` (${googleEmail})` : ''}${
                      lastSyncLabel ? ` · Última sincronização: ${lastSyncLabel}` : ''
                    }`
                  : lastSyncLabel
                  ? `Última sincronização: ${lastSyncLabel} · Reconecte para sincronizar automaticamente.`
                  : 'Conecte sua conta Google para sincronizar sua agenda principal nos dois sentidos.'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {googleConnected ? (
              <>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onSyncGoogle}
                  disabled={googleSyncing}
                >
                  <RefreshCw size={15} className={googleSyncing ? 'spin' : undefined} />
                  {googleSyncing ? 'Sincronizando...' : 'Sincronizar agora'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={onDisconnectGoogle}
                  disabled={googleSyncing}
                  title="Encerrar sessão do Google Agenda"
                >
                  <CloudOff size={15} /> Desconectar
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={onConnectGoogle}
                disabled={googleSyncing}
              >
                <RefreshCw size={15} className={googleSyncing ? 'spin' : undefined} />
                {googleSyncing ? 'Conectando...' : 'Conectar Google Agenda'}
              </button>
            )}
          </div>
        </div>

        {googleMessage && (
          <div
            className="pill pill-success"
            style={{ marginTop: '12px', padding: '7px 12px', borderRadius: '10px' }}
          >
            {googleMessage}
          </div>
        )}

        {googleError && (
          <div
            style={{
              marginTop: '12px',
              padding: '10px 12px',
              borderRadius: '10px',
              background: 'var(--danger-soft)',
              color: 'var(--danger)',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{googleError}</span>
          </div>
        )}
      </section>

      {importFeedback && (
        <div
          className="pill pill-accent"
          style={{ marginBottom: '14px', padding: '8px 14px', borderRadius: '10px' }}
        >
          {importFeedback}
        </div>
      )}

      {/* Calendário Mensal */}
      <section className="card" style={{ marginBottom: '20px' }}>
        <div className="calendar-header-bar">
          <div className="calendar-nav">
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: '6px 10px' }}
              onClick={handlePrevMonth}
              aria-label="Mês anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <h2 className="calendar-month-title">{monthLabel}</h2>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: '6px 10px' }}
              onClick={handleNextMonth}
              aria-label="Próximo mês"
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: '6px 12px', fontSize: '0.78rem' }}
              onClick={handleGoToday}
            >
              Hoje
            </button>
          </div>

          <div className="calendar-legend">
            <span className="calendar-legend-item">
              <span className="calendar-dot event" /> Compromissos
            </span>
            <span className="calendar-legend-item">
              <span className="calendar-dot task" /> Tarefas do dia
            </span>
          </div>
        </div>

        <div className="calendar-weekdays">
          {WEEKDAYS.map((wd) => (
            <div key={wd} className="calendar-weekday">
              {wd}
            </div>
          ))}
        </div>

        <div className="calendar-grid">
          {calendarCells.map((cell) => {
            const dayEvents = eventsByDate.get(cell.iso) ?? [];
            const dayTasks = tasksByDate.get(cell.iso) ?? [];
            const isToday = cell.iso === todayISO;
            const isSelected = cell.iso === selectedDate;

            const combinedItems: Array<
              | { kind: 'event'; id: string; label: string }
              | { kind: 'task'; id: string; label: string; completed: boolean }
            > = [
              ...dayEvents.map((ev) => ({
                kind: 'event' as const,
                id: ev.id,
                label: ev.allDay ? ev.title : `${ev.time} ${ev.title}`,
              })),
              ...dayTasks.map((t) => ({
                kind: 'task' as const,
                id: t.id,
                label: t.title,
                completed: t.completed,
              })),
            ];

            const visibleItems = combinedItems.slice(0, 3);
            const extraCount = combinedItems.length - visibleItems.length;

            return (
              <button
                key={cell.iso}
                type="button"
                onClick={() => handleSelectDay(cell)}
                className={[
                  'calendar-cell',
                  !cell.inMonth ? 'outside' : '',
                  isToday ? 'today' : '',
                  isSelected ? 'selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="calendar-cell-top">
                  <span className="calendar-day-num">{cell.day}</span>
                </div>

                {visibleItems.length > 0 && (
                  <div className="calendar-items">
                    {visibleItems.map((item) => (
                      <div
                        key={`${item.kind}-${item.id}`}
                        className={`calendar-chip ${item.kind} ${
                          item.kind === 'task' && item.completed ? 'done' : ''
                        }`}
                        title={item.label}
                      >
                        {item.label}
                      </div>
                    ))}
                    {extraCount > 0 && (
                      <span className="calendar-more">+{extraCount} mais</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Detalhes do dia selecionado */}
      <section className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <h2 className="card-title" style={{ textTransform: 'capitalize' }}>
            <Calendar size={18} style={{ color: 'var(--accent)' }} />
            {formatLongDate(selectedDate)}
          </h2>
          <span className="pill pill-neutral">
            {selectedEvents.length} compromisso(s) · {selectedTasks.length} tarefa(s)
          </span>
        </div>

        {selectedEvents.length === 0 && selectedTasks.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Nenhum compromisso ou tarefa agendada para este dia.
          </p>
        ) : (
          <div className="list-stack">
            {selectedEvents.map((ev) => (
              <EventRow key={ev.id} ev={ev} onUpdate={onUpdate} onDelete={onDelete} />
            ))}

            {selectedTasks.map((t) => (
              <div key={t.id} className="list-row" style={{ flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => onToggleTask(t.id)}
                  aria-label={t.completed ? 'Desmarcar tarefa' : 'Concluir tarefa'}
                  style={{ color: t.completed ? 'var(--success)' : 'var(--text-muted)' }}
                >
                  {t.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                </button>
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontWeight: 600,
                        textDecoration: t.completed ? 'line-through' : 'none',
                        opacity: t.completed ? 0.65 : 1,
                      }}
                    >
                      {t.title}
                    </span>
                    <span className="pill pill-success">Tarefa</span>
                    <span className="pill pill-neutral">{t.category}</span>
                    {t.isReminder && (
                      <span className="pill pill-warning">
                        <Bell size={11} /> Lembrete
                      </span>
                    )}
                  </div>
                  {t.notes && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {t.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Novo compromisso */}
      <section className="card" style={{ marginBottom: '20px' }}>
        <h2 className="card-title" style={{ marginBottom: '12px' }}>
          <Plus size={18} style={{ color: 'var(--accent)' }} />
          Novo compromisso
        </h2>
        <form onSubmit={handleSubmit} className="list-stack">
          <div className="form-grid">
            <input
              className="input"
              placeholder="Ex: Supervisão clínica, Aula de Neuro..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <input
              type="time"
              className="input"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              title="Horário de início"
              required
            />
            <input
              type="time"
              className="input"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              title="Horário de término (opcional)"
            />
            <select
              className="select"
              value={category}
              onChange={(e) => setCategory(e.target.value as EventCategory)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="form-grid">
            <input
              className="input"
              placeholder="Local ou link (opcional)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <input
              className="input"
              placeholder="Observações (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">
              <Plus size={16} /> Adicionar à agenda
            </button>
          </div>
        </form>
      </section>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {(['Todas', ...CATEGORIES] as const).map((cat) => (
          <button
            key={cat}
            className={`btn ${filter === cat ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <section className="card">
        <div className="card-header">
          <h2 className="card-title">
            <Calendar size={18} style={{ color: 'var(--accent)' }} />
            Todos os compromissos ({filtered.length})
          </h2>
        </div>

        {filtered.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Nenhum compromisso nessa categoria.
          </p>
        ) : (
          <div className="list-stack">
            {filtered.map((ev) => (
              <EventRow key={ev.id} ev={ev} showDate onUpdate={onUpdate} onDelete={onDelete} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
