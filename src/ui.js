(() => {
  const G = globalThis.Gantt;
  function node(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) {
      n.className = cls;
    }
    if (text !== undefined) {
      n.textContent = text;
    }
    return n;
  }

  function createInput(row, key) {
    const input = node('input');
    input.dataset.key = key;
    input.type = key === 'start' || key === 'end' ? 'date' : key === 'progress' ? 'number' : 'text';
    input.value = row.draft[key];
    input.setAttribute('aria-label', {
      name: '项目名称',
      start: '开始日期',
      end: '结束日期',
      progress: '当前进度'
    }[key]);
    if (key === 'name') {
      input.placeholder = '输入项目名称';
    }
    if (key === 'progress') {
      input.min = '0';
      input.max = '100';
      input.step = '1';
    }
    if (key === 'start' || key === 'end') {
      input.min = '0001-01-01';
      input.max = '9999-12-31';
    }
    return input;
  }

  function createColorControl(row) {
    const control = node('div', 'color-control');
    const select = node('select');
    select.dataset.key = 'theme';
    select.setAttribute('aria-label', '颜色主题');
    for (const t of G.themes) {
      const opt = node('option', '', t.name);
      opt.value = t.id;
      select.append(opt);
    }
    const custom = node('option', '', '自定义');
    custom.value = 'custom';
    select.append(custom);
    select.value = row.draft.color.mode === 'custom' ? 'custom' : row.draft.color.presetId;
    const color = node('input');
    color.type = 'color';
    color.dataset.key = 'customBase';
    color.value = row.draft.color.customBase || '#638be0';
    color.hidden = select.value !== 'custom';
    color.setAttribute('aria-label', '自定义主色');
    control.append(select, color);
    return control;
  }

  function appendError(field, index, key) {
    const error = node('span', 'error');
    error.id = `error-${index}-${key}`;
    field.append(error);
    field.querySelectorAll('input,select').forEach(n => n.setAttribute('aria-describedby', error.id));
  }

  function createField(row, index, key) {
    const field = node('div', 'field');
    field.dataset.field = key;
    field.append(key === 'color' ? createColorControl(row) : createInput(row, key));
    appendError(field, index, key);
    return field;
  }

  function createActions(index, count) {
    const actions = node('div', 'row-actions');
    for (const [action, text, label] of [['up', '↑', '上移'], ['down', '↓', '下移'], ['delete', '×', '删除项目']]) {
      const b = node('button', 'icon-button ' + action, text);
      b.dataset.action = action;
      b.setAttribute('aria-label', label);
      b.disabled = action === 'up' && index === 0 || action === 'down' && index === count - 1;
      actions.append(b);
    }
    return actions;
  }

  function createRow(row, index, count) {
    const div = node('div', 'project-row');
    div.dataset.id = row.id;
    const handle = node('button', 'icon-button handle', '⠿');
    handle.dataset.action = 'drag';
    handle.setAttribute('aria-label', '拖拽排序');
    div.append(handle);
    for (const key of ['name', 'start', 'end', 'progress', 'color']) {
      div.append(createField(row, index, key));
    }
    div.append(createActions(index, count));
    return div;
  }

  G.renderRows = function (host, rows) {
    host.replaceChildren();
    rows.forEach((row, index) => {
      const div = createRow(row, index, rows.length);
      host.append(div);
      G.renderErrors(div, row);
    });
  };

  G.renderErrors = function (div, row) {
    for (const field of div.querySelectorAll('[data-field]')) {
      const error = row.errors[field.dataset.field] || '';
      field.querySelector('.error').textContent = error;
      field.querySelectorAll('input,select').forEach(n => n.setAttribute('aria-invalid', String(!!error)));
    }
  };

  G.setupDrag = function (host, move) {
    let drag = null;
    let frame = null;

    function clearDropMarkers() {
      host.querySelectorAll('.drop-before,.drop-after').forEach(n => n.classList.remove('drop-before', 'drop-after'));
    }

    function locateTarget(y) {
      if (!drag) {
        return;
      }
      clearDropMarkers();
      // 目标下标按排除拖拽行后的列表计算，直接交给移动操作。
      const others = [...host.children].filter(n => n.dataset.id !== drag.id);
      const next = others.find(n => y < n.getBoundingClientRect().top + n.getBoundingClientRect().height / 2);
      drag.target = next ? others.indexOf(next) : others.length;
      if (next) {
        next.classList.add('drop-before');
      } else {
        others.at(-1)?.classList.add('drop-after');
      }
    }

    function tick() {
      if (!drag) {
        return;
      }
      if (drag.active) {
        const delta = drag.y < 70 ? -12 : drag.y > innerHeight - 70 ? 12 : 0;
        if (delta) {
          window.scrollBy(0, delta);
          locateTarget(drag.y);
        }
      }
      frame = requestAnimationFrame(tick);
    }

    function startDrag(e) {
      const handle = e.target.closest('[data-action=drag]');
      if (!handle || e.button !== 0) {
        return;
      }
      const row = handle.closest('.project-row');
      drag = {
        id: row.dataset.id,
        startY: e.clientY,
        y: e.clientY,
        target: [...host.children].indexOf(row),
        active: false,
        pointer: e.pointerId
      };
      handle.setPointerCapture(e.pointerId);
      frame = requestAnimationFrame(tick);
    }

    function updateDrag(e) {
      if (!drag || e.pointerId !== drag.pointer) {
        return;
      }
      drag.y = e.clientY;
      if (Math.abs(e.clientY - drag.startY) > 5) {
        drag.active = true;
      }
      if (drag.active) {
        e.preventDefault();
        [...host.children].find(n => n.dataset.id === drag.id)?.classList.add('dragging');
        locateTarget(e.clientY);
      }
    }

    function finishDrag(commit) {
      if (!drag) {
        return;
      }
      const old = drag;
      // 先清理拖拽状态和样式，再提交排序；取消时只做清理。
      drag = null;
      cancelAnimationFrame(frame);
      clearDropMarkers();
      host.querySelector('.dragging')?.classList.remove('dragging');
      if (commit && old.active) {
        move(old.id, old.target);
      }
    }

    host.addEventListener('pointerdown', startDrag);
    host.addEventListener('pointermove', updateDrag);
    host.addEventListener('pointerup', () => finishDrag(true));
    host.addEventListener('pointercancel', () => finishDrag(false));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        finishDrag(false);
      }
    });
  };
})();
