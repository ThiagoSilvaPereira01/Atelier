import React, { useState } from 'react';
import { Calendar, Plus, Trash2, MapPin, Clock } from 'lucide-react';
import type { AgendaEvent, EventCategory } from '../types';
import { getTodayISO } from '../data/initialData';

interface AgendaViewProps {
  events: AgendaEvent[];
  onAdd: (event: Omit<AgendaEvent, 'id'>) => void;
  onDelete: (id: string) => void;
}

const CATEGORIES: EventCategory[] = ['Faculdade', 'Estágio', 'Supervisão', 'Pessoal'];

export const AgendaView: React.FC<AgendaViewProps> = ({ events, onAdd, onDelete }) => {
  const [filter, setFilter] = useState<EventCategory | 'Todas'>('Todas');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(getTodayISO());
  const [time, setTime] = useState('14:00');
  const [category, setCategory] = useState<EventCategory>('Faculdade');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

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

  const filtered = events
    .filter((ev) => filter === 'Todas' || ev.category === filter)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="date-eyebrow">Organização semanal</p>
          <h1 className="page-title">Agenda</h1>
          <p className="page-subtitle">Aulas, estágios, supervisões e compromissos pessoais.</p>
        </div>
      </header>

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
              <Plus size={16} />
              Adicionar à agenda
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
              <div key={ev.id} className="list-row">
                <div>
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
                <button className="btn-icon" onClick={() => onDelete(ev.id)} title="Excluir">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
