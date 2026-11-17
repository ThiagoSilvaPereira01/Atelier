import React, { useState, useRef } from 'react';
import {
  Calendar,
  Plus,
  Trash2,
  MapPin,
  Clock,
  ExternalLink,
  Download,
  Upload,
} from 'lucide-react';
import type { AgendaEvent, EventCategory } from '../types';
import { getTodayISO } from '../data/initialData';

interface AgendaViewProps {
  events: AgendaEvent[];
  onAdd: (event: Omit<AgendaEvent, 'id'>) => void;
  onDelete: (id: string) => void;
}

const CATEGORIES: EventCategory[] = ['Faculdade', 'Estágio', 'Supervisão', 'Pessoal'];

function toGoogleCalendarUrl(ev: AgendaEvent): string {
  const dateCompact = ev.date.replaceAll('-', '');
  const [hh, mm] = (ev.time || '09:00').split(':').map((n) => Number(n) || 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  const startStr = `${dateCompact}T${pad(hh)}${pad(mm)}00`;
  const endHour = (hh + 1) % 24;
  const endStr = `${dateCompact}T${pad(endHour)}${pad(mm)}00`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `[${ev.category}] ${ev.title}`,
    dates: `${startStr}/${endStr}`,
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
    const dateCompact = ev.date.replaceAll('-', '');
    const [hh, mm] = (ev.time || '09:00').split(':').map((n) => Number(n) || 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    const start = `${dateCompact}T${pad(hh)}${pad(mm)}00`;
    const end = `${dateCompact}T${pad((hh + 1) % 24)}${pad(mm)}00`;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.id}@atelier.app`);
    lines.push(`DTSTART:${start}`);
    lines.push(`DTEND:${end}`);
    lines.push(`SUMMARY:[${ev.category}] ${ev.title}`);
    if (ev.location) lines.push(`LOCATION:${ev.location}`);
    if (ev.notes) lines.push(`DESCRIPTION:${ev.notes}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
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

    const summary = getField('SUMMARY');
    const dtstart = getField('DTSTART');
    if (!summary || dtstart.length < 8) continue;

    const year = dtstart.slice(0, 4);
    const month = dtstart.slice(4, 6);
    const day = dtstart.slice(6, 8);
    const date = `${year}-${month}-${day}`;

    let time = '09:00';
    const tMatch = dtstart.match(/T(\d{2})(\d{2})/);
    if (tMatch) {
      time = `${tMatch[1]}:${tMatch[2]}`;
    }

    const location = getField('LOCATION') || undefined;
    const notes = getField('DESCRIPTION') || undefined;

    imported.push({
      title: summary,
      date,
      time,
      category: 'Pessoal',
      location,
      notes,
    });
  }

  return imported;
}

export const AgendaView: React.FC<AgendaViewProps> = ({ events, onAdd, onDelete }) => {
  const [filter, setFilter] = useState<EventCategory | 'Todas'>('Todas');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(getTodayISO());
  const [time, setTime] = useState('14:00');
  const [category, setCategory] = useState<EventCategory>('Faculdade');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      date,
      time,
      category,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    setTitle('');
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
    for (const ev of parsed) {
      onAdd(ev);
    }
    setImportFeedback(
      parsed.length > 0
        ? `${parsed.length} evento(s) importado(s) para sua agenda!`
        : 'Nenhum evento válido encontrado no arquivo .ics.'
    );
    e.target.value = '';
    window.setTimeout(() => setImportFeedback(null), 4000);
  };

  const filtered = events
    .filter((ev) => filter === 'Todas' || ev.category === filter)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="date-eyebrow">Organização semanal</p>
          <h1 className="page-title">Agenda</h1>
          <p className="page-subtitle">
            Aulas, estágios, supervisões e integração rápida com o Google Agenda.
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

      {importFeedback && (
        <div
          className="pill pill-accent"
          style={{ marginBottom: '14px', padding: '8px 14px', borderRadius: '10px' }}
        >
          {importFeedback}
        </div>
      )}

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
              required
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
            Próximos eventos ({filtered.length})
          </h2>
        </div>

        {filtered.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Nenhum compromisso nessa categoria.
          </p>
        ) : (
          <div className="list-stack">
            {filtered.map((ev) => (
              <div key={ev.id} className="list-row" style={{ flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '190px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600 }}>{ev.title}</span>
                    <span className="pill pill-accent">{ev.category}</span>
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
                      <Clock size={13} /> {ev.date.split('-').reverse().join('/')} às {ev.time}
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
                    title="Abrir evento pronto no Google Agenda"
                  >
                    <ExternalLink size={13} /> Google Agenda
                  </a>
                  <button className="btn-icon" onClick={() => onDelete(ev.id)} title="Excluir">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
