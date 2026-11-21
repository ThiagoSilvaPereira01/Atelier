import React, { useState } from 'react';
import {
  Home,
  Calendar,
  BookOpen,
  CheckSquare,
  Wallet,
  Settings,
  User as UserIcon,
  Sun,
  Moon,
  Sparkles,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import type { TabId, ThemeMode } from './types';
import { useAppData } from './hooks/useAppData';
import { logoutFirebase } from './lib/firebase';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { AgendaView } from './components/AgendaView';
import { StudiesView } from './components/StudiesView';
import { TasksView } from './components/TasksView';
import { FinanceView } from './components/FinanceView';
import { ProfileView } from './components/ProfileView';
import { SettingsView } from './components/SettingsView';

const NAV_ITEMS: { id: TabId; label: string; shortLabel: string; icon: React.ReactNode }[] = [
  { id: 'inicio', label: 'Início', shortLabel: 'Início', icon: <Home size={17} /> },
  { id: 'agenda', label: 'Agenda', shortLabel: 'Agenda', icon: <Calendar size={17} /> },
  { id: 'estudos', label: 'Estudos', shortLabel: 'Estudos', icon: <BookOpen size={17} /> },
  { id: 'tarefas', label: 'Tarefas & Lembretes', shortLabel: 'Tarefas', icon: <CheckSquare size={17} /> },
  { id: 'financeiro', label: 'Financeiro', shortLabel: 'Finanças', icon: <Wallet size={17} /> },
  { id: 'perfil', label: 'Perfil', shortLabel: 'Perfil', icon: <UserIcon size={17} /> },
  { id: 'ajustes', label: 'Ajustes', shortLabel: 'Ajustes', icon: <Settings size={17} /> },
];

const DEFAULT_MOBILE_FAVORITES: TabId[] = ['inicio', 'agenda', 'estudos', 'tarefas', 'financeiro'];

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('inicio');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const store = useAppData();
  const { data } = store;

  if (store.authLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-app)',
          color: 'var(--text-secondary)',
          fontSize: '0.95rem',
        }}
      >
        Carregando Atelier...
      </div>
    );
  }

  if (store.firebaseConfig && !store.user) {
    return <LoginView auth={store.auth} />;
  }

  const setTheme = (theme: ThemeMode) => {
    store.updateSettings({ theme });
  };

  const validFavorites = (data.settings.mobileFavorites ?? []).filter((id) =>
    NAV_ITEMS.some((n) => n.id === id)
  );
  const favoriteIds = validFavorites.length > 0 ? validFavorites : DEFAULT_MOBILE_FAVORITES;

  const mobileNavItems = favoriteIds
    .map((id) => NAV_ITEMS.find((n) => n.id === id))
    .filter((item): item is (typeof NAV_ITEMS)[number] => Boolean(item))
    .slice(0, 5);

  const activeInBottomBar = mobileNavItems.some((item) => item.id === activeTab);

  const syncLabel =
    store.syncStatus === 'synced'
      ? 'Firebase conectado'
      : store.syncStatus === 'syncing'
      ? 'Sincronizando...'
      : store.syncStatus === 'error'
      ? 'Erro no Firebase'
      : 'Salvo localmente';

  return (
    <div className="app-shell">
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div>
          <div className="brand-block">
            <span className="brand-script">{data.settings.brandName}</span>
            <div className="brand-subtitle">{data.settings.brandSubtitle}</div>
          </div>

          <nav className="nav-list">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="theme-pills" role="group" aria-label="Escolher tema">
            <button
              className={`theme-pill-btn ${data.settings.theme === 'pastel' ? 'active' : ''}`}
              onClick={() => setTheme('pastel')}
              title="Tema Pastel"
            >
              <Sparkles size={12} /> Pastel
            </button>
            <button
              className={`theme-pill-btn ${data.settings.theme === 'light' ? 'active' : ''}`}
              onClick={() => setTheme('light')}
              title="Minimalista Claro"
            >
              <Sun size={12} /> Claro
            </button>
            <button
              className={`theme-pill-btn ${data.settings.theme === 'dark' ? 'active' : ''}`}
              onClick={() => setTheme('dark')}
              title="Modo Escuro"
            >
              <Moon size={12} /> Escuro
            </button>
          </div>

          <button className="sync-badge" onClick={() => setActiveTab('ajustes')}>
            <span className={`sync-dot ${store.syncStatus}`} />
            <span>{syncLabel}</span>
          </button>

          {store.user && store.auth && (
            <button
              className="sync-badge"
              onClick={() => logoutFirebase(store.auth!)}
              title="Sair da conta"
            >
              <LogOut size={14} />
              <span>Sair da conta</span>
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header className="mobile-topbar">
          <div>
            <span className="brand-script" style={{ fontSize: '1.6rem' }}>
              {data.settings.brandName}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className="theme-pill-btn active"
              style={{ padding: '6px 8px' }}
              onClick={() => {
                setActiveTab('perfil');
                setMobileMenuOpen(false);
              }}
              aria-label="Abrir perfil"
              title="Meu Perfil"
            >
              <UserIcon size={16} />
            </button>
            <button
              className="theme-pill-btn active"
              style={{ padding: '6px 10px' }}
              onClick={() => {
                const order: ThemeMode[] = ['pastel', 'light', 'dark'];
                const next = order[(order.indexOf(data.settings.theme) + 1) % order.length];
                setTheme(next);
              }}
            >
              {data.settings.theme === 'pastel'
                ? 'Pastel'
                : data.settings.theme === 'light'
                ? 'Claro'
                : 'Escuro'}
            </button>
            <button
              className="theme-pill-btn active"
              style={{ padding: '6px 8px' }}
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Abrir menu"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </header>

        {mobileMenuOpen && (
          <div className="mobile-drawer-overlay" onClick={() => setMobileMenuOpen(false)}>
            <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Todas as abas</span>
                <button className="btn-icon" onClick={() => setMobileMenuOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="list-stack">
                {NAV_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                    style={{
                      color: activeTab === item.id ? 'var(--accent-text)' : 'var(--text-primary)',
                      background: activeTab === item.id ? 'var(--accent)' : 'var(--bg-card-soft)',
                    }}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
                {store.user && store.auth && (
                  <button
                    className="nav-item"
                    style={{ color: 'var(--danger)', background: 'var(--danger-soft)' }}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logoutFirebase(store.auth!);
                    }}
                  >
                    <LogOut size={17} />
                    <span>Sair da conta</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <main className="main-content">
          {activeTab === 'inicio' && (
            <DashboardView
              data={data}
              onNavigate={setActiveTab}
              onToggleTask={store.toggleTask}
              onToggleHideFinance={() =>
                store.updateSettings({
                  hideFinancialValues: !data.settings.hideFinancialValues,
                })
              }
            />
          )}

          {activeTab === 'agenda' && (
            <AgendaView
              events={data.events}
              tasks={data.tasks}
              onAdd={store.addEvent}
              onUpdate={store.updateEvent}
              onDelete={store.deleteEvent}
              onToggleTask={store.toggleTask}
              googleConnected={store.googleCalendarConnected}
              googleSyncing={store.googleCalendarSyncing}
              googleError={store.googleCalendarError}
              googleMessage={store.googleCalendarMessage}
              googleLastSyncAt={data.settings.googleCalendarLastSyncAt}
              googleEmail={data.settings.googleCalendarEmail}
              onConnectGoogle={store.connectAndSyncGoogleCalendar}
              onSyncGoogle={store.syncGoogleCalendarNow}
              onDisconnectGoogle={store.disconnectGoogleCalendar}
            />
          )}

          {activeTab === 'estudos' && (
            <StudiesView
              courses={data.courses}
              readings={data.readings}
              internshipHoursDone={data.settings.internshipHoursDone}
              internshipHoursTarget={data.settings.internshipHoursTarget}
              onUpdateInternshipHours={(done, target) =>
                store.updateSettings({
                  internshipHoursDone: done,
                  internshipHoursTarget: target,
                })
              }
              onAddCourse={store.addCourse}
              onUpdateCourse={store.updateCourse}
              onDeleteCourse={store.deleteCourse}
              onAddReading={store.addReading}
              onUpdateReadingStatus={store.updateReadingStatus}
              onDeleteReading={store.deleteReading}
            />
          )}

          {activeTab === 'tarefas' && (
            <TasksView
              tasks={data.tasks}
              onAdd={store.addTask}
              onUpdate={store.updateTask}
              onToggle={store.toggleTask}
              onDelete={store.deleteTask}
            />
          )}

          {activeTab === 'financeiro' && (
            <FinanceView
              transactions={data.transactions}
              hideValues={data.settings.hideFinancialValues}
              monthlyBudget={data.settings.monthlyBudget}
              onUpdateMonthlyBudget={(monthlyBudget) => store.updateSettings({ monthlyBudget })}
              onToggleHide={() =>
                store.updateSettings({
                  hideFinancialValues: !data.settings.hideFinancialValues,
                })
              }
              onAdd={store.addTransaction}
              onUpdate={store.updateTransaction}
              onDelete={store.deleteTransaction}
            />
          )}

          {activeTab === 'perfil' && (
            <ProfileView
              data={data}
              user={store.user}
              onUpdateSettings={store.updateSettings}
            />
          )}

          {activeTab === 'ajustes' && (
            <SettingsView
              settings={data.settings}
              onUpdateSettings={store.updateSettings}
              firebaseConfig={store.firebaseConfig}
              auth={store.auth}
              user={store.user}
              syncStatus={store.syncStatus}
              syncError={store.syncError}
              onConnectFirebase={store.connectFirebase}
              onDisconnectFirebase={store.disconnectFirebase}
              onResetDemo={store.resetToDemo}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="mobile-bottom-nav">
        {mobileNavItems.map((item) => (
          <button
            key={item.id}
            className={`mobile-nav-btn ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(item.id);
              setMobileMenuOpen(false);
            }}
          >
            {item.icon}
            <span>{item.shortLabel}</span>
          </button>
        ))}
        <button
          className={`mobile-nav-btn ${!activeInBottomBar || mobileMenuOpen ? 'active' : ''}`}
          onClick={() => setMobileMenuOpen((v) => !v)}
        >
          <Menu size={18} />
          <span>Mais</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
