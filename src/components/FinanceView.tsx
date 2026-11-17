import React, { useState } from 'react';
import {
  Wallet,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  Search,
  PieChart,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import type { Transaction, TransactionType } from '../types';
import { getTodayISO } from '../data/initialData';

interface FinanceViewProps {
  transactions: Transaction[];
  hideValues: boolean;
  monthlyBudget?: number;
  onUpdateMonthlyBudget: (budget: number) => void;
  onToggleHide: () => void;
  onAdd: (tx: Omit<Transaction, 'id'>) => void;
  onUpdate: (id: string, partial: Partial<Transaction>) => void;
  onDelete: (id: string) => void;
}

const CATEGORY_PRESETS = [
  'Estudos',
  'Livros & Materiais',
  'Transporte',
  'Alimentação',
  'Moradia',
  'Saúde & Terapia',
  'Lazer',
  'Bolsa / Estágio',
  'Atendimentos',
  'Outros',
];

const PAYMENT_METHODS = ['Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro', 'Boleto', 'Transferência'];

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export const FinanceView: React.FC<FinanceViewProps> = ({
  transactions,
  hideValues,
  monthlyBudget = 0,
  onUpdateMonthlyBudget,
  onToggleHide,
  onAdd,
  onUpdate,
  onDelete,
}) => {
  const today = getTodayISO();
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7));
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('saida');
  const [category, setCategory] = useState('Estudos');
  const [customCategory, setCustomCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Pix');
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState('');

  const [typeFilter, setTypeFilter] = useState<'todos' | TransactionType>('todos');
  const [search, setSearch] = useState('');
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(String(monthlyBudget || ''));

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');

  const monthTx = transactions
    .filter((t) => t.date.startsWith(selectedMonth))
    .sort((a, b) => b.date.localeCompare(a.date));

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

  const filteredTx = monthTx.filter((tx) => {
    if (typeFilter !== 'todos' && tx.type !== typeFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchTitle = tx.title.toLowerCase().includes(q);
      const matchCat = tx.category.toLowerCase().includes(q);
      const matchNotes = (tx.notes ?? '').toLowerCase().includes(q);
      if (!matchTitle && !matchCat && !matchNotes) return false;
    }
    return true;
  });

  // Agrupamento de saídas por categoria
  const expensesByCategory = monthTx
    .filter((t) => t.type === 'saida')
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});
  const categoryBreakdown = Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]);

  const budgetPct =
    monthlyBudget > 0 ? Math.min(100, Math.round((saidas / monthlyBudget) * 100)) : 0;
  const overBudget = monthlyBudget > 0 && saidas > monthlyBudget;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount.replace(',', '.'));
    if (!title.trim() || isNaN(num) || num <= 0) return;
    const finalCat =
      category === '__custom__' ? customCategory.trim() || 'Outros' : category || 'Outros';
    onAdd({
      title: title.trim(),
      amount: num,
      type,
      category: finalCat,
      date,
      paymentMethod,
      notes: notes.trim() || undefined,
    });
    setTitle('');
    setAmount('');
    setNotes('');
    setCustomCategory('');
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(budgetInput.replace(',', '.'));
    onUpdateMonthlyBudget(isNaN(val) || val < 0 ? 0 : val);
    setEditingBudget(false);
  };

  const startEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setEditTitle(tx.title);
    setEditAmount(String(tx.amount));
    setEditCategory(tx.category);
  };

  const saveEdit = (id: string) => {
    const num = Number(editAmount.replace(',', '.'));
    if (!editTitle.trim() || isNaN(num) || num <= 0) return;
    onUpdate(id, {
      title: editTitle.trim(),
      amount: num,
      category: editCategory.trim() || 'Outros',
    });
    setEditingId(null);
  };

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="date-eyebrow">Controle pessoal</p>
          <h1 className="page-title">Financeiro</h1>
          <p className="page-subtitle">
            Entradas, gastos por categoria, orçamento mensal e valores a receber.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="month"
            className="input"
            style={{ width: '165px' }}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
          <button className="btn btn-ghost" onClick={onToggleHide}>
            {hideValues ? <EyeOff size={16} /> : <Eye size={16} />}
            {hideValues ? 'Mostrar' : 'Ocultar'}
          </button>
        </div>
      </header>

      <div className="metrics-row" style={{ marginBottom: '20px' }}>
        <div className="card">
          <div className="metric-label">Saldo do mês</div>
          <div className={`metric-value ${hideValues ? 'blur-value' : ''}`}>
            {formatBRL(saldo)}
          </div>
        </div>
        <div className="card">
          <div className="metric-label">Entradas</div>
          <div
            className={`metric-value ${hideValues ? 'blur-value' : ''}`}
            style={{ color: 'var(--success)' }}
          >
            {formatBRL(entradas)}
          </div>
        </div>
        <div className="card">
          <div className="metric-label">Saídas</div>
          <div
            className={`metric-value ${hideValues ? 'blur-value' : ''}`}
            style={{ color: 'var(--danger)' }}
          >
            {formatBRL(saidas)}
          </div>
        </div>
        <div className="card">
          <div className="metric-label">A receber</div>
          <div
            className={`metric-value ${hideValues ? 'blur-value' : ''}`}
            style={{ color: 'var(--warning)' }}
          >
            {formatBRL(receber)}
          </div>
        </div>
      </div>

      {/* Orçamento Mensal & Gastos por Categoria */}
      <div className="dashboard-grid" style={{ marginBottom: '20px' }}>
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">
              <Wallet size={18} style={{ color: 'var(--accent)' }} />
              Meta de gastos do mês
            </h2>
            <button
              className="btn btn-ghost"
              style={{ padding: '5px 10px', fontSize: '0.76rem' }}
              onClick={() => {
                setBudgetInput(String(monthlyBudget || ''));
                setEditingBudget((v) => !v);
              }}
            >
              {editingBudget ? 'Fechar' : monthlyBudget > 0 ? 'Alterar meta' : 'Definir meta'}
            </button>
          </div>

          {editingBudget && (
            <form onSubmit={handleSaveBudget} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                className="input"
                placeholder="Ex: 1500"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">
                Salvar
              </button>
            </form>
          )}

          {monthlyBudget > 0 ? (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.84rem',
                  marginBottom: '8px',
                }}
              >
                <span className={hideValues ? 'blur-value' : ''}>
                  Gasto: <strong>{formatBRL(saidas)}</strong> de {formatBRL(monthlyBudget)}
                </span>
                <span
                  className={`pill ${overBudget ? 'pill-danger' : budgetPct > 80 ? 'pill-warning' : 'pill-success'}`}
                >
                  {budgetPct}%
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{
                    width: `${budgetPct}%`,
                    background: overBudget ? 'var(--danger)' : undefined,
                  }}
                />
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                {overBudget
                  ? `Você passou ${formatBRL(saidas - monthlyBudget)} da meta deste mês.`
                  : `Ainda restam ${formatBRL(monthlyBudget - saidas)} dentro da meta.`}
              </p>
            </div>
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Defina um teto mensal de gastos para acompanhar quanto ainda pode gastar no mês.
            </p>
          )}
        </section>

        <section className="card">
          <div className="card-header">
            <h2 className="card-title">
              <PieChart size={18} style={{ color: 'var(--accent)' }} />
              Saídas por categoria
            </h2>
          </div>

          {categoryBreakdown.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Nenhuma saída registrada neste mês ainda.
            </p>
          ) : (
            <div className="list-stack">
              {categoryBreakdown.slice(0, 5).map(([cat, total]) => {
                const pct = saidas > 0 ? Math.round((total / saidas) * 100) : 0;
                return (
                  <div key={cat}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.82rem',
                        marginBottom: '4px',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{cat}</span>
                      <span className={hideValues ? 'blur-value' : ''}>
                        {formatBRL(total)} ({pct}%)
                      </span>
                    </div>
                    <div className="progress-track" style={{ height: '6px' }}>
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Novo lançamento */}
      <section className="card" style={{ marginBottom: '20px' }}>
        <h2 className="card-title" style={{ marginBottom: '12px' }}>
          <Plus size={18} style={{ color: 'var(--accent)' }} />
          Novo lançamento
        </h2>
        <form onSubmit={handleSubmit} className="list-stack">
          <div className="form-grid">
            <input
              className="input"
              placeholder="Descrição (ex: Bolsa estágio, Livro...)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <input
              className="input"
              placeholder="Valor (R$)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <select
              className="select"
              value={type}
              onChange={(e) => setType(e.target.value as TransactionType)}
            >
              <option value="saida">Saída</option>
              <option value="entrada">Entrada</option>
              <option value="receber">A receber</option>
            </select>
            <select
              className="select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORY_PRESETS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="__custom__">Outra categoria...</option>
            </select>
          </div>

          <div className="form-grid">
            {category === '__custom__' && (
              <input
                className="input"
                placeholder="Nome da categoria"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                required
              />
            )}
            <select
              className="select"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              {PAYMENT_METHODS.map((pm) => (
                <option key={pm} value={pm}>
                  {pm}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <input
              className="input"
              placeholder="Observação (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">
              <Plus size={16} /> Registrar
            </button>
          </div>
        </form>
      </section>

      {/* Filtros + Lista */}
      <section className="card">
        <div className="card-header" style={{ flexWrap: 'wrap' }}>
          <h2 className="card-title">
            <Wallet size={18} style={{ color: 'var(--accent)' }} />
            Lançamentos ({filteredTx.length})
          </h2>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', minWidth: '190px' }}>
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
                placeholder="Buscar lançamento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {(
            [
              { id: 'todos', label: 'Todos' },
              { id: 'entrada', label: 'Entradas' },
              { id: 'saida', label: 'Saídas' },
              { id: 'receber', label: 'A receber' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              className={`btn ${typeFilter === f.id ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              onClick={() => setTypeFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filteredTx.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Nenhum lançamento encontrado neste filtro.
          </p>
        ) : (
          <div className="list-stack">
            {filteredTx.map((tx) => (
              <div key={tx.id} className="list-row" style={{ flexWrap: 'wrap' }}>
                {editingId === tx.id ? (
                  <div className="form-grid" style={{ width: '100%' }}>
                    <input
                      className="input"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                    <input
                      className="input"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                    />
                    <input
                      className="input"
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-primary" onClick={() => saveEdit(tx.id)}>
                        <Check size={15} /> Salvar
                      </button>
                      <button className="btn btn-ghost" onClick={() => setEditingId(null)}>
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ flex: 1, minWidth: '180px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{tx.title}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {tx.date.split('-').reverse().join('/')} · {tx.category}
                        {tx.paymentMethod ? ` · ${tx.paymentMethod}` : ''}
                      </div>
                      {tx.notes && (
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {tx.notes}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span
                        className={`pill ${
                          tx.type === 'entrada'
                            ? 'pill-success'
                            : tx.type === 'saida'
                            ? 'pill-danger'
                            : 'pill-warning'
                        } ${hideValues ? 'blur-value' : ''}`}
                      >
                        {tx.type === 'saida' ? '-' : '+'} {formatBRL(tx.amount)}
                      </span>
                      {tx.type === 'receber' && (
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '4px 9px', fontSize: '0.74rem' }}
                          onClick={() => onUpdate(tx.id, { type: 'entrada', date: today })}
                          title="Marcar como recebido"
                        >
                          <CheckCircle2 size={14} style={{ color: 'var(--success)' }} /> Recebido
                        </button>
                      )}
                      <button className="btn-icon" onClick={() => startEdit(tx)} title="Editar">
                        <Pencil size={15} />
                      </button>
                      <button className="btn-icon" onClick={() => onDelete(tx.id)} title="Excluir">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
