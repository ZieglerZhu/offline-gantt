(() => {
  const G = globalThis.Gantt;

  G.download = function (blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  G.serializeSvg = function (svg) {
    const copy = svg.cloneNode(true);
    copy.removeAttribute('hidden');
    copy.querySelectorAll('title').forEach(n => n.remove());
    copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    return new XMLSerializer().serializeToString(copy);
  };

  G.exportSvg = function (svg) {
    return G.download(
      new Blob([G.serializeSvg(svg)], { type: 'image/svg+xml;charset=utf-8' }),
      'gantt-' + G.timestamp() + '.svg'
    );
  };

  G.pngBlob = async function (svg) {
    const width = Number(svg.getAttribute('width'));
    const height = Number(svg.getAttribute('height'));
    const scale = Math.min(2, Math.sqrt(24000000 / (width * height)), 16000 / width, 16000 / height);
    const url = URL.createObjectURL(new Blob([G.serializeSvg(svg)], { type: 'image/svg+xml;charset=utf-8' }));
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(width * scale));
      canvas.height = Math.max(1, Math.floor(height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw Error('无法创建画布，请尝试下载 SVG');
      }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) {
        throw Error('图片过大，请尝试下载 SVG');
      }
      return blob;
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  G.exportJson = function (config) {
    return G.download(
      new Blob([JSON.stringify({ ...config, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' }),
      'gantt-config-' + G.timestamp() + '.json'
    );
  };
})();
