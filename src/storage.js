(() => {
  const G = globalThis.Gantt;
  G.storageKey = 'offline-project-gantt:v1';

  G.loadConfig = function () {
    try {
      const raw = localStorage.getItem(G.storageKey);
      return {
        config: raw ? G.validateConfig(JSON.parse(raw)) : G.emptyConfig(),
        message: raw ? '已恢复本地保存的计划' : '数据仅保存在你的设备上'
      };
    } catch {
      return {
        config: G.emptyConfig(),
        message: '本地数据无法读取，已使用空白配置；原数据未自动覆盖',
        warning: true
      };
    }
  };

  G.saveConfig = function (config) {
    try {
      localStorage.setItem(G.storageKey, JSON.stringify(config));
      return true;
    } catch {
      return false;
    }
  };
})();
