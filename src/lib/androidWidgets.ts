import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import type { AppData, TabId, TaskPriority } from '../types';
import { addDaysISO } from '../data/initialData';

interface WidgetEventPayload {
  id: string;
  title: string;
  date: string;
  time: string;
  allDay?: boolean;
  category: string;
  location?: string;
}

interface WidgetTaskPayload {
  id: string;
  title: string;
  category: string;
  priority: TaskPriority;
  dueDate?: string;
  isReminder?: boolean;
}

interface WidgetBridgePluginInterface {
  syncWidgetData(options: {
    theme: string;
    brandName: string;
    events: WidgetEventPayload[];
    tasks: WidgetTaskPayload[];
  }): Promise<void>;
  consumePendingTab(): Promise<{ tab?: string }>;
  addListener(
    eventName: 'widgetTabOpen',
    listenerFunc: (data: { tab?: string }) => void
  ): Promise<PluginListenerHandle>;
}

const WidgetBridge = registerPlugin<WidgetBridgePluginInterface>('WidgetBridge');

const PRIORITY_RANK: Record<TaskPriority, number> = {
  alta: 0,
  media: 1,
  baixa: 2,
};

function isValidWidgetTab(tab: string | undefined): tab is TabId {
  return tab === 'agenda' || tab === 'tarefas' || tab === 'inicio';
}

export function syncAndroidWidgets(data: AppData): void {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return;
  }

  const minDate = addDaysISO(-1);
  const maxDate = addDaysISO(14);

  const upcomingEvents: WidgetEventPayload[] = data.events
    .filter((ev) => ev.date >= minDate && ev.date <= maxDate)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
    .slice(0, 60)
    .map((ev) => ({
      id: ev.id,
      title: ev.title,
      date: ev.date,
      time: ev.time,
      allDay: Boolean(ev.allDay),
      category: ev.category,
      location: ev.location ?? '',
    }));

  const pendingTasks: WidgetTaskPayload[] = data.tasks
    .filter((t) => !t.completed)
    .sort((a, b) => {
      const pDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (pDiff !== 0) return pDiff;
      const dA = a.dueDate ?? '9999-99-99';
      const dB = b.dueDate ?? '9999-99-99';
      return dA.localeCompare(dB);
    })
    .slice(0, 25)
    .map((t) => ({
      id: t.id,
      title: t.title,
      category: t.category,
      priority: t.priority,
      dueDate: t.dueDate ?? '',
      isReminder: Boolean(t.isReminder),
    }));

  WidgetBridge.syncWidgetData({
    theme: data.settings.theme,
    brandName: data.settings.brandName || 'Atelier',
    events: upcomingEvents,
    tasks: pendingTasks,
  }).catch(() => {
    // Ignore native bridge errors on older builds
  });
}

export async function consumeInitialWidgetTab(): Promise<TabId | null> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return null;
  }
  try {
    const res = await WidgetBridge.consumePendingTab();
    return isValidWidgetTab(res.tab) ? res.tab : null;
  } catch {
    return null;
  }
}

export function subscribeWidgetTabOpen(onTab: (tab: TabId) => void): () => void {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return () => {};
  }

  let disposed = false;
  let handle: PluginListenerHandle | null = null;

  WidgetBridge.addListener('widgetTabOpen', (payload) => {
    if (isValidWidgetTab(payload.tab)) {
      onTab(payload.tab);
    }
  })
    .then((h) => {
      if (disposed) {
        void h.remove();
      } else {
        handle = h;
      }
    })
    .catch(() => {});

  return () => {
    disposed = true;
    if (handle) {
      void handle.remove();
    }
  };
}
