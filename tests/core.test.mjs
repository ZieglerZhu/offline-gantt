import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
for(const name of ['date','themes','model','layout'])vm.runInThisContext(await readFile(new URL(`../src/${name}.js`,import.meta.url),'utf8'));
const G=globalThis.Gantt;
const p=(overrides={})=>({id:'a',name:'项目',start:'2026-09-01',end:'2026-09-30',progress:60,color:{mode:'preset',presetId:'blue-purple'},...overrides});
test('strict calendar parsing and year 1',()=>{for(const s of ['2026-02-29','2026-02-30','2026-13-01','0000-01-01','2026-1-01',''])assert.equal(G.date.parse(s),null);assert.notEqual(G.date.parse('2024-02-29'),null);assert.equal(G.date.fromDay(G.date.parse('0001-01-01')),'0001-01-01');});
test('month weeks partition every day and reset W1',()=>{for(let m=1;m<=12;m++){const s=`2026-${String(m).padStart(2,'0')}-01`,weeks=G.date.weeks(s);assert.equal(weeks[0].label,'W1');assert.equal(weeks[0].start,G.date.parse(s));assert.equal(weeks.at(-1).end,G.date.parse(G.date.last(s)));weeks.forEach((w,i)=>{assert.ok(w.end-w.start<7);if(i)assert.equal(w.start,weeks[i-1].end+1);});}assert.equal(G.date.weeks('2026-03-01').length,6);});
test('calendar two-year boundary including leap-day overflow',()=>{assert.ok(G.date.rangeOK([p({start:'2026-09-05',end:'2028-09-05'})]));assert.ok(!G.date.rangeOK([p({start:'2026-09-05',end:'2028-09-06'})]));assert.ok(G.date.rangeOK([p({start:'2024-02-29',end:'2026-03-01'})]));assert.ok(!G.date.rangeOK([p({start:'2024-02-29',end:'2026-03-02'})]));});
test('inclusive day geometry and rounded month range',()=>{const l=G.layout([p({start:'2026-09-03',end:'2026-09-03'})],1);assert.equal(l.tasks[0].width,9);assert.equal(l.tasks[0].x,50);assert.equal(l.start,'2026-09-01');assert.equal(l.end,'2026-09-30');});
test('invalid draft retains valid then recovers',()=>{const row=G.createRow(p()),rows=[row];row.draft.progress='120';assert.equal(G.commitRow(rows,row),false);assert.equal(row.valid.progress,60);assert.equal(row.draft.progress,'120');row.draft.progress='80';assert.ok(G.commitRow(rows,row));assert.equal(row.valid.progress,80);for(const v of ['',-1,101,'abc','1.1']){row.draft.progress=v;assert.equal(G.commitRow(rows,row),false);}assert.equal(row.valid.progress,80);});
test('other invalid drafts do not block valid row; global validation is atomic',()=>{const a=G.createRow(p()),b=G.createRow(p({id:'b'})),rows=[a,b];a.draft.name='';b.draft.progress='40';assert.ok(G.commitRow(rows,b));b.draft.end='2029-01-01';assert.equal(G.commitRow(rows,b),false);assert.equal(b.valid.end,'2026-09-30');});
test('new blank row remains absent from valid projects',()=>{const r=G.createRow();assert.equal(G.commitRow([r],r),false);assert.equal(G.projects([r]).length,0);});
test('config validates identity, types, dates, settings and hostile names as text',()=>{const config={...G.emptyConfig(),projects:[p({name:'<script>alert(1)</script>'})]};assert.equal(G.validateConfig(config).projects[0].name,config.projects[0].name);for(const bad of [{...config,schemaVersion:2},{...config,projects:[p(),p()]},{...config,projects:[p({progress:'40'})]},{...config,projects:[p({start:'2026-02-30'})]},{...config,settings:{showToday:'yes',zoom:1}}])assert.throws(()=>G.validateConfig(bad));});
test('undo restores draft and valid, rejects range conflict and expiration',()=>{const row=G.createRow(p());row.draft.progress='120';const snap={row,index:0,expiresAt:200};const rows=[];assert.equal(G.restoreDeleted(rows,snap,100),'');assert.equal(rows[0].draft.progress,'120');assert.equal(rows[0].valid.progress,60);assert.ok(G.restoreDeleted([],snap,201));const far=[G.createRow(p({id:'b',start:'2029-01-01',end:'2029-01-02'}))];assert.ok(G.restoreDeleted(far,snap,100));assert.equal(far.length,1);});
test('truncation preserves graphemes',()=>{assert.equal(G.truncate('👨‍👩‍👧‍👦项目',2,t=>Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(t)).length),'👨‍👩‍👧‍👦…');});
test('built HTML has no external script or stylesheet loads',async()=>{const html=await readFile(new URL('../project-gantt.html',import.meta.url),'utf8');assert.doesNotMatch(html,/<script[^>]+src=|<link[^>]+href=|@import|\bfetch\(|XMLHttpRequest|WebSocket/);assert.ok(html.includes('connect-src \'none\''));});

for(const zoom of [0.65,0.8,1,1.25,1.5])test(`timeline geometry at ${zoom*100}%`,()=>{
 const projects=[p({start:'2026-07-03',end:'2026-09-20'}),p({id:'b',start:'2026-09-05',end:'2026-09-05'})];
 const base=G.layout(projects,1),l=G.layout(projects,zoom),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
 assert.equal(l.start,'2026-07-01');assert.equal(l.end,'2026-09-30');
 near(l.dayWidth,9*zoom);near(l.width,64+92*9*zoom);assert.equal(l.height,294);
 for(let day=l.startDay;day<=l.endDay+1;day++)near(l.x(day),32+(day-l.startDay)*9*zoom);
 l.tasks.forEach((t,i)=>{near(t.width/base.tasks[i].width,zoom);near(t.x,32+(G.date.parse(t.start)-l.startDay)*9*zoom);assert.equal(t.y,110+i*84);});
 assert.deepEqual(l.months,base.months);
});
