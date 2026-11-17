import React, { useState } from 'react';
import { Target, Plus, Trash2 } from 'lucide-react';
import type { Goal, GoalArea } from '../types';

interface GoalsViewProps {
  goals: Goal[];
  onAdd: (goal: Omit<Goal, 'id'>) => void;
  onUpdateProgress: (id: string, progress: number) => void;
  onDelete: (id: string) => void;
}

const AREAS: GoalArea[] = ['Acadêmico', 'Estágio & Carreira', 'Pessoal', 'Financeiro'];

export const GoalsView: React.FC<GoalsViewProps> = ({
  goals,
  onAdd,
  onUpdateProgress,
  onDelete,
}) => {
  const [title, setTitle] = useState('');
  const [area, setArea] = useState<GoalArea>('Acadêmico');
  const [targetDate, setTargetDate] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      area,
      progress: 0,
      targetDate: targetDate || undefined,
      notes: notes.trim() || undefined,
    });
    setTitle('');
    setTargetDate('');
    setNotes('');
  };

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="date-eyebrow">Visão de futuro</p>
          <h1 className="page-title">Metas</h1>
          <p className="page-subtitle">Objetivos acadêmicos, de carreira, pessoais e financeiros.</p>
        </div>
      </header>

      <section className="card" style={{ marginBottom: '20px' }}>
        <h2 className="card-title" style={{ marginBottom: '12px' }}>
          <Plus size={18} style={{ color: 'var(--accent)' }} />
          Nova meta
        </h2>
        <form onSubmit={handleSubmit} className="list-stack">
          <div className="form-grid">
            <input
              className="input"
              placeholder="Qual é a meta?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <select
              className="select"
              value={area}
              onChange={(e) => setArea(e.target.value as GoalArea)}
            >
              {AREAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="input"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
          <div className="form-grid">
            <input
              className="input"
              placeholder="Detalhes ou próximos passos (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">
              <Plus size={16} /> Criar meta
            </button>
          </div>
        </form>
      </section>

      <div className="dashboard-grid">
        {goals.map((g) => (
          <section key={g.id} className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <Target size={18} style={{ color: 'var(--accent)' }} />
                <span className="pill pill-accent">{g.area}</span>
              </div>
              <button className="btn-icon" onClick={() => onDelete(g.id)} title="Excluir">
                <Trash2 size={15} />
              </button>
            </div>

            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '6px' }}>{g.title}</h3>
            {g.notes && (
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                {g.notes}
              </p>
            )}

            <div className="progress-track" style={{ marginBottom: '10px' }}>
              <div className="progress-fill" style={{ width: `${g.progress}%` }} />
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                Progresso: {g.progress}%
              </span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={g.progress}
                onChange={(e) => onUpdateProgress(g.id, Number(e.target.value))}
                style={{ accentColor: 'var(--accent)', flex: 1, maxWidth: '160px' }}
              />
            </div>

            {g.targetDate && (
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                Prazo alvo: {g.targetDate.split('-').reverse().join('/')}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
};
