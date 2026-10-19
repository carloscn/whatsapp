#!/bin/sh
cd "$(dirname "$0")/.." || exit 1

electron=./node_modules/electron/dist/electron
sandbox=./node_modules/electron/dist/chrome-sandbox

if [ ! -x "$electron" ]; then
  echo "还没有安装 Electron。先运行 npm install，再运行 node node_modules/electron/install.js" >&2
  exit 1
fi

# Wayland + Vulkan crashes this Electron build on Ubuntu. XWayland is stable
# here and still gets the tray icon. Ubuntu also blocks the user namespace
# sandbox unless chrome-sandbox is setuid root.
set -- --ozone-platform=x11 --disable-vulkan
if [ ! -u "$sandbox" ]; then
  set -- "$@" --no-sandbox
fi

exec "$electron" "$@" .
