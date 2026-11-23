const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

let server = null;
let mainWindow = null;
const PREFERRED_PORT = 45917;

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function createStaticHandler(distDir) {
  const resolvedRoot = path.resolve(distDir);
  return (req, res) => {
    const rawPath = (req.url || '/').split('?')[0];
    const safeRel = rawPath === '/' ? 'index.html' : rawPath.replace(/^\/+/, '');
    let filePath = path.resolve(resolvedRoot, safeRel);

    if (!filePath.startsWith(resolvedRoot + path.sep) && filePath !== resolvedRoot) {
      filePath = path.join(resolvedRoot, 'index.html');
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(resolvedRoot, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
    fs.createReadStream(filePath).pipe(res);
  };
}

function listenOnPort(distDir, port) {
  return new Promise((resolve, reject) => {
    const srv = http.createServer(createStaticHandler(distDir));
    srv.on('error', reject);
    srv.listen(port, '127.0.0.1', () => {
      const addr = srv.address();
      resolve({ server: srv, port: addr.port });
    });
  });
}

async function startStaticServer(distDir) {
  try {
    return await listenOnPort(distDir, PREFERRED_PORT);
  } catch (err) {
    if (err && err.code === 'EADDRINUSE') {
      return listenOnPort(distDir, 0);
    }
    throw err;
  }
}

async function createWindow() {
  const distDir = path.join(__dirname, '..', 'dist');
  const started = await startStaticServer(distDir);
  server = started.server;

  const iconPath = path.join(__dirname, '..', 'public', 'icon-512.png');

  const win = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 900,
    minHeight: 620,
    title: 'Atelier · Psicologia & Rotina',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow = win;
  win.on('closed', () => {
    if (mainWindow === win) {
      mainWindow = null;
    }
  });

  // Allow Firebase Google Auth popups, open external Calendar / update links in default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (
      url &&
      (url.startsWith('https://calendar.google.com/') ||
        url.startsWith('https://github.com/ThiagoSilvaPereira01/Atelier/') ||
        url.startsWith('https://atelier-649da.web.app/baixar'))
    ) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  await win.loadURL(`http://localhost:${started.port}/`);
}

if (gotTheLock) {
  app.whenReady().then(createWindow);
}

app.on('window-all-closed', () => {
  if (server) {
    server.close();
    server = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
