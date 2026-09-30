(() => {
  const G = globalThis.Gantt;
  G.zoomLevels = [0.65, 0.8, 1, 1.25, 1.5];

  G.emptyConfig = function () {
    return {
      schemaVersion: 1,
      settings: {
        showToday: true,
        zoom: 1
      },
      projects: []
    };
  };

  G.projects = function (rows) {
    return rows.flatMap(r => r.valid ? [r.valid] : []);
  };

  G.createRow = function (project = null, index = 0) {
    return {
      id: project?.id || 'p_' + crypto.randomUUID(),
      draft: project
        ? {
          ...structuredClone(project),
          progress: String(project.progress)
        }
        : {
          name: '',
          start: '',
          end: '',
          progress: '0',
          color: {
            mode: 'preset',
            presetId: G.themes[index % G.themes.length].id
          }
        },
      valid: project ? structuredClone(project) : null,
      errors: {}
    };
  };

  G.validateDraft = function (d) {
    const e = {};
    if (typeof d.name !== 'string' || !d.name.trim()) {
      e.name = '请输入项目名称';
    }
    if (G.date.parse(d.start) === null) {
      e.start = '请选择有效的开始日期';
    }
    if (G.date.parse(d.end) === null) {
      e.end = '请选择有效的结束日期';
    }
    if (!e.start && !e.end && d.start > d.end) {
      e.end = '结束日期不能早于开始日期';
    }
    if (
      String(d.progress).trim() === '' ||
      !Number.isInteger(Number(d.progress)) ||
      Number(d.progress) < 0 ||
      Number(d.progress) > 100
    ) {
      e.progress = '进度必须为 0～100 的整数';
    }
    if (!G.validColor(d.color)) {
      e.color = '请选择有效颜色';
    }
    return e;
  };

  G.commitRow = function (rows, row) {
    row.errors = G.validateDraft(row.draft);
    if (Object.keys(row.errors).length) {
      return false;
    }
    const p = {
      id: row.id,
      name: row.draft.name.trim(),
      start: row.draft.start,
      end: row.draft.end,
      progress: Number(row.draft.progress),
      color: structuredClone(row.draft.color)
    };
    const candidates = rows.flatMap(r => r === row ? [p] : r.valid ? [r.valid] : []);
    if (!G.date.rangeOK(candidates)) {
      row.errors.start = row.errors.end = '所有项目的整体跨度不能超过 2 年';
      return false;
    }
    row.valid = p;
    return true;
  };

  G.validateConfig = function (value) {
    if (!value || value.schemaVersion !== 1) {
      throw Error('不支持的配置版本');
    }
    if (
      !value.settings ||
      typeof value.settings.showToday !== 'boolean' ||
      !G.zoomLevels.includes(value.settings.zoom)
    ) {
      throw Error('显示设置不合法');
    }
    if (!Array.isArray(value.projects)) {
      throw Error('projects 必须是数组');
    }
    const ids = new Set();
    const projects = value.projects.map((p, i) => {
      if (!p || typeof p.id !== 'string' || !p.id.trim() || ids.has(p.id)) {
        throw Error(`第 ${i + 1} 个项目的 ID 无效或重复`);
      }
      ids.add(p.id);
      if (typeof p.progress !== 'number' || Object.keys(G.validateDraft(p)).length) {
        throw Error(`第 ${i + 1} 个项目的数据不合法`);
      }
      const color = p.color.mode === 'preset'
        ? {
          mode: 'preset',
          presetId: p.color.presetId
        }
        : {
          mode: 'custom',
          customBase: p.color.customBase
        };
      return {
        id: p.id,
        name: p.name.trim(),
        start: p.start,
        end: p.end,
        progress: p.progress,
        color
      };
    });
    if (!G.date.rangeOK(projects)) {
      throw Error('所有项目的整体跨度不能超过 2 年');
    }
    return {
      schemaVersion: 1,
      settings: {
        showToday: value.settings.showToday,
        zoom: value.settings.zoom
      },
      projects
    };
  };

  G.restoreDeleted = function (rows, snapshot, now = Date.now()) {
    if (!snapshot || now > snapshot.expiresAt) {
      return '撤销已过期';
    }
    const next = rows.slice();
    next.splice(Math.min(snapshot.index, next.length), 0, snapshot.row);
    if (!G.date.rangeOK(G.projects(next))) {
      return '恢复后整体跨度超过 2 年，请先调整日期';
    }
    rows.splice(0, rows.length, ...next);
    return '';
  };
})();
