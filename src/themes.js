(() => {
  const G = globalThis.Gantt;
  G.themes = [
    ['blue-purple', '蓝紫', '#638be0', '#7955ca'],
    ['cyan-blue', '青蓝', '#299eb7', '#356cab'],
    ['purple-magenta', '紫粉', '#9465cc', '#b14d88'],
    ['teal', '青绿', '#2a9d96', '#247481'],
    ['orange-red', '橙红', '#d98b42', '#ca5869'],
    ['sky-indigo', '天蓝', '#4898cf', '#5365bd'],
    ['lavender', '淡紫', '#a17acb', '#7655ad'],
    ['rose', '玫瑰', '#cc718c', '#b34f70'],
    ['olive', '橄榄', '#8c9c50', '#5c865e'],
    ['slate', '雾蓝', '#6b93ac', '#536e95']
  ].map(([id, name, a, b]) => ({ id, name, a, b }));

  G.validColor = function (c) {
    return !!c && (
      c.mode === 'preset'
        ? G.themes.some(t => t.id === c.presetId)
        : c.mode === 'custom' && /^#[0-9a-f]{6}$/i.test(c.customBase)
    );
  };

  function custom(hex) {
    const [r, g, b] = hex.slice(1).match(/../g).map(x => parseInt(x, 16) / 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let h = 0;
    const l = (max + min) / 2;
    if (delta) {
      h = (
        max === r
          ? ((g - b) / delta + 6) % 6
          : max === g
            ? (b - r) / delta + 2
            : (r - g) / delta + 4
      ) * 60;
    }
    const s = delta ? delta / (1 - Math.abs(2 * l - 1)) : 0;

    function color(dh, dl) {
      return `hsl(${(h + dh + 360) % 360} ${Math.min(75, Math.max(25, s * 100))}% ${Math.min(55, Math.max(32, l * 100)) + dl}%)`;
    }

    return { a: color(-8, 0), b: color(8, -8) };
  }

  G.resolveColor = function (c) {
    return c.mode === 'custom'
      ? custom(c.customBase)
      : G.themes.find(t => t.id === c.presetId);
  };
})();
