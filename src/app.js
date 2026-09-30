(() => {
  const G = globalThis.Gantt;

  function getElementById(id) {
    return document.getElementById(id);
  }

  const loaded = G.loadConfig();
  let rows = loaded.config.projects.map(project => G.createRow(project));
  let settings = loaded.config.settings;
  let deleted = null;
  let toastTimer;
  let renderFrame;
  let themeIndex = rows.length;

  // 编辑器保留草稿；保存和图表只读取各行最后一次通过校验的有效态。
  function currentConfig() {
    return {
      schemaVersion: 1,
      settings: { ...settings },
      projects: G.projects(rows)
    };
  }

  function showSaveStatus(message, warning = false) {
    getElementById('saveStatus').textContent = message;
    getElementById('saveStatus').classList.toggle('warning', warning);
  }
  showSaveStatus(loaded.message, loaded.warning);

  function saveCurrentConfig() {
    const ok = G.saveConfig(currentConfig());
    showSaveStatus(
      ok
        ? '已自动保存 · ' + new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })
        : '未能自动保存，请导出配置备份',
      !ok
    );
  }

  function showToast(text, undo = false) {
    clearTimeout(toastTimer);
    getElementById('toastText').textContent = text;
    getElementById('undoDelete').hidden = !undo;
    getElementById('toast').hidden = false;
    toastTimer = setTimeout(() => {
      getElementById('toast').hidden = true;
    }, undo ? 7000 : 4500);
  }

  // 图表更新与编辑器重建分开，输入时保持焦点、选区和输入法状态。
  function renderChart() {
    const projects = G.projects(rows);
    const layout = G.renderGantt(getElementById('ganttSvg'), projects, settings);
    getElementById('ganttSvg').toggleAttribute('hidden', !layout);
    getElementById('emptyState').hidden = !!layout;
    getElementById('exportSvg').disabled = getElementById('exportPng').disabled = !layout;
    getElementById('projectCount').textContent = String(projects.length).padStart(2, '0');
    getElementById('rangeLabel').textContent = layout ? `${layout.start} — ${layout.end}` : '等待你的第一个计划';
    getElementById('showToday').checked = settings.showToday;
    getElementById('zoomLabel').textContent = Math.round(settings.zoom * 100) + '%';
    getElementById('zoomOut').disabled = settings.zoom === G.zoomLevels[0];
    getElementById('zoomIn').disabled = settings.zoom === G.zoomLevels.at(-1);
  }

  function scheduleChartRender() {
    cancelAnimationFrame(renderFrame);
    renderFrame = requestAnimationFrame(renderChart);
  }

  function renderEditor() {
    G.renderRows(getElementById('projectRows'), rows);
    getElementById('rowCount').textContent = rows.length;
    getElementById('editorEmpty').hidden = !!rows.length;
  }

  function refreshAfterRowChange() {
    saveCurrentConfig();
    renderEditor();
    renderChart();
  }

  function addProject() {
    rows.push(G.createRow(null, themeIndex++));
    renderEditor();
    const last = getElementById('projectRows').lastElementChild;
    last.querySelector('[data-key=name]').focus();
    last.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function updateDraft(event) {
    if (event.isComposing) {
      return;
    }
    const input = event.target;
    const key = input.dataset.key;
    if (!key) {
      return;
    }
    const rowElement = input.closest('.project-row');
    const row = rows.find(candidate => candidate.id === rowElement.dataset.id);
    if (!row) {
      return;
    }
    if (key === 'theme') {
      row.draft.color = input.value === 'custom'
        ? {
          mode: 'custom',
          customBase: rowElement.querySelector('[data-key=customBase]').value
        }
        : { mode: 'preset', presetId: input.value };
      rowElement.querySelector('[data-key=customBase]').hidden = input.value !== 'custom';
    } else if (key === 'customBase') {
      row.draft.color = { mode: 'custom', customBase: input.value };
    } else {
      row.draft[key] = input.value;
    }
    if (G.commitRow(rows, row)) {
      saveCurrentConfig();
      scheduleChartRender();
    }
    G.renderErrors(rowElement, row);
  }

  function moveRow(id, target) {
    const index = rows.findIndex(row => row.id === id);
    if (index < 0 || target < 0 || target >= rows.length) {
      return;
    }
    const [row] = rows.splice(index, 1);
    rows.splice(target, 0, row);
    refreshAfterRowChange();
  }

  function deleteRow(index) {
    deleted = {
      row: structuredClone(rows[index]),
      index,
      expiresAt: Date.now() + 7000
    };
    rows.splice(index, 1);
    refreshAfterRowChange();
    showToast(`已删除“${deleted.row.draft.name||'未命名项目'}”`, true);
  }

  function handleRowAction(event) {
    const button = event.target.closest('[data-action]');
    if (!button) {
      return;
    }
    const rowElement = button.closest('.project-row');
    const index = rows.findIndex(row => row.id === rowElement.dataset.id);
    const action = button.dataset.action;
    if (action === 'up' || action === 'down') {
      moveRow(rowElement.dataset.id, index + (action === 'up' ? -1 : 1));
      const movedElement = [...getElementById('projectRows').children].find(node => node.dataset.id === rowElement.dataset.id);
      movedElement?.querySelector(`[data-action=${action}]`)?.focus();
    }
    if (action === 'delete') {
      deleteRow(index);
    }
  }

  function undoDelete() {
    const error = G.restoreDeleted(rows, deleted);
    if (error) {
      getElementById('toastText').textContent = error;
      return;
    }
    deleted = null;
    refreshAfterRowChange();
    showToast('项目已恢复');
  }

  function changeZoom(delta) {
    const next = G.zoomLevels[G.zoomLevels.indexOf(settings.zoom) + delta];
    if (next) {
      settings.zoom = next;
      saveCurrentConfig();
      renderChart();
    }
  }

  // 导出前同步刷新，避免读取尚未由下一帧更新的图表。
  function exportSvg() {
    renderChart();
    G.exportSvg(getElementById('ganttSvg'));
  }

  async function exportPng() {
    renderChart();
    const button = getElementById('exportPng');
    button.disabled = true;
    button.textContent = '正在生成…';
    try {
      const blob = await G.pngBlob(getElementById('ganttSvg'));
      G.download(blob, 'gantt-' + G.timestamp() + '.png');
      showToast('PNG 已生成');
    } catch (error) {
      showToast('PNG 生成失败，请尝试 SVG：' + error.message);
    } finally {
      button.disabled = !G.projects(rows).length;
      button.textContent = '↓ 下载 PNG';
    }
  }

  function applyImportedConfig(next) {
    rows = next.projects.map(project => G.createRow(project));
    settings = next.settings;
    themeIndex = rows.length;
    deleted = null;
    refreshAfterRowChange();
    showToast('配置已导入');
  }

  async function importConfig(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    try {
      const next = G.validateConfig(JSON.parse(await file.text()));
      getElementById('importMessage').textContent = `当前有 ${rows.length} 个编辑项目。导入后将替换为 ${next.projects.length} 个项目。`;
      const dialog = getElementById('importDialog');
      dialog.returnValue = 'cancel';
      dialog.showModal();
      // 校验后的配置暂存在本次回调中，只有确认关闭对话框才替换当前状态。
      dialog.addEventListener('close', () => {
        if (dialog.returnValue !== 'confirm') {
          return;
        }
        applyImportedConfig(next);
      }, { once: true });
    } catch (error) {
      showToast('无法导入：' + error.message);
    }
  }

  // 统一绑定页面事件；行输入采用委托，编辑器重建后无需重新绑定。
  getElementById('addProject').onclick = getElementById('emptyAdd').onclick = addProject;
  getElementById('projectRows').addEventListener('input', updateDraft);
  getElementById('projectRows').addEventListener('change', updateDraft);
  getElementById('projectRows').addEventListener('compositionend', updateDraft);
  getElementById('projectRows').onclick = handleRowAction;
  G.setupDrag(getElementById('projectRows'), moveRow);
  getElementById('undoDelete').onclick = undoDelete;
  getElementById('showToday').onchange = event => {
    settings.showToday = event.target.checked;
    saveCurrentConfig();
    renderChart();
  };
  getElementById('zoomOut').onclick = () => changeZoom(-1);
  getElementById('zoomIn').onclick = () => changeZoom(1);
  getElementById('exportJson').onclick = () => G.exportJson(currentConfig());
  getElementById('exportSvg').onclick = exportSvg;
  getElementById('exportPng').onclick = exportPng;
  getElementById('importJson').onclick = () => getElementById('fileInput').click();
  getElementById('fileInput').onchange = importConfig;

  let lastToday = G.date.localYmd();

  function refreshToday() {
    const today = G.date.localYmd();
    if (today !== lastToday) {
      lastToday = today;
      renderChart();
    }
  }
  setInterval(refreshToday, 30000);
  document.addEventListener('visibilitychange', refreshToday);
  renderEditor();
  renderChart();
})();
