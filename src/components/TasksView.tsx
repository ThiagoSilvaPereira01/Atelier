import React, { useState } from 'react';
import { CheckSquare, Plus, Trash2, CheckCircle2, Circle, Bell } from 'lucide-react';
import type { TaskItem, TaskCategory, TaskPriority } from '../types';
import { getTodayISO } from '../data/initialData';

interface TasksViewProps {
  tasks: TaskItem[];
  onAdd: (task: Omit<TaskItem, 'id'>) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const CATEGORIES: TaskCategory[] = ['Faculdade', 'Estágio', 'Pessoal'];
const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Média' },
  { value: 'baixa', label: 'Baixa' },
];

export const TasksView: React.FC<TasksViewProps> = ({ tasks, onAdd, onToggle, onDelete }) => {
  const [filter, setFilter] = useState<'Todas' | TaskCategory>('Todas');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('Faculdade');
  const [priority, setPriority] = useState<TaskPriority>('media');
  const [dueDate, setDueDate] = useState(getTodayISO());
  const [isReminder, setIsReminder] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      completed: false,
      category,
      priority,
      dueDate: dueDate || undefined,
      isReminder,
    });
    setTitle('');
    setIsReminder(false);
  };

  const filtered = tasks.filter((t) => filter === 'Todas' || t.category === filter);
  const pending = filtered.filter((t) => !t.completed);
  const completed = filtered.filter((t) => t.completed);

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="date-eyebrow">Produtividade</p>
          <h1 className="page-title">Tarefas & Lembretes</h1>
          <p className="page-subtitle">
            Entregas da faculdade, relatórios de estágio e afazeres do dia.
          </p>
        </div>
      </header>

      <section className="card" style={{ marginBottom: '20px' }}>
        <h2 className="card-title" style={{ marginBottom: '12px' }}>
          <Plus size={18} style={{ color: 'var(--accent)' }} />
          Nova tarefa ou lembrete
        </h2>
        <form onSubmit={handleSubmit} className="list-stack">
          <div className="form-grid">
            <input
              className="input"
              placeholder="O que precisa ser feito?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <select
              className="select"
              value={category}
              onChange={(e) => setCategory(e.target.value as TaskCategory)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              className="select"
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  Prioridade {p.label}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isReminder}
                onChange={(e) => setIsReminder(e.target.checked)}
              />
              <Bell size={15} style={{ color: 'var(--accent)' }} />
              Destacar como lembrete
            </label>
            <button type="submit" className="btn btn-primary">
              <Plus size={16} /> Adicionar
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

      <section className="card" style={{ marginBottom: '16px' }}>
        <div className="card-header">
          <h2 className="card-title">
            <CheckSquare size={18} style={{ color: 'var(--accent)' }} />
            Pendentes ({pending.length})
          </h2>
        </div>

        {pending.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Nenhuma tarefa pendente nessa categoria!
          </p>
        ) : (
          <div className="list-stack">
            {pending.map((t) => (
              <div key={t.id} className="list-row">
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}
                  onClick={() => onToggle(t.id)}
                >
                  <Circle size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.92rem' }}>
                      {t.isReminder && <Bell size={13} style={{ color: 'var(--accent)', marginRight: '5px', verticalAlign: 'middle' }} />}
                      {t.title}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                      <span className="pill pill-neutral">{t.category}</span>
                      <span
                        className={`pill ${
                          t.priority === 'alta'
                            ? 'pill-danger'
                            : t.priority === 'media'
                            ? 'pill-warning'
                            : 'pill-neutral'
                        }`}
                      >
                        {t.priority}
                      </span>
                      {t.dueDate && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Prazo: {t.dueDate.split('-').reverse().join('/')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button className="btn-icon" onClick={() => onDelete(t.id)} title="Excluir">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {completed.length > 0 && (
        <section className="card">
          <div className="card-header">
            <h2 className="card-title" style={{ color: 'var(--text-secondary)' }}>
              Concluídas ({completed.length})
            </h2>
          </div>
          <div className="list-stack">
            {completed.map((t) => (
              <div key={t.id} className="list-row" style={{ opacity: 0.72 }}>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}
                  onClick={() => onToggle(t.id)}
                >
                  <CheckCircle2 size={18} style={{ color: 'var(--success)', flexShrink: 0 }} />
                  <span style={{ textDecoration: 'line-through', fontSize: '0.9rem' }}>
                    {t.title}
                  </span>
                </div>
                <button className="btn-icon" onClick={() => onDelete(t.id)} title="Excluir">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
