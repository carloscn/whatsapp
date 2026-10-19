'use strict';

const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  nativeImage,
  session,
  shell,
} = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const WEB_APP_URL = 'https://web.whatsapp.com/';
const CHROME_VERSION = process.versions.chrome || '130.0.0.0';
const CHROME_MAJOR = CHROME_VERSION.split('.')[0];
const USER_AGENT =
  `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 ` +
  `(KHTML, like Gecko) Chrome/${CHROME_VERSION} Safari/537.36`;
const NOTIFY_CLICK = '__WA_DESKTOP_NOTIFY_CLICK__';
const PROFILE_DIR = path.join(app.getPath('appData'), 'whatsapp');

const DENIED_PERMISSIONS = new Set([
  'geolocation',
  'midi',
  'midiSysex',
  'hid',
  'serial',
  'usb',
  'bluetooth',
]);

app.setName('whatsapp');
app.setPath('userData', PROFILE_DIR);
app.userAgentFallback = USER_AGENT;
app.commandLine.appendSwitch('class', 'whatsapp');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('ozone-platform', 'x11');
app.commandLine.appendSwitch('disable-vulkan');

const hookSource = fs.readFileSync(path.join(__dirname, 'notification-hook.js'), 'utf8')
  .replaceAll('__CHROME_MAJOR__', CHROME_MAJOR);

let mainWindow = null;
let tray = null;
let isQuitting = false;
let config = loadConfig();

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => showMainWindow());
  app.whenReady().then(start).catch((error) => {
    console.error(error);
    app.quit();
  });
}

function configPath() {
  return path.join(PROFILE_DIR, 'window.json');
}

