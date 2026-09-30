import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// Compare downloaded files with an independent snapshot of the visible chart.
export async function verifyExport(page,out,stem,{showToday,projects}) {
 const snapshot=await page.locator('#ganttSvg').evaluate(svg=>{
  const copy=svg.cloneNode(true);copy.removeAttribute('hidden');copy.querySelectorAll('title').forEach(n=>n.remove());
  return new XMLSerializer().serializeToString(copy);
 });
 await page.locator('#chartScroll').evaluate(n=>n.scrollLeft=(n.scrollWidth-n.clientWidth)/2);
 assert.ok(await page.locator('#chartScroll').evaluate(n=>n.scrollLeft>0));
 const download=async(id,extension)=>{
  const pending=page.waitForEvent('download');await page.locator(id).click();
  const file=new URL(`${stem}.${extension}`,out);await(await pending).saveAs(file.pathname);return readFile(file);
 };
 const svg=(await download('#exportSvg','svg')).toString();
 assert.equal(svg,snapshot,'download preserves all coordinates, labels, clips and full range');
 const geometry=await page.evaluate(({svg,showToday,projects})=>{
  const doc=new DOMParser().parseFromString(svg,'image/svg+xml'),root=doc.documentElement;
  const today=root.querySelector('line[stroke="#de626b"]');
  if(Boolean(today)!==showToday)throw Error('Today visibility differs');
  if(root.querySelectorAll('[data-task-id]').length!==projects)throw Error('Missing projects');
  return {width:Number(root.getAttribute('width')),height:Number(root.getAttribute('height')),todayX:today?Number(today.getAttribute('x1')):null};
 },{svg,showToday,projects});
 const png=await download('#exportPng','png');
 assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');
 const scale=Math.min(2,Math.sqrt(24000000/(geometry.width*geometry.height)),16000/geometry.width,16000/geometry.height);
 const width=Math.max(1,Math.floor(geometry.width*scale)),height=Math.max(1,Math.floor(geometry.height*scale));
 assert.equal(png.readUInt32BE(16),width);assert.equal(png.readUInt32BE(20),height);
 const pixels=await page.evaluate(async({svg,png,width,height})=>{
  const raster=async src=>{const image=new Image();image.src=src;await image.decode();const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,width,height);return ctx.getImageData(0,0,width,height).data;};
  const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
  try{const expected=await raster(url),actual=await raster('data:image/png;base64,'+png);let differences=0;for(let i=0;i<actual.length;i++)if(actual[i]!==expected[i])differences++;return {differences,lastPixelAlpha:actual.at(-1)};}finally{URL.revokeObjectURL(url);}
 },{svg,png:png.toString('base64'),width,height});
 assert.equal(pixels.differences,0,'PNG pixels match complete current SVG rasterization');assert.ok(pixels.lastPixelAlpha>0);
 return {...geometry,pngWidth:width,pngHeight:height,rasterScale:scale,pixelDifferences:pixels.differences};
}

export async function verifyZoomExports(page,out,fixtures,importConfig) {
 await page.setViewportSize({width:900,height:1000});
 const config={...fixtures,settings:{showToday:true,zoom:0.65},projects:[...fixtures.projects,
  {...fixtures.projects[0],id:'short',name:'一天项目标签应隐藏',start:'2026-09-05',end:'2026-09-05'},
  {...fixtures.projects[0],id:'truncated',name:'这个项目名称足够长以覆盖各个比例下的名称省略行为',start:'2026-09-01',end:'2026-09-30'}]};
 await importConfig(config);await page.locator('button[value=confirm]').click();await page.waitForFunction(()=>!document.getElementById('importDialog').open);
 const results=[];
 for(const zoom of [0.65,0.8,1,1.25,1.5]){
  await page.waitForFunction(expected=>document.getElementById('zoomLabel').textContent===expected,`${Math.round(zoom*100)}%`);
  assert.equal(await page.locator('#zoomLabel').textContent(),`${Math.round(zoom*100)}%`);
  const shape=await page.locator('#ganttSvg').evaluate(svg=>({
   bars:[...svg.querySelectorAll('[data-task-id] > g > rect:first-child')].map(n=>({x:+n.getAttribute('x'),y:+n.getAttribute('y'),width:+n.getAttribute('width'),height:+n.getAttribute('height')})),
   shortLabels:svg.querySelectorAll('[data-task-id="short"] text').length,
   truncated:svg.querySelector('[data-task-id="truncated"] text')?.textContent,
   nameSize:svg.querySelector('[data-task-id="p1"] text').getAttribute('font-size')
  }));
  assert.equal(shape.shortLabels,0);assert.ok(shape.truncated.endsWith('…'));assert.equal(shape.nameSize,'17');
  shape.bars.forEach((bar,i)=>{assert.equal(bar.height,54);assert.equal(bar.y,110+i*84);const days=(Date.parse(config.projects[i].end)-Date.parse(config.projects[i].start))/86400000+1;assert.ok(Math.abs(bar.width-days*9*zoom)<1e-8);});
  for(const showToday of [true,false]){
   await page.locator('#showToday').setChecked(showToday);
   await page.waitForFunction(shown=>Boolean(document.querySelector('#ganttSvg line[stroke="#de626b"]'))===shown,showToday);
   const result=await verifyExport(page,out,`zoom-${Math.round(zoom*100)}-${showToday?'today':'no-today'}`,{showToday,projects:config.projects.length});
   if(showToday)assert.ok(Math.abs(result.todayX-(32+66.5*9*zoom))<1e-8);
   results.push({zoom,showToday,...result});
  }
  await page.locator('#showToday').check();
  if(zoom<1.5)await page.locator('#zoomIn').click();
 }
 return results;
}
