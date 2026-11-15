/* ListPull Forecast Lab - illustrative ARIMA(1,1,0), browser only.
   Neubra Electron uses the full npm "arima" model package; this is not that service. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id), NS='http://www.w3.org/2000/svg';
 const demos={
  visits:Array.from({length:38},(_,i)=>Math.round(180+7.5*i+18*Math.sin(i*.44)+5*Math.cos(i*1.4))),
  tickets:Array.from({length:38},(_,i)=>Math.round(56-0.32*i+7*Math.sin(i*.72)+2*Math.cos(i*.23))),
  inventory:Array.from({length:38},(_,i)=>Math.round(94+2*i+11*Math.sin(i*.46)+9*Math.cos(i*.83)))
 };
 let last=null;
 const mk=(tag,attrs={},txt)=>{
  const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));
  if(txt!==undefined)e.textContent=txt;return e;
 };
 function parse(text){
  const raw=text.trim().split(/[\s,;]+/).filter(Boolean);
  if(raw.length<8||raw.length>120)throw Error('Provide 8–120 historical values.');
  const values=raw.map(Number);
  if(values.some(n=>!Number.isFinite(n)||Math.abs(n)>1e9))throw Error('Use finite numeric values below 1 billion.');
  return values;
 }
 const {fitArima110}=window.ListPullMath;
 const norm=n=>Number(n).toLocaleString(undefined,{maximumFractionDigits:2});
 const format=n=>Number(n).toFixed(2);
 function drawChart(values,result){
  const svg=$('forecast-chart');svg.replaceChildren();
  const w=950,h=440,L=64,R=42,T=25,B=55,pw=w-L-R,ph=h-T-B;
  const total=values.length+result.forecast.length-1;
  const all=[...values,...result.forecast.flatMap(v=>[v.lower,v.upper])];
  let lo=Math.min(...all),hi=Math.max(...all);
  let pad=(hi-lo)*.11||10;lo-=pad;hi+=pad;
  const xx=i=>L+pw*(i/total), yy=v=>T+ph*(hi-v)/(hi-lo);
  for(let j=0;j<=4;j++){
   const val=lo+(hi-lo)*j/4,y=yy(val);
   svg.append(mk('line',{x1:L,y1:y,x2:w-R,y2:y,stroke:'#39445d','stroke-width':1}));
   svg.append(mk('text',{x:L-9,y:y+5,'text-anchor':'end',fill:'#a2b3d0','font-size':18},norm(val)));
  }
  const boundary=values.length-1;
  svg.append(mk('line',{x1:xx(boundary),x2:xx(boundary),y1:T,y2:T+ph,stroke:'#d6b3f8','stroke-width':2,'stroke-dasharray':'8 8'}));
  svg.append(mk('text',{x:xx(boundary)+9,y:T+24,fill:'#e7c7ff','font-size':17},'Projection starts'));
  const points=values.map((v,i)=>xx(i).toFixed(1)+','+yy(v).toFixed(1)).join(' ');
  svg.append(mk('polyline',{points,fill:'none',stroke:'#6ce7d5','stroke-width':4,'stroke-linecap':'round','stroke-linejoin':'round'}));
  const continuation=[{step:0,point:values[boundary],lower:values[boundary],upper:values[boundary]},...result.forecast];
  const upper=continuation.map(p=>xx(boundary+p.step).toFixed(1)+','+yy(p.upper).toFixed(1));
  const lower=continuation.slice().reverse().map(p=>xx(boundary+p.step).toFixed(1)+','+yy(p.lower).toFixed(1));
  svg.append(mk('polygon',{points:upper.concat(lower).join(' '),fill:'#ffbc7833',stroke:'none'}));
  const forecastPoints=continuation.map(p=>xx(boundary+p.step).toFixed(1)+','+yy(p.point).toFixed(1)).join(' ');
  svg.append(mk('polyline',{points:forecastPoints,fill:'none',stroke:'#ffc078','stroke-width':4,'stroke-linejoin':'round','stroke-dasharray':'10 6'}));
  const labels=[0,Math.round(boundary/2),boundary,total];
  labels.forEach(i=>svg.append(mk('text',{x:xx(i),y:h-20,'text-anchor':'middle',fill:'#b6c1d3','font-size':17},String(i+1))));
  svg.append(mk('circle',{cx:xx(boundary),cy:yy(values[boundary]),r:6,fill:'#b5fae7'}));
 }
 function card(label,value){
  const n=document.createElement('div');n.className='forecast-stat';
  const strong=document.createElement('strong');strong.textContent=value;
  const small=document.createElement('span');small.textContent=label;n.append(strong,small);return n;
 }
 function run(){
  try{
   const values=parse($('forecast-series').value);
   const horizon=Number($('forecast-horizon').value);
   const r=fitArima110(values,horizon);last={observed:values,...r};
   drawChart(values,r);
   const stats=$('forecast-stats');stats.replaceChildren(
    card('Last observation',norm(values[values.length-1])),
    card('Lagged-difference φ',format(r.phi)),
    card('Residual σ',format(r.sigma))
   );
   const rows=$('forecast-rows');rows.replaceChildren();
   for(const p of r.forecast){
    const tr=document.createElement('tr');
    for(const val of [p.step,format(p.point),format(p.lower),format(p.upper)]){
     const td=document.createElement('td');td.textContent=String(val);tr.append(td);
    }
    rows.append(tr);
   }
   $('forecast-status').textContent='Projection complete. Teaching interval is not calibrated.';
   $('forecast-csv').disabled=false;
  }catch(e){$('forecast-status').textContent=e.message;$('forecast-csv').disabled=true}
 }
 function reset(){
  $('forecast-series').value=demos[$('forecast-example').value].join(', ');
  run();
 }
 $('forecast-example').addEventListener('change',reset);
 $('forecast-horizon').addEventListener('input',event=>{$('horizon-output').value=event.target.value;});
 $('forecast-run').addEventListener('click',run);$('forecast-reset').addEventListener('click',reset);
 $('forecast-csv').addEventListener('click',()=>{
  if(!last)return;
  const csv=['period,observed,forecast,illustrative_lower,illustrative_upper'];
  last.observed.forEach((v,i)=>csv.push((i+1)+','+v+',,,'));
  last.forecast.forEach(p=>csv.push((last.observed.length+p.step)+',,'+format(p.point)+','+format(p.lower)+','+format(p.upper)));
  const file=new Blob([csv.join('\n')+'\n'],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(file);const a=document.createElement('a');a.href=url;a.download='listpull-forecast-demo.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 reset();
})();