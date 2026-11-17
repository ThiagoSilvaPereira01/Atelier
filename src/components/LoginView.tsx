import React, { useState } from 'react';
import { type Auth, updateProfile } from 'firebase/auth';
import { Mail, Lock, User as UserIcon, AlertCircle, Sparkles } from 'lucide-react';
import {
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  translateAuthError,
  setPendingRegistrationName,
  clearPendingRegistrationName,
} from '../lib/firebase';

interface LoginViewProps {
  auth: Auth | null;
}

export const LoginView: React.FC<LoginViewProps> = ({ auth }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await loginWithEmail(auth, email.trim(), password);
      } else {
        setPendingRegistrationName(name);
        const cred = await registerWithEmail(auth, email.trim(), password);
        if (name.trim()) {
          await updateProfile(cred.user, { displayName: name.trim() });
        }
      }
    } catch (err) {
      clearPendingRegistrationName();
      setError(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (!auth) return;
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle(auth);
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        backgroundColor: 'var(--bg-app)',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '32px 28px',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <span
            className="font-script"
            style={{ fontSize: '2.8rem', color: 'var(--accent)', lineHeight: 1 }}
          >
            Atelier
          </span>
          <div
            style={{
              fontSize: '0.68rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              fontWeight: 600,
              marginTop: '4px',
            }}
          >
            PSICOLOGIA & ROTINA
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '12px' }}>
            {mode === 'login'
              ? 'Entre na sua conta para acessar seu espaço.'
              : 'Crie sua conta para começar seu espaço do zero.'}
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px',
            background: 'var(--bg-card-soft)',
            padding: '4px',
            borderRadius: '12px',
            marginBottom: '20px',
          }}
        >
          <button
            type="button"
            className={`btn ${mode === 'login' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ border: 'none' }}
            onClick={() => {
              setMode('login');
              setError(null);
            }}
          >
            Entrar
          </button>
          <button
            type="button"
            className={`btn ${mode === 'register' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ border: 'none' }}
            onClick={() => {
              setMode('register');
              setError(null);
            }}
          >
            Criar conta
          </button>
        </div>

        {error && (
          <div
            className="pill pill-danger"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '10px',
              marginBottom: '14px',
              fontSize: '0.82rem',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="list-stack">
          {mode === 'register' && (
            <div style={{ position: 'relative' }}>
              <UserIcon
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                className="input"
                style={{ paddingLeft: '36px' }}
                placeholder="Seu nome (ex: Raquel)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <Mail
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="email"
              className="input"
              style={{ paddingLeft: '36px' }}
              placeholder="Seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="password"
              className="input"
              style={{ paddingLeft: '36px' }}
              placeholder="Sua senha (mín. 6 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '11px' }}
            disabled={loading}
          >
            <Sparkles size={16} />
            {loading
              ? 'Carregando...'
              : mode === 'login'
              ? 'Entrar no Atelier'
              : 'Criar minha conta'}
          </button>
        </form>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            margin: '18px 0',
            color: 'var(--text-muted)',
            fontSize: '0.78rem',
          }}
        >
          <span style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
          <span>ou</span>
          <span style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
        </div>

        <button
          type="button"
          className="btn btn-ghost"
          style={{ width: '100%', padding: '11px' }}
          onClick={handleGoogle}
          disabled={loading}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.9 1.5l2.7-2.6C16.9 3.3 14.7 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z"
            />
          </svg>
          Continuar com Google
        </button>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <a
            href="baixar/"
            style={{
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              textDecoration: 'underline',
            }}
          >
            Baixar aplicativo (.exe / .apk)
          </a>
        </div>
      </div>
    </div>
  );
};
