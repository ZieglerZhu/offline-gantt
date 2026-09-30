'use strict';
globalThis.Gantt = globalThis.Gantt || {};

(() => {
  const G = globalThis.Gantt;
  function utc(y, m, d) {
    const t = new Date(0);
    t.setUTCFullYear(y, m - 1, d);
    t.setUTCHours(0, 0, 0, 0);
    return t;
  }

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function ymd(t) {
    return `${String(t.getUTCFullYear()).padStart(4, '0')}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
  }

  function parse(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return null;
    }
    const [y, m, d] = value.split('-').map(Number);
    if (y < 1 || y > 9999) {
      return null;
    }
    const t = utc(y, m, d);
    return ymd(t) === value ? Math.floor(t.getTime() / 86400000) : null;
  }

  function fromDay(n) {
    return ymd(new Date(n * 86400000));
  }

  function first(s) {
    return s.slice(0, 7) + '-01';
  }

  function last(s) {
    const [y, m] = s.split('-').map(Number);
    return ymd(utc(y, m + 1, 0));
  }

  function nextMonth(s) {
    const [y, m] = s.split('-').map(Number);
    return ymd(utc(y, m + 1, 1));
  }

  function weeks(s) {
    let day = parse(first(s));
    const end = parse(last(s));
    const out = [];
    while (day <= end) {
      const weekday = (new Date(day * 86400000).getUTCDay() + 6) % 7;
      const finish = Math.min(day + 6 - weekday, end);
      out.push({ label: `W${out.length + 1}`, start: day, end: finish });
      day = finish + 1;
    }
    return out;
  }

  function rangeOK(projects) {
    if (!projects.length) {
      return true;
    }
    const start = projects.reduce((a, p) => p.start < a ? p.start : a, projects[0].start);
    const end = projects.reduce((a, p) => p.end > a ? p.end : a, projects[0].end);
    const [y, m, d] = start.split('-').map(Number);
    return parse(end) <= Math.floor(utc(y + 2, m, d).getTime() / 86400000);
  }

  function localYmd(t = new Date()) {
    return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
  }

  G.date = { parse, fromDay, first, last, nextMonth, weeks, rangeOK, localYmd };
  G.timestamp = function (t = new Date()) {
    return localYmd(t).replaceAll('-', '') + '-' + pad(t.getHours()) + pad(t.getMinutes()) + pad(t.getSeconds());
  };
})();
