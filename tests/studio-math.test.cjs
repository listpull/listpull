'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {solve2x2,fitArima110}=require('../assets/studio-math.js');
const approximately=(a,b,epsilon=1e-6)=>assert.ok(Math.abs(a-b)<epsilon, a+' ≉ '+b);

test('coordination has two pure Nash equilibria and one interior mixed',()=>{
 const out=solve2x2([[5,0],[3,2]],[[5,3],[0,2]]);
 assert.equal(out.equilibria.filter(e=>e.kind==='Pure').length,2);
 const mixed=out.equilibria.find(e=>e.kind==='Mixed');
 assert.ok(mixed);approximately(mixed.x[0],.5);approximately(mixed.y[0],.5);
 approximately(mixed.regretA,0);approximately(mixed.regretB,0);
});
test('prisoner dilemma has one pure equilibrium',()=>{
 const out=solve2x2([[3,0],[5,1]],[[3,5],[0,1]]);
 assert.equal(out.equilibria.length,1);
 assert.deepEqual(out.equilibria[0].x,[0,1]);
 assert.deepEqual(out.equilibria[0].y,[0,1]);
});
test('zero-sum matching pennies has a 50/50 mixed equilibrium',()=>{
 const out=solve2x2([[1,-1],[-1,1]],[[-1,1],[1,-1]]);
 assert.equal(out.equilibria.length,1);
 assert.equal(out.equilibria[0].kind,'Mixed');
 approximately(out.equilibria[0].x[0],.5);
 approximately(out.equilibria[0].y[0],.5);
});
test('flat payoff game is labeled degenerate',()=>{
 const out=solve2x2([[1,1],[1,1]],[[1,1],[1,1]]);
 assert.equal(out.degenerate,true);
 assert.ok(out.equilibria.length>=1);
});
test('ARIMA demonstration forecasts linear progression with zero residual spread',()=>{
 const values=Array.from({length:25},(_,i)=>100+5*i);
 const out=fitArima110(values,8);
 assert.equal(out.forecast.length,8);
 approximately(out.forecast[0].point,225);
 approximately(out.forecast[7].point,260);
 approximately(out.sigma,0);
});
test('ARIMA demonstration stays finite for flat observed series',()=>{
 const out=fitArima110(Array(20).fill(12),12);
 assert.ok(out.forecast.every(p=>Number.isFinite(p.point)&&Number.isFinite(p.lower)&&Number.isFinite(p.upper)));
});
test('new marketing and Studio pages exist and link to real source files',()=>{
 const root=path.resolve(__dirname,'..');
 const pages=['index.html','solutions.html','engineering.html','labs.html','studio.html','studio/vector.html','studio/strategy.html','studio/forecast.html','studio/ai.html'];
 const required=['/assets/site-v2.css','/assets/studio-math.js','/assets/studio-ai.js','/assets/studio-vector.js'];
 pages.forEach(page=>assert.ok(fs.existsSync(path.join(root,page)),page+' is missing'));
 required.forEach(file=>assert.ok(fs.existsSync(path.join(root,file.slice(1))),file+' is missing'));
 for(const page of pages){
  const html=fs.readFileSync(path.join(root,page),'utf8');
  assert.ok(html.includes('<main'),page+' needs a main landmark');
  assert.ok(html.includes('<title>'),page+' needs a title');
 }
});
