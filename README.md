# WhatsApp

A personal Ubuntu desktop window for [WhatsApp Web](https://web.whatsapp.com/). The login stays on this computer, and closing the window leaves the app in the tray.

This is not an official Meta client.

## Run from source

```bash
npm install
npm start
npm run install-launcher
```

`install-launcher` adds WhatsApp to the application menu with its own icon. Opening that icon again brings back the window that is already running.

Sign in by scanning the QR code with your phone, the same way as in a browser. The session (cookies and IndexedDB) is stored in `~/.config/whatsapp`. Do not copy that directory to anyone else; it is the logged-in account. Deleting it signs you out.

## Desktop behavior

- Closing the window hides it in the tray. Quit from the tray menu, or press `Ctrl+Q`.
- Use “显示窗口/隐藏窗口” in the tray menu to toggle the window. Clicking the tray icon also toggles it when the desktop supports tray clicks.
- The native title bar shows the installed application version.
- `Ctrl+W` hides the window in the tray.
- `Ctrl+=` zooms in, `Ctrl+-` zooms out, and `Ctrl+0` returns to 100%.
- New messages use system notifications. Clicking a notification brings the window back. When the title shows an unread count, the tray tooltip reads “WhatsApp · N unread”.
- Downloads go straight to the Downloads folder.
- Voice and video calls use the microphone and camera. If the system asks for access, allow it.
- Window size and zoom are saved in `~/.config/whatsapp/window.json`.

## Install

Ubuntu 26.04:

```bash
sudo curl -fsSL https://apt.mltz.tech/key.gpg -o /usr/share/keyrings/mltz.gpg
echo "deb [signed-by=/usr/share/keyrings/mltz.gpg] https://apt.mltz.tech resolute main" | sudo tee /etc/apt/sources.list.d/mltz.list
sudo apt-get update
sudo apt-get install whatsapp
```

On Ubuntu 24.04, use the suite name `noble` instead of `resolute`. The installed package shares `~/.config/whatsapp` with `npm start`.

## Release

Publish a GitHub Release tagged like `v1.2.3`. Actions builds `whatsapp_<version>_amd64.deb`, attaches it to that Release, and publishes it to the `resolute` and `noble` apt suites.

This repository is public. The SSH private key, host, and known_hosts file live only in the GitHub `apt` environment, and that environment accepts only `v*` tags. The deploy key on the server can run the publish command and cannot open a shell.

Each Release needs a higher semantic version. The same version cannot be replaced with a different deb.
