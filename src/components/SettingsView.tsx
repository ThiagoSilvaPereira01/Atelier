import React, { useState } from 'react';
import type { Auth, User } from 'firebase/auth';
import {
  Palette,
  Cloud,
  LogOut,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { AppSettings, FirebaseConfig, ThemeMode } from '../types';
import {
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  logoutFirebase,
} from '../lib/firebase';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
  firebaseConfig: FirebaseConfig | null;
  auth: Auth | null;
  user: User | null;
  syncStatus: 'local' | 'syncing' | 'synced' | 'error';
  syncError: string | null;
  onConnectFirebase: (config: FirebaseConfig) => Promise<void>;
  onDisconnectFirebase: () => Promise<void>;
  onResetDemo: () => void;
}

const BRAND_SUGGESTIONS = [
  { name: 'Atelier', subtitle: 'PSICOLOGIA & ROTINA' },
  { name: 'Atelier Raquel', subtitle: 'MENTE & ORGANIZAÇÃO' },
  { name: 'Raquel · Psi', subtitle: 'ESTUDOS & VIDA' },
  { name: 'Espaço Raquel', subtitle: 'PSICOLOGIA & ROTINA' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  firebaseConfig,
  auth,
  user,
  syncStatus,
  syncError,
  onConnectFirebase,
  onDisconnectFirebase,
  onResetDemo,
}) => {
  const [apiKey, setApiKey] = useState(firebaseConfig?.apiKey ?? '');
  const [authDomain, setAuthDomain] = useState(firebaseConfig?.authDomain ?? '');
  const [projectId, setProjectId] = useState(firebaseConfig?.projectId ?? '');
  const [appId, setAppId] = useState(firebaseConfig?.appId ?? '');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSaveFirebase = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthMessage(null);
    if (!apiKey.trim() || !projectId.trim()) {
      setAuthError('Preencha pelo menos apiKey e projectId.');
      return;
    }
    await onConnectFirebase({
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim() || `${projectId.trim()}.firebaseapp.com`,
      projectId: projectId.trim(),
      storageBucket: `${projectId.trim()}.appspot.com`,
      messagingSenderId: '',
      appId: appId.trim(),
    });
    setAuthMessage('Configuração do Firebase salva! Agora faça login abaixo para sincronizar.');
  };

  const handleEmailAuth = async (mode: 'login' | 'register') => {
    if (!auth) return;
    setAuthError(null);
    setAuthMessage(null);
    try {
      if (mode === 'login') {
        await loginWithEmail(auth, email, password);
      } else {
        await registerWithEmail(auth, email, password);
      }
      setAuthMessage('Conectado com sucesso! Seus dados já estão sincronizados na nuvem.');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Erro na autenticação');
    }
  };

  const handleGoogleAuth = async () => {
    if (!auth) return;
    setAuthError(null);
    setAuthMessage(null);
    try {
      await loginWithGoogle(auth);
      setAuthMessage('Conectado com Google!');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Erro no login com Google');
    }
  };

  const themes: { id: ThemeMode; label: string; desc: string }[] = [
    { id: 'pastel', label: 'Pastel', desc: 'Tons quentes, terracota suave e creme' },
    { id: 'light', label: 'Minimalista Claro', desc: 'Branco limpo, grafite e verde sálvia' },
    { id: 'dark', label: 'Modo Escuro', desc: 'Confortável para estudar à noite' },
  ];

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="date-eyebrow">Personalização & Nuvem</p>
          <h1 className="page-title">Ajustes</h1>
          <p className="page-subtitle">
            Escolha o tema visual, personalize o nome do app e conecte ao Firebase.
          </p>
        </div>
      </header>

      <div className="dashboard-grid">
        {/* Aparência */}
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">
              <Palette size={18} style={{ color: 'var(--accent)' }} />
              Tema visual
            </h2>
          </div>
          <div className="list-stack">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => onUpdateSettings({ theme: t.id })}
                className="list-row"
                style={{
                  cursor: 'pointer',
                  textAlign: 'left',
                  borderColor: settings.theme === t.id ? 'var(--accent)' : 'transparent',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{t.label}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {t.desc}
                  </div>
                </div>
                {settings.theme === t.id && <span className="pill pill-accent">Ativo</span>}
              </button>
            ))}
          </div>
        </section>

        {/* Identidade */}
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">
              <Sparkles size={18} style={{ color: 'var(--accent)' }} />
              Nome & Identidade
            </h2>
          </div>

          <div className="list-stack">
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Nome na saudação
              </label>
              <input
                className="input"
                value={settings.userName}
                onChange={(e) => onUpdateSettings({ userName: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Nome do app (menu lateral)
              </label>
              <input
                className="input"
                value={settings.brandName}
                onChange={(e) => onUpdateSettings({ brandName: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Subtítulo
              </label>
              <input
                className="input"
                value={settings.brandSubtitle}
                onChange={(e) => onUpdateSettings({ brandSubtitle: e.target.value })}
              />
            </div>

            <div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Sugestões rápidas:
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {BRAND_SUGGESTIONS.map((s) => (
                  <button
                    key={s.name}
                    className="btn btn-ghost"
                    style={{ padding: '5px 10px', fontSize: '0.76rem' }}
                    onClick={() =>
                      onUpdateSettings({ brandName: s.name, brandSubtitle: s.subtitle })
                    }
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Firebase */}
        <section className="card span-2">
          <div className="card-header">
            <h2 className="card-title">
              <Cloud size={18} style={{ color: 'var(--accent)' }} />
              Sincronização com Firebase
            </h2>
            <span
              className={`pill ${
                syncStatus === 'synced'
                  ? 'pill-success'
                  : syncStatus === 'error'
                  ? 'pill-danger'
                  : 'pill-warning'
              }`}
            >
              {syncStatus === 'synced'
                ? 'Sincronizado na nuvem'
                : syncStatus === 'syncing'
                ? 'Sincronizando...'
                : syncStatus === 'error'
                ? 'Erro de sincronização'
                : 'Modo Local (sem nuvem)'}
            </span>
          </div>

          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            Enquanto não conectar o Firebase, tudo fica salvo automaticamente neste navegador. Para
            sincronizar entre celular e computador, cole as credenciais do seu projeto Firebase
            (Authentication + Firestore Database).
          </p>

          {authError && (
            <div
              className="pill pill-danger"
              style={{ marginBottom: '12px', padding: '8px 12px', borderRadius: '10px' }}
            >
              <AlertCircle size={15} /> {authError}
            </div>
          )}
          {syncError && (
            <div
              className="pill pill-danger"
              style={{ marginBottom: '12px', padding: '8px 12px', borderRadius: '10px' }}
            >
              <AlertCircle size={15} /> {syncError}
            </div>
          )}
          {authMessage && (
            <div
              className="pill pill-success"
              style={{ marginBottom: '12px', padding: '8px 12px', borderRadius: '10px' }}
            >
              <CheckCircle2 size={15} /> {authMessage}
            </div>
          )}

          {user ? (
            <div className="list-row">
              <div>
                <div style={{ fontWeight: 600 }}>Conectado como {user.email || user.displayName}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Projeto Firebase: {firebaseConfig?.projectId}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-ghost"
                  onClick={() => auth && logoutFirebase(auth)}
                >
                  <LogOut size={15} /> Sair
                </button>
                <button className="btn btn-ghost" onClick={onDisconnectFirebase}>
                  Trocar projeto
                </button>
              </div>
            </div>
          ) : (
            <div className="list-stack">
              <form onSubmit={handleSaveFirebase} className="form-grid">
                <input
                  className="input"
                  placeholder="apiKey"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <input
                  className="input"
                  placeholder="projectId"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                />
                <input
                  className="input"
                  placeholder="authDomain (opcional)"
                  value={authDomain}
                  onChange={(e) => setAuthDomain(e.target.value)}
                />
                <input
                  className="input"
                  placeholder="appId (opcional)"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                />
                <button type="submit" className="btn btn-primary">
                  Salvar Firebase
                </button>
              </form>

              {firebaseConfig && auth && (
                <div
                  style={{
                    marginTop: '10px',
                    paddingTop: '14px',
                    borderTop: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '10px' }}>
                    Entrar na conta para sincronizar
                  </div>
                  <div className="form-grid" style={{ marginBottom: '10px' }}>
                    <input
                      type="email"
                      className="input"
                      placeholder="E-mail"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                      type="password"
                      className="input"
                      placeholder="Senha (mín. 6 caracteres)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleEmailAuth('login')}
                    >
                      Entrar
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => handleEmailAuth('register')}
                    >
                      Criar conta
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={handleGoogleAuth}>
                      Entrar com Google
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Limpar dados */}
        <section className="card span-2">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontWeight: 600 }}>Limpar todos os meus dados</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Zera agenda, tarefas, finanças, hábitos, metas e estudos desta conta.
              </div>
            </div>
            <button className="btn btn-ghost" onClick={onResetDemo}>
              <RotateCcw size={15} /> Limpar tudo
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
