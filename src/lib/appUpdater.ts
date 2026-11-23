import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

declare const __APP_VERSION__: string;

const GITHUB_REPO = 'ThiagoSilvaPereira01/Atelier';
const DOWNLOAD_PAGE_URL = 'https://atelier-649da.web.app/baixar';

export type AppPlatform = 'android' | 'windows' | 'web';

export interface AppUpdateInfo {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  releaseName: string;
  notes: string;
  publishedAt?: string;
  apkUrl?: string;
  apkSize?: number;
  exeUrl?: string;
  exeSize?: number;
  releaseUrl: string;
}

interface GitHubReleaseAsset {
  name: string;
  size: number;
  browser_download_url: string;
}

interface GitHubReleaseResponse {
  tag_name?: string;
  name?: string;
  body?: string;
  published_at?: string;
  html_url?: string;
  assets?: GitHubReleaseAsset[];
}

interface AppUpdaterPluginInterface {
  downloadAndInstall(options: { url: string }): Promise<void>;
  addListener(
    eventName: 'downloadProgress',
    listenerFunc: (data: { percent: number }) => void
  ): Promise<PluginListenerHandle>;
}

const AppUpdaterNative = registerPlugin<AppUpdaterPluginInterface>('AppUpdater');

export function getAppVersion(): string {
  return typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__ ? __APP_VERSION__ : '1.1.0';
}

export function getAppPlatform(): AppPlatform {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    return 'android';
  }
  if (typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent)) {
    return 'windows';
  }
  return 'web';
}

function parseVersionParts(raw: string): number[] {
  const cleaned = raw.trim().replace(/^v/i, '').split('-')[0];
  return cleaned.split('.').map((part) => {
    const n = Number.parseInt(part, 10);
    return Number.isFinite(n) ? n : 0;
  });
}

export function compareVersions(a: string, b: string): number {
  const pa = parseVersionParts(a);
  const pb = parseVersionParts(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const va = pa[i] ?? 0;
    const vb = pb[i] ?? 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}

export async function checkForAppUpdate(): Promise<AppUpdateInfo> {
  const currentVersion = getAppVersion();

  let release: GitHubReleaseResponse | null = null;
  const latestRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json' },
  });

  if (latestRes.ok) {
    release = (await latestRes.json()) as GitHubReleaseResponse;
  } else {
    const listRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=1`,
      { headers: { Accept: 'application/vnd.github+json' } }
    );
    if (listRes.ok) {
      const list = (await listRes.json()) as GitHubReleaseResponse[];
      release = Array.isArray(list) && list.length > 0 ? list[0] : null;
    } else {
      throw new Error('Não foi possível verificar atualizações agora.');
    }
  }

  if (!release || !release.tag_name) {
    return {
      currentVersion,
      latestVersion: currentVersion,
      hasUpdate: false,
      releaseName: `v${currentVersion}`,
      notes: '',
      releaseUrl: `https://github.com/${GITHUB_REPO}/releases`,
    };
  }

  const latestVersion = release.tag_name.trim().replace(/^v/i, '');
  const assets = Array.isArray(release.assets) ? release.assets : [];
  const apk = assets.find((a) => a.name.toLowerCase().endsWith('.apk'));
  const exe = assets.find((a) => a.name.toLowerCase().endsWith('.exe'));

  return {
    currentVersion,
    latestVersion,
    hasUpdate: compareVersions(latestVersion, currentVersion) > 0,
    releaseName: release.name || release.tag_name,
    notes: (release.body || '').trim(),
    publishedAt: release.published_at,
    apkUrl: apk?.browser_download_url,
    apkSize: apk?.size,
    exeUrl: exe?.browser_download_url,
    exeSize: exe?.size,
    releaseUrl: release.html_url || `https://github.com/${GITHUB_REPO}/releases`,
  };
}

export async function installAppUpdate(
  update: AppUpdateInfo,
  onProgress?: (percent: number) => void
): Promise<void> {
  const platform = getAppPlatform();

  if (platform === 'android' && update.apkUrl) {
    let listener: PluginListenerHandle | null = null;
    try {
      if (onProgress) {
        listener = await AppUpdaterNative.addListener('downloadProgress', (data) => {
          onProgress(Math.max(0, Math.min(100, Math.round(data.percent))));
        });
      }
      await AppUpdaterNative.downloadAndInstall({ url: update.apkUrl });
      return;
    } catch {
      // Fall back to opening the APK download URL in the system browser
      window.open(update.apkUrl, '_blank', 'noopener,noreferrer');
      return;
    } finally {
      if (listener) {
        void listener.remove();
      }
    }
  }

  if (platform === 'windows' && update.exeUrl) {
    window.open(update.exeUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  window.open(DOWNLOAD_PAGE_URL, '_blank', 'noopener,noreferrer');
}

export function formatBytesMB(bytes?: number): string | null {
  if (!bytes || bytes <= 0) return null;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}
