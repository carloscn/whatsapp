(() => {
  if (window.__waDesktopHook) return;
  window.__waDesktopHook = true;

  const chromeMajor = '__CHROME_MAJOR__';
  const brands = [
    { brand: 'Chromium', version: chromeMajor },
    { brand: 'Google Chrome', version: chromeMajor },
    { brand: 'Not-A.Brand', version: '99' },
  ];
  const userAgent = navigator.userAgent.replace(/\s*Electron\/[\d.]+\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
  if (userAgent !== navigator.userAgent) {
    Object.defineProperty(navigator, 'userAgent', { configurable: true, get: () => userAgent });
  }
  if (navigator.userAgentData) {
    const nativeData = navigator.userAgentData;
    const fakeData = {
      brands,
      mobile: false,
      platform: 'Linux',
      getHighEntropyValues: (hints) => nativeData.getHighEntropyValues(hints).then((values) => ({
        ...values,
        brands,
        fullVersionList: brands.map((item) => ({ brand: item.brand, version: `${item.version}.0.0.0` })),
        platform: 'Linux',
        mobile: false,
      })),
      toJSON() {
        return { brands, mobile: false, platform: 'Linux' };
      },
    };
    Object.defineProperty(navigator, 'userAgentData', { configurable: true, get: () => fakeData });
  }

  const Native = window.Notification;
  if (typeof Native !== 'function') return;

  function WrappedNotification(title, options) {
    const notification = new Native(title, options);
    notification.addEventListener('click', () => {
      console.info('__WA_DESKTOP_NOTIFY_CLICK__');
    });
    return notification;
  }

  WrappedNotification.prototype = Native.prototype;
  Object.setPrototypeOf(WrappedNotification, Native);

  Object.defineProperty(WrappedNotification, 'permission', {
    configurable: true,
    enumerable: true,
    get() {
      return Native.permission;
    },
  });

  WrappedNotification.requestPermission = (callback) => Native.requestPermission(callback);

  if (Object.prototype.hasOwnProperty.call(Native, 'maxActions')) {
    Object.defineProperty(WrappedNotification, 'maxActions', {
      get() {
        return Native.maxActions;
      },
    });
  }

  window.Notification = WrappedNotification;

  if (Native.permission === 'default') {
    const pending = Native.requestPermission();
    if (pending && typeof pending.catch === 'function') pending.catch(() => {});
  }
})();