function loadConfig() {
  try {
    const parsed = JSON.parse(fs.readFileSync(configPath(), 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveConfig() {
  try {
    fs.mkdirSync(PROFILE_DIR, { recursive: true });
    fs.writeFileSync(configPath(), JSON.stringify(config));
  } catch (error) {
    console.error('failed to save window state:', error.message);
  }
}

function assetPath(name) {
  return path.join(__dirname, '..', 'assets', name);
}

function acceptLanguage() {
  const locale = app.getLocale() || 'en-US';
  const base = locale.split('-')[0];
  if (!base || base === locale) return `${locale},en;q=0.8`;
  return `${locale},${base};q=0.9,en;q=0.8`;
}

function isWebAppUrl(url) {
  try {
    return new URL(url).hostname === 'web.whatsapp.com' && new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

function isInternalUrl(url) {
  if (!url || url === 'about:blank') return true;
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('file:')) return true;
  return isWebAppUrl(url);
}

function openExternal(url) {
  try {
    const protocol = new URL(url).protocol;
    if (protocol === 'https:' || protocol === 'http:' || protocol === 'mailto:') {
      shell.openExternal(url);
    }
  } catch {
    // Ignore malformed popup targets.
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function prepareSession() {
  const browserSession = session.defaultSession;
  browserSession.setUserAgent(USER_AGENT, acceptLanguage());

  browserSession.setPermissionRequestHandler((_contents, permission, callback) => {
    callback(!DENIED_PERMISSIONS.has(permission));
  });
  browserSession.setPermissionCheckHandler((_contents, permission) => {
    return !DENIED_PERMISSIONS.has(permission);
  });

  browserSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const headers = details.requestHeaders;
    for (const key of Object.keys(headers)) {
      const lower = key.toLowerCase();
      if (lower === 'user-agent' && String(headers[key]).includes('Electron')) headers[key] = USER_AGENT;
      if (lower.startsWith('sec-ch-ua')) delete headers[key];
    }
    headers['sec-ch-ua'] = `"Chromium";v="${CHROME_MAJOR}", "Google Chrome";v="${CHROME_MAJOR}", "Not-A.Brand";v="99"`;
    headers['sec-ch-ua-mobile'] = '?0';
    headers['sec-ch-ua-platform'] = '"Linux"';
    callback({ requestHeaders: headers });
  });

  browserSession.on('will-download', (_event, item) => {
    item.setSavePath(uniqueDownloadPath(item.getFilename()));
  });
}

function uniqueDownloadPath(filename) {
  const dir = app.getPath('downloads');
  const safe = path.basename(String(filename || 'download')).replace(/[^\w.\- ()\u0080-\uFFFF]+/g, '_') || 'download';
  const target = path.join(dir, safe);
  if (!fs.existsSync(target)) return target;
  const ext = path.extname(safe);
  const base = path.basename(safe, ext);
  for (let index = 1; index < 1000; index += 1) {
    const candidate = path.join(dir, `${base} (${index})${ext}`);
    if (!fs.existsSync(candidate)) return candidate;
  }
  return target;
}

function createWindow() {
  const bounds = restoreBounds();
  const windowIcon = nativeImage.createFromPath(assetPath('icon.png'));
  const win = new BrowserWindow({
    ...bounds,
    minWidth: 880,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#111b21',
    title: 'WhatsApp',
    icon: windowIcon.isEmpty() ? undefined : windowIcon,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      webviewTag: false,
    },
  });

  mainWindow = win;
  Menu.setApplicationMenu(null);
  win.webContents.setBackgroundThrottling(false);
  if (typeof config.zoomLevel === 'number') win.webContents.setZoomLevel(config.zoomLevel);

  win.once('ready-to-show', () => showMainWindow());
  setTimeout(() => {
    if (win && !win.isDestroyed() && !win.isVisible()) showMainWindow();
  }, 8000);

  win.on('close', (event) => {
    if (!isQuitting && tray) {
      event.preventDefault();
      win.hide();
      refreshTrayMenu();
    }
  });
  win.on('show', refreshTrayMenu);
  win.on('hide', () => {
    refreshTrayMenu();
    scheduleSaveBounds();
  });
  win.on('focus', () => win.flashFrame(false));
  win.on('resize', scheduleSaveBounds);
  win.on('move', scheduleSaveBounds);

  const contents = win.webContents;
  contents.on('will-navigate', (event, url) => {
    if (isInternalUrl(url)) return;
    event.preventDefault();
    openExternal(url);
  });
  contents.setWindowOpenHandler(({ url }) => {
    if (isInternalUrl(url)) return { action: 'allow' };
    openExternal(url);
    return { action: 'deny' };
  });
  contents.on('page-title-updated', (_event, title) => updateUnread(title));
  contents.on('zoom-changed', () => {
    config.zoomLevel = contents.getZoomLevel();
    saveConfig();
  });
  contents.on('console-message', (event) => {
    if (String(event.message || '').includes(NOTIFY_CLICK)) showMainWindow();
  });
  contents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown' || input.alt || !(input.control || input.meta)) return;
    const key = input.key.toLowerCase();
    if (key === '=' || key === '+' || input.code === 'NumpadAdd') {
      event.preventDefault();
      setZoom(contents, contents.getZoomLevel() + 0.5);
    } else if (key === '-' || key === '_' || input.code === 'NumpadSubtract') {
      event.preventDefault();
      setZoom(contents, contents.getZoomLevel() - 0.5);
    } else if (key === '0' || input.code === 'Numpad0') {
      event.preventDefault();
      setZoom(contents, 0);
    } else if (key === 'q') {
      event.preventDefault();
      quitApp();
    } else if (key === 'w') {
      event.preventDefault();
      if (tray) win.hide();
      else win.close();
    } else if (key === 'i' && input.shift) {
      event.preventDefault();
      contents.toggleDevTools();
    }
  });
  contents.on('did-finish-load', () => {
    process.stderr.write(`loaded ${contents.getURL()}\n`);
  });
  contents.on('did-fail-load', (_event, errorCode, description, url, isMainFrame) => {
    if (!isMainFrame || errorCode === -3) return;
    process.stderr.write(`load failed ${errorCode} ${description} ${url}\n`);
    showOffline(description || '网络不可用');
  });
  contents.on('render-process-gone', (_event, details) => {
    if (details.reason !== 'clean-exit' && win && !win.isDestroyed()) {
      contents.loadURL(WEB_APP_URL);
    }
  });
  contents.on('dom-ready', () => {
    contents.executeJavaScript(hookSource).catch(() => {});
  });

  return win;
}

function restoreBounds() {
  const saved = config.bounds;
  if (!saved || typeof saved.width !== 'number' || typeof saved.height !== 'number') {
    return { width: 1200, height: 800 };
  }
  return {
    x: saved.x,
    y: saved.y,
    width: Math.max(880, saved.width),
    height: Math.max(640, saved.height),
  };
}

let saveTimer = null;
function scheduleSaveBounds() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.isVisible()) return;
    config.bounds = mainWindow.getBounds();
    saveConfig();
  }, 300);
}

