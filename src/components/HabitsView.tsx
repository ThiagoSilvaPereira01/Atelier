import React, { useState } from 'react';
import { Flame, Plus, Trash2, Check } from 'lucide-react';
import type { Habit } from '../types';
import { addDaysISO } from '../data/initialData';

interface HabitsViewProps {
  habits: Habit[];
  onAdd: (habit: Omit<Habit, 'id' | 'completedDates'>) => void;
  onToggleDate: (habitId: string, dateISO: string) => void;
  onDelete: (id: string) => void;
}

function getLast7Days(): { iso: string; label: string }[] {
  const days: { iso: string; label: string }[] = [];
  for (let i = -6; i <= 0; i++) {
    const iso = addDaysISO(i);
    const [y, m, d] = iso.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })
      .format(dateObj)
      .replace('.', '')
      .slice(0, 3);
    days.push({ iso, label: `${weekday} ${d}` });
  }
  return days;
}

export const HabitsView: React.FC<HabitsViewProps> = ({
  habits,
  onAdd,
  onToggleDate,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('✨');
  const [target, setTarget] = useState(5);

  const days = getLast7Days();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      icon: icon.trim() || '✨',
      targetDaysPerWeek: Math.min(7, Math.max(1, target)),
    });
    setName('');
  };

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="date-eyebrow">Bem-estar & Constância</p>
          <h1 className="page-title">Hábitos</h1>
          <p className="page-subtitle">Acompanhe seus hábitos diários nos últimos 7 dias.</p>
        </div>
      </header>

      <section className="card" style={{ marginBottom: '20px' }}>
        <h2 className="card-title" style={{ marginBottom: '12px' }}>
          <Plus size={18} style={{ color: 'var(--accent)' }} />
          Novo hábito
        </h2>
        <form onSubmit={handleSubmit} className="form-grid">
          <input
            className="input"
            placeholder="Ex: Meditar 10 min, Ler artigo..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="input"
            placeholder="Emoji (ex: 🌿)"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
          />
          <select
            className="select"
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                Meta: {n}x por semana
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-primary">
            <Plus size={16} /> Adicionar
          </button>
        </form>
      </section>

      <div className="list-stack">
        {habits.map((h) => {
          const doneThisWeek = days.filter((d) => h.completedDates.includes(d.iso)).length;
          return (
            <section key={h.id} className="card">
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.3rem' }}>{h.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600 }}>{h.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {doneThisWeek} de {h.targetDaysPerWeek} dias na semana
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="pill pill-accent">
                    <Flame size={13} /> {h.completedDates.length} total
                  </span>
                  <button className="btn-icon" onClick={() => onDelete(h.id)} title="Excluir">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                  gap: '8px',
                }}
              >
                {days.map((d) => {
                  const checked = h.completedDates.includes(d.iso);
                  return (
                    <button
                      key={d.iso}
                      onClick={() => onToggleDate(h.id, d.iso)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '10px 4px',
                        borderRadius: '12px',
                        border: `1px solid ${checked ? 'var(--accent)' : 'var(--border-color)'}`,
                        background: checked ? 'var(--accent-soft)' : 'var(--bg-card-soft)',
                        color: checked ? 'var(--accent)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                      }}
                    >
                      <span>{d.label}</span>
                      <span
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '999px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: checked ? 'var(--accent)' : 'transparent',
                          color: checked ? 'var(--accent-text)' : 'var(--text-muted)',
                          border: checked ? 'none' : '1px solid var(--border-color)',
                        }}
                      >
                        {checked && <Check size={13} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
