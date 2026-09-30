import { readFile, writeFile } from 'node:fs/promises';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);

function read(p) {
  return readFile(new URL(p, root), 'utf8');
}

// 按数组顺序内联独立 script；date 初始化 Gantt，其余模块扩展它，app 最后启动。
// 共享接口留在 Gantt 上，模块内部的辅助函数留在各自 IIFE 内。
const files = [
  'date',    // date（日期工具）、timestamp
  'themes',  // themes、validColor、resolveColor
  'model',   // zoomLevels、emptyConfig、projects、createRow、validateDraft、commitRow、validateConfig、restoreDeleted
  'layout',  // font、layout、truncate
  'gantt',   // renderGantt
  'storage', // storageKey、loadConfig、saveConfig
  'export',  // download、serializeSvg、exportSvg、pngBlob、exportJson
  'ui',      // renderRows、renderErrors、setupDrag
  'app'      // 消费以上接口，持有页面状态并绑定事件
];

const scripts = await Promise.all(files.map(async name => {
  const code = await read(`src/${name}.js`);
  new vm.Script(code, { filename: name + '.js' });
  return `<script>\n/* ${name}.js */\n${code.replace(/<\/script/gi, '<\\/script')}\n</script>`;
}));

let template = await read('src/index.html');
for (const marker of ['<!-- INLINE_CSS -->', '<!-- INLINE_JS -->']) {
  if (template.split(marker).length !== 2) {
    throw Error('Missing or duplicate marker: ' + marker);
  }
}
const css = await read('src/styles.css');
if (/<\/style/i.test(css)) {
  throw Error('Unexpected closing style tag');
}
template = template
  .replace('<!-- INLINE_CSS -->', () => `<style>\n${css}\n</style>`)
  .replace('<!-- INLINE_JS -->', () => scripts.join('\n'));

const output = new URL('project-gantt.html', root);
if (process.argv.includes('--check')) {
  let current;
  try {
    current = await readFile(output);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw Error('Missing project-gantt.html; run node scripts/build.mjs.');
    }
    throw error;
  }
  if (!current.equals(Buffer.from(template))) {
    throw Error('project-gantt.html is out of date; run node scripts/build.mjs.');
  }
  console.log(`Checked project-gantt.html (${Buffer.byteLength(template)} bytes), up to date.`);
} else {
  await writeFile(output, template);
  console.log(`Built project-gantt.html (${Buffer.byteLength(template)} bytes), no dependencies.`);
}
