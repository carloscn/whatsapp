#!/usr/bin/env node
'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const iconSrc = path.join(root, 'assets', 'icon.png');
const launcher = path.join(root, 'scripts', 'launch.sh');
const home = os.homedir();
const iconName = 'dev.carloscn.whatsapp';
const iconDir = path.join(home, '.local/share/icons/hicolor/512x512/apps');
const appsDir = path.join(home, '.local/share/applications');

if (!fs.existsSync(path.join(root, 'node_modules', 'electron', 'dist', 'electron'))) {
  console.error('还没有安装 Electron。先在仓库里运行 npm install。');
  process.exit(1);
}

fs.mkdirSync(iconDir, { recursive: true });
fs.mkdirSync(appsDir, { recursive: true });
fs.copyFileSync(iconSrc, path.join(iconDir, `${iconName}.png`));
fs.chmodSync(launcher, 0o755);

const desktop = `[Desktop Entry]
Version=1.0
Type=Application
Name=WhatsApp
GenericName=WhatsApp
Comment=个人 WhatsApp 桌面版
Exec=${launcher}
Icon=${iconName}
Terminal=false
Categories=Network;InstantMessaging;
StartupWMClass=whatsapp
StartupNotify=true
`;

const desktopPath = path.join(appsDir, `${iconName}.desktop`);
fs.writeFileSync(desktopPath, desktop);
fs.chmodSync(desktopPath, 0o644);

try {
  execFileSync('update-desktop-database', [appsDir], { stdio: 'ignore' });
} catch {
  // The desktop file still works without the cache refresh.
}

try {
  execFileSync('gtk-update-icon-cache', ['-f', '-t', path.join(home, '.local/share/icons/hicolor')], {
    stdio: 'ignore',
  });
} catch {
  // Icon caches are optional on this desktop.
}

console.log(`已写入 ${desktopPath}`);
console.log('从应用菜单打开 WhatsApp。登录会留在 ~/.config/whatsapp');
