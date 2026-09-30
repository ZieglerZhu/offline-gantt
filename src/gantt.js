(() => {
  const G = globalThis.Gantt;
  const NS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs = {}, text) {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      n.setAttribute(k, String(v));
    }
    if (text !== undefined) {
      n.textContent = text;
    }
    return n;
  }

  function line(svg, x, y1, y2, color, width = 1) {
    return svg.append(el('line', {
      x1: x,
      x2: x,
      y1,
      y2,
      stroke: color,
      'stroke-width': width
    }));
  }

  function initializeSvg(svg, projects, L) {
    for (const [k, v] of Object.entries({
      width: L.width,
      height: L.height,
      viewBox: `0 0 ${L.width} ${L.height}`,
      role: 'img',
      'aria-label': `项目甘特图，${projects.length} 个项目，${L.start} 至 ${L.end}`
    })) {
      svg.setAttribute(k, v);
    }
    svg.append(el('style', {}, `text{font-family:${G.font}}`));
    svg.append(el('rect', {
      width: L.width,
      height: L.height,
      fill: '#fff'
    }));
    const defs = el('defs');
    svg.append(defs);
    return defs;
  }

  function drawTimeAxis(svg, L) {
    for (const month of L.months) {
      line(svg, L.x(month.start), 34, L.height - 20, '#e9ecf1');
      svg.append(el('text', {
        x: (L.x(month.start) + L.x(month.end + 1)) / 2,
        y: 36,
        'text-anchor': 'middle',
        fill: '#343944',
        'font-size': 22,
        'font-weight': 600
      }, month.label));
      for (const week of month.weeks) {
        if (week.start !== month.start) {
          line(svg, L.x(week.start), 82, L.height - 20, '#f0f2f5');
        }
        svg.append(el('text', {
          x: (L.x(week.start) + L.x(week.end + 1)) / 2,
          y: 72,
          'text-anchor': 'middle',
          fill: '#a0a6b1',
          'font-size': Math.min(14, Math.max(9, (week.end - week.start + 1) * L.dayWidth * .8))
        }, week.label));
      }
    }
    line(svg, L.x(L.endDay + 1), 34, L.height - 20, '#e9ecf1');
  }

  function appendTaskBar(defs, group, t, i, theme) {
    const grad = el('linearGradient', { id: `gradient-${i}`, x1: 0, y1: 0, x2: 1, y2: 0 });
    grad.append(
      el('stop', { offset: 0, 'stop-color': theme.a }),
      el('stop', { offset: 1, 'stop-color': theme.b })
    );
    defs.append(grad);
    const clip = el('clipPath', { id: `clip-${i}` });
    clip.append(el('rect', {
      x: t.x,
      y: t.y,
      width: t.width,
      height: 54,
      rx: Math.min(14, t.width / 2)
    }));
    defs.append(clip);
    const body = el('g', { 'clip-path': `url(#clip-${i})` });
    body.append(el('rect', {
      x: t.x,
      y: t.y,
      width: t.width,
      height: 54,
      fill: `url(#gradient-${i})`,
      opacity: .58
    }));
    body.append(el('rect', {
      x: t.x,
      y: t.y,
      width: t.width * t.progress / 100,
      height: 54,
      fill: `url(#gradient-${i})`,
      'data-progress': t.progress
    }));
    group.append(body);
  }

  function appendTaskLabels(group, t, theme, measure) {
    const pillText = t.progress + '%';
    const pillWidth = measure(pillText) + 24;
    // 极短项目只省略标签，条形与进度宽度仍按真实日期绘制。
    if (t.width >= pillWidth + 16) {
      const name = G.truncate(t.name, t.width - pillWidth - 44, measure);
      const nameWidth = measure(name);
      if (name) {
        group.append(el('text', {
          x: t.x + 16,
          y: t.y + 33,
          fill: '#fff',
          'font-size': 17,
          'font-weight': 500,
          style: 'paint-order:stroke;stroke:#27334755;stroke-width:1.2px;stroke-linejoin:round'
        }, name));
      }
      const px = t.x + (name ? 16 + nameWidth + 12 : 8);
      group.append(el('rect', {
        x: px,
        y: t.y + 10,
        width: pillWidth,
        height: 34,
        rx: 17,
        fill: '#fff',
        'fill-opacity': .94
      }));
      group.append(el('text', {
        x: px + pillWidth / 2,
        y: t.y + 32,
        'text-anchor': 'middle',
        fill: theme.b,
        'font-size': 16,
        'font-weight': 600
      }, pillText));
    }
  }

  function drawTasks(svg, defs, L) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = `500 17px ${G.font}`;

    function measure(t) {
      return ctx.measureText(t).width;
    }

    for (const [i, t] of L.tasks.entries()) {
      const theme = G.resolveColor(t.color);
      const group = el('g', { 'data-task-id': t.id });
      appendTaskBar(defs, group, t, i, theme);
      appendTaskLabels(group, t, theme, measure);
      group.append(el('title', {}, `${t.name}\n${t.start} ~ ${t.end}\n进度 ${t.progress}%`));
      svg.append(group);
    }
  }

  function drawToday(svg, L, settings) {
    const today = G.date.parse(G.date.localYmd());
    if (settings.showToday && today >= L.startDay && today <= L.endDay) {
      const x = L.x(today) + L.dayWidth / 2;
      line(svg, x, 92, L.height - 20, '#de626b', 2);
      svg.append(el('circle', { cx: x, cy: 92, r: 3, fill: '#de626b' }));
      svg.append(el('text', {
        x: Math.min(L.width - 92, Math.max(8, x - 35)),
        y: 90,
        fill: '#cd626b',
        'font-size': 10
      }, G.date.localYmd()));
    }
  }

  G.renderGantt = function (svg, projects, settings) {
    svg.replaceChildren();
    const L = G.layout(projects, settings.zoom);
    if (!L) {
      return null;
    }
    const defs = initializeSvg(svg, projects, L);
    drawTimeAxis(svg, L);
    drawTasks(svg, defs, L);
    // 今天标记最后追加，使其始终位于任务条上层。
    drawToday(svg, L, settings);
    return L;
  };
})();
