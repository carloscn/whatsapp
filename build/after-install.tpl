#!/bin/bash

# Menu launches go through this wrapper so Ozone and Vulkan flags exist before
# Electron starts. A symlink to the raw binary skips those flags.
rm -f '/usr/bin/${executable}'
cat > '/usr/bin/${executable}' << EOF
#!/bin/sh
exec '/opt/${sanitizedProductName}/${executable}' --ozone-platform=x11 --disable-vulkan "\$@"
EOF
chmod 755 '/usr/bin/${executable}'

# Electron aborts when chrome-sandbox exists but is not setuid root, even if
# user namespaces work. apt runs this script as root.
chown root:root '/opt/${sanitizedProductName}/chrome-sandbox' || true
chmod 4755 '/opt/${sanitizedProductName}/chrome-sandbox' || true

if hash update-mime-database 2>/dev/null; then
    update-mime-database /usr/share/mime || true
fi

if hash update-desktop-database 2>/dev/null; then
    update-desktop-database /usr/share/applications || true
fi

if apparmor_status --enabled > /dev/null 2>&1; then
  APPARMOR_PROFILE_SOURCE='/opt/${sanitizedProductName}/resources/apparmor-profile'
  APPARMOR_PROFILE_TARGET='/etc/apparmor.d/${executable}'
  if apparmor_parser --skip-kernel-load --debug "$APPARMOR_PROFILE_SOURCE" > /dev/null 2>&1; then
    cp -f "$APPARMOR_PROFILE_SOURCE" "$APPARMOR_PROFILE_TARGET"
    if ! { [ -x '/usr/bin/ischroot' ] && /usr/bin/ischroot; } && hash apparmor_parser 2>/dev/null; then
      apparmor_parser --replace --write-cache --skip-read-cache "$APPARMOR_PROFILE_TARGET"
    fi
  else
    echo "Skipping the installation of the AppArmor profile as this version of AppArmor does not seem to support the bundled profile"
  fi
fi
