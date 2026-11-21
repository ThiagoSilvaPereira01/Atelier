import React, { useState } from 'react';
import {
  CheckSquare,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Bell,
  Search,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import type { TaskItem, TaskCategory, TaskPriority } from '../types';
import { getTodayISO } from '../data/initialData';

interface TasksViewProps {
  tasks: TaskItem[];
  onAdd: (task: Omit<TaskItem, 'id'>) => void;
  onUpdate: (id: string, partial: Partial<TaskItem>) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const CATEGORIES: TaskCategory[] = ['Faculdade', 'Monitoria', 'Pessoal'];
const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Média' },
  { value: 'baixa', label: 'Baixa' },
];

type QuickFilter = 'todas' | 'hoje' | 'atrasadas' | 'lembretes' | 'alta';

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  onAdd,
  onUpdate,
  onToggle,
  onDelete,
}) => {
  const today = getTodayISO();
  const [filter, setFilter] = useState<'Todas' | TaskCategory>('Todas');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('todas');
  const [search, setSearch] = useState('');

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('Faculdade');
  const [priority, setPriority] = useState<TaskPriority>('media');
  const [dueDate, setDueDate] = useState(today);
  const [isReminder, setIsReminder] = useState(false);
  const [notes, setNotes] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState<TaskPriority>('media');
  const [editDueDate, setEditDueDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

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
      notes: notes.trim() || undefined,
    });
    setTitle('');
    setNotes('');
    setIsReminder(false);
  };

  const startEdit = (t: TaskItem) => {
    setEditingId(t.id);
    setEditTitle(t.title);
    setEditPriority(t.priority);
    setEditDueDate(t.dueDate ?? '');
    setEditNotes(t.notes ?? '');
  };

  const saveEdit = (id: string) => {
    if (!editTitle.trim()) return;
    onUpdate(id, {
      title: editTitle.trim(),
      priority: editPriority,
      dueDate: editDueDate || undefined,
      notes: editNotes.trim() || undefined,
    });
    setEditingId(null);
  };

  const filtered = tasks.filter((t) => {
    if (filter !== 'Todas' && t.category !== filter) return false;
    if (quickFilter === 'hoje' && t.dueDate !== today) return false;
    if (quickFilter === 'atrasadas' && (t.completed || !t.dueDate || t.dueDate >= today)) {
      return false;
    }
    if (quickFilter === 'lembretes' && !t.isReminder) return false;
    if (quickFilter === 'alta' && t.priority !== 'alta') return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (
        !t.title.toLowerCase().includes(q) &&
        !(t.notes ?? '').toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  const pending = filtered.filter((t) => !t.completed);
  const completed = filtered.filter((t) => t.completed);

  const totalCount = tasks.length;
  const doneCount = tasks.filter((t) => t.completed).length;
  const overdueCount = tasks.filter((t) => !t.completed && t.dueDate && t.dueDate < today).length;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="date-eyebrow">Produtividade</p>
          <h1 className="page-title">Tarefas & Lembretes</h1>
          <p className="page-subtitle">
            Entregas da faculdade, atividades de monitoria, prazos e afazeres do dia.
          </p>
        </div>

        {totalCount > 0 && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="pill pill-accent">
              {doneCount}/{totalCount} concluídas ({progressPct}%)
            </span>
            {overdueCount > 0 && (
              <span className="pill pill-danger">{overdueCount} atrasada(s)</span>
            )}
          </div>
        )}
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
          <input
            className="input"
            placeholder="Notas ou detalhes (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
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

      {/* Filtros */}
      <div className="list-stack" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {(['Todas', ...CATEGORIES] as const).map((cat) => (
            <button
              key={cat}
              className={`btn ${filter === cat ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(cat)}
            >
              {cat}
            </button>
          ))}
          <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              className="input"
              style={{ paddingLeft: '32px' }}
              placeholder="Buscar tarefa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(
            [
              { id: 'todas', label: 'Tudo' },
              { id: 'hoje', label: 'Para hoje' },
              { id: 'atrasadas', label: 'Atrasadas' },
              { id: 'lembretes', label: 'Lembretes' },
              { id: 'alta', label: 'Prioridade alta' },
            ] as const
          ).map((qf) => (
            <button
              key={qf.id}
              className={`btn ${quickFilter === qf.id ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '5px 11px', fontSize: '0.76rem' }}
              onClick={() => setQuickFilter(qf.id)}
            >
              {qf.label}
            </button>
          ))}
        </div>
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
            Nenhuma tarefa pendente neste filtro!
          </p>
        ) : (
          <div className="list-stack">
            {pending.map((t) => {
              const isOverdue = Boolean(t.dueDate && t.dueDate < today);
              return (
                <div key={t.id} className="list-row" style={{ flexWrap: 'wrap' }}>
                  {editingId === t.id ? (
                    <div className="list-stack" style={{ width: '100%' }}>
                      <div className="form-grid">
                        <input
                          className="input"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                        />
                        <select
                          className="select"
                          value={editPriority}
                          onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
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
                          value={editDueDate}
                          onChange={(e) => setEditDueDate(e.target.value)}
                        />
                      </div>
                      <input
                        className="input"
                        placeholder="Notas..."
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-primary" onClick={() => saveEdit(t.id)}>
                          <Check size={15} /> Salvar
                        </button>
                        <button className="btn btn-ghost" onClick={() => setEditingId(null)}>
                          <X size={15} /> Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          cursor: 'pointer',
                          flex: 1,
                          minWidth: '200px',
                        }}
                        onClick={() => onToggle(t.id)}
                      >
                        <Circle
                          size={18}
                          style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '2px' }}
                        />
                        <div>
                          <div style={{ fontWeight: 500, fontSize: '0.92rem' }}>
                            {t.isReminder && (
                              <Bell
                                size={13}
                                style={{
                                  color: 'var(--accent)',
                                  marginRight: '5px',
                                  verticalAlign: 'middle',
                                }}
                              />
                            )}
                            {t.title}
                          </div>
                          {t.notes && (
                            <div
                              style={{
                                fontSize: '0.78rem',
                                color: 'var(--text-secondary)',
                                marginTop: '2px',
                              }}
                            >
                              {t.notes}
                            </div>
                          )}
                          <div
                            style={{
                              display: 'flex',
                              gap: '6px',
                              marginTop: '5px',
                              flexWrap: 'wrap',
                              alignItems: 'center',
                            }}
                          >
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
                            {isOverdue && <span className="pill pill-danger">Atrasada</span>}
                            {t.dueDate && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                Prazo: {t.dueDate.split('-').reverse().join('/')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn-icon" onClick={() => startEdit(t)} title="Editar">
                          <Pencil size={15} />
                        </button>
                        <button className="btn-icon" onClick={() => onDelete(t.id)} title="Excluir">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
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
