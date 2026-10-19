# WhatsApp

个人用的 Ubuntu 桌面窗口。里面打开的是 [WhatsApp Web](https://web.whatsapp.com/)，登录状态保存在本机，关闭窗口会留在托盘里。

这不是 Meta 的官方客户端。

## 使用

```bash
npm install
npm start
npm run install-launcher
```

`install-launcher` 会在应用菜单里放一个带自己图标的 WhatsApp。再点一次图标会回到已经打开的窗口。

登录用手机扫码，和浏览器里一样。会话（Cookie、IndexedDB）在 `~/.config/whatsapp`。不要把这个目录拷给别人，里面就是已登录的账号。删掉它等于退出登录。

## 桌面行为

- 点窗口关闭：缩进托盘，不退出。托盘菜单里的「退出」，或 `Ctrl+Q`，才会真正退出。
- `Ctrl+W`：隐藏到托盘。
- `Ctrl+=` 放大，`Ctrl+-` 缩小，`Ctrl+0` 回到 100%。
- 新消息走系统通知。点通知会把窗口叫回来。标题里出现未读数时，托盘提示会写成「WhatsApp · N 条未读」。
- 下载的文件直接进「下载」文件夹。
- 语音和视频通话会用到麦克风、摄像头。系统如果再弹一次访问确认，允许即可。
- 窗口大小和缩放会记在 `~/.config/whatsapp/window.json`。

## 安装

Ubuntu 26.04：

```bash
sudo curl -fsSL https://apt.mltz.tech/key.gpg -o /usr/share/keyrings/mltz.gpg
echo "deb [signed-by=/usr/share/keyrings/mltz.gpg] https://apt.mltz.tech resolute main" | sudo tee /etc/apt/sources.list.d/mltz.list
sudo apt-get update
sudo apt-get install whatsapp
```

Ubuntu 24.04 把套件名 `resolute` 换成 `noble`。安装后的程序和 `npm start` 共用 `~/.config/whatsapp`。

## 发布

在 GitHub 上发布一个形如 `v1.2.3` 的 Release。Actions 会编译 `whatsapp_<版本>_amd64.deb`，挂到这个 Release 上，并推到 apt 的 `resolute` 和 `noble`。

仓库是公开的。SSH 私钥、主机和 known_hosts 只放在 GitHub 环境 `apt` 里，并且这个环境只接受 `v*` 标签。部署用的密钥在服务器上只能执行发布命令，不能登录 shell。

`0.1.0` 已经在 apt 里。下一次 Release 要用更高的版本号，同一个版本号不能换成另一个 deb。
