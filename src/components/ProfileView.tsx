import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import { User as UserIcon, GraduationCap, Sparkles, CheckCircle2, BookOpen, Clock } from 'lucide-react';
import type { AppData, AppSettings } from '../types';

interface ProfileViewProps {
  data: AppData;
  user: User | null;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'A';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

interface ProfileDraft {
  userName?: string;
  profileRole?: string;
  profileInstitution?: string;
  profileCourse?: string;
  profileFocus?: string;
  profileBio?: string;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ data, user, onUpdateSettings }) => {
  const { settings } = data;
  const [draft, setDraft] = useState<ProfileDraft>({});
  const [savedToast, setSavedToast] = useState(false);

  const userName = draft.userName ?? settings.userName;
  const profileRole = draft.profileRole ?? settings.profileRole ?? '';
  const profileInstitution = draft.profileInstitution ?? settings.profileInstitution ?? '';
  const profileCourse = draft.profileCourse ?? settings.profileCourse ?? '';
  const profileFocus = draft.profileFocus ?? settings.profileFocus ?? '';
  const profileBio = draft.profileBio ?? settings.profileBio ?? '';

  const completedTasks = data.tasks.filter((t) => t.completed).length;
  const fichadas = data.readings.filter((r) => r.status === 'Fichado').length;
  const totalCourses = data.courses.length;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      userName: userName.trim() || 'Raquel',
      profileRole: profileRole.trim(),
      profileInstitution: profileInstitution.trim(),
      profileCourse: profileCourse.trim(),
      profileFocus: profileFocus.trim(),
      profileBio: profileBio.trim(),
    });
    setDraft({});
    setSavedToast(true);
    window.setTimeout(() => setSavedToast(false), 2500);
  };

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="date-eyebrow">Identidade pessoal</p>
          <h1 className="page-title">Meu Perfil</h1>
          <p className="page-subtitle">
            Suas informações pessoais, acadêmicas e resumo da sua jornada no Atelier.
          </p>
        </div>
      </header>

      {/* Cartão de Apresentação */}
      <section className="card" style={{ marginBottom: '20px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={settings.userName}
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid var(--accent)',
              }}
            />
          ) : (
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: 'var(--accent)',
                color: 'var(--accent-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.45rem',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {getInitials(settings.userName)}
            </div>
          )}

          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>{settings.userName}</h2>
              {settings.profileRole && (
                <span className="pill pill-accent">{settings.profileRole}</span>
              )}
            </div>

            {(settings.profileInstitution || settings.profileCourse) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.86rem',
                  color: 'var(--text-secondary)',
                  marginTop: '4px',
                }}
              >
                <GraduationCap size={15} style={{ color: 'var(--accent)' }} />
                <span>
                  {[settings.profileInstitution, settings.profileCourse].filter(Boolean).join(' · ')}
                </span>
              </div>
            )}

            {user?.email && (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                Conta conectada: {user.email}
              </div>
            )}
          </div>
        </div>

        {settings.profileBio && (
          <p
            style={{
              marginTop: '14px',
              padding: '12px 14px',
              borderRadius: '12px',
              background: 'var(--bg-card-soft)',
              fontSize: '0.88rem',
              color: 'var(--text-secondary)',
            }}
          >
            {settings.profileBio}
          </p>
        )}

        {settings.profileFocus && (
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={15} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>
              Foco atual: {settings.profileFocus}
            </span>
          </div>
        )}

        <div className="metrics-row" style={{ marginTop: '16px' }}>
          <div className="metric-box">
            <div className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Clock size={13} /> Estágio
            </div>
            <div className="metric-value">
              {settings.internshipHoursDone}h / {settings.internshipHoursTarget}h
            </div>
          </div>
          <div className="metric-box">
            <div className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <CheckCircle2 size={13} /> Tarefas feitas
            </div>
            <div className="metric-value">{completedTasks}</div>
          </div>
          <div className="metric-box">
            <div className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <BookOpen size={13} /> Leituras fichadas
            </div>
            <div className="metric-value">{fichadas}</div>
          </div>
          <div className="metric-box">
            <div className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <GraduationCap size={13} /> Disciplinas
            </div>
            <div className="metric-value">{totalCourses}</div>
          </div>
        </div>
      </section>

      {/* Editar Perfil */}
      <section className="card">
        <div className="card-header">
          <h2 className="card-title">
            <UserIcon size={18} style={{ color: 'var(--accent)' }} />
            Editar informações do perfil
          </h2>
          {savedToast && <span className="pill pill-success">Perfil salvo!</span>}
        </div>

        <form onSubmit={handleSave} className="list-stack">
          <div className="form-grid">
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Nome de exibição
              </label>
              <input
                className="input"
                placeholder="Ex: Raquel Silva"
                value={userName}
                onChange={(e) => setDraft((prev) => ({ ...prev, userName: e.target.value }))}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Ocupação / Semestre
              </label>
              <input
                className="input"
                placeholder="Ex: Psicologia · 7º Semestre"
                value={profileRole}
                onChange={(e) => setDraft((prev) => ({ ...prev, profileRole: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-grid">
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Faculdade / Local de estágio
              </label>
              <input
                className="input"
                placeholder="Ex: Clínica Escola / Universidade"
                value={profileInstitution}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, profileInstitution: e.target.value }))
                }
              />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Abordagem ou área de interesse
              </label>
              <input
                className="input"
                placeholder="Ex: TCC, Psicanálise, Neuropsicologia..."
                value={profileCourse}
                onChange={(e) => setDraft((prev) => ({ ...prev, profileCourse: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Foco ou frase do momento
            </label>
            <input
              className="input"
              placeholder="Ex: Concluir as horas de estágio e manter rotina leve"
              value={profileFocus}
              onChange={(e) => setDraft((prev) => ({ ...prev, profileFocus: e.target.value }))}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Sobre você (bio)
            </label>
            <textarea
              className="textarea"
              rows={3}
              placeholder="Escreva um pouco sobre você, seus objetivos ou rotina..."
              value={profileBio}
              onChange={(e) => setDraft((prev) => ({ ...prev, profileBio: e.target.value }))}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary">
              Salvar perfil
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