function showOffline(description) {
  const html = `<!doctype html>
<meta charset="utf-8">
<title>WhatsApp</title>
<style>
  html, body { height: 100%; margin: 0; background: #111b21; color: #e9edef; font: 16px/1.5 sans-serif; }
  main { height: 100%; display: flex; align-items: center; justify-content: center; }
  section { text-align: center; max-width: 380px; padding: 24px; }
  button { margin-top: 16px; background: #1b3a4b; color: white; border: 0; border-radius: 8px; padding: 10px 18px; font-size: 15px; cursor: pointer; }
  p.detail { color: #8696a0; font-size: 13px; }
</style>
<main><section>
  <h1>暂时连不上 WhatsApp</h1>
  <p>检查网络后再试一次。已登录的会话还在这台电脑上。</p>
  <p class="detail">${escapeHtml(description)}</p>
  <button onclick="location.href='${WEB_APP_URL}'">重试</button>
</section></main>`;
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  showMainWindow();
}

function updateUnread(title) {
  const match = /[(（](\d+)[)）]/.exec(title || '');
  const count = match ? match[1] : '';
  if (tray) tray.setToolTip(count ? `WhatsApp · ${count} 条未读` : 'WhatsApp');
  if (count && mainWindow && !mainWindow.isFocused()) mainWindow.flashFrame(true);
}

function setZoom(contents, level) {
  const next = Math.min(8, Math.max(-7, level));
  contents.setZoomLevel(next);
  config.zoomLevel = contents.getZoomLevel();
  saveConfig();
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  mainWindow.flashFrame(false);
  refreshTrayMenu();
}

function toggleWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isVisible() && mainWindow.isFocused()) mainWindow.hide();
  else showMainWindow();
  refreshTrayMenu();
}

function buildTrayMenu() {
  const visible = mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible();
  return Menu.buildFromTemplate([
    {
      label: visible ? '隐藏窗口' : '显示窗口',
      click: toggleWindow,
    },
    {
      label: '重新加载',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.loadURL(WEB_APP_URL);
      },
    },
    { type: 'separator' },
    { label: '退出', click: quitApp },
  ]);
}

function refreshTrayMenu() {
  if (tray) tray.setContextMenu(buildTrayMenu());
}

function createTray() {
  try {
    const image = nativeImage.createFromPath(assetPath('tray.png'));
    if (image.isEmpty()) return;
    tray = new Tray(image.resize({ width: 22, height: 22 }));
    tray.setToolTip('WhatsApp');
    refreshTrayMenu();
    tray.on('click', toggleWindow);
    tray.on('double-click', showMainWindow);
  } catch (error) {
    console.error('tray unavailable:', error.message);
    tray = null;
  }
}

function quitApp() {
  isQuitting = true;
  app.quit();
}

async function start() {
  await prepareSession();
  const win = createWindow();
  createTray();
  win.loadURL(WEB_APP_URL);
  app.on('activate', () => showMainWindow());
  app.on('before-quit', () => {
    isQuitting = true;
  });
  app.on('window-all-closed', () => {
    if (!tray) app.quit();
  });
}
