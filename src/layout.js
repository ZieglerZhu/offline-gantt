(() => {
  const G = globalThis.Gantt;
  G.font = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", "PingFang SC", Arial, sans-serif';

  G.layout = function (projects, zoom) {
    if (!projects.length) {
      return null;
    }
    const start = G.date.first(projects.reduce((a, p) => p.start < a ? p.start : a, projects[0].start));
    const end = G.date.last(projects.reduce((a, p) => p.end > a ? p.end : a, projects[0].end));
    const startDay = G.date.parse(start);
    const endDay = G.date.parse(end);
    const dayWidth = 9 * zoom;

    function x(day) {
      return 32 + (day - startDay) * dayWidth;
    }

    const months = [];
    let current = start;
    while (G.date.parse(current) !== null && current <= end) {
      months.push({
        label: current.slice(0, 7),
        start: G.date.parse(current),
        end: G.date.parse(G.date.last(current)),
        weeks: G.date.weeks(current)
      });
      current = G.date.nextMonth(current);
    }
    return {
      start,
      end,
      startDay,
      endDay,
      dayWidth,
      x,
      months,
      width: 64 + (endDay - startDay + 1) * dayWidth,
      height: 126 + projects.length * 84,
      tasks: projects.map((p, i) => ({
        ...p,
        x: x(G.date.parse(p.start)),
        y: 110 + i * 84,
        width: (G.date.parse(p.end) - G.date.parse(p.start) + 1) * dayWidth
      }))
    };
  };

  G.truncate = function (text, maxWidth, measure) {
    if (measure(text) <= maxWidth) {
      return text;
    }
    if (measure('…') > maxWidth) {
      return '';
    }
    const parts = typeof Intl.Segmenter === 'function'
      ? Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text), s => s.segment)
      : Array.from(text);
    let lo = 0;
    let hi = parts.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (measure(parts.slice(0, mid).join('') + '…') <= maxWidth) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    return parts.slice(0, lo).join('') + '…';
  };
})();
