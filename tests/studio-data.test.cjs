'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const D=require('../assets/studio-data.js');
const {solve2x2}=require('../assets/studio-math.js');
test('CSV parser supports quoted separators and embedded newlines',()=>{
 const csv='name,category,value\n"Bird, Rare",Wetland,12\n"Fox\nSighting",Forest,8\n';
 const data=D.parseCSV(csv);
 assert.equal(data.rows.length,2);assert.equal(data.rows[0].name,'Bird, Rare');
 assert.equal(data.rows[1].name,'Fox\nSighting');
});
test('CSV parser limits malformed or unbalanced data',()=>{
 assert.throws(()=>D.parseCSV('a,b\n1\n2,3'),/Row 2/);
 assert.throws(()=>D.parseCSV('a,b\n"bad,5'),/unclosed/);
});
test('inventory discovery produces transparent, monotonic demand scenarios',()=>{
 const data=D.makeDemo('inventory'),p=D.profile(data);
 assert.ok(p.some(x=>x.key==='expected_demand'&&x.type==='numeric'));
 const map=D.suggest(data,p);assert.equal(map.goal,'stockout');
 const base=D.analyze(data,{...map,goal:'stockout',uplift:0});
 const stress=D.analyze(data,{...map,goal:'stockout',uplift:80});
 assert.equal(base.total,35);assert.ok(stress.count>=base.count);assert.ok(base.count<=base.total);
});
test('customer outcome categories support descriptive rates',()=>{
 const data=D.makeDemo('customers');
 const out=D.analyze(data,{goal:'groups',group:'segment',outcome:'repeat_purchase',positive:'Yes'});
 assert.equal(out.kind,'rates');assert.ok(out.rows.length===4);
 assert.ok(out.share>=0&&out.share<=1);
 assert.ok(out.rows.every(g=>g.interval[0]<=g.share&&g.interval[1]>=g.share));
});
test('observed strategy payoff mapping is derived from all four combinations',()=>{
 const data=D.makeDemo('strategic');
 const map=D.suggest(data,D.profile(data));
 const out=D.deriveNash(data,map);
 assert.deepEqual(out.counts,[[20,20],[20,20]]);
 const equilibrium=solve2x2(out.A,out.B);
 assert.ok(equilibrium.equilibria.length>=1);
 assert.ok(equilibrium.equilibria.every(g=>g.regretA<.00001&&g.regretB<.00001));
});
test('wildlife tracking projects an illustrative next location from GPS records',()=>{
 const data=D.makeDemo('movement');
 const p=D.profile(data),suggest=D.suggest(data,p);
 assert.equal(suggest.goal,'movement');
 const out=D.trackMovement(data,{animalId:'Heron H-101',steps:1});
 assert.equal(out.kind,'movement');
 assert.equal(out.points.length,12);
 assert.ok(Number.isFinite(out.projected.lat)&&Number.isFinite(out.projected.lon));
 assert.ok(out.validationErrorKm>=0&&out.uncertaintyKm>0);
});
test('health example is aggregate and has no individual identifiers',()=>{
 const d=D.makeDemo('health');
 assert.deepEqual(d.headers,['region','report_week','case_count','clinic_capacity']);
 const out=D.analyze(d,{goal:'groups',group:'region',outcome:'case_count'});
 assert.equal(out.kind,'groups');
});
test('all published HTML routes use contact page, not mailto',()=>{
 const root=path.resolve(__dirname,'..');
 function walk(dir){
  let arr=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){
   const full=path.join(dir,e.name);
   if(e.isDirectory())arr.push(...walk(full));
   else if(full.endsWith('.html'))arr.push(full);
  }return arr;
 }
 for(const p of walk(root)){
  const s=fs.readFileSync(p,'utf8');
  assert.equal(/mailto:/i.test(s),false,path.relative(root,p)+' contains a mailto link');
 }
});
test('sitemap includes all new public destinations once',()=>{
 const xml=fs.readFileSync(path.resolve(__dirname,'../sitemap.xml'),'utf8');
 const urls=['/solutions.html','/engineering.html','/labs.html','/studio.html','/studio/video-editor.html','/studio/strategy.html','/studio/forecast.html','/studio/ai.html','/studio/image-editor.html'];
 for(const url of urls){
  const found=xml.split('https://listpull.com'+url+'</loc>').length-1;
  assert.equal(found,1,'Expected exactly one sitemap entry for '+url);
 }
});
test('public Studio pages never mention internal source projects or developer infrastructure',()=>{
 const root=path.resolve(__dirname,'..');
 for(const p of ['studio/ai.html','studio/vector.html','studio/forecast.html','studio/strategy.html','studio.html','labs.html']){
  const content=fs.readFileSync(path.join(root,p),'utf8');
  assert.equal(/Neubra|Electron|GitHub Pages|private research engine|founder.s portfolio/i.test(content),false,p+' exposes internal implementation history');
 }
});
test('entry pages advertise recognizable consumer and business paths',()=>{
 const root=path.resolve(__dirname,'..');
 const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.ok(home.includes('Play. Create.'));
 assert.ok(home.includes('labs-chevron-icon'));
 assert.ok(home.includes('/solutions.html'));
 const strategy=fs.readFileSync(path.join(root,'studio/strategy.html'),'utf8');
 for(const id of ['discovery-upload','discovery-group','discovery-outcome','discovery-goal','discovery-insights'])assert.ok(strategy.includes('id="'+id+'"'));
 const forecast=fs.readFileSync(path.join(root,'studio/forecast.html'),'utf8');
 for(const id of ['forecast-upload','forecast-column','forecast-backtest'])assert.ok(forecast.includes('id="'+id+'"'));
 const ai=fs.readFileSync(path.join(root,'studio/ai.html'),'utf8');
 for(const id of ['ai-local-start','fiddle-preview','fiddle-html'])assert.ok(ai.includes('id="'+id+'"'));
});

test('Creative and Video Studio route one editor each, without sign-in controls',()=>{
 const root=path.resolve(__dirname,'..');
 const creative=fs.readFileSync(path.join(root,'studio/image-editor.html'),'utf8');
 const video=fs.readFileSync(path.join(root,'studio/video-editor.html'),'utf8');
 for(const name of ['creative-document-width','creative-document-height','creative-z','creative-gradient-angle','creative-shadow-blur','creative-depth','creative-ai-request','creative-canvas'])
  assert.ok(creative.includes('id="'+name+'"'),name);
 for(const name of ['video-canvas','video-clip-track','video-title-track','video-audio-track','video-scrub','video-export-type','video-ai-request'])
  assert.ok(video.includes('id="'+name+'"'),name);
 assert.ok(creative.includes('data-fullscreen-target=".creative-main"'));
 assert.ok(video.includes('data-fullscreen-target=".video-main"'));
 assert.ok(video.includes('data-fullscreen-target=".video-monitor"'));
 assert.ok(!/\b(sign\s?in|subscribe|paywall)\b/i.test(creative+' '+video));
});
