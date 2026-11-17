import React, { useState } from 'react';
import { Wallet, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import type { Transaction, TransactionType } from '../types';
import { getTodayISO } from '../data/initialData';

interface FinanceViewProps {
  transactions: Transaction[];
  hideValues: boolean;
  onToggleHide: () => void;
  onAdd: (tx: Omit<Transaction, 'id'>) => void;
  onDelete: (id: string) => void;
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export const FinanceView: React.FC<FinanceViewProps> = ({
  transactions,
  hideValues,
  onToggleHide,
  onAdd,
  onDelete,
}) => {
  const today = getTodayISO();
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7));
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('saida');
  const [category, setCategory] = useState('Estudos');
  const [date, setDate] = useState(today);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount.replace(',', '.'));
    if (!title.trim() || isNaN(num) || num <= 0) return;
    onAdd({
      title: title.trim(),
      amount: num,
      type,
      category: category.trim() || 'Geral',
      date,
    });
    setTitle('');
    setAmount('');
  };

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="date-eyebrow">Controle pessoal</p>
          <h1 className="page-title">Financeiro</h1>
          <p className="page-subtitle">Entradas, gastos com faculdade/rotina e valores a receber.</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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

      <section className="card" style={{ marginBottom: '20px' }}>
        <h2 className="card-title" style={{ marginBottom: '12px' }}>
          <Plus size={18} style={{ color: 'var(--accent)' }} />
          Novo lançamento
        </h2>
        <form onSubmit={handleSubmit} className="form-grid">
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
          <input
            className="input"
            placeholder="Categoria"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <input
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            <Plus size={16} /> Registrar
          </button>
        </form>
      </section>

      <section className="card">
        <div className="card-header">
          <h2 className="card-title">
            <Wallet size={18} style={{ color: 'var(--accent)' }} />
            Lançamentos ({monthTx.length})
          </h2>
        </div>

        {monthTx.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Nenhum lançamento registrado neste mês.
          </p>
        ) : (
          <div className="list-stack">
            {monthTx.map((tx) => (
              <div key={tx.id} className="list-row">
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{tx.title}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {tx.date.split('-').reverse().join('/')} · {tx.category}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                  <button className="btn-icon" onClick={() => onDelete(tx.id)} title="Excluir">
                    <Trash2 size={15} />
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
