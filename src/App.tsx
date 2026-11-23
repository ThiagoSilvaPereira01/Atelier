import React, { useState, useEffect } from 'react';
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
  Download,
} from 'lucide-react';
import type { TabId, ThemeMode } from './types';
import { useAppData } from './hooks/useAppData';
import { logoutFirebase } from './lib/firebase';
import { consumeInitialWidgetTab, subscribeWidgetTabOpen } from './lib/androidWidgets';
import {
  checkForAppUpdate,
  getAppPlatform,
  installAppUpdate,
  type AppUpdateInfo,
} from './lib/appUpdater';
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
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateProgress, setUpdateProgress] = useState<number | null>(null);
  const [updateBannerDismissed, setUpdateBannerDismissed] = useState(false);
  const store = useAppData();
  const { data } = store;
  const appPlatform = getAppPlatform();

  // Check for newer GitHub Releases automatically on installed apps (Android / Windows)
  useEffect(() => {
    if (appPlatform === 'web') return;
    let cancelled = false;
    checkForAppUpdate()
      .then((info) => {
        if (!cancelled) {
          setUpdateInfo(info);
        }
      })
      .catch(() => {
        // Silent fail on background startup check
      });
    return () => {
      cancelled = true;
    };
  }, [appPlatform]);

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateError(null);
    try {
      const info = await checkForAppUpdate();
      setUpdateInfo(info);
      if (info.hasUpdate) {
        setUpdateBannerDismissed(false);
      }
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Erro ao verificar atualizações.');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleInstallUpdate = async () => {
    if (!updateInfo) return;
    setUpdateError(null);
    setUpdateProgress(0);
    try {
      await installAppUpdate(updateInfo, (pct) => setUpdateProgress(pct));
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Não foi possível baixar a atualização.');
    } finally {
      setUpdateProgress(null);
    }
  };

  // Scroll to top when switching tabs (especially noticeable on mobile)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [activeTab]);

  // Open the right tab when launched or resumed from an Android home-screen widget
  useEffect(() => {
    void consumeInitialWidgetTab().then((tab) => {
      if (tab) {
        setActiveTab(tab);
        setMobileMenuOpen(false);
      }
    });
    return subscribeWidgetTabOpen((tab) => {
      setActiveTab(tab);
      setMobileMenuOpen(false);
    });
  }, []);

  // Keep mobile browser status/address bar color synced with active theme
  useEffect(() => {
    const themeColor =
      data.settings.theme === 'dark'
        ? '#181a1f'
        : data.settings.theme === 'light'
        ? '#ffffff'
        : '#8f4f46';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', themeColor);
    }
  }, [data.settings.theme]);

  // Prevent background page scroll while mobile drawer is open
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileMenuOpen]);

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
            <span className="brand-script" style={{ fontSize: '1.65rem' }}>
              {data.settings.brandName}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              type="button"
              className="mobile-topbar-btn"
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
              type="button"
              className="mobile-topbar-btn mobile-topbar-pill"
              onClick={() => {
                const order: ThemeMode[] = ['pastel', 'light', 'dark'];
                const next = order[(order.indexOf(data.settings.theme) + 1) % order.length];
                setTheme(next);
              }}
              aria-label="Alternar tema"
            >
              {data.settings.theme === 'pastel' ? (
                <Sparkles size={13} />
              ) : data.settings.theme === 'light' ? (
                <Sun size={13} />
              ) : (
                <Moon size={13} />
              )}
              <span>
                {data.settings.theme === 'pastel'
                  ? 'Pastel'
                  : data.settings.theme === 'light'
                  ? 'Claro'
                  : 'Escuro'}
              </span>
            </button>
            <button
              type="button"
              className="mobile-topbar-btn"
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
              <div className="mobile-drawer-handle" aria-hidden="true" />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.96rem' }}>Todas as abas</span>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Fechar menu"
                >
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
          {appPlatform !== 'web' && updateInfo?.hasUpdate && !updateBannerDismissed && (
            <div
              className="card"
              style={{
                marginBottom: '16px',
                padding: '12px 14px',
                borderColor: 'var(--accent)',
                background: 'var(--accent-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 200px' }}>
                <Download size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                    Nova versão v{updateInfo.latestVersion} disponível!
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                    Você está na v{updateInfo.currentVersion}. Toque em atualizar para instalar a versão mais recente.
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: '7px 14px', fontSize: '0.82rem' }}
                  onClick={() => void handleInstallUpdate()}
                  disabled={updateProgress !== null}
                >
                  <Download size={14} />
                  {updateProgress !== null
                    ? updateProgress > 0
                      ? `Baixando ${updateProgress}%...`
                      : 'Baixando...'
                    : 'Atualizar'}
                </button>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => setUpdateBannerDismissed(true)}
                  aria-label="Dispensar aviso de atualização"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

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
              googleAutoSync={store.googleCalendarAutoSync}
              onConnectGoogle={store.connectAndSyncGoogleCalendar}
              onAutoSyncGoogle={store.syncGoogleCalendarSilent}
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
              googleConnected={store.googleCalendarConnected}
              googleSyncing={store.googleCalendarSyncing}
              googleError={store.googleCalendarError}
              googleMessage={store.googleCalendarMessage}
              googleLastSyncAt={store.googleCalendarLastSyncAt}
              googleEmail={data.settings.googleCalendarEmail}
              googleAutoSync={store.googleCalendarAutoSync}
              onToggleGoogleAutoSync={() =>
                store.updateSettings({ googleCalendarAutoSync: !store.googleCalendarAutoSync })
              }
              onConnectGoogle={store.connectAndSyncGoogleCalendar}
              onSyncGoogle={store.syncGoogleCalendarNow}
              onDisconnectGoogle={store.disconnectGoogleCalendar}
              updateInfo={updateInfo}
              checkingUpdate={checkingUpdate}
              updateError={updateError}
              updateProgress={updateProgress}
              onCheckUpdate={handleCheckUpdate}
              onInstallUpdate={handleInstallUpdate}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="mobile-bottom-nav" aria-label="Navegação principal">
        {mobileNavItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`mobile-nav-btn ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(item.id);
              setMobileMenuOpen(false);
            }}
          >
            <span className="mobile-nav-icon">{item.icon}</span>
            <span>{item.shortLabel}</span>
          </button>
        ))}
        <button
          type="button"
          className={`mobile-nav-btn ${!activeInBottomBar || mobileMenuOpen ? 'active' : ''}`}
          onClick={() => setMobileMenuOpen((v) => !v)}
        >
          <span className="mobile-nav-icon">
            <Menu size={18} />
          </span>
          <span>Mais</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
