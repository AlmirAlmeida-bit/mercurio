// Preload das abas de sites. Só faz algo na página de login do Google: completa a identidade de Chrome que o Google
// confere antes de aceitar o login (window.chrome e a marca "Google Chrome"); sem isso aparece "Este navegador ou app
// pode não ser seguro". Os cabeçalhos equivalentes são ajustados no main.js (LOGIN_BRANDS). Nada é exposto à página.
const { contextBridge } = require('electron');

if (location.hostname === 'accounts.google.com') {
  contextBridge.executeInMainWorld({
    func: () => {
      const c = window.chrome || (window.chrome = {});
      c.app ??= {
        isInstalled: false,
        InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
        RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' },
        getDetails: () => null,
        getIsInstalled: () => false,
      };
      c.runtime ??= {};
      c.csi ??= () => ({ startE: performance.timeOrigin, onloadT: Date.now(), pageT: performance.now(), tran: 15 });
      c.loadTimes ??= () => ({});
      const d = navigator.userAgentData;
      if (!d) return;
      const proto = Object.getPrototypeOf(d);
      const withChrome = list => [{ brand: 'Google Chrome', version: list.find(b => b.brand === 'Chromium')?.version ?? '' }, ...list];
      const brands = withChrome(d.brands);
      Object.defineProperty(proto, 'brands', { get: () => brands });
      const high = proto.getHighEntropyValues;
      proto.getHighEntropyValues = function (hints) {
        return high.call(this, hints).then(v => {
          if (v.brands) v.brands = brands;
          if (v.fullVersionList) v.fullVersionList = withChrome(v.fullVersionList);
          return v;
        });
      };
    },
  });
}
