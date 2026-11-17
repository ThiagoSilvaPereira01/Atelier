import React from 'react';
import {
  Calendar,
  Bell,
  Wallet,
  BookOpen,
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  Flame,
  ArrowRight,
} from 'lucide-react';
import type { AppData, TabId } from '../types';
import { getTodayISO } from '../data/initialData';

interface DashboardViewProps {
  data: AppData;
  onNavigate: (tab: TabId) => void;
  onToggleTask: (id: string) => void;
  onToggleHabitToday: (habitId: string, todayISO: string) => void;
  onToggleHideFinance: () => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function formatTodayHeader(): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  data,
  onNavigate,
  onToggleTask,
  onToggleHabitToday,
  onToggleHideFinance,
}) => {
  const today = getTodayISO();
  const todayEvents = data.events
    .filter((e) => e.date === today)
    .sort((a, b) => a.time.localeCompare(b.time));

  const pendingTasks = data.tasks.filter((t) => !t.completed).slice(0, 4);

  const currentMonth = today.slice(0, 7);
  const monthTx = data.transactions.filter((t) => t.date.startsWith(currentMonth));
  const entradas = monthTx
    .filter((t) => t.type === 'entrada')
    .reduce((acc, t) => acc + t.amount, 0);
  const saidas = monthTx
    .filter((t) => t.type === 'saida')
    .reduce((acc, t) => acc + t.amount, 0);
  const receber = monthTx
    .filter((t) => t.type === 'receber')
    .reduce((acc, t) => acc + t.amount, 0);
  const saldo = entradas - saidas;

  const hidden = data.settings.hideFinancialValues;
  const internshipPct = Math.min(
    100,
    Math.round(
      (data.settings.internshipHoursDone / Math.max(1, data.settings.internshipHoursTarget)) * 100
    )
  );

  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date());

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="date-eyebrow">{formatTodayHeader()}</p>
          <h1 className="page-title">
            {getGreeting()}, {data.settings.userName}
          </h1>
          <p className="page-subtitle">
            Seu resumo de Psicologia, rotina e finanças para hoje.
          </p>
        </div>

        <button className="btn btn-ghost" onClick={() => onNavigate('estudos')}>
          <BookOpen size={16} />
          Estágio: {data.settings.internshipHoursDone}h / {data.settings.internshipHoursTarget}h ({internshipPct}%)
        </button>
      </header>

      <div className="dashboard-grid">
        {/* Compromissos de hoje */}
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">
              <Calendar size={18} style={{ color: 'var(--accent)' }} />
              Agenda de hoje
            </h2>
            <button className="btn-icon" onClick={() => onNavigate('agenda')} title="Ver agenda">
              <ArrowRight size={16} />
            </button>
          </div>

          {todayEvents.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Nenhum compromisso marcado para hoje.
            </p>
          ) : (
            <div className="list-stack">
              {todayEvents.map((ev) => (
                <div key={ev.id} className="list-row">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{ev.title}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {ev.time} {ev.location ? `· ${ev.location}` : ''}
                    </div>
                  </div>
                  <span className="pill pill-accent">{ev.category}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Lembretes & Tarefas */}
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">
              <Bell size={18} style={{ color: 'var(--accent)' }} />
              Lembretes & Tarefas
            </h2>
            <button className="btn-icon" onClick={() => onNavigate('tarefas')} title="Ver tarefas">
              <ArrowRight size={16} />
            </button>
          </div>

          {pendingTasks.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Tudo em dia por aqui!
            </p>
          ) : (
            <div className="list-stack">
              {pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className="list-row"
                  style={{ cursor: 'pointer' }}
                  onClick={() => onToggleTask(task.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {task.completed ? (
                      <CheckCircle2 size={18} style={{ color: 'var(--success)', flexShrink: 0 }} />
                    ) : (
                      <Circle size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    )}
                    <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>{task.title}</span>
                  </div>
                  <span
                    className={`pill ${
                      task.priority === 'alta'
                        ? 'pill-danger'
                        : task.priority === 'media'
                        ? 'pill-warning'
                        : 'pill-neutral'
                    }`}
                  >
                    {task.category}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Financeiro do mês */}
        <section className="card span-2">
          <div className="card-header">
            <h2 className="card-title">
              <Wallet size={18} style={{ color: 'var(--accent)' }} />
              Financeiro · {monthLabel}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                className="btn-icon"
                onClick={onToggleHideFinance}
                title={hidden ? 'Mostrar valores' : 'Ocultar valores'}
              >
                {hidden ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button
                className="btn-icon"
                onClick={() => onNavigate('financeiro')}
                title="Abrir financeiro"
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          <div className="metrics-row">
            <div className="metric-box">
              <div className="metric-label">Saldo do mês</div>
              <div className={`metric-value ${hidden ? 'blur-value' : ''}`}>{formatBRL(saldo)}</div>
            </div>
            <div className="metric-box">
              <div className="metric-label">Entradas</div>
              <div
                className={`metric-value ${hidden ? 'blur-value' : ''}`}
                style={{ color: 'var(--success)' }}
              >
                {formatBRL(entradas)}
              </div>
            </div>
            <div className="metric-box">
              <div className="metric-label">Saídas</div>
              <div
                className={`metric-value ${hidden ? 'blur-value' : ''}`}
                style={{ color: 'var(--danger)' }}
              >
                {formatBRL(saidas)}
              </div>
            </div>
            <div className="metric-box">
              <div className="metric-label">A receber</div>
              <div
                className={`metric-value ${hidden ? 'blur-value' : ''}`}
                style={{ color: 'var(--warning)' }}
              >
                {formatBRL(receber)}
              </div>
            </div>
          </div>
        </section>

        {/* Hábitos de hoje */}
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">
              <Flame size={18} style={{ color: 'var(--accent)' }} />
              Hábitos de hoje
            </h2>
            <button className="btn-icon" onClick={() => onNavigate('habitos')} title="Ver hábitos">
              <ArrowRight size={16} />
            </button>
          </div>

          {data.habits.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Nenhum hábito cadastrado ainda. Adicione o primeiro na aba Hábitos.
            </p>
          ) : (
            <div className="list-stack">
              {data.habits.map((h) => {
                const done = h.completedDates.includes(today);
                return (
                  <div
                    key={h.id}
                    className="list-row"
                    style={{ cursor: 'pointer' }}
                    onClick={() => onToggleHabitToday(h.id, today)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span>{h.icon}</span>
                      <span
                        style={{
                          fontSize: '0.88rem',
                          fontWeight: 500,
                          textDecoration: done ? 'line-through' : 'none',
                          color: done ? 'var(--text-muted)' : 'var(--text-primary)',
                        }}
                      >
                        {h.name}
                      </span>
                    </div>
                    <span className={`pill ${done ? 'pill-success' : 'pill-neutral'}`}>
                      {done ? 'Feito' : 'Marcar'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Leituras & Provas */}
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">
              <BookOpen size={18} style={{ color: 'var(--accent)' }} />
              Estudos de Psicologia
            </h2>
            <button className="btn-icon" onClick={() => onNavigate('estudos')} title="Ver estudos">
              <ArrowRight size={16} />
            </button>
          </div>

          {data.readings.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Nenhuma leitura cadastrada ainda.
            </p>
          ) : (
            <div className="list-stack">
              {data.readings.slice(0, 3).map((r) => (
                <div key={r.id} className="list-row">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{r.title}</div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                      {r.author} · {r.course}
                    </div>
                  </div>
                  <span
                    className={`pill ${
                      r.status === 'Fichado'
                        ? 'pill-success'
                        : r.status === 'Lendo'
                        ? 'pill-warning'
                        : 'pill-neutral'
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
