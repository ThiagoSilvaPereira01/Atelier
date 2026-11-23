import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Trash2,
  MapPin,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Bell,
  RefreshCw,
  Cloud,
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
  googleAutoSync: boolean;
  onConnectGoogle: () => Promise<void>;
  onAutoSyncGoogle: () => Promise<void>;
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
  googleAutoSync,
  onConnectGoogle,
  onAutoSyncGoogle,
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

  useEffect(() => {
    if (googleConnected && googleAutoSync) {
      void onAutoSyncGoogle();
    }
  }, [googleConnected, googleAutoSync, onAutoSyncGoogle]);

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

        {!googleConnected && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={onConnectGoogle}
            disabled={googleSyncing}
          >
            <RefreshCw size={15} className={googleSyncing ? 'spin' : undefined} />
            {googleSyncing ? 'Sincronizando...' : 'Sincronizar com Google'}
          </button>
        )}
      </header>

      {googleError && (
        <div
          style={{
            marginBottom: '16px',
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
            const mobileDots = combinedItems.slice(0, 4);

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
                  combinedItems.length > 0 ? 'has-items' : '',
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

                {mobileDots.length > 0 && (
                  <div className="calendar-mobile-dots" aria-hidden="true">
                    {mobileDots.map((item) => (
                      <span
                        key={`${item.kind}-${item.id}`}
                        className={`calendar-dot ${item.kind}${
                          item.kind === 'task' && item.completed ? ' done' : ''
                        }`}
                      />
                    ))}
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
